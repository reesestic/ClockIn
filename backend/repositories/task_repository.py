class TaskRepository:
    def __init__(self, supabase):
        self.supabase = supabase

    def create(self, task_data):  
        response = self.supabase.table('Tasks').insert(task_data).execute()
