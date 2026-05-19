from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import BillingRecord, BillingStatus, Room

router = APIRouter()


@router.get("/summary")
def billing_summary(
    period: str = Query(..., description="YYYY-MM"),
    db: Session = Depends(get_db),
) -> dict:
    total_usage = (
        db.scalar(select(func.coalesce(func.sum(BillingRecord.total_kwh), 0.0)).where(BillingRecord.period == period))
        or 0.0
    )
    expected_revenue = (
        db.scalar(
            select(func.coalesce(func.sum(BillingRecord.total_amount_idr), 0.0)).where(BillingRecord.period == period)
        )
        or 0.0
    )

    rooms_paid = db.scalar(
        select(func.count()).select_from(BillingRecord).where(BillingRecord.period == period, BillingRecord.status == BillingStatus.paid)
    ) or 0
    rooms_pending = db.scalar(
        select(func.count()).select_from(BillingRecord).where(BillingRecord.period == period, BillingRecord.status == BillingStatus.sent)
    ) or 0
    rooms_unpaid = db.scalar(
        select(func.count()).select_from(BillingRecord).where(BillingRecord.period == period, BillingRecord.status == BillingStatus.generated)
    ) or 0

    total_collected = (
        db.scalar(
            select(func.coalesce(func.sum(BillingRecord.total_amount_idr), 0.0)).where(
                BillingRecord.period == period,
                BillingRecord.status == BillingStatus.paid,
            )
        )
        or 0.0
    )

    return {
        "period": period,
        "total_usage_kwh": float(total_usage),
        "expected_revenue": float(expected_revenue),
        "collection": {
            "total_collected": float(total_collected),
            "rooms_paid": int(rooms_paid),
            "rooms_pending": int(rooms_pending),
            "rooms_unpaid": int(rooms_unpaid),
        },
    }


@router.get("/invoices")
def list_invoices(
    period: str = Query(..., description="YYYY-MM"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
) -> dict:
    offset = (page - 1) * limit

    total_items = db.scalar(select(func.count()).select_from(BillingRecord).where(BillingRecord.period == period)) or 0

    rows = db.execute(
        select(
            BillingRecord.billing_id,
            BillingRecord.room_id,
            BillingRecord.total_kwh,
            BillingRecord.total_amount_idr,
            BillingRecord.status,
            Room.tariff_per_kwh,
        )
        .join(Room, Room.room_id == BillingRecord.room_id)
        .where(BillingRecord.period == period)
        .order_by(BillingRecord.room_id)
        .offset(offset)
        .limit(limit)
    ).all()

    data = [
        {
            "invoice_id": r.billing_id,
            "room_no": str(r.room_id).replace("R-", ""),
            "kwh_used": float(r.total_kwh),
            "rate": float(r.tariff_per_kwh),
            "total_amount": float(r.total_amount_idr),
            "status": r.status.value if hasattr(r.status, "value") else str(r.status),
            "payment_proof_url": None,
        }
        for r in rows
    ]

    return {"data": data, "meta": {"total_items": int(total_items), "current_page": int(page)}}


@router.patch("/invoices/{invoice_id}/status")
def update_invoice_status(
    invoice_id: str,
    payload: dict,
    db: Session = Depends(get_db),
) -> dict:
    record = db.get(BillingRecord, invoice_id)
    if not record:
        return {"error": "invoice_not_found"}

    status = payload.get("status")
    if status not in {"paid", "unpaid", "pending"}:
        return {"error": "invalid_status"}

    # Map UI statuses to our enum
    if status == "paid":
        record.status = BillingStatus.paid
    elif status == "pending":
        record.status = BillingStatus.sent
    else:
        record.status = BillingStatus.generated

    db.commit()
    db.refresh(record)

    return {
        "invoice_id": record.billing_id,
        "status": record.status.value,
    }


@router.get("/invoices/{invoice_id}")
def invoice_detail(invoice_id: str, db: Session = Depends(get_db)) -> dict:
    row = db.execute(
        select(
            BillingRecord,
            Room,
        )
        .join(Room, Room.room_id == BillingRecord.room_id)
        .where(BillingRecord.billing_id == invoice_id)
    ).first()

    if not row:
        return {"error": "invoice_not_found"}

    record: BillingRecord = row[0]
    room: Room = row[1]

    period_start = f"{record.period}-01"

    return {
        "invoice_id": record.billing_id,
        "room_no": str(record.room_id).replace("R-", ""),
        "billing_period": record.period,
        "due_date": None,
        "status": record.status.value,
        "tenant": {
            "name": room.tenant_name,
            "email": room.tenant_email,
        },
        "usage": {
            "meter_reading": None,
            "kwh_used": float(record.total_kwh),
            "rate_per_kwh": float(room.tariff_per_kwh),
        },
        "total_amount": float(record.total_amount_idr),
        "payment_proof_url": None,
        "recommendation": {"estimated_savings": 0, "note": "Data tidak tersedia untuk room ini."},
    }
