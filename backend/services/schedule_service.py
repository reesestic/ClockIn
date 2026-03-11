# from fastapi import HTTPException
#
# from repositories.calendar_repository import CalendarRepository
# from services.calendar_service import CalendarService
# from database.database_models import ScheduleTaskResponse
#
#
# class ScheduleService:
#
#     def __init__(self):
#         self.repo = CalendarRepository()
#
#     def schedule_task(self, task_id, body):
#
#         task = self.repo.get_task_by_id(task_id)
#         if task is None:
#             raise HTTPException(status_code=404, detail="Task not found")
#
#         if not task.isSchedulable():
#             raise HTTPException(status_code=400, detail="Task is already complete")
#
#         missing = task.getMissingFields()
#         if missing:
#             raise HTTPException(
#                 status_code=422,
#                 detail=f"Task is missing required fields: {', '.join(missing)}",
#             )
#
#         cal_service = CalendarService(
#             oauth_token=body.oauth_token,
#             refresh_token=body.refresh_token,
#             user_id=body.user_id,
#         )
#
#         try:
#             slot = cal_service.findOpenSlot(task)
#         except ValueError as exc:
#             raise HTTPException(status_code=409, detail=str(exc))
#
#         try:
#             event_id = cal_service.createEvent(task, slot)
#         except Exception as exc:
#             raise HTTPException(
#                 status_code=502,
#                 detail=f"Google Calendar API error: {exc}",
#             )
#
#         self.repo.save_scheduled_event(task_id, event_id, slot)
#
#         return ScheduleTaskResponse(
#             task_id=task_id,
#             calendar_event_id=event_id,
#             scheduled_start=slot,
#         )