from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import BillingRecord, ConsumptionLog, Room


def generate_billing_for_period(db: Session, period: str) -> list[BillingRecord]:
    rooms = list(db.scalars(select(Room)).all())
    created: list[BillingRecord] = []

    for room in rooms:
        # Idempotent: skip if billing for this room+period already exists
        existing = db.scalar(
            select(BillingRecord).where(BillingRecord.room_id == room.room_id, BillingRecord.period == period)
        )
        if existing:
            continue

        # naive: sum all logs whose timestamp starts with YYYY-MM
        total_kwh = float(
            db.scalar(
                select(func.coalesce(func.sum(ConsumptionLog.kwh_used), 0.0)).where(
                    ConsumptionLog.room_id == room.room_id,
                    func.to_char(ConsumptionLog.timestamp, "YYYY-MM") == period,
                )
            )
            or 0.0
        )
        total_amount = total_kwh * float(room.tariff_per_kwh)

        record = BillingRecord(
            room_id=room.room_id,
            period=period,
            total_kwh=total_kwh,
            total_amount_idr=total_amount,
        )
        db.add(record)
        created.append(record)

    db.commit()
    for rec in created:
        db.refresh(rec)

    return created
