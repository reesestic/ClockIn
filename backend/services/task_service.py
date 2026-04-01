
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
    
    def create_tasks_bulk(self, tasks_data: list, user_id: str):
        created_tasks = []
        for task_data in tasks_data:
            created_task = self.create_task(task_data, user_id)
            created_tasks.append(created_task)
        return created_tasks