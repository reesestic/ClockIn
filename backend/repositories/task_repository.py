class TaskRepository:
    def __init__(self, supabase):
        self.supabase = supabase

    def create(self, task_data):  
        #given the task data from the service, send it to the database!
        response = self.supabase.table('Tasks').insert(task_data).execute()
