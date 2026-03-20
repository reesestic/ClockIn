from fastapi import APIRouter
from controllers.schedule_controller import generate_schedule_controller, get_schedule_controller

router = APIRouter(prefix="/schedule", tags=["schedule"])

@router.post("")
def generate_schedule(req: dict):
    return generate_schedule_controller(req)


@router.get("")
def get_schedule():
    return get_schedule_controller()