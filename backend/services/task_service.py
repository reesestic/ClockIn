class TaskService:
    def __init__(self, TaskRepo):
        self.TaskRepo = TaskRepo

    def create_task(self, task_data):
        self.TaskRepo.create(task_data)
        return self.TaskRepo.create(task_data)
    
    def get_tasks(self,user_id):
        return self.TaskRepo.get_tasks(user_id)

    def delete_task(self, task_id):
        return self.TaskRepo.delete_task(task_id)
    
    def update_task(self, task_id: str, task_data: dict):
        return self.TaskRepo.update_task(task_id, task_data)