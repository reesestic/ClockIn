from datetime import datetime
from uuid import UUID
from database.supabase_client import supabase


class ScheduleRepository:

    def log_behavior_event(self, user_id: UUID, task_id: UUID, slot_offered: datetime, action: str):
        supabase.table("user_behavior_events").insert({
            "user_id": str(user_id),
            "task_id": str(task_id),
            "slot_offered": slot_offered.isoformat(),
            "action": action,
        }).execute()

    def get_behavior_events(self, user_id: UUID) -> list[dict]:
        response = (
            supabase.table("user_behavior_events")
            .select("*")
            .eq("user_id", str(user_id))
            .execute()
        )
        return response.data

    def save_schedule(self, user_id: UUID, task_id: UUID, start: datetime, end: datetime) -> dict:
        response = supabase.table("schedules").insert({
            "user_id": str(user_id),
            "task_id": str(task_id),
            "scheduled_start": start.isoformat(),
            "scheduled_end": end.isoformat(),
        }).execute()
        return response.data[0]

    def get_schedules_for_user(self, user_id: UUID) -> list[dict]:
        response = (
            supabase.table("schedules")
            .select("*")
            .eq("user_id", str(user_id))
            .execute()
        )
        return response.data
