from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import BillingRecord, Room, User
from app.schemas.billing import BillingGenerateRequest, BillingRecordOut
from app.services.billing_service import generate_billing_for_period
from app.services.auth_service import get_current_user, require_admin


router = APIRouter()


@router.post("/generate", response_model=list[BillingRecordOut])
def generate(
    payload: BillingGenerateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[BillingRecordOut]:
    return generate_billing_for_period(db, payload.period)


@router.get("/my-invoices")
def my_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    room_id = current_user.room_id
    if not room_id:
        return {"data": [], "meta": {"total_items": 0}}

    rows = db.execute(
        select(
            BillingRecord.billing_id,
            BillingRecord.room_id,
            BillingRecord.total_kwh,
            BillingRecord.total_amount_idr,
            BillingRecord.status,
            BillingRecord.period,
            BillingRecord.generated_at,
            Room.tariff_per_kwh,
        )
        .join(Room, Room.room_id == BillingRecord.room_id)
        .where(BillingRecord.room_id == room_id)
        .order_by(BillingRecord.period.desc())
    ).all()

    data = [
        {
            "invoice_id": r.billing_id,
            "room_id": r.room_id,
            "period": r.period,
            "kwh_used": float(r.total_kwh),
            "rate": float(r.tariff_per_kwh),
            "total_amount": float(r.total_amount_idr),
            "status": r.status.value if hasattr(r.status, "value") else str(r.status),
            "generated_at": r.generated_at.isoformat() if r.generated_at else None,
        }
        for r in rows
    ]

    return {"data": data, "meta": {"total_items": len(data)}}
