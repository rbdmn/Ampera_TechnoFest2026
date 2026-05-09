from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import AlertHistory, AlertType


def create_alert(db: Session, room_id: str, alert_type: AlertType, message: str) -> AlertHistory:
    alert = AlertHistory(room_id=room_id, alert_type=alert_type, message=message)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def list_alerts(db: Session, limit: int = 100) -> list[AlertHistory]:
    stmt = select(AlertHistory).order_by(AlertHistory.triggered_at.desc()).limit(limit)
    return list(db.scalars(stmt).all())
