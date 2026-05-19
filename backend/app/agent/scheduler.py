from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.agent.agent import run_agent_loop
from app.config import get_settings

scheduler = AsyncIOScheduler()


def start_scheduler() -> None:
    settings = get_settings()
    if not settings.enable_scheduler or scheduler.running:
        return

    scheduler.add_job(run_agent_loop, "interval", minutes=5, id="agent_loop", replace_existing=True)
    scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
