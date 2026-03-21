import os
from dotenv import load_dotenv

from database.supabase_client import supabase

from repositories.sticky_note_repository import StickyNoteRepository
from repositories.task_repository import TaskRepository
from repositories.schedule_repository import ScheduleRepository

from services.sticky_note_service import StickyNoteService
from services.openai_service import AIService
from services.task_service import TaskService
from services.schedule_service import ScheduleService


load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")


task_repository = TaskRepository(supabase)
sticky_note_repo = StickyNoteRepository(supabase)
task_service = TaskService(task_repository)
openai_service = AIService(api_key)

sticky_note_service = StickyNoteService(
    sticky_note_repo,
    openai_service,
    task_service
)

schedule_repository = ScheduleRepository(supabase)
schedule_service = ScheduleService(ScheduleRepository, TaskRepository)
