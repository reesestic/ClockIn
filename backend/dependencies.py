from database.supabase_client import supabase
from repositories.sticky_note_repository import StickyNoteRepository
from services.sticky_note_service import StickyNoteService
from services.openai_service import OpenAIService
from services.task_service import TaskService

sticky_note_repo = StickyNoteRepository(supabase)
task_service = TaskService()
openai_service = OpenAIService()

sticky_note_service = StickyNoteService(
    sticky_note_repo,
    openai_service,
    task_service
)