from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ConsumptionLog
from app.schemas.consumption import ConsumptionLogOut, ConsumptionSummaryOut
from app.services.consumption_service import get_latest_logs, get_summary_month

router = APIRouter()


def _parse_iso_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@router.get("/summary", response_model=ConsumptionSummaryOut)
def summary(db: Session = Depends(get_db)) -> ConsumptionSummaryOut:
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1)
    else:
        month_end = month_start.replace(month=month_start.month + 1)

    total = get_summary_month(db, month_start, month_end)
    return ConsumptionSummaryOut(total_kwh_month=total, rooms_count=0)


@router.get("/rooms/{room_id}", response_model=list[ConsumptionLogOut])
def latest_for_room(room_id: str, db: Session = Depends(get_db)) -> list[ConsumptionLogOut]:
    logs = get_latest_logs(db, room_id)
    return logs


@router.get("/rooms/{room_id}")
def consumption_for_room(
    room_id: str,
    start: str | None = Query(default=None, description="ISO datetime"),
    end: str | None = Query(default=None, description="ISO datetime"),
    interval: str = Query(default="hour", pattern="^(hour|day)$"),
    db: Session = Depends(get_db),
) -> dict:
    now = datetime.now(timezone.utc)
    start_dt = _parse_iso_datetime(start) if start else (now - timedelta(hours=24) if interval == "hour" else now - timedelta(days=30))
    end_dt = _parse_iso_datetime(end) if end else now

    bucket_expr = func.date_trunc("hour" if interval == "hour" else "day", ConsumptionLog.timestamp)

    rows = db.execute(
        select(
            bucket_expr.label("bucket"),
            func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0).label("kwh"),
        )
        .where(
            ConsumptionLog.room_id == room_id,
            ConsumptionLog.timestamp >= start_dt,
            ConsumptionLog.timestamp < end_dt,
        )
        .group_by("bucket")
        .order_by("bucket")
    ).all()

    series = [{"ts": r.bucket.isoformat(), "kwh": float(r.kwh)} for r in rows]
    return {"room_id": room_id, "range": {"start": start_dt.isoformat(), "end": end_dt.isoformat(), "interval": interval}, "series": series}
