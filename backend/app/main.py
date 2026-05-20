from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.agent.agent import configure_agent_console_logging
from app.agent.scheduler import start_scheduler, stop_scheduler
from app.api import agent
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files (e.g., profile photos)
Path(settings.uploads_dir).mkdir(parents=True, exist_ok=True)
app.mount(settings.uploads_public_path, StaticFiles(directory=settings.uploads_dir), name="static")

# --- Routers ---
from app.api import alerts, auth, billing, consumption, occupancies, rooms, tenants  # noqa: E402
from app.api import billing_admin, dashboard, rooms_admin  # noqa: E402
from app.api import reports  # noqa: E402

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
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(agent.router, prefix="/agent", tags=["agent"])


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Ampera AI API is running"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
async def startup() -> None:
    configure_agent_console_logging()
    # Create tables (simple MVP; replace with Alembic later)
    try:
        from app.db.init_db import init_db  # noqa: E402

        init_db()
    except Exception:
        # Avoid blocking boot in demo if DB isn't configured yet
        pass

    start_scheduler()


@app.on_event("shutdown")
async def shutdown() -> None:
    stop_scheduler()
