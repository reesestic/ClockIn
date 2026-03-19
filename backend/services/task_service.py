
class TaskService:
    def __init__(self, TaskRepo):
        self.TaskRepo = TaskRepo

    def create_task(self, task_data):
        self.TaskRepo.create(task_data)
        return
    
    def get_tasks(self,user_id):
        return self.TaskRepo.get_tasks(user_id)