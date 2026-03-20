from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from database.database_models import Task

# Work window constants (local time interpreted as UTC for simplicity)
WORK_START_HOUR = 8   # 8 AM
WORK_END_HOUR = 22    # 10 PM
SLOT_STEP_MINUTES = 15


class CalendarService:
    """Integrates with the Google Calendar API on behalf of a user."""

    def __init__(self, oauth_token: str, refresh_token: str, user_id: str) -> None:
        self.oauth_token = oauth_token
        self.refresh_token = refresh_token
        self.user_id = user_id
        self._service = None  # built lazily

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_service(self):
        """Build (or return cached) Google Calendar API service client."""
        if self._service is not None:
            return self._service

        import google.oauth2.credentials as google_credentials
        from googleapiclient.discovery import build

        creds = google_credentials.Credentials(
            token=self.oauth_token,
            refresh_token=self.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
        )

        if creds.expired:
            self.refreshToken()
            creds.token = self.oauth_token

        self._service = build("calendar", "v3", credentials=creds)
        return self._service

    def refreshToken(self) -> None:
        """Refresh the OAuth 2.0 access token using the stored refresh token."""
        import google.oauth2.credentials as google_credentials
        from google.auth.transport.requests import Request

        creds = google_credentials.Credentials(
            token=self.oauth_token,
            refresh_token=self.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
        )
        creds.refresh(Request())
        self.oauth_token = creds.token
        # Reset cached service so it picks up the new token
        self._service = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def getExistingEvents(
        self, range_start: datetime, range_end: datetime
    ) -> list[dict]:
        """Fetch all events from the primary calendar within the given range.

        Args:
            range_start: Start of the query window (UTC).
            range_end:   End of the query window (UTC).

        Returns:
            List of Google Calendar event resource dicts.
        """
        service = self._get_service()
        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=range_start.isoformat(),
                timeMax=range_end.isoformat(),
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )
        return events_result.get("items", [])

    def findOpenSlot(self, task: Task) -> datetime:
        """Find the earliest open slot for a task between now and its due_date.

        Algorithm:
        1. Round *now* up to the next 15-minute boundary.
        2. Fetch all events in [now, due_date] with a single API call.
        3. Walk forward in 15-minute steps; skip outside 8 AM – 10 PM window;
           skip if the task would end past the work-day end or past due_date.
        4. Reject a candidate if any existing event overlaps it.
        5. Return the first conflict-free slot, or raise ValueError if none found.

        Args:
            task: The Task to schedule.

        Returns:
            A timezone-aware datetime representing the scheduled start.

        Raises:
            ValueError: If no open slot exists before the task's due_date.
        """
        now = datetime.now(tz=timezone.utc)

        # Ensure due_date is timezone-aware
        due_date = task.due_date
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)

        if now >= due_date:
            raise ValueError("Task due_date is in the past; cannot schedule.")

        # Step 1 – round now up to the next 15-min boundary
        candidate = _round_up_to_slot(now)

        # Step 2 – fetch all busy events once
        existing_events = self.getExistingEvents(candidate, due_date)
        busy_intervals = _parse_busy_intervals(existing_events)

        task_duration = timedelta(minutes=task.task_duration)
        step = timedelta(minutes=SLOT_STEP_MINUTES)

        # Step 3 – walk forward
        while candidate < due_date:
            candidate_end = candidate + task_duration

            # Skip if outside 8 AM – 10 PM window
            if not _within_work_window(candidate, candidate_end):
                # Jump to start of next work window
                candidate = _next_work_window_start(candidate)
                continue

            # Skip if task would end past due_date
            if candidate_end > due_date:
                break

            # Step 4 – check for conflicts
            if not _has_conflict(candidate, candidate_end, busy_intervals):
                return candidate

            candidate += step

        raise ValueError(
            f"No available slot found for task '{task.title}' before its due_date."
        )

    def createEvent(self, task: Task, slot: datetime) -> str:
        """Create a Google Calendar event for the task at the given slot.

        Args:
            task: The Task to create an event for.
            slot: The start time for the event.

        Returns:
            The Google Calendar event ID string.

        Raises:
            googleapiclient.errors.HttpError: On API failure.
        """
        service = self._get_service()
        event_body = task.toCalendarEvent(slot)
        created_event = (
            service.events()
            .insert(calendarId="primary", body=event_body)
            .execute()
        )
        return created_event["id"]


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------


def _round_up_to_slot(dt: datetime) -> datetime:
    """Round *dt* up to the next 15-minute boundary."""
    step = SLOT_STEP_MINUTES * 60  # seconds
    ts = dt.timestamp()
    rounded = math.ceil(ts / step) * step
    return datetime.fromtimestamp(rounded, tz=dt.tzinfo)


def _parse_busy_intervals(events: list[dict]) -> list[tuple[datetime, datetime]]:
    """Extract (start, end) datetime pairs from a list of Google Calendar events."""
    intervals: list[tuple[datetime, datetime]] = []
    for event in events:
        start_raw = event.get("start", {}).get("dateTime") or event.get("start", {}).get("date")
        end_raw = event.get("end", {}).get("dateTime") or event.get("end", {}).get("date")
        if start_raw and end_raw:
            start_dt = datetime.fromisoformat(start_raw)
            end_dt = datetime.fromisoformat(end_raw)
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=timezone.utc)
            if end_dt.tzinfo is None:
                end_dt = end_dt.replace(tzinfo=timezone.utc)
            intervals.append((start_dt, end_dt))
    return intervals


def _within_work_window(start: datetime, end: datetime) -> bool:
    """Return True if both start and end fall within 8 AM – 10 PM (UTC)."""
    return (
        WORK_START_HOUR <= start.hour < WORK_END_HOUR
        and (end.hour < WORK_END_HOUR or (end.hour == WORK_END_HOUR and end.minute == 0))
    )


def _next_work_window_start(dt: datetime) -> datetime:
    """Return 8 AM on the next calendar day if dt is past 10 PM, else 8 AM today."""
    if dt.hour >= WORK_END_HOUR:
        next_day = (dt + timedelta(days=1)).replace(
            hour=WORK_START_HOUR, minute=0, second=0, microsecond=0
        )
        return next_day
    return dt.replace(hour=WORK_START_HOUR, minute=0, second=0, microsecond=0)


def _has_conflict(
    candidate: datetime,
    candidate_end: datetime,
    busy_intervals: list[tuple[datetime, datetime]],
) -> bool:
    """Return True if [candidate, candidate_end) overlaps any busy interval."""
    for event_start, event_end in busy_intervals:
        if event_start < candidate_end and event_end > candidate:
            return True
    return False
