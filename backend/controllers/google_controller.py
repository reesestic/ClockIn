from fastapi import APIRouter, Depends
from constants.routes import GOOGLE
from dependencies.auth import get_current_user
from dependencies.dependencies import google_service
from fastapi.responses import RedirectResponse
import os

router = APIRouter(prefix=GOOGLE)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


@router.get("/login")
def google_login(user_id: str):
    url = google_service.get_auth_url(user_id)["url"]
    return RedirectResponse(url)


@router.get("/callback")
def google_callback(code: str, state: str):
    google_service.handle_callback(code, state)
    return RedirectResponse(f"{FRONTEND_URL}/availability")


@router.post("/sync")
def sync_google(user=Depends(get_current_user)):
    return google_service.sync_calendar(user["id"])


@router.post("/disconnect")
def disconnect_google(user=Depends(get_current_user)):
    return google_service.disconnect(user["id"])


@router.get("/status")
def google_status(user=Depends(get_current_user)):
    return google_service.get_status(user["id"])
