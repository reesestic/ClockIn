from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from supabase_client import supabase
from database.database_models import PriorityLevel, Task, TaskCreateRequest, TaskUpdateRequest


def _row_to_task(row: dict) -> Task:
    """Convert a Supabase row dict into a Task domain object."""
    return Task(
        task_id=UUID(row["task_id"]),
        title=row["title"],
        description=row.get("description", ""),
        due_date=datetime.fromisoformat(row["due_date"]),
        task_duration=row["task_duration"],
        priority=PriorityLevel(row["priority"]),
        source_note_id=UUID(row["source_note_id"]),
        is_complete=row.get("is_complete", False),
        calendar_event_id=row.get("calendar_event_id"),
        scheduled_start=(
            datetime.fromisoformat(row["scheduled_start"])
            if row.get("scheduled_start")
            else None
        ),
    )


class CalendarRepository:
    """Handles all Supabase CRUD operations for the tasks table."""

    TABLE = "tasks"

    def get_task_by_id(self, task_id: UUID) -> Optional[Task]:
        response = (
            supabase.table(self.TABLE)
            .select("*")
            .eq("task_id", str(task_id))
            .execute()
        )
        if not response.data:
            return None
        return _row_to_task(response.data[0])

    def get_tasks_by_user(self, user_id: str) -> list[Task]:
        response = (
            supabase.table(self.TABLE)
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return [_row_to_task(row) for row in response.data]

    def create_task(self, payload: TaskCreateRequest) -> Task:
        data = {
            "title": payload.title,
            "description": payload.description,
            "due_date": payload.due_date.isoformat(),
            "task_duration": payload.task_duration,
            "priority": payload.priority.value,
            "source_note_id": str(payload.source_note_id),
        }
        response = supabase.table(self.TABLE).insert(data).execute()
        return _row_to_task(response.data[0])

    def update_task(self, task_id: UUID, payload: TaskUpdateRequest) -> Task:
        updates: dict = {}
        if payload.title is not None:
            updates["title"] = payload.title
        if payload.description is not None:
            updates["description"] = payload.description
        if payload.due_date is not None:
            updates["due_date"] = payload.due_date.isoformat()
        if payload.task_duration is not None:
            updates["task_duration"] = payload.task_duration
        if payload.priority is not None:
            updates["priority"] = payload.priority.value
        if payload.is_complete is not None:
            updates["is_complete"] = payload.is_complete

        response = (
            supabase.table(self.TABLE)
            .update(updates)
            .eq("task_id", str(task_id))
            .execute()
        )
        return _row_to_task(response.data[0])

    def save_scheduled_event(
        self,
        task_id: UUID,
        calendar_event_id: str,
        scheduled_start: datetime,
    ) -> Task:
        updates = {
            "calendar_event_id": calendar_event_id,
            "scheduled_start": scheduled_start.isoformat(),
        }
        response = (
            supabase.table(self.TABLE)
            .update(updates)
            .eq("task_id", str(task_id))
            .execute()
        )
        return _row_to_task(response.data[0])

    def delete_task(self, task_id: UUID) -> bool:
        response = (
            supabase.table(self.TABLE)
            .delete()
            .eq("task_id", str(task_id))
            .execute()
        )
        return len(response.data) > 0
