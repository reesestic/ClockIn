

from fastapi import APIRouter, Depends
from fastapi import Body
from constants.routes import TASKS
from dependencies.dependencies import task_service
from dependencies.auth import get_current_user

router = APIRouter(prefix=TASKS)

@router.get("/")
def get_tasks(user=Depends(get_current_user)):
    user_id = user["id"]
    return task_service.get_tasks(user_id)


@router.delete("/delete/{task_id}")
def delete_task(task_id, user=Depends(get_current_user)):
    user_id = user["id"]
    return task_service.delete_task(task_id, user_id)

@router.post("/save")
def save_task(task_data: dict = Body(...), user=Depends(get_current_user)):
    user_id = user["id"]
    print('task:' + str(task_data))
    return task_service.create_task(task_data, user_id)

@router.patch("/update/{task_id}")
def update_task(task_id: str, task_data: dict = Body(...), user=Depends(get_current_user)):
    user_id = user["id"]
    return task_service.update_task(task_id, task_data, user_id)

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