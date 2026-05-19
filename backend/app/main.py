from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agent.scheduler import start_scheduler
from app.api import agent
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
from app.api import alerts, auth, billing, consumption, occupancies, rooms, tenants  # noqa: E402
from app.api import billing_admin, dashboard, rooms_admin  # noqa: E402

app.include_router(auth.router, prefix="/auth", tags=["auth"])
# Register admin/static room endpoints first to avoid /{room_id} catching /table, /summary, etc.
app.include_router(rooms_admin.router, prefix="/rooms", tags=["rooms"])
app.include_router(rooms.router, prefix="/rooms", tags=["rooms"])
app.include_router(tenants.router, prefix="/tenants", tags=["tenants"])
app.include_router(occupancies.router, prefix="/occupancies", tags=["occupancies"])
app.include_router(consumption.router, prefix="/consumption", tags=["consumption"])
app.include_router(billing.router, prefix="/billing", tags=["billing"])
app.include_router(billing_admin.router, prefix="/billing", tags=["billing"])
app.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
app.include_router(agent.router, prefix="/agent", tags=["agent"])


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Ampera AI API is running"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
async def startup() -> None:
    # Create tables (simple MVP; replace with Alembic later)
    try:
        from app.db.init_db import init_db  # noqa: E402

        init_db()
    except Exception:
        # Avoid blocking boot in demo if DB isn't configured yet
        pass

    start_scheduler()
