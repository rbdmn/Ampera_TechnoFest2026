from __future__ import annotations

from datetime import datetime

from langchain.tools import tool
from sqlalchemy import func, select


def _format_idr(value: float) -> str:
    return f"Rp {value:,.0f}".replace(",", ".")


@tool
def get_billing_summary(room_id: str | None = None, period: str | None = None) -> str:
    """Ambil ringkasan tagihan kamar atau semua kamar untuk periode YYYY-MM atau tahun YYYY.

    Args:
        room_id: Opsional, filter kamar tertentu.
        period: "YYYY-MM" untuk bulan tertentu, atau "YYYY" untuk satu tahun penuh.
    """
    from app.db.database import get_db
    from app.db.models import BillingRecord

    active_period = period or datetime.now().strftime("%Y-%m")
    is_year_only = len(active_period) == 4

    db_gen = get_db()
    db = next(db_gen)
    try:
        if is_year_only:
            period_like = f"{active_period}-%"
            stmt = (
                select(
                    BillingRecord.room_id,
                    func.sum(BillingRecord.total_kwh).label("total_kwh"),
                    func.sum(BillingRecord.total_amount_idr).label("total_idr"),
                    func.min(BillingRecord.period).label("min_period"),
                    func.max(BillingRecord.period).label("max_period"),
                )
                .where(BillingRecord.period.like(period_like))
                .group_by(BillingRecord.room_id)
                .order_by(BillingRecord.room_id.asc())
            )
            if room_id:
                stmt = stmt.where(BillingRecord.room_id == room_id)

            bill_rows = db.execute(stmt).all()
            if not bill_rows:
                target = f"kamar {room_id} " if room_id else ""
                return f"Belum ada data tagihan untuk {target}tahun {active_period}."

            lines = [f"Ringkasan tagihan tahun {active_period}:"]
            total_kwh = 0.0
            total_idr = 0.0
            for row in bill_rows:
                row_total_kwh = float(row.total_kwh)
                row_total_idr = float(row.total_idr)
                lines.append(
                    f"- {row.room_id}: {row_total_kwh:.2f} kWh, "
                    f"{_format_idr(row_total_idr)} ({row.min_period} s.d. {row.max_period})."
                )
                total_kwh += row_total_kwh
                total_idr += row_total_idr

            lines.append(f"Total: {total_kwh:.2f} kWh, {_format_idr(total_idr)}.")
            return "\n".join(lines)

        else:
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
