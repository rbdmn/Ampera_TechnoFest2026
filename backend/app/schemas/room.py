from __future__ import annotations

from pydantic import BaseModel, EmailStr


class RoomBase(BaseModel):
    room_id: str
    floor: int | None = None
    tenant_name: str | None = None
    tenant_email: EmailStr | None = None
    monthly_limit_kwh: float
    tariff_per_kwh: float


class RoomOut(RoomBase):
    class Config:
        from_attributes = True
