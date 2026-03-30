

from fastapi import APIRouter, Depends
from fastapi import Body
from constants.routes import TASKS
from dependencies.dependencies import task_service
from dependencies.auth import get_current_user

router = APIRouter(prefix=TASKS)

@router.get("")
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