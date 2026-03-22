from fastapi import APIRouter, Depends
from constants.routes import SCHEDULE
from dependencies.auth import get_current_user

from dependencies.dependencies import schedule_service
from models.schedule_model import GenerateScheduleRequest

router = APIRouter(prefix=SCHEDULE)

# make types instead of dict
@router.post("")
def generate_schedule_controller(req: GenerateScheduleRequest, user=Depends(get_current_user)):
    print("Controller: ", req)
    if not req.taskIds:
        return {"error": "No tasks selected"}


    return schedule_service.build_schedule(
        user["id"],
        req.taskIds,
        req.filters
    )


@router.get("/")
def get_schedule_controller(user=Depends(get_current_user)):
    return schedule_service.schedule_repo.get_active_schedule(user["id"])

