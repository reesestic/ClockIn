from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from controllers.sticky_note_controller import router as sticky_note_router
from controllers.auth_controller import router as auth_router
from controllers.calendar_controller import router as calendar_router
from controllers.schedule_controller import router as schedule_router
from services.ml_service import MLService
from services.feature_discovery_service import FeatureDiscoveryService
from repositories.schedule_repository import ScheduleRepository

_ml = MLService()
_schedule_repo = ScheduleRepository()
_discovery = FeatureDiscoveryService(_schedule_repo)


def _recompute_all_users():
    """Recompute perceptron weights for every active user using time-decay."""
    user_ids = _schedule_repo.get_active_user_ids()
    for uid in user_ids:
        try:
            _ml.recompute_weights_from_history(uid, _schedule_repo)
        except Exception:
            pass


def _promote_latent_features():
    """Promote any latent key that has crossed the frequency threshold."""
    promoted = _discovery.check_and_promote()
    if promoted:
        print(f"[scheduler] Promoted {len(promoted)} latent feature(s): {promoted}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = AsyncIOScheduler()
    scheduler.add_job(_recompute_all_users,      "interval", seconds=86400, id="decay_recompute")
    scheduler.add_job(_promote_latent_features,  "interval", seconds=86400, id="feature_promotion")
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(lifespan=lifespan)

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
