import os
from dotenv import load_dotenv

from database.supabase_client import supabase
from repositories.sticky_note_repository import StickyNoteRepository
from repositories.task_repository import TaskRepository
from services.sticky_note_service import StickyNoteService
from services.openai_service import AIService
from services.task_service import TaskService

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

sticky_note_repo = StickyNoteRepository(supabase)
task_service = TaskService(TaskRepository)
openai_service = AIService(api_key)

sticky_note_service = StickyNoteService(
    sticky_note_repo,
    openai_service,
    task_service
)