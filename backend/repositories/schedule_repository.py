from datetime import datetime

class ScheduleRepository:
    def __init__(self, supabase):
        self.supabase = supabase

    # -------------------------
    # CREATE / REPLACE SCHEDULE
    # -------------------------
    def create_schedule(self, user_id):
        # 1. Find existing schedule
        existing = (
            self.supabase
            .table("Schedules")
            .select("id")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )

        if existing.data:
            schedule_id = existing.data[0]["id"]

            # 2. Delete blocks first (FK safety)
            (
                self.supabase
                .table("ScheduleBlocks")
                .delete()
                .eq("schedule_id", schedule_id)
                .execute()
            )

            # 3. Delete schedule
            (
                self.supabase
                .table("Schedules")
                .delete()
                .eq("id", schedule_id)
                .execute()
            )

        # 4. Create new schedule
        result = (
            self.supabase
            .table("Schedules")
            .insert({
                "user_id": user_id,
                "name": "Generated Schedule",
                "date": datetime.now().date().isoformat()
            })
            .execute()
        )

        return result.data[0]


    # -------------------------
    # INSERT BLOCKS (BULK)
    # -------------------------
    def insert_blocks(self, blocks: list):
        result = (
            self.supabase
            .table("ScheduleBlocks")
            .insert(blocks)
            .execute()
        )

        return result.data


    # -------------------------
    # FETCH USER SCHEDULE
    # -------------------------
    def get_schedule(self, user_id):
        result = (
            self.supabase
            .table("Schedules")
            .select("*, ScheduleBlocks(*)")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )

        if not result.data:
            return None

        schedule = result.data[0]

        # reshape for frontend
        return {
            "id": schedule["id"],
            "blocks": [
                {
                    "id": block["id"],
                    "taskId": block["task_id"],
                    "title": block["title"],
                    "start": block["start_time"],
                    "end": block["end_time"],
                    "color": block.get("color")
                }
                for block in schedule.get("ScheduleBlocks", [])
            ]
        }