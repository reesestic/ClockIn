from datetime import datetime, timezone
from uuid import UUID

from repositories.schedule_repository import ScheduleRepository
from services.ml_service import MLService


DEFAULT_WEIGHTS = {
    "priority": 0.4,
    "urgency": 0.4, # how many days until due date
    "duration_fit": 0.2,
}


class ScheduleService:

    def __init__(self):
        self.repo = ScheduleRepository()
        self.ml = MLService()

    def score_slot(self, task: dict, proposed_start: datetime, user_id: UUID) -> float:
        weights = self._get_weights(user_id)

        priority_score = self._score_priority(task.get("priority"))
        urgency_score = self._score_urgency(task.get("due_date"))
        duration_fit_score = self._score_duration_fit(task.get("task_duration"), proposed_start)

        score = (
            weights["priority"] * priority_score +
            weights["urgency"] * urgency_score +
            weights["duration_fit"] * duration_fit_score
        )
        return round(score, 4)

    def accept_slot(self, user_id: UUID, task_id: UUID, proposed_start: datetime, scheduled_end: datetime):
        self.repo.log_behavior_event(user_id, task_id, proposed_start, "accepted")
        return self.repo.save_schedule(user_id, task_id, proposed_start, scheduled_end)

    def reject_slot(self, user_id: UUID, task_id: UUID, proposed_start: datetime):
        self.repo.log_behavior_event(user_id, task_id, proposed_start, "rescheduled")

    def get_schedule(self, user_id: UUID) -> list[dict]:
        return self.repo.get_schedules_for_user(user_id)

# helpers 4 scoring
    def _score_priority(self, priority: int | None) -> float:
        if priority is None:
            return 0.5
        return min(priority, 5) / 5.0

    def _score_urgency(self, due_date: str | None) -> float:
        if due_date is None:
            return 0.3
        due = datetime.fromisoformat(due_date).replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        days_left = (due - now).days
        if days_left <= 0:
            return 1.0
        if days_left >= 14:
            return 0.1
        return round(1 - (days_left / 14), 4)

    def _score_duration_fit(self, task_duration: int | None, proposed_start: datetime) -> float:
        hour = proposed_start.hour
        if 8 <= hour < 12:
            return 1.0
        if 12 <= hour < 15:
            return 0.7
        if 15 <= hour < 18:
            return 0.5
        return 0.2

    def _get_weights(self, user_id: UUID) -> dict:
        events = self.repo.get_behavior_events(user_id)
        if len(events) < 10:
            return DEFAULT_WEIGHTS
        try:
            return self.ml.get_learned_weights(events)
        except Exception:
            return DEFAULT_WEIGHTS
