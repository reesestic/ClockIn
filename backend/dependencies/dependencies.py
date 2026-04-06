import os
from dotenv import load_dotenv

from database.supabase_client import supabase

from repositories.sticky_note_repository import StickyNoteRepository
from repositories.task_repository import TaskRepository
from repositories.schedule_repository import ScheduleRepository
from repositories.timer_repository import TimerRepository
from repositories.busy_times_repository import BusyTimesRepository



from services.sticky_note_service import StickyNoteService
from services.openai_service import AIService
from services.task_service import TaskService
from services.schedule_service import ScheduleService
from services.timer_service import TimerService
from services.busy_times_service import BusyTimesService
from services.stats_service import StatsService


load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")


# Instances
openai_service = AIService(api_key)


task_repository = TaskRepository(supabase)
task_service = TaskService(task_repository)

schedule_repository = ScheduleRepository(supabase)
schedule_service = ScheduleService(schedule_repository, task_repository)

sticky_note_repository = StickyNoteRepository(supabase)
sticky_note_service = StickyNoteService(sticky_note_repository, openai_service, task_service)

timer_repository = TimerRepository(supabase)
timer_service = TimerService(timer_repository)

busy_times_repo    = BusyTimesRepository(supabase)
busy_times_service = BusyTimesService(busy_times_repo)

stats_service = StatsService(timer_repository)