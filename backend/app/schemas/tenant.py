from __future__ import annotations

from pydantic import BaseModel, EmailStr


class TenantCreate(BaseModel):
    full_name: str
    email: EmailStr | None = None
    phone: str | None = None


class TenantOut(BaseModel):
    tenant_id: str
    full_name: str
    email: EmailStr | None = None
    phone: str | None = None

    class Config:
        from_attributes = True
