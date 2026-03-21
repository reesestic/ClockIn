from fastapi import APIRouter, HTTPException
from database.supabase_client import supabase
from models.auth_model import LoginRequest, SignupRequest, AuthResponse

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })
        return AuthResponse(
            access_token=res.session.access_token,
            user_id=res.user.id,
            email=res.user.email
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid email or password")


@router.post("/signup")
def signup(payload: SignupRequest):
    try:
        supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
            "options": {"data": {"username": payload.username}}
        })
        return {"message": "Account created! Check your email to confirm."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
