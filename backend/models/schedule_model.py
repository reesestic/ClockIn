from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class SlotScoreRequest(BaseModel):
    task_id: UUID
    proposed_start: datetime


class SlotScoreResponse(BaseModel):
    task_id: UUID
    proposed_start: datetime
    score: float
    accepted: bool


class BehaviorEventRequest(BaseModel):
    task_id: UUID
    slot_offered: datetime
    action: str  # "accepted", "rescheduled", "ignored"


class ScheduleRequest(BaseModel):
    task_id: UUID
    scheduled_start: datetime
    scheduled_end: datetime


class ScheduleResponse(BaseModel):
    id: UUID
    task_id: UUID
    scheduled_start: datetime
    scheduled_end: datetime
    created_at: datetime
