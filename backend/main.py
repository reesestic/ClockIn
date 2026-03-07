from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from controllers import sticky_note_controller

app = FastAPI()

# Only allows FASTAPI to take requests from these frontends (security)
# If new domains are deployed, update this list
origins = [
    "http://localhost:5173",
    "https://clock-in-orcin.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sticky_note_controller.router)