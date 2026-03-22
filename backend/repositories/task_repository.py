class TaskRepository:
    def __init__(self, supabase):
        self.supabase = supabase

    def create(self, task_data, user_id):
        # Here you would typically interact with your database to save the task
        # For example, using Supabase client to insert a new record
        task_data["user_id"] = user_id  # Ensure the task is associated with the user
        result = self.supabase.table('Tasks').insert(task_data).execute()
        return result.data[0]

    def get_tasks(self, user_id):
        response = self.supabase.table('Tasks').select('*').eq('user_id', user_id).execute()
        return response.data

    def delete_task(self, task_id: str, user_id: str):
            result = (
                self.supabase
                .table("Tasks")
                .delete()
                .eq("id", task_id)
                .eq("user_id", user_id)
                .execute()
            )
            if not result.data:
                raise Exception("Task not found")

            return task_id

    def update_task(self, task_id: str, task_data: dict, user_id: str):
        result = (
            self.supabase
                .table('Tasks')
                .update(task_data)
                .eq('id', task_id)
                .eq('user_id', user_id)
                .execute()
        )
        return result.data[0]