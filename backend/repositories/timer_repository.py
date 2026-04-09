class TimerRepository:
    def __init__(self, supabase):
        self.supabase = supabase

    def create_session(self, data: dict):
        result = (
            self.supabase
            .table("TimerSession")
            .insert(data)
            .execute()
        )

        return result.data[0]