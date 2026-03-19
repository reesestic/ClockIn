class TaskRepository:
    def __init__(self, supabase):
        self.supabase = supabase

    def create(self, task_data):
        # Here you would typically interact with your database to save the task
        # For example, using Supabase client to insert a new record
        self.supabase.table('Tasks').insert(task_data).execute()
        return

    def get_tasks(self, user_id):
        response = self.supabase.table('Tasks').select('*').eq('user_id', user_id).execute()
        return response.data