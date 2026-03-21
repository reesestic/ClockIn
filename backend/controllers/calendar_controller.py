from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from auth import get_current_user_id
from database.database_models import (
    TaskCreateRequest,
    TaskResponse,
    TaskUpdateRequest,
)
from repositories.calendar_repository import CalendarRepository

router = APIRouter(prefix="/calendar", tags=["calendar"])
repo = CalendarRepository()


def _task_to_response(task) -> TaskResponse:
    return TaskResponse(
        id=task.id,
        user_id=task.user_id,
        created_at=task.created_at,
        title=task.title,
        description=task.description,
        task_duration=task.task_duration,
        priority=task.priority,
        due_date=task.due_date,
        can_schedule=task.can_schedule,
        is_complete=task.is_complete,
    )


@router.get("/tasks/user/me", response_model=list[TaskResponse])
def get_my_tasks(user_id: str = Depends(get_current_user_id)):
    tasks = repo.get_tasks_by_user(user_id)
    return [_task_to_response(t) for t in tasks]


@router.post("/tasks", response_model=TaskResponse, status_code=201)
def create_task(payload: TaskCreateRequest, user_id: str = Depends(get_current_user_id)):
    task = repo.create_task(payload, user_id)
    return _task_to_response(task)


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(task_id: UUID, user_id: str = Depends(get_current_user_id)):
    task = repo.get_task_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_to_response(task)


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: UUID, payload: TaskUpdateRequest, user_id: str = Depends(get_current_user_id)):
    task = repo.get_task_by_id(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    updated = repo.update_task(task_id, payload)
    return _task_to_response(updated)


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: UUID, user_id: str = Depends(get_current_user_id)):
    deleted = repo.delete_task(task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
