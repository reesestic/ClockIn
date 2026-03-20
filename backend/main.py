from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase_client import supabase
from controllers.calendar_controller import router as calendar_router
from controllers.sticky_note_controller import router as sticky_note_router

app = FastAPI()
app.include_router(calendar_router)

# Only allows FASTAPI to take requests from these frontends (security)
# If new domains are deployed, update this list
# origins = [
#     "http://localhost:5173",
#     "https://clock-in-orcin.vercel.app"
# ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sticky_note_router)
