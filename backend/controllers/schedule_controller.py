from uuid import UUID
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone

from models.schedule_model import SlotScoreRequest, SlotScoreResponse, BehaviorEventRequest, ScheduleRequest, ScheduleResponse, AutoScheduleRequest, AutoScheduleResponse, GenerateScheduleRequest
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
async def accept_slot(body: ScheduleRequest, user_id: UUID):
    # Find the most recently rejected slot for this task (the "original" before correction)
    rejected_slot = schedule_service.get_last_rejected_slot(user_id, body.task_id)

    result = schedule_service.accept_slot(
        user_id=user_id,
        task_id=body.task_id,
        proposed_start=body.scheduled_start,
        scheduled_end=body.scheduled_end,
    )

    # Full pipeline: OpenAI → FeatureValidator → perceptron update (fire-and-forget on error)
    if rejected_slot is not None:
        try:
            await schedule_service.process_slot_correction(
                user_id, body.task_id, rejected_slot, body.scheduled_start
            )
        except Exception:
            pass  # never block the accept response

    return result


@router.post("/reject")
def reject_slot(body: BehaviorEventRequest, user_id: UUID):
    schedule_service.reject_slot(
        user_id=user_id,
        task_id=body.task_id,
        proposed_start=body.slot_offered,
    )
    return {"message": "slot rejected, logged"}


@router.post("/auto", response_model=AutoScheduleResponse)
def auto_schedule(body: AutoScheduleRequest, user_id: UUID):
    task = task_repo.get_task_by_id(body.task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    task_dict = {
        "priority": task.priority,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "task_duration": task.task_duration,
    }

    try:
        result = schedule_service.find_best_slot(task_dict, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return AutoScheduleResponse(
        task_id=body.task_id,
        best_slot=result["best_slot"],
        score=result["score"],
        accepted=result["accepted"],
    )


@router.post("/generate")
def generate_schedule(body: GenerateScheduleRequest, user_id: UUID):
    if not body.task_ids:
        raise HTTPException(status_code=400, detail="No tasks selected")
    try:
        result = schedule_service.build_schedule(str(user_id), body.task_ids, body.filters)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result


@router.get("/user/{user_id}")
def get_schedule(user_id: UUID):
    return schedule_service.get_schedule(user_id)
