from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Tenant
from app.schemas.tenant import TenantCreate, TenantOut

router = APIRouter()


@router.post("/", response_model=TenantOut)
def create_tenant(payload: TenantCreate, db: Session = Depends(get_db)) -> TenantOut:
    if payload.email:
        existing = db.scalar(select(Tenant).where(Tenant.email == payload.email))
        if existing:
            raise HTTPException(status_code=409, detail="email_already_used")

    t = Tenant(full_name=payload.full_name, email=str(payload.email) if payload.email else None, phone=payload.phone)
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.get("/", response_model=list[TenantOut])
def list_tenants(db: Session = Depends(get_db)) -> list[TenantOut]:
    return list(db.scalars(select(Tenant).order_by(Tenant.created_at.desc())).all())
