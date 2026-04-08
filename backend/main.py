from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from controllers.sticky_note_controller import router as sticky_note_router
from controllers.task_controller import router as task_router
from controllers.auth_controller import router as auth_router
from controllers.schedule_controller import router as schedule_router
from controllers.timer_controller import router as timer_router
from controllers.busy_times_controller import router as busy_times_router
from controllers.stats_controller import router as stats_router
from controllers.google_controller import router as google_router
from controllers.plants_controller import router as plants_router


# For daily gcal sync
import threading
import time
from database.supabase_client import supabase
from dependencies.dependencies import google_service


app = FastAPI()

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
app.include_router(task_router)
app.include_router(auth_router)
app.include_router(schedule_router)
app.include_router(timer_router)
app.include_router(busy_times_router)
app.include_router(stats_router)
app.include_router(google_router)
app.include_router(plants_router)

def daily_sync_job():
    while True:
        time.sleep(86400)  # 24 hours
        try:
            res = supabase.table("GoogleTokens").select("user_id").execute()
            for row in res.data:
                try:
                    google_service.sync_calendar(row["user_id"])
                except Exception as e:
                    print(f"Sync failed for {row['user_id']}: {e}")
        except Exception as e:
            print(f"Daily sync job error: {e}")

sync_thread = threading.Thread(target=daily_sync_job, daemon=True)
sync_thread.start()



