# removed supabase import
import json
from typing import Dict, Any
from models.sticky_note_model import StickyNoteColor

class StickyNoteService:
    def __init__(self, SNRepo, AIService, TaskService):
        self.SNRepo = SNRepo
        self.AIService = AIService
        self.TaskService = TaskService
    
    async def note_to_task(self, sticky_id, user_id):
        #get sticky note fields to feed to OpenAI
        title = self.SNRepo.get_title(sticky_id)
        text = self.SNRepo.get_text(sticky_id)
        # Extract structured task data from the sticky note
        task_data = await self.AIService.extract_task_fields(title, text, user_id)
        # Create and return a new task(s) using the extracted data
        return task_data
    
    async def send_notes_as_tasks(self, task_data, user_id):
        #create and send the tasks to the task list
        created_tasks = self.TaskService.create_tasks_bulk(task_data, user_id)
        #delete sticky note after sending to task list
        return created_tasks

    @staticmethod
    def _normalize_note(row: Dict[str, Any]):
        return {
            "id": row.get("id"),
            "title": row.get("title"),
            "content": row.get("text"),
            "color": row.get("color"),
            "position": {
                "x": row.get("posX"),
                "y": row.get("posY"),
                "z": row.get("posZ")
            }
        }
    # Creation Stuff
    def create_note(self, user_id: str, title: str, content: str, color: str, x: int, y: int, z: int):
        row = self.SNRepo.create_note(user_id, title, content, color, x, y, z)
        return self._normalize_note(row)

    # Returns id, title, text, color, user_id, posX, posY, posZ

    def update_note(self, id: str, title: str, content: str, user_id: str):
        row = self.SNRepo.update_note(id, title, content, user_id)
        return self._normalize_note(row)

    def get_notes(self, user_id: str):
        rows = self.SNRepo.get_notes(user_id)
        return [self._normalize_note(r) for r in rows]

    def delete_note(self, note_id: str, user_id: str):
        return self.SNRepo.delete_note(note_id, user_id)
        # returning an ID

    def update_color(self, note_id: str, color: StickyNoteColor, user_id: str):
        self.SNRepo.update_color(note_id, color, user_id)

#         sticky = sticky_note_service.update_note(note.id, note.title, note.content, user_id)
#
#     else:
#         sticky = sticky_note_service.create_note(user_id, note.title, note.content, note.color,
#                                                  note.position.x, note.position.y, note.position.z )