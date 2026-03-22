from uuid import UUID
from fastapi import APIRouter, HTTPException
from datetime import datetime

from models.schedule_model import SlotScoreRequest, SlotScoreResponse, BehaviorEventRequest, ScheduleRequest, ScheduleResponse
from services.schedule_service import ScheduleService
from repositories.calendar_repository import CalendarRepository

router = APIRouter(prefix="/schedule", tags=["schedule"])

schedule_service = ScheduleService()
task_repo = CalendarRepository()


@router.post("/score", response_model=SlotScoreResponse)
def score_slot(body: SlotScoreRequest, user_id: UUID):
    task = task_repo.get_task_by_id(body.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    task_dict = {
        "priority": task.priority,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "task_duration": task.task_duration,
    }

    score = schedule_service.score_slot(task_dict, body.proposed_start, user_id)
    accepted = score >= 0.5

    return SlotScoreResponse(
        task_id=body.task_id,
        proposed_start=body.proposed_start,
        score=score,
        accepted=accepted,
    )


@router.post("/accept")
def accept_slot(body: ScheduleRequest, user_id: UUID):
    result = schedule_service.accept_slot(
        user_id=user_id,
        task_id=body.task_id,
        proposed_start=body.scheduled_start,
        scheduled_end=body.scheduled_end,
    )
    return result


@router.post("/reject")
def reject_slot(body: BehaviorEventRequest, user_id: UUID):
    schedule_service.reject_slot(
        user_id=user_id,
        task_id=body.task_id,
        proposed_start=body.slot_offered,
    )
    return {"message": "slot rejected, logged"}


@router.get("/user/{user_id}")
def get_schedule(user_id: UUID):
    return schedule_service.get_schedule(user_id)
