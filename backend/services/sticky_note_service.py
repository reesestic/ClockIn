# removed supabase import

class StickyNoteService:
    def __init__(self, SNRepo, AIService, TaskService):
        self.SNRepo = SNRepo
        self.AIService = AIService
        self.TaskService = TaskService
    
    async def note_to_task(self, sticky_id):
        
        #get sticky note fields to feed to OpenAI
        title = self.SNRepo.get_title(sticky_id)
        text = self.SNRepo.get_text(sticky_id)
        
        # Extract structured task data from the sticky note
        task_data = await self.AIService.extract_task_fields(title, text)
        
        # Create a new task using the extracted data
        await self.TaskService.create_task(task_data)
        
        
        # Include delete method of database from SNRepo here 
        # to delete the sticky note after conversion
        return 
    
    async def sticky_to_db(self, title, text, id, user_id, posX, posY, posZ):
        self.SNRepo.create_sticky_note(title, text, id, user_id, posX, posY, posZ)
        return


    # Creation Stuff
    def create_note(self, title: str, content: str, x: int, y: int, z: int):
        return self.SNRepo.create_note(title, content, x, y, z)
        # Returns id, title, text, color, user_id, posX, posY, posZ

    def update_note(self, id: int, title: str, content: str):
        return self.SNRepo.update_note(id, title, content)

    def get_notes(self, user_id: int):
        return self.SNRepo.get_notes(user_id)