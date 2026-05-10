from __future__ import annotations

from datetime import datetime

from langchain.tools import tool
from sqlalchemy import select


def _format_idr(value: float) -> str:
    return f"Rp {value:,.0f}".replace(",", ".")


@tool
def get_billing_summary(room_id: str | None = None, period: str | None = None) -> str:
    """Ambil ringkasan tagihan kamar atau semua kamar untuk periode YYYY-MM."""
    from app.db.database import get_db
    from app.db.models import BillingRecord

    active_period = period or datetime.now().strftime("%Y-%m")

    db_gen = get_db()
    db = next(db_gen)
    try:
        stmt = select(BillingRecord).where(BillingRecord.period == active_period)
        if room_id:
            stmt = stmt.where(BillingRecord.room_id == room_id)
        stmt = stmt.order_by(BillingRecord.room_id.asc())

        records = list(db.scalars(stmt).all())
        if not records:
            target = f"kamar {room_id} " if room_id else ""
            return f"Belum ada data tagihan untuk {target}periode {active_period}."

        total_kwh = sum(float(record.total_kwh) for record in records)
        total_idr = sum(float(record.total_amount_idr) for record in records)
        lines = [f"Ringkasan tagihan periode {active_period}:"]

        for record in records:
            lines.append(
                f"- {record.room_id}: {float(record.total_kwh):.2f} kWh, "
                f"{_format_idr(float(record.total_amount_idr))} ({record.status.value})."
            )

        lines.append(f"Total: {total_kwh:.2f} kWh, {_format_idr(total_idr)}.")
        return "\n".join(lines)
    finally:
        db_gen.close()
