from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import ConsumptionLog


def get_latest_logs(db: Session, room_id: str, limit: int = 50) -> list[ConsumptionLog]:
    stmt = (
        select(ConsumptionLog)
        .where(ConsumptionLog.room_id == room_id)
        .order_by(ConsumptionLog.timestamp.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt).all())


def get_summary_month(db: Session, month_start: datetime, month_end: datetime) -> float:
    stmt = select(func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0)).where(
        ConsumptionLog.timestamp >= month_start,
        ConsumptionLog.timestamp < month_end,
    )
    return float(db.scalar(stmt) or 0.0)
