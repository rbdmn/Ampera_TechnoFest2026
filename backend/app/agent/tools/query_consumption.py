from __future__ import annotations

from datetime import datetime

from sqlalchemy import select

from app.db.database import SessionLocal
from app.db.models import ConsumptionLog, Room


def query_consumption(room_id: str | None = None, limit: int = 48) -> dict:
    """Fetch latest consumption logs.

    If room_id is None, returns latest logs for all rooms (up to `limit` each).
    """

    db = SessionLocal()
    try:
        if room_id:
            stmt = (
                select(ConsumptionLog)
                .where(ConsumptionLog.room_id == room_id)
                .order_by(ConsumptionLog.timestamp.desc())
                .limit(limit)
            )
            logs = list(db.scalars(stmt).all())
            return {
                "room_id": room_id,
                "count": len(logs),
                "logs": [
                    {
                        "timestamp": l.timestamp.isoformat(),
                        "kwh_used": float(l.kwh_used),
                        "cumulative_kwh_month": float(l.cumulative_kwh_month),
                    }
                    for l in logs
                ],
            }

        rooms = list(db.scalars(select(Room.room_id)).all())
        out: dict[str, dict] = {}
        for rid in rooms:
            stmt = (
                select(ConsumptionLog)
                .where(ConsumptionLog.room_id == rid)
                .order_by(ConsumptionLog.timestamp.desc())
                .limit(limit)
            )
            logs = list(db.scalars(stmt).all())
            out[rid] = {
                "count": len(logs),
                "latest_timestamp": logs[0].timestamp.isoformat() if logs else None,
                "latest_kwh_used": float(logs[0].kwh_used) if logs else None,
            }

        return {"rooms": out, "as_of": datetime.utcnow().isoformat()}

    finally:
        db.close()
