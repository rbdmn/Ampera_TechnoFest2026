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

app.include_router(agent.router, prefix="/agent", tags=["agent"])


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Ampera AI API is running"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
async def startup() -> None:
    start_scheduler()
