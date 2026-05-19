from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ConsumptionLog, MeterReading, Room, User

router = APIRouter()


def _parse_iso_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@router.get("/admin/overview")
def admin_overview(
    start: str | None = Query(default=None, description="ISO datetime, e.g. 2020-01-01T00:00:00Z"),
    end: str | None = Query(default=None, description="ISO datetime, e.g. 2020-01-08T00:00:00Z"),
    interval: str = Query(default="day", pattern="^(hour|day)$"),
    db: Session = Depends(get_db),
) -> dict:
    """Admin dashboard core data.

    Returns:
    - totals (rooms/users/kwh)
    - time-series consumption for charting
    """
    now = datetime.now(timezone.utc)
    start_dt = _parse_iso_datetime(start) if start else (now - timedelta(days=30))
    end_dt = _parse_iso_datetime(end) if end else now

    if interval == "hour":
        bucket_expr = func.date_trunc("hour", ConsumptionLog.timestamp)
    else:
        bucket_expr = func.date_trunc("day", ConsumptionLog.timestamp)

    rooms_count = db.scalar(select(func.count()).select_from(Room)) or 0
    users_count = db.scalar(select(func.count()).select_from(User)) or 0

    total_kwh = (
        db.scalar(
            select(func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0)).where(
                ConsumptionLog.timestamp >= start_dt,
                ConsumptionLog.timestamp < end_dt,
            )
        )
        or 0.0
    )

    series_rows = db.execute(
        select(
            bucket_expr.label("bucket"),
            func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0).label("kwh"),
        )
        .where(
            ConsumptionLog.timestamp >= start_dt,
            ConsumptionLog.timestamp < end_dt,
        )
        .group_by("bucket")
        .order_by("bucket")
    ).all()

    series = [{"ts": row.bucket.isoformat(), "kwh": float(row.kwh)} for row in series_rows]

    return {
        "range": {"start": start_dt.isoformat(), "end": end_dt.isoformat(), "interval": interval},
        "totals": {"rooms": int(rooms_count), "users": int(users_count), "kwh": float(total_kwh)},
        "series": series,
    }


@router.get("/user/overview")
def user_overview(
    email: str = Query(..., description="User email (MVP auth: passed by frontend)."),
    start: str | None = Query(default=None, description="ISO datetime"),
    end: str | None = Query(default=None, description="ISO datetime"),
    interval: str = Query(default="day", pattern="^(hour|day)$"),
    db: Session = Depends(get_db),
) -> dict:
    """User dashboard core data (per account).

    MVP: identifies user by email query param (until JWT/claims are implemented).
    """

    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.is_active:
        return {"error": "user_not_found"}

    room_id = user.room_id
    if not room_id:
        return {
            "user": {"user_id": user.user_id, "email": user.email, "role": user.role.value},
            "room": None,
            "range": None,
            "totals": None,
            "series": [],
            "latest_meter_reading": None,
        }

    now = datetime.now(timezone.utc)
    start_dt = _parse_iso_datetime(start) if start else (now - timedelta(days=30))
    end_dt = _parse_iso_datetime(end) if end else now

    if interval == "hour":
        bucket_expr = func.date_trunc("hour", ConsumptionLog.timestamp)
    else:
        bucket_expr = func.date_trunc("day", ConsumptionLog.timestamp)

    total_kwh = (
        db.scalar(
            select(func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0)).where(
                ConsumptionLog.room_id == room_id,
                ConsumptionLog.timestamp >= start_dt,
                ConsumptionLog.timestamp < end_dt,
            )
        )
        or 0.0
    )

    series_rows = db.execute(
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
    series = [{"ts": row.bucket.isoformat(), "kwh": float(row.kwh)} for row in series_rows]

    latest_reading = db.scalar(
        select(MeterReading)
        .where(MeterReading.room_id == room_id)
        .order_by(MeterReading.reading_period_end.desc())
        .limit(1)
    )

    latest_reading_payload = None
    if latest_reading:
        latest_reading_payload = {
            "reading_id": latest_reading.reading_id,
            "room_id": latest_reading.room_id,
            "reading_value_kwh": float(latest_reading.reading_value_kwh),
            "usage_delta_kwh": float(latest_reading.usage_delta_kwh),
            "period_start": latest_reading.reading_period_start.isoformat(),
            "period_end": latest_reading.reading_period_end.isoformat(),
            "source": latest_reading.source.value,
            "verification_status": latest_reading.verification_status.value,
        }

    return {
        "user": {"user_id": user.user_id, "email": user.email, "role": user.role.value},
        "room": {"room_id": room_id},
        "range": {"start": start_dt.isoformat(), "end": end_dt.isoformat(), "interval": interval},
        "totals": {"kwh": float(total_kwh)},
        "series": series,
        "latest_meter_reading": latest_reading_payload,
    }
