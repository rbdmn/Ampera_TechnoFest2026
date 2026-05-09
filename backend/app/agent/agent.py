from __future__ import annotations

from app.agent.prompts import AGENT_SYSTEM_PROMPT
from app.agent.tools.analyze_pattern import analyze_pattern
from app.agent.tools.query_consumption import query_consumption
from app.agent.tools.send_notification import send_notification
from app.db.database import SessionLocal
from app.db.models import Room


async def chat_with_agent(message: str) -> str:
    """Development-mode chat: returns basic stats from DB if available."""
    _ = AGENT_SYSTEM_PROMPT

    try:
        stats = query_consumption(room_id=None, limit=24)
        rooms = stats.get("rooms", {})
        return (
            "Ampera AI (dev) connected. "
            f"Rooms={len(rooms)}. "
            f"Message='{message}'"
        )
    except Exception:
        return "Ampera AI (dev) ready. DB not configured yet."


async def run_agent_loop() -> None:
    """Scheduled observe-think-act: detect anomalies and write alerts."""
    db = SessionLocal()
    try:
        room_ids = [r.room_id for r in db.query(Room.room_id).all()]
    finally:
        db.close()

    for rid in room_ids:
        try:
            result = analyze_pattern(room_id=rid)
            if result.get("is_anomaly"):
                msg = (
                    "Terdeteksi anomali konsumsi listrik. "
                    f"kWh terbaru={result.get('latest_kwh'):.3f}, "
                    f"baseline mean={result.get('mean_kwh'):.3f}, z={result.get('z'):.2f}."
                )
                send_notification(room_id=rid, message=msg, alert_type="anomaly")
        except Exception:
            # keep loop resilient for demo
            continue

    return None
