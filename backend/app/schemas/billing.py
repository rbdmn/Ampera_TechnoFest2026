from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class BillingRecordOut(BaseModel):
    billing_id: str
    room_id: str
    period: str
    total_kwh: float
    total_amount_idr: float
    status: str
    generated_at: datetime

    class Config:
        from_attributes = True


class BillingGenerateRequest(BaseModel):
    period: str  # YYYY-MM
