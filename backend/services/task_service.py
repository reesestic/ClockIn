
class TaskService:
    def __init__(self, TaskRepo):
        self.TaskRepo = TaskRepo

    def create_task(self, task_data, user_id):
        return self.TaskRepo.create(task_data, user_id)

    def get_tasks(self, user_id):
        return self.TaskRepo.get_tasks(user_id)

    def delete_task(self, task_id, user_id):
        return self.TaskRepo.delete_task(task_id, user_id)

    def update_task(self, task_id: str, task_data: dict, user_id: str):
        return self.TaskRepo.update_task(task_id, task_data, user_id) 