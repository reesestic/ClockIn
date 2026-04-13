from pydantic import BaseModel
from typing import Optional

class BusyTimeRequest(BaseModel):
    title: str
    start_time: Optional[str] = None   # "HH:MM:SS"
    end_time: Optional[str] = None
    days_of_week: list[str] = []       # ["MON", "WED", "FRI"]
    source: Optional[str] = "manual"
