from services.schedule_service import build_schedule, fetch_schedule
from fastapi import APIRouter
from constants.routes import SCHEDULE

router = APIRouter(prefix=SCHEDULE)

# make types instead of dict
@router.post("/")
def generate_schedule_controller(req: dict):
    task_ids = req.get("taskIds", [])
    filters = req.get("filters", {})
    user_id = req.get("userId")  # TEMP (later from auth)

    if not task_ids:
        return {"error": "No tasks selected"}

    return schedule_service.build_schedule(user_id, task_ids, filters)


@router.get("/")
def get_schedule_controller():
    return fetch_schedule()

