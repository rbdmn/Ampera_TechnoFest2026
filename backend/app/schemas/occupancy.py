from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class CheckInRequest(BaseModel):
    tenant_id: str
    start_at: datetime | None = None


class CheckOutRequest(BaseModel):
    end_at: datetime | None = None


class OccupancyOut(BaseModel):
    occupancy_id: str
    room_id: str
    tenant_id: str
    start_at: datetime
    end_at: datetime | None = None
    status: str

    class Config:
        from_attributes = True
