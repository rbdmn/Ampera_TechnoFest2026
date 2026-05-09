from __future__ import annotations

from app.db.database import SessionLocal
from app.db.models import AlertType
from app.services.alert_service import create_alert


def send_notification(room_id: str, message: str, alert_type: str = "usage_warning") -> dict[str, str]:
    db = SessionLocal()
    try:
        at = AlertType(alert_type)
        alert = create_alert(db, room_id=room_id, alert_type=at, message=message)
        return {"status": "saved", "alert_id": alert.alert_id}
    finally:
        db.close()
