from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PriorityLevel(str, Enum):
    LOW = "LOW"
    MED = "MED"
    HIGH = "HIGH"


class Task:
    """Domain model mirroring the Supabase tasks table row."""

    def __init__(
        self,
        task_id: UUID,
        title: str,
        description: str,
        due_date: datetime,
        task_duration: int,
        priority: PriorityLevel,
        source_note_id: UUID,
        is_complete: bool = False,
        calendar_event_id: Optional[str] = None,
        scheduled_start: Optional[datetime] = None,
    ) -> None:
        self.task_id = task_id
        self.title = title
        self.description = description
        self.due_date = due_date
        self.task_duration = task_duration
        self.priority = priority
        self.source_note_id = source_note_id
        self.is_complete = is_complete
        self.calendar_event_id = calendar_event_id
        self.scheduled_start = scheduled_start

    def isSchedulable(self) -> bool:
        """Return False if task is already complete."""
        return not self.is_complete

    def getMissingFields(self) -> list[str]:
        """Return list of required fields that are None or empty."""
        missing: list[str] = []
        if not self.title:
            missing.append("title")
        if self.due_date is None:
            missing.append("due_date")
        if self.task_duration is None or self.task_duration <= 0:
            missing.append("task_duration")
        if self.source_note_id is None:
            missing.append("source_note_id")
        return missing

    def markComplete(self) -> None:
        """Mark the task as complete."""
        self.is_complete = True

    def toCalendarEvent(self, start: datetime) -> dict:
        """Build a Google Calendar event payload from this task.

        Args:
            start: The scheduled start time for the event.

        Returns:
            A dict compatible with the Google Calendar Events.insert API.
        """
        from datetime import timedelta

        end = start + timedelta(minutes=self.task_duration)
        return {
            "summary": self.title,
            "description": self.description,
            "start": {"dateTime": start.isoformat(), "timeZone": "UTC"},
            "end": {"dateTime": end.isoformat(), "timeZone": "UTC"},
            "reminders": {"useDefault": True},
        }


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class TaskCreateRequest(BaseModel):
    title: str
    description: str = ""
    due_date: datetime
    task_duration: int = Field(..., gt=0, description="Duration in minutes")
    priority: PriorityLevel = PriorityLevel.MED
    source_note_id: UUID


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    task_duration: Optional[int] = Field(None, gt=0)
    priority: Optional[PriorityLevel] = None
    is_complete: Optional[bool] = None


class ScheduleTaskRequest(BaseModel):
    oauth_token: str
    refresh_token: str
    user_id: str


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class TaskResponse(BaseModel):
    task_id: UUID
    title: str
    description: str
    due_date: datetime
    task_duration: int
    priority: PriorityLevel
    is_complete: bool
    calendar_event_id: Optional[str]
    scheduled_start: Optional[datetime]
    source_note_id: UUID

    model_config = {"from_attributes": True}


class ScheduleTaskResponse(BaseModel):
    task_id: UUID
    calendar_event_id: str
    scheduled_start: datetime
    message: str = "Task successfully scheduled on Google Calendar"
