
class TaskService:
    def __init__(self, TaskRepo):
        self.TaskRepo = TaskRepo
    
    def create_task(self, task_data):
        self.TaskRepo.create(task_data)
        return