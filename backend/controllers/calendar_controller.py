from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException

from database.database_models import (
    ScheduleTaskRequest,
    ScheduleTaskResponse,
    TaskCreateRequest,
    TaskResponse,
    TaskUpdateRequest,
)
from repositories.calendar_repository import CalendarRepository
from services.calendar_service import CalendarService

router = APIRouter(prefix="/calendar", tags=["calendar"])
repo = CalendarRepository()


def _task_to_response(task) -> TaskResponse:
    return TaskResponse(
        task_id=task.task_id,
        title=task.title,
        description=task.description,
        due_date=task.due_date,
        task_duration=task.task_duration,
        priority=task.priority,
        is_complete=task.is_complete,
        calendar_event_id=task.calendar_event_id,
        scheduled_start=task.scheduled_start,
        source_note_id=task.source_note_id,
    )


# CRUD Endpoints

@router.post("/tasks", response_model=TaskResponse, status_code=201)
def create_task(payload: TaskCreateRequest):
    task = repo.create_task(payload)
    return _task_to_response(task)


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: UUID):
    task = repo.get_task_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_to_response(task)


@router.get("/tasks/user/{user_id}", response_model=list[TaskResponse])
def get_tasks_for_user(user_id: str):
    tasks = repo.get_tasks_by_user(user_id)
    return [_task_to_response(t) for t in tasks]


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: UUID, payload: TaskUpdateRequest):
    task = repo.get_task_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    updated = repo.update_task(task_id, payload)
    return _task_to_response(updated)


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: UUID):
    deleted = repo.delete_task(task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")


# Schedule Endpoint

@router.post("/schedule/{task_id}", response_model=ScheduleTaskResponse)
def schedule_task(task_id: UUID, body: ScheduleTaskRequest):
    # load task
    task = repo.get_task_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    # validate schedulability
    if not task.isSchedulable():
        raise HTTPException(status_code=400, detail="Task is already complete")

    missing = task.getMissingFields()
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Task is missing required fields: {', '.join(missing)}",
        )

    # instantiate calendar service
    cal_service = CalendarService(
        oauth_token=body.oauth_token,
        refresh_token=body.refresh_token,
        user_id=body.user_id,
    )

    # find open slot
    try:
        slot = cal_service.findOpenSlot(task)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    # create Google Calendar event
    try:
        event_id = cal_service.createEvent(task, slot)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Google Calendar API error: {exc}",
        )

    # go back to Supabase
    repo.save_scheduled_event(task_id, event_id, slot)

    # return response
    return ScheduleTaskResponse(
        task_id=task_id,
        calendar_event_id=event_id,
        scheduled_start=slot,
    )
