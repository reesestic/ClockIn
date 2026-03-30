from fastapi import APIRouter, Depends
from constants.routes import TIMER
from dependencies.auth import get_current_user

from dependencies.dependencies import timer_service
from models.timer_model import TimerRequest

router = APIRouter(prefix=TIMER)

@router.post("")
def create_timer_session(req: TimerRequest, user=Depends(get_current_user)):
    # 🔥 For now just return — you'll add service/repo later

    session = timer_service.create_session(user["id"], req.dict())
    return {
            "message": "Timer session received",
            "user_id": user["id"],
            "data": session
        }