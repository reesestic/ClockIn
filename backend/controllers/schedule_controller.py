from services.schedule_service import build_schedule, fetch_schedule
from fastapi import APIRouter
from constants.routes import SCHEDULE

router = APIRouter(prefix=SCHEDULE)

@router.post("/")
def generate_schedule_controller(req: dict):
    task_ids = req.get("taskIds", [])
    filters = req.get("filters", {})

    if not task_ids:
        return {"error": "No tasks selected"}

    schedule = build_schedule(task_ids, filters)
    return schedule


@router.get("/")
def get_schedule_controller():
    return fetch_schedule()