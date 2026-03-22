from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from controllers.sticky_note_controller import router as sticky_note_router
from controllers.auth_controller import router as auth_router
from controllers.calendar_controller import router as calendar_router
from controllers.schedule_controller import router as schedule_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sticky_note_router)
app.include_router(auth_router)
app.include_router(calendar_router)
app.include_router(schedule_router)

@app.get("/")
def root():
    return {"message": "backend running"}
