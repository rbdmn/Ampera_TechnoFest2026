from __future__ import annotations

from datetime import datetime

from langchain.tools import tool
from sqlalchemy import func, select


def _format_idr(value: float) -> str:
    return f"Rp {value:,.0f}".replace(",", ".")


def _format_period_label(period: str) -> str:
    month_map = {
        "01": "Januari",
        "02": "Februari",
        "03": "Maret",
        "04": "April",
        "05": "Mei",
        "06": "Juni",
        "07": "Juli",
        "08": "Agustus",
        "09": "September",
        "10": "Oktober",
        "11": "November",
        "12": "Desember",
    }
    if len(period) == 7 and "-" in period:
        year, month = period.split("-", maxsplit=1)
        return f"{month_map.get(month, month)} {year}"
    if len(period) == 4:
        return f"Tahun {period}"
    return period


def _fallback_from_consumption(db, active_period: str, room_id: str | None, is_year_only: bool) -> str | None:
    """Hitung tagihan langsung dari consumption_logs jika billing_records kosong."""
    from app.db.models import ConsumptionLog, Room

    if is_year_only:
        period_like = f"{active_period}-%"
        stmt = (
            select(
                ConsumptionLog.room_id,
                func.sum(ConsumptionLog.kwh_used).label("total_kwh"),
            )
            .where(func.to_char(ConsumptionLog.timestamp, "YYYY-MM").like(period_like))
            .group_by(ConsumptionLog.room_id)
        )
    else:
        stmt = (
            select(
                ConsumptionLog.room_id,
                func.sum(ConsumptionLog.kwh_used).label("total_kwh"),
            )
            .where(func.to_char(ConsumptionLog.timestamp, "YYYY-MM") == active_period)
            .group_by(ConsumptionLog.room_id)
        )

    if room_id:
        stmt = stmt.where(ConsumptionLog.room_id == room_id)

    log_rows = db.execute(stmt).all()
    if not log_rows:
        return None

    room_ids = [row.room_id for row in log_rows]
    rooms = {
        room.room_id: room
        for room in db.scalars(select(Room).where(Room.room_id.in_(room_ids))).all()
    }

    lines = [
        f"## Laporan Tagihan { _format_period_label(active_period) }",
        "",
        "| Kamar | Total kWh | Total Tagihan |",
        "|---|---:|---:|",
    ]

    total_kwh = 0.0
    total_idr = 0.0
    for row in log_rows:
        room = rooms.get(row.room_id)
        kwh = float(row.total_kwh)
        idr = kwh * float(room.tariff_per_kwh if room else 1444.70)
        room_name = room.tenant_name if room and room.tenant_name else row.room_id
        lines.append(f"| {row.room_id} ({room_name}) | {kwh:.2f} | {_format_idr(idr)} |")
        total_kwh += kwh
        total_idr += idr

    lines.append("")
    lines.append("Berikut ringkasan yang dihitung langsung dari data konsumsi.")
    lines.append(f"**Total:** {total_kwh:.2f} kWh, {_format_idr(total_idr)}.")
    lines.append("> Tagihan dihitung otomatis dari data konsumsi karena billing_records belum tersedia.")
    return "\n".join(lines)


def _build_monthly_report(records, rooms: dict[str, object], period_label: str) -> str:
    lines: list[str] = [
        f"## Laporan Bulanan - {period_label}",
        "",
        "| Kamar | Penghuni | kWh | Tagihan | Status |",
        "|---|---|---:|---:|---|",
    ]

    total_kwh = 0.0
    total_idr = 0.0
    top_record = None

    for record in records:
        room = rooms.get(record.room_id)
        room_name = room.tenant_name if room and getattr(room, "tenant_name", None) else record.room_id
        kwh = float(record.total_kwh)
        amount = float(record.total_amount_idr)
        status = getattr(record.status, "value", str(record.status))
        lines.append(
            f"| {record.room_id} | {room_name} | {kwh:.2f} | {_format_idr(amount)} | {status} |"
        )
        total_kwh += kwh
        total_idr += amount
        if top_record is None or amount > float(top_record.total_amount_idr):
            top_record = record

    lines.append("")
    lines.append("Berikut ringkasan tagihan bulanan per kamar.")
    lines.append(f"**Total bulan ini:** {total_kwh:.2f} kWh, {_format_idr(total_idr)}.")

    if top_record is not None:
        top_room = rooms.get(top_record.room_id)
        top_name = top_room.tenant_name if top_room and getattr(top_room, "tenant_name", None) else top_record.room_id
        lines.append(
            f"**Sorotan:** Tagihan tertinggi ada di {top_record.room_id} ({top_name}) "
            f"sebesar {_format_idr(float(top_record.total_amount_idr))}."
        )

    lines.extend(
        [
            "",
            "> Tips: lihat kamar dengan tagihan tertinggi lebih dulu. Biasanya ada alat standby, AC, atau dispenser yang nyala terus.",
        ]
    )
    return "\n".join(lines)


def _build_yearly_report(rows, rooms: dict[str, object], period_label: str) -> str:
    lines: list[str] = [
        f"## Laporan Tahunan - {period_label}",
        "",
        "| Kamar | Penghuni | Total kWh | Total Tagihan | Rentang Periode |",
        "|---|---|---:|---:|---|",
    ]

    total_kwh = 0.0
    total_idr = 0.0
    for row in rows:
        room = rooms.get(row.room_id)
        room_name = room.tenant_name if room and getattr(room, "tenant_name", None) else row.room_id
        row_total_kwh = float(row.total_kwh)
        row_total_idr = float(row.total_idr)
        lines.append(
            f"| {row.room_id} | {room_name} | {row_total_kwh:.2f} | {_format_idr(row_total_idr)} | "
            f"{row.min_period} s.d. {row.max_period} |"
        )
        total_kwh += row_total_kwh
        total_idr += row_total_idr

    lines.append("")
    lines.append("Berikut ringkasan tagihan per kamar untuk periode ini.")
    lines.append(f"**Total setahun:** {total_kwh:.2f} kWh, {_format_idr(total_idr)}.")
    return "\n".join(lines)


@tool
def get_billing_summary(room_id: str | None = None, period: str | None = None) -> str:
    """Ambil ringkasan tagihan kamar atau semua kamar untuk periode YYYY-MM atau tahun YYYY."""
    from app.db.database import get_db
    from app.db.models import BillingRecord, Room

    active_period = period or datetime.now().strftime("%Y-%m")
    is_year_only = len(active_period) == 4
    period_label = _format_period_label(active_period)

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

            rows = db.execute(stmt).all()
            if not rows:
                fallback = _fallback_from_consumption(db, active_period, room_id, is_year_only)
                if fallback:
                    return fallback
                target = f"kamar {room_id} " if room_id else ""
                return f"Belum ada data tagihan untuk {target}tahun {active_period}."

            room_ids = [row.room_id for row in rows]
            rooms = {
                room.room_id: room
                for room in db.scalars(select(Room).where(Room.room_id.in_(room_ids))).all()
            }
            return _build_yearly_report(rows, rooms, period_label)

        stmt = select(BillingRecord).where(BillingRecord.period == active_period)
        if room_id:
            stmt = stmt.where(BillingRecord.room_id == room_id)
        stmt = stmt.order_by(BillingRecord.room_id.asc())

        records = list(db.scalars(stmt).all())
        if not records:
            fallback = _fallback_from_consumption(db, active_period, room_id, is_year_only)
            if fallback:
                return fallback
            target = f"kamar {room_id} " if room_id else ""
            return f"Belum ada data tagihan untuk {target}periode {active_period}."

        room_ids = [record.room_id for record in records]
        rooms = {
            room.room_id: room
            for room in db.scalars(select(Room).where(Room.room_id.in_(room_ids))).all()
        }
        return _build_monthly_report(records, rooms, period_label)

    finally:
        db_gen.close()
