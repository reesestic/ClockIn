from supabase import Client
from datetime import datetime, timezone
import uuid


class PlantsRepository:
    def __init__(self, supabase):
        self.supabase = supabase

    def get_active_plant(self, user_id: str):
        result = (
            self.supabase.table("Plants")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    def create_plant(self, user_id: str, stage: int = 1):
        result = (
            self.supabase.table("Plants")
            .insert({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "stage": stage,
                "progress_seconds": 0,
                "is_active": True,
                "variety": "sunflower",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            .execute()
        )
        return result.data[0]

    def advance_stage(self, plant_id: str, new_stage: int):
        result = (
            self.supabase.table("Plants")
            .update({"stage": new_stage})
            .eq("id", plant_id)
            .execute()
        )
        return result.data[0]

    def update_progress(self, plant_id: str, progress_seconds: int):
        result = (
            self.supabase.table("Plants")
            .update({"progress_seconds": progress_seconds})
            .eq("id", plant_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def complete_plant(self, plant_id: str):
        result = (
            self.supabase.table("Plants")
            .update({
                "is_active": False,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            })
            .eq("id", plant_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def get_completed_plant_count(self, user_id: str) -> int:
        result = (
            self.supabase.table("Plants")
            .select("id")
            .eq("user_id", user_id)
            .eq("is_active", False)
            .execute()
        )
        return len(result.data) if result.data else 0