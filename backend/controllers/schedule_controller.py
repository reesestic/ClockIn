# from uuid import UUID
# from fastapi import APIRouter
#
# from database.database_models import ScheduleTaskRequest, ScheduleTaskResponse
# from services.schedule_service import ScheduleService
#
# router = APIRouter(prefix="/schedule", tags=["schedule"])
#
# schedule_service = ScheduleService()
#
# @router.post("/{task_id}", response_model=ScheduleTaskResponse)
# def schedule_task(task_id: UUID, body: ScheduleTaskRequest):
#     return schedule_service.schedule_task(task_id, body)