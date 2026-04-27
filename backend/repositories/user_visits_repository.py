from database.supabase_client import supabase 

class UserVisitsRepository:
    @staticmethod
    async def get_by_user_id(user_id: str):
        print("repository called, calling supabase now")
        response = supabase.table("user_visits") \
            .select("visited_home, visited_notes, visited_tasks, visited_schedule, visited_timer, visited_garden") \
            .eq("id", user_id) \
            .execute()
        print("supabase response:", response.data)
        return response.data

    @staticmethod
    async def set_visited(user_id: str, column: str):
        response = supabase.table("user_visits") \
            .update({column: True}) \
            .eq("id", user_id) \
            .execute()
        return response.data[0]