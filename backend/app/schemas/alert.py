from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AlertOut(BaseModel):
    alert_id: str
    room_id: str
    alert_type: str
    message: str
    triggered_at: datetime
    is_read: bool

    class Config:
        from_attributes = True
