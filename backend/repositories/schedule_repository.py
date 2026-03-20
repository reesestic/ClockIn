class ScheduleRepository:
    def __init__(self, supabase):
        self.supabase = supabase

    def save_schedule(self, schedule: list):
        # 🔥 Replace entire schedule (simple version)
        self.supabase.table("Schedule").delete().neq("id", "").execute()

        self.supabase.table("Schedule").insert(schedule).execute()

        return schedule

    def get_schedule(self):
        result = self.supabase.table("Schedule").select("*").execute()
        return result.data