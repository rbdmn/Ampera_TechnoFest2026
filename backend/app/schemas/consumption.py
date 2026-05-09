from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ConsumptionLogOut(BaseModel):
    log_id: str
    room_id: str
    timestamp: datetime
    kwh_used: float
    cumulative_kwh_month: float

    class Config:
        from_attributes = True


class ConsumptionSummaryOut(BaseModel):
    total_kwh_month: float
    rooms_count: int
