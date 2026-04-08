from fastapi import APIRouter, Depends
from constants.routes import GOOGLE
from dependencies.auth import get_current_user
from dependencies.dependencies import google_service
from fastapi.responses import RedirectResponse

router = APIRouter(prefix=GOOGLE)


@router.get("/login")
def google_login(user_id: str):  # no auth dependency
    url = google_service.get_auth_url(user_id)["url"]
    return RedirectResponse(url)


@router.get("/callback")
def google_callback(code: str, state: str):
    google_service.handle_callback(code, state)
    # Its hardcoded girl watch out!
    return RedirectResponse("http://localhost:5173/availability")


@router.post("/sync")
def sync_google(user=Depends(get_current_user)):
    return google_service.sync_calendar(user["id"])


@router.post("/disconnect")
def disconnect_google(user=Depends(get_current_user)):
    return google_service.disconnect(user["id"])


@router.get("/status")
def google_status(user=Depends(get_current_user)):
    return google_service.get_status(user["id"])