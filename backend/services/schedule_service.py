import os
import json
from datetime import datetime, timezone, timedelta
from uuid import UUID

from repositories.schedule_repository import ScheduleRepository
from repositories.calendar_repository import CalendarRepository
from services.ml_service import MLService
from services.feature_validator import FeatureValidator
from services.feature_discovery_service import FeatureDiscoveryService


DEFAULT_WEIGHTS = {
    "priority": 0.4,
    "urgency": 0.4,
    "duration_fit": 0.2,
}


class ScheduleService:

    def __init__(self):
        self.repo      = ScheduleRepository()
        self.task_repo = CalendarRepository()
        self.ml        = MLService()
        self.validator = FeatureValidator()
        self.discovery = FeatureDiscoveryService(self.repo)
        # InterpretationService is lazy-loaded so the app starts without OPENAI_API_KEY
        self._interpreter = None

    def _get_interpreter(self):
        if self._interpreter is None:
            from services.interpretation_service import InterpretationService
            api_key = os.getenv("OPENAI_API_KEY", "")
            self._interpreter = InterpretationService(api_key)
        return self._interpreter

    # Public: generate a full schedule for a list of tasks 

    def build_schedule(self, user_id: str, task_ids: list[str], filters: dict, allowed_days: list[str] | None = None) -> list[dict]:
        # 1. fetch tasks (single batch query to avoid HTTP/2 threading issues)
        tasks = self.task_repo.get_tasks_by_ids(task_ids)

        # Get existing schedules to include them as booked and in results
        existing_schedules = self.repo.get_schedules_for_user(UUID(user_id))

        # 2. load already-booked slots so we don't double-book
        booked = self._get_booked_slots(UUID(user_id))

        # Add all existing schedules to results and ensure they are booked
        results = []
        for s in existing_schedules:
            start_str = s["scheduled_start"]
            end_str = s["scheduled_end"]
            start = datetime.fromisoformat(self._strip_tz(start_str))
            end = datetime.fromisoformat(self._strip_tz(end_str))
            date_str = start.date().isoformat()
            start_mins = start.hour * 60 + start.minute
            end_mins = end.hour * 60 + end.minute
            # Ensure booked includes them (though _get_booked_slots already does, but to be safe)
            if (date_str, start_mins, end_mins) not in booked:
                booked.append((date_str, start_mins, end_mins))
            results.append({
                "task_id": s["task_id"],
                "title": s["title"],
                "description": s.get("description"),
                "start": start_str,
                "end": end_str,
                "score": 1.0,  # indicating already scheduled
            })

        # Identify which of the task_ids are already scheduled
        existing_task_ids = set(s['task_id'] for s in existing_schedules)
        new_task_ids = [tid for tid in task_ids if tid not in existing_task_ids]

        # Only schedule new tasks
        new_tasks = [t for t in tasks if str(t.id) in new_task_ids]

        task_dicts = [
            {
                "id": str(t.id),
                "title": t.title,
                "description": t.description,
                "priority": t.priority,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "task_duration": t.task_duration,
            }
            for t in new_tasks
        ]

        # 3. rank tasks by filter preferences (determines scheduling order)
        ranked = self._rank_tasks(task_dicts, filters)

        # 4. get weights (ML or default) then temporarily boost by filters
        base_weights = self._get_weights(UUID(user_id))
        weights = self._apply_filter_boosts(base_weights, filters)

        # 5. for each task in ranked order, find its best available slot
        skipped = []
        for task in ranked:
            slot = self._find_best_slot_for_task(task, booked, weights, allowed_days or [])
            if slot is None:
                skipped.append({"task_id": task["id"], "title": task["title"], "skipped": True, "reason": "no_slot"})
                continue
            duration_mins = task.get("task_duration") or 60
            end = slot + timedelta(minutes=duration_mins)
            booked.append((
                slot.date().isoformat(),
                slot.hour * 60 + slot.minute,
                slot.hour * 60 + slot.minute + duration_mins,
            ))
            duration_fit = self._score_duration_fit(task.get("task_duration"), slot)
            score = round(
                weights["priority"] * self._score_priority(task.get("priority")) +
                weights["urgency"] * self._score_urgency(task.get("due_date")) +
                weights["duration_fit"] * duration_fit,
                4
            )
            results.append({
                "task_id": task["id"],
                "title": task["title"],
                "description": task.get("description"),
                "start": slot.isoformat(),
                "end": end.isoformat(),
                "score": score,
            })

        return {"scheduled": results, "skipped": skipped}

    # Public: existing single-slot methods (kept for compatibility) 

    def accept_slot(self, user_id: UUID, task_id: UUID, proposed_start: datetime, scheduled_end: datetime):
        self.repo.log_behavior_event(user_id, task_id, proposed_start, "accepted")
        return self.repo.save_schedule(user_id, task_id, proposed_start, scheduled_end)

    def reject_slot(self, user_id: UUID, task_id: UUID, proposed_start: datetime):
        self.repo.log_behavior_event(user_id, task_id, proposed_start, "rescheduled")

    def get_schedule(self, user_id: UUID) -> list[dict]:
        return self.repo.get_schedules_for_user(user_id)

    # Task ranking (filters determine order, not slot)

    def _rank_tasks(self, tasks: list[dict], filters: dict) -> list[dict]:
        def sort_key(task):
            score = 0
            if filters.get("deadline") == "desc":
                score += self._score_urgency(task.get("due_date")) * 2
            elif filters.get("deadline") == "asc":
                score -= self._score_urgency(task.get("due_date")) * 2
            if filters.get("importance") == "desc":
                score += self._score_priority(task.get("priority")) * 2
            elif filters.get("importance") == "asc":
                score -= self._score_priority(task.get("priority")) * 2
            return score

        return sorted(tasks, key=sort_key, reverse=True)

    # Temporarily boost weights based on filter preferences 

    def _apply_filter_boosts(self, weights: dict, filters: dict) -> dict:
        w = weights.copy()
        if filters.get("deadline") in ("asc", "desc"):
            w["urgency"] = min(w["urgency"] * 1.75, 1.0)
        if filters.get("importance") in ("asc", "desc"):
            w["priority"] = min(w["priority"] * 1.75, 1.0)
        if filters.get("time") in ("asc", "desc"):
            w["duration_fit"] = min(w["duration_fit"] * 1.75, 1.0)
        total = sum(w.values()) or 1
        return {k: round(v / total, 4) for k, v in w.items()}

    # Find best available slot for a single task 

    def _find_best_slot_for_task(self, task: dict, booked: list, weights: dict, allowed_days: list[str] | None = None) -> datetime | None:
        """booked is a list of (date_str, start_mins, end_mins) ranges."""
        priority_score = self._score_priority(task.get("priority"))
        urgency_score = self._score_urgency(task.get("due_date"))

        now = datetime.now()  # naive local time — matches how due dates are stored
        best_score = -1
        best_slot = None
        duration_mins = task.get("task_duration") or 60

        due_date = task.get("due_date")
        due_dt = self._parse_due_dt(due_date) if due_date else None

        for day_offset in range(7):
            day = now + timedelta(days=day_offset)
            date_str = day.date().isoformat()
            if allowed_days and date_str not in allowed_days:
                continue
            day_booked = [(s, e) for (d, s, e) in booked if d == date_str]

            for hour in range(6, 24):
                slot_dt = day.replace(hour=hour, minute=0, second=0, microsecond=0)
                if slot_dt <= now:
                    continue
                slot_start_mins = hour * 60
                slot_end_mins = slot_start_mins + duration_mins
                # Reject if this range overlaps any booked range on the same day
                if any(slot_start_mins < be and bs < slot_end_mins for bs, be in day_booked):
                    continue
                slot_end = slot_dt + timedelta(minutes=duration_mins)
                if due_dt and slot_end > due_dt:
                    continue
                duration_fit = self._score_duration_fit(duration_mins, slot_dt)
                score = round(
                    weights["priority"] * priority_score +
                    weights["urgency"] * urgency_score +
                    weights["duration_fit"] * duration_fit,
                    4
                )
                if score > best_score:
                    best_score = score
                    best_slot = slot_dt

        return best_slot

    # Helpers 

    @staticmethod
    def _strip_tz(s: str) -> str:
        """Remove timezone suffix so fromisoformat gives a naive local datetime."""
        import re
        return re.sub(r'([+-]\d{2}:\d{2}|Z)$', '', s)

    def _get_booked_slots(self, user_id: UUID) -> list:
        """Returns list of (date_str, start_mins, end_mins) for all saved blocks."""
        existing = self.repo.get_schedules_for_user(user_id)
        booked = []
        for s in existing:
            try:
                start = datetime.fromisoformat(self._strip_tz(s["scheduled_start"]))
                end   = datetime.fromisoformat(self._strip_tz(s["scheduled_end"]))
            except Exception:
                continue
            booked.append((
                start.date().isoformat(),
                start.hour * 60 + start.minute,
                end.hour * 60 + end.minute,
            ))
        return booked

    def _score_priority(self, priority: int | None) -> float:
        if priority is None:
            return 0.5
        return min(priority, 5) / 5.0

    @staticmethod
    def _parse_due_dt(due_date: str) -> datetime:
        """
        Parse a due-date string to a naive local datetime so it compares
        correctly against datetime.now() (also naive local).

        The frontend stores datetime-local values without timezone info —
        treating them as UTC would shift them by the user's UTC offset and
        make near-deadline tasks appear already overdue.

        - Date-only  → end of that day (23:59:59)
        - Datetime   → exact time, timezone stripped so it stays as entered
        """
        if len(due_date) <= 10:
            return datetime.fromisoformat(due_date).replace(hour=23, minute=59, second=59)
        due = datetime.fromisoformat(due_date)
        # Strip any timezone so comparisons stay in local wall-clock time
        return due.replace(tzinfo=None)

    def _score_urgency(self, due_date: str | None) -> float:
        if due_date is None:
            return 0.3
        due = self._parse_due_dt(due_date)
        now = datetime.now()  # naive local time — matches how due dates are stored
        hours_left = (due - now).total_seconds() / 3600
        if hours_left <= 0:
            return 1.0
        if hours_left >= 14 * 24:
            return 0.1
        return round(1 - (hours_left / (14 * 24)), 4)

    def _score_duration_fit(self, task_duration: int | None, proposed_start: datetime) -> float:
        hour = proposed_start.hour
        if 18 <= hour < 24:
            return 1.0
        if 15 <= hour < 18:
            return 0.7
        if 12 <= hour < 15:
            return 0.5
        return 0.2

    def _get_weights(self, user_id: UUID) -> dict:
        """
        Read perceptron weights from the database (primary source of truth).
        Falls back to DEFAULT_WEIGHTS until the perceptron has been trained.
        LogisticRegression is no longer used for scheduling decisions.
        """
        return self.ml.get_learned_weights(str(user_id), self.repo)

    def get_last_rejected_slot(self, user_id: UUID, task_id: UUID) -> datetime | None:
        """Returns the most recently rejected slot for this task, or None."""
        events = self.repo.get_behavior_events_ordered(user_id)
        last = None
        for ev in events:
            if ev.get("task_id") == str(task_id) and ev.get("action") == "rescheduled":
                try:
                    last = datetime.fromisoformat(
                        ev["slot_offered"].replace("Z", "+00:00")
                    )
                except Exception:
                    pass
        return last

    async def process_slot_correction(
        self,
        user_id: UUID,
        task_id: UUID,
        rejected_slot: datetime,
        accepted_slot: datetime,
    ) -> None:
        """
        Full correction pipeline:
          OpenAI interpretation → FeatureValidator → perceptron update (with decay)

        Called after a user accepts a new slot, with the previously rejected slot
        passed in.  Stores latent features as JSONB alongside the event.
        """
        task = self.task_repo.get_task_by_id(task_id)
        task_dict = {
            "title":         task.title         if task else "unknown",
            "priority":      task.priority      if task else 3,
            "due_date":      task.due_date.isoformat() if (task and task.due_date) else None,
            "task_duration": task.task_duration if task else 60,
        }

        # 1. OpenAI semantic interpretation
        interp = None
        try:
            interp = await self._get_interpreter().interpret_slot_correction(
                task_dict, rejected_slot, accepted_slot
            )
        except Exception:
            pass

        if interp is None:
            return  # OpenAI unavailable — skip training, don't block the accept

        # Print OpenAI's interpretation for debugging
        print(f"[OPENAI INTERPRETATION] Task: {task_dict['title']}, Rejected: {rejected_slot}, Accepted: {accepted_slot}")
        print(f"Reasoning: {interp.get('reasoning', 'No reasoning provided')}")
        print(f"Interpretation: {json.dumps(interp, indent=2, default=str)}")

        original  = interp.get("original",   {})
        corrected = interp.get("corrected",  {})
        confidence = interp.get("confidence")
        latent_vars = interp.get("latent_vars", {})
        if not isinstance(latent_vars, dict):
            latent_vars = {}

        # Derive correction_type and direction for the validator
        try:
            direction = FeatureValidator.slot_direction(rejected_slot.hour, accepted_slot.hour)
        except Exception:
            direction = None
        correction_type = "slot_hour"

        # 2. FeatureValidator gate
        passed, _ = self.validator.validate(
            original, corrected,
            str(user_id), correction_type, direction,
            float(confidence) if confidence is not None else None,
        )
        if not passed:
            return

        phi_corr = FeatureValidator.to_vector(corrected)
        phi_orig = FeatureValidator.to_vector(original)

        # Print ML inputs and current weights
        current_weights = self._get_weights(user_id)
        print(f"[ML INPUTS] Task: {task_dict['title']}")
        print(f"Phi_orig (rejected features): {phi_orig}")
        print(f"Phi_corr (accepted features): {phi_corr}")
        print(f"Latent vars: {latent_vars}")
        print(f"Current weights: {current_weights}")

        # 3. Persist the event with latent features
        self.repo.log_behavior_event_with_features(
            user_id, task_id, accepted_slot, "accepted",
            phi_corr, latent_vars,
        )

        # 3b. Record latent keys for promotion tracking (non-blocking)
        if latent_vars:
            self.discovery.record_latent_keys(latent_vars)

        # 4. Online perceptron update with time decay
        correction_ts = accepted_slot if accepted_slot.tzinfo else \
            accepted_slot.replace(tzinfo=timezone.utc)
        try:
            new_weights = self.ml.perceptron_update(
                str(user_id), phi_corr, phi_orig, correction_ts, self.repo
            )
            print(f"Updated weights: {new_weights}")
        except Exception:
            pass

    # Public: score a specific slot for a task

    def score_slot(self, task: dict, proposed_start: datetime, user_id: UUID) -> float:
        weights = self._get_weights(user_id)
        weights = self._apply_filter_boosts(weights, {})
        return round(
            weights["priority"] * self._score_priority(task.get("priority")) +
            weights["urgency"] * self._score_urgency(task.get("due_date")) +
            weights["duration_fit"] * self._score_duration_fit(task.get("task_duration"), proposed_start),
            4
        )

    # Public: find the best slot for a single task

    def find_best_slot(self, task: dict, user_id: UUID) -> dict:
        weights = self._get_weights(user_id)
        booked = self._get_booked_slots(user_id)
        slot = self._find_best_slot_for_task(task, booked, weights)
        if slot is None:
            raise ValueError("No available slot found in the next 7 days")
        score = self.score_slot(task, slot, user_id)
        return {"best_slot": slot, "score": score, "accepted": score >= 0.5}
