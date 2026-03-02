
class StickyNoteService:
    def __init__(self, SNRepo, AIService, TaskService):
        self.SNRepo = SNRepo
        self.AIService = AIService
        self.TaskService = TaskService