from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class GenerateScheduleRequest(BaseModel):
    taskIds: List[str]
    filters: Optional[Dict[str, Any]] = {}
    userId: Optional[str] = None  # TEMP (remove when auth added)