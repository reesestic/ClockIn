from services.schedule_service import build_schedule, fetch_schedule
from fastapi import APIRouter, Depends
from constants.routes import SCHEDULE
from models.schedule_model import GenerateScheduleRequest
from dependencies.auth import get_current_user

router = APIRouter(prefix=SCHEDULE)

# make types instead of dict
@router.post("/")
def generate_schedule_controller(req: GenerateScheduleRequest, user=Depends(get_current_user)):
    if not req.taskIds:
        return {"error": "No tasks selected"}


    return schedule_service.build_schedule(
        user["id"],
        req.taskIds,
        req.filters
    )


@router.get("/")
def get_schedule_controller():
    return fetch_schedule()

