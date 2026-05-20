from __future__ import annotations

from datetime import datetime

from app.db.database import SessionLocal
from app.db.models import AlertType
from app.services.alert_service import create_alert


def _parse_triggered_at(value: str | datetime | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    text = value.strip()
    if not text:
        return None
    return datetime.fromisoformat(text.replace("Z", "+00:00"))


def send_notification(
    room_id: str,
    message: str,
    alert_type: str = "usage_warning",
    triggered_at: str | datetime | None = None,
) -> dict[str, str]:
    db = SessionLocal()
    try:
        at = AlertType(alert_type)
        alert = create_alert(
            db,
            room_id=room_id,
            alert_type=at,
            message=message,
            triggered_at=_parse_triggered_at(triggered_at),
        )
        return {
            "status": "saved",
            "alert_id": alert.alert_id,
            "room_id": alert.room_id,
            "alert_type": alert.alert_type.value,
            "message": alert.message,
            "triggered_at": alert.triggered_at.isoformat(),
        }
    finally:
        db.close()
