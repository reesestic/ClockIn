from fastapi import APIRouter, Depends
from constants.routes import PLANTS
from dependencies.auth import get_current_user
from dependencies.dependencies import plants_service

router = APIRouter(prefix=PLANTS)

@router.post("/grow")
async def grow_plant(body: dict, user=Depends(get_current_user)):
    active_seconds = body.get("active_seconds", 0)
    user_id = user["id"]
    return await plants_service.grow_plant(user_id, active_seconds)

@router.get("/active")
async def get_active_plant(user=Depends(get_current_user)):
    user_id = user["id"]
    return await plants_service.get_active_plant(user_id)