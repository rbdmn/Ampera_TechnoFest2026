from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import AlertHistory, User
from app.schemas.alert import AlertOut
from app.services.auth_service import get_current_user

router = APIRouter()


def _parse_iso_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@router.get("/")
def get_alerts(
    room_id: str | None = Query(default=None),
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
    type: str = Query(default="all", description="alert|insight|system|all"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    # Regular user can only see alerts for their own room.
    if current_user.role.value != "admin" and current_user.room_id:
        room_id = current_user.room_id
    # Map UI type -> our AlertType strings (MVP fallback)
    type_map = {
        "alert": {"usage_warning", "limit_exceeded"},
        "insight": {"anomaly"},
        "system": set(),
        "all": None,
    }

    start_dt = _parse_iso_datetime(start) if start else None
    end_dt = _parse_iso_datetime(end) if end else None

    stmt = select(AlertHistory)
    if room_id:
        stmt = stmt.where(AlertHistory.room_id == room_id)
    if start_dt:
        stmt = stmt.where(AlertHistory.triggered_at >= start_dt)
    if end_dt:
        stmt = stmt.where(AlertHistory.triggered_at < end_dt)

    allowed = type_map.get(type, None)
    if allowed is not None and allowed:
        stmt = stmt.where(AlertHistory.alert_type.in_(list(allowed)))

    total_items = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    unread_count = (
        db.scalar(select(func.count()).select_from(AlertHistory).where(AlertHistory.is_read.is_(False))) or 0
    )

    offset = (page - 1) * limit
    rows = list(db.scalars(stmt.order_by(AlertHistory.triggered_at.desc()).offset(offset).limit(limit)).all())

    data = [AlertOut.model_validate(r).model_dump() for r in rows]

    return {
        "data": data,
        "meta": {
            "total_items": int(total_items),
            "unread_count": int(unread_count),
            "current_page": int(page),
        },
    }


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    unread = db.scalar(select(func.count()).select_from(AlertHistory).where(AlertHistory.is_read.is_(False))) or 0
    return {"unread_count": int(unread)}


@router.get("/notifications")
def list_notifications(
    email: str | None = Query(default=None, description="User email (optional for demo fallback)."),
    type: str = Query(default="all", description="alert|insight|system|all"),
    unread_only: bool = Query(default=False),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    """User-facing notifications.

    Backed by AlertHistory. We map:
    - alert: usage_warning, limit_exceeded
    - insight: anomaly
    - system: (none for now)

    If email is provided, we scope to the user's room_id.
    """

    # demo fallback: if email missing, don't scope by room (show all)
    room_id = None
    if email:
        user = db.scalar(select(User).where(User.email == email))
        if user and user.is_active and user.room_id:
            room_id = user.room_id

    type_map = {
        "alert": {"usage_warning", "limit_exceeded"},
        "insight": {"anomaly"},
        "system": set(),
        "all": None,
    }

    stmt = select(AlertHistory)
    if room_id:
        stmt = stmt.where(AlertHistory.room_id == room_id)

    allowed = type_map.get(type, None)
    if allowed is not None and allowed:
        stmt = stmt.where(AlertHistory.alert_type.in_(list(allowed)))

    if unread_only:
        stmt = stmt.where(AlertHistory.is_read.is_(False))

    total_items = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    unread_count = db.scalar(
        select(func.count()).select_from(AlertHistory)
        .where(AlertHistory.is_read.is_(False))
        .where(AlertHistory.room_id == room_id) if room_id else select(func.count()).select_from(AlertHistory).where(AlertHistory.is_read.is_(False))
    ) or 0

    offset = (page - 1) * limit
    rows = list(db.scalars(stmt.order_by(AlertHistory.triggered_at.desc()).offset(offset).limit(limit)).all())

    data = [AlertOut.model_validate(r).model_dump() for r in rows]
    return {
        "data": data,
        "meta": {
            "total_items": int(total_items),
            "unread_count": int(unread_count),
            "current_page": int(page),
        },
    }


@router.post("/notifications/mark-all-read")
def mark_all_notifications_read(
    email: str | None = Query(default=None, description="User email (optional for demo fallback)."),
    db: Session = Depends(get_db),
) -> dict:
    room_id = None
    if email:
        user = db.scalar(select(User).where(User.email == email))
        if user and user.is_active and user.room_id:
            room_id = user.room_id

    stmt = select(AlertHistory).where(AlertHistory.is_read.is_(False))
    if room_id:
        stmt = stmt.where(AlertHistory.room_id == room_id)

    rows = list(db.scalars(stmt).all())
    for r in rows:
        r.is_read = True

    db.commit()

    return {"updated": len(rows)}


@router.post("/notifications/{alert_id}/read")
def mark_notification_read(alert_id: str, db: Session = Depends(get_db)) -> dict:
    alert = db.get(AlertHistory, alert_id)
    if not alert:
        return {"error": "notification_not_found"}

    alert.is_read = True
    db.commit()

    return {"alert_id": alert.alert_id, "is_read": True}


@router.get("/feedback")
def list_admin_feedback(
    email: str | None = Query(default=None, description="User email (optional for demo fallback)."),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    """MVP: reuse AlertHistory as a "message" stream.

    We treat alert_type=anomaly as feedback for now.
    (Can be replaced with a dedicated messages table later.)
    """

    room_id = None
    if email:
        user = db.scalar(select(User).where(User.email == email))
        if user and user.is_active and user.room_id:
            room_id = user.room_id

    stmt = select(AlertHistory).where(AlertHistory.alert_type == "anomaly")
    if room_id:
        stmt = stmt.where(AlertHistory.room_id == room_id)

    total_items = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    offset = (page - 1) * limit
    rows = list(db.scalars(stmt.order_by(AlertHistory.triggered_at.desc()).offset(offset).limit(limit)).all())

    data = [AlertOut.model_validate(r).model_dump() for r in rows]

    return {"data": data, "meta": {"total_items": int(total_items), "current_page": int(page)}}
