# from uuid import UUID
#
# from fastapi import APIRouter, HTTPException
#
# from database.database_models import (
#     TaskCreateRequest,
#     TaskResponse,
#     TaskUpdateRequest,
# )
#
# from repositories.calendar_repository import CalendarRepository
#
# router = APIRouter(prefix="/tasks", tags=["tasks"])
#
#
# @router.post("/tasks", response_model=TaskResponse, status_code=201)
# def create_task(payload: TaskCreateRequest):
#     task = repo.create_task(payload)
#     return _task_to_response(task)
#
#
# @router.get("/tasks/{task_id}", response_model=TaskResponse)
# def get_task(task_id: UUID):
#     task = repo.get_task_by_id(task_id)
#     if task is None:
#         raise HTTPException(status_code=404, detail="Task not found")
#     return _task_to_response(task)
#
#
# @router.get("/tasks/user/{user_id}", response_model=list[TaskResponse])
# def get_tasks_for_user(user_id: UUID):
#     tasks = repo.get_tasks_by_user(user_id)
#     return [_task_to_response(t) for t in tasks]
#
#
# @router.patch("/tasks/{task_id}", response_model=TaskResponse)
# def update_task(task_id: UUID, payload: TaskUpdateRequest):
#     task = repo.get_task_by_id(task_id)
#     if task is None:
#         raise HTTPException(status_code=404, detail="Task not found")
#     updated = repo.update_task(task_id, payload)
#     return _task_to_response(updated)
#
#
# @router.delete("/tasks/{task_id}", status_code=204)
# def delete_task(task_id: UUID):
#     deleted = repo.delete_task(task_id)
#     if not deleted:
#         raise HTTPException(status_code=404, detail="Task not found")