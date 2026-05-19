from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import AlertHistory, ConsumptionLog, MeterReading, Room, RoomOccupancy, User
from app.services.auth_service import get_current_user, require_admin

router = APIRouter()


def _parse_iso_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _month_range(now: datetime) -> tuple[datetime, datetime]:
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1)
    else:
        month_end = month_start.replace(month=month_start.month + 1)
    return month_start, month_end


def _status_from_usage(usage_kwh: float, limit_kwh: float) -> str:
    if limit_kwh <= 0:
        return "normal"
    ratio = usage_kwh / limit_kwh
    if ratio >= 1.0:
        return "exceeded"
    if ratio >= 0.8:
        return "warning"
    return "normal"


def _human_status(status: str) -> str:
    return {
        "normal": "Normal",
        "warning": "High Peak Detected",
        "exceeded": "Anomalous Usage",
    }.get(status, "Normal")


@router.get("/admin/overview")
def admin_overview(
    start: str | None = Query(default=None, description="ISO datetime, e.g. 2020-01-01T00:00:00Z"),
    end: str | None = Query(default=None, description="ISO datetime, e.g. 2020-01-08T00:00:00Z"),
    interval: str = Query(default="day", pattern="^(hour|day)$"),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    now = datetime.now(timezone.utc)
    start_dt = _parse_iso_datetime(start) if start else (now - timedelta(days=30))
    end_dt = _parse_iso_datetime(end) if end else now

    if interval == "hour":
        bucket_expr = func.date_trunc("hour", ConsumptionLog.timestamp)
    else:
        bucket_expr = func.date_trunc("day", ConsumptionLog.timestamp)

    total_rooms = db.scalar(select(func.count()).select_from(Room)) or 0

    # rooms with at least one active occupancy
    active_rooms = db.scalar(
        select(func.count(func.distinct(RoomOccupancy.room_id))).where(RoomOccupancy.end_at.is_(None))
    ) or 0

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

    # Estimated bill: usage * tariff_per_kwh (per-room tariff; use log join)
    estimated_bill = (
        db.scalar(
            select(func.coalesce(func.sum(ConsumptionLog.kwh_used * Room.tariff_per_kwh), 0.0))
            .select_from(ConsumptionLog)
            .join(Room, Room.room_id == ConsumptionLog.room_id)
            .where(ConsumptionLog.timestamp >= start_dt, ConsumptionLog.timestamp < end_dt)
        )
        or 0.0
    )

    active_alerts_count = db.scalar(select(func.count()).select_from(AlertHistory).where(AlertHistory.is_read.is_(False))) or 0

    # Top consumers (by month-to-date usage percentage)
    month_start, month_end = _month_range(now)
    top_rows = db.execute(
        select(
            Room.room_id,
            (func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0) / func.nullif(Room.monthly_limit_kwh, 0.0)).label(
                "usage_ratio"
            ),
        )
        .select_from(Room)
        .join(ConsumptionLog, ConsumptionLog.room_id == Room.room_id, isouter=True)
        .where(ConsumptionLog.timestamp >= month_start, ConsumptionLog.timestamp < month_end)
        .group_by(Room.room_id, Room.monthly_limit_kwh)
        .order_by(func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0).desc())
        .limit(5)
    ).all()

    top_consumers = [
        {
            "room_id": row.room_id,
            "usage_percentage": int(round(float(row.usage_ratio or 0.0) * 100)),
        }
        for row in top_rows
    ]

    series_rows = db.execute(
        select(
            bucket_expr.label("bucket"),
            func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0).label("kwh"),
            func.coalesce(func.max(ConsumptionLog.kwh_used), 0.0).label("peak_kwh"),
        )
        .where(
            ConsumptionLog.timestamp >= start_dt,
            ConsumptionLog.timestamp < end_dt,
        )
        .group_by("bucket")
        .order_by("bucket")
    ).all()

    # Peak demand approximation: max hourly kWh within bucket ~= kW (1h window)
    series = []
    for row in series_rows:
        peak_kw = float(row.peak_kwh)
        status = "normal"
        if peak_kw >= 5.0:
            status = "warning"
        if peak_kw >= 8.0:
            status = "exceeded"
        series.append(
            {
                "ts": row.bucket.isoformat(),
                "kwh": float(row.kwh),
                "peak_demand_kw": peak_kw,
                "status": _human_status(status),
            }
        )

    return {
        "range": {"start": start_dt.isoformat(), "end": end_dt.isoformat(), "interval": interval},
        "totals": {
            "kwh": float(total_kwh),
            "estimated_bill": float(estimated_bill),
            "active_rooms": int(active_rooms),
            "total_rooms": int(total_rooms),
            "users": int(users_count),
            "active_alerts_count": int(active_alerts_count),
        },
        "top_consumers": top_consumers,
        "series": series,
    }


@router.get("/user/overview")
def user_overview(
    email: str | None = Query(default=None, description="User email (admin only: query any user)."),
    start: str | None = Query(default=None, description="ISO datetime"),
    end: str | None = Query(default=None, description="ISO datetime"),
    interval: str = Query(default="day", pattern="^(hour|day)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    # Admin can query any user by email; regular user always gets their own data.
    if current_user.role.value == "admin" and email:
        user = db.scalar(select(User).where(User.email == email))
    else:
        user = current_user
    if not user or not user.is_active:
        return {"error": "user_not_found"}

    room_id = user.room_id
    if not room_id:
        return {
            "user": {"user_id": user.user_id, "email": user.email, "role": user.role.value},
            "room": None,
            "range": None,
            "totals": None,
            "settings": None,
            "projection": None,
            "series": [],
            "latest_meter_reading": None,
        }

    room = db.get(Room, room_id)

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

    rate = float(room.tariff_per_kwh) if room else 0.0
    limit = float(room.monthly_limit_kwh) if room else 0.0
    bill = float(total_kwh) * rate

    # Projection: simple linear projection based on current month daily average
    month_start, month_end = _month_range(now)
    mtd_kwh = (
        db.scalar(
            select(func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0)).where(
                ConsumptionLog.room_id == room_id,
                ConsumptionLog.timestamp >= month_start,
                ConsumptionLog.timestamp < now,
            )
        )
        or 0.0
    )
    days_passed = max((now.date() - month_start.date()).days + 1, 1)
    total_days = max((month_end.date() - month_start.date()).days, 1)
    projected_kwh = float(mtd_kwh) / days_passed * total_days
    projected_bill = projected_kwh * rate

    series_rows = db.execute(
        select(
            bucket_expr.label("bucket"),
            func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0).label("kwh"),
            func.coalesce(func.max(ConsumptionLog.kwh_used), 0.0).label("peak_kwh"),
        )
        .where(
            ConsumptionLog.room_id == room_id,
            ConsumptionLog.timestamp >= start_dt,
            ConsumptionLog.timestamp < end_dt,
        )
        .group_by("bucket")
        .order_by("bucket")
    ).all()

    series = []
    for row in series_rows:
        peak_kw = float(row.peak_kwh)
        status_key = "normal"
        if limit > 0 and float(row.kwh) / limit >= 0.8:
            status_key = "warning"
        if limit > 0 and float(row.kwh) / limit >= 1.0:
            status_key = "exceeded"

        series.append(
            {
                "ts": row.bucket.isoformat(),
                "kwh": float(row.kwh),
                "peak_demand_kw": peak_kw,
                "status": _human_status(status_key),
            }
        )

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
        "user": {
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role.value,
            "full_name": user.full_name,
            "profile_photo_url": getattr(user, "profile_photo_url", None),
        },
        "room": {
            "room_id": room_id,
            "tenant_name": room.tenant_name if room else None,
        },
        "range": {"start": start_dt.isoformat(), "end": end_dt.isoformat(), "interval": interval},
        "totals": {"kwh": float(total_kwh), "bill": float(bill)},
        "settings": {"rate_per_kwh": float(rate), "monthly_limit_kwh": float(limit)},
        "projection": {"projected_kwh": float(projected_kwh), "projected_bill": float(projected_bill)},
        "series": series,
        "latest_meter_reading": latest_reading_payload,
    }
