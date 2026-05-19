from __future__ import annotations

from datetime import date, datetime, timedelta

from langchain.tools import tool
from sqlalchemy import func, select

from app.agent.tools.analyze_pattern import analyze_pattern
from app.agent.tools.calculate_bill import calculate_bill


def _format_idr(value: float) -> str:
    return f"Rp {value:,.0f}".replace(",", ".")


def _parse_reference_date(reference_date: str | None) -> date | None:
    if not reference_date:
        return None

    value = reference_date.strip()
    if not value:
        return None

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except ValueError:
        pass

    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _room_name(room) -> str:
    if room and getattr(room, "tenant_name", None):
        return room.tenant_name
    if room and getattr(room, "tenant_email", None):
        return room.tenant_email
    return "Belum ada penghuni"


def _summarize_peak_hours(peak_hours: object) -> str:
    if not isinstance(peak_hours, list) or not peak_hours:
        return "-"

    parts: list[str] = []
    for item in peak_hours[:2]:
        if not isinstance(item, dict):
            continue
        hour = item.get("hour")
        avg_kwh = item.get("avg_kwh")
        if hour is None or avg_kwh is None:
            continue
        parts.append(f"{int(hour):02d}:00 ({float(avg_kwh):.2f} kWh)")
    return ", ".join(parts) if parts else "-"


@tool
def get_end_of_day_report(room_id: str | None = None, reference_date: str | None = None) -> str:
    """Buat laporan akhir hari dari konsumsi terbaru yang tersedia di database."""
    from app.db.database import get_db
    from app.db.models import AlertHistory, BillingRecord, ConsumptionLog, Room

    db_gen = get_db()
    db = next(db_gen)
    try:
        latest_timestamp = db.scalar(select(func.max(ConsumptionLog.timestamp)))
        if latest_timestamp is None:
            return "Data laporan akhir hari belum tersedia karena belum ada consumption_logs di database."

        target_date = _parse_reference_date(reference_date) or latest_timestamp.date()
        day_start = datetime.combine(target_date, datetime.min.time(), tzinfo=latest_timestamp.tzinfo)
        day_end = day_start + timedelta(days=1)

        day_stmt = (
            select(
                ConsumptionLog.room_id,
                func.sum(ConsumptionLog.kwh_used).label("total_kwh"),
                func.max(ConsumptionLog.cumulative_kwh_month).label("latest_cumulative"),
            )
            .where(
                ConsumptionLog.timestamp >= day_start,
                ConsumptionLog.timestamp < day_end,
            )
            .group_by(ConsumptionLog.room_id)
            .order_by(func.sum(ConsumptionLog.kwh_used).desc())
        )
        if room_id:
            day_stmt = day_stmt.where(ConsumptionLog.room_id == room_id)

        day_rows = db.execute(day_stmt).all()
        fallback_note = ""
        if not day_rows:
            if target_date != latest_timestamp.date():
                fallback_note = (
                    f"Data untuk {target_date.isoformat()} tidak ditemukan, jadi saya pakai "
                    f"data terbaru yang tersedia: {latest_timestamp.date().isoformat()}."
                )
                target_date = latest_timestamp.date()
                day_start = datetime.combine(target_date, datetime.min.time(), tzinfo=latest_timestamp.tzinfo)
                day_end = day_start + timedelta(days=1)
                day_rows = db.execute(
                    select(
                        ConsumptionLog.room_id,
                        func.sum(ConsumptionLog.kwh_used).label("total_kwh"),
                        func.max(ConsumptionLog.cumulative_kwh_month).label("latest_cumulative"),
                    )
                    .where(
                        ConsumptionLog.timestamp >= day_start,
                        ConsumptionLog.timestamp < day_end,
                    )
                    .group_by(ConsumptionLog.room_id)
                    .order_by(func.sum(ConsumptionLog.kwh_used).desc())
                ).all()
                if room_id:
                    day_rows = [row for row in day_rows if row.room_id == room_id]
            else:
                return f"Tidak ada data konsumsi untuk {target_date.isoformat()}."

        room_ids = [row.room_id for row in day_rows]
        rooms = {
            room.room_id: room
            for room in db.scalars(select(Room).where(Room.room_id.in_(room_ids))).all()
        }

        alert_stmt = select(AlertHistory).where(
            AlertHistory.triggered_at >= day_start,
            AlertHistory.triggered_at < day_end,
        )
        if room_id:
            alert_stmt = alert_stmt.where(AlertHistory.room_id == room_id)
        alerts = list(db.scalars(alert_stmt).all())

        period = target_date.strftime("%Y-%m")
        month_stmt = (
            select(
                ConsumptionLog.room_id,
                func.sum(ConsumptionLog.kwh_used).label("month_kwh"),
            )
            .where(func.to_char(ConsumptionLog.timestamp, "YYYY-MM") == period)
            .group_by(ConsumptionLog.room_id)
        )
        if room_id:
            month_stmt = month_stmt.where(ConsumptionLog.room_id == room_id)
        month_rows = {row.room_id: float(row.month_kwh) for row in db.execute(month_stmt).all()}

        billing_stmt = select(BillingRecord).where(BillingRecord.period == period)
        if room_id:
            billing_stmt = billing_stmt.where(BillingRecord.room_id == room_id)
        billing_rows = {record.room_id: record for record in db.scalars(billing_stmt).all()}

        total_day_kwh = sum(float(row.total_kwh) for row in day_rows)
        total_alerts = len(alerts)
        top_row = day_rows[0] if day_rows else None
        top_room = rooms.get(top_row.room_id) if top_row else None

        lines: list[str] = [
            f"## Laporan Akhir Hari - {target_date.isoformat()}",
        ]
        if fallback_note:
            lines.extend(["", f"> {fallback_note}"])

        lines.extend(
            [
                "",
                "### Ringkasan Harian",
                "",
                "| Kamar | Penghuni | kWh Hari Ini | Akumulasi Bulan | Pola Waktu | Estimasi Tagihan Bulan Ini | Status |",
                "|---|---|---:|---:|---|---:|---|",
            ]
        )

        total_month_kwh = 0.0
        total_estimated_bill = 0.0
        for row in day_rows:
            room = rooms.get(row.room_id)
            current_month_kwh = month_rows.get(row.room_id, float(row.latest_cumulative or 0.0))
            tariff = float(room.tariff_per_kwh) if room else 1444.70
            limit = float(room.monthly_limit_kwh) if room else 50.0
            estimated_bill = calculate_bill(total_kwh=current_month_kwh, tariff=tariff)
            pattern = analyze_pattern(room_id=row.room_id, monthly_limit_kwh=limit)
            time_pattern = pattern.get("time_pattern") or "-"
            peak_hours = _summarize_peak_hours(pattern.get("peak_hours"))
            if time_pattern and peak_hours != "-":
                time_pattern = f"{time_pattern} | {peak_hours}"
            status = "Normal"
            if limit > 0 and current_month_kwh >= limit:
                status = "Melebihi"
            elif limit > 0 and current_month_kwh >= 0.8 * limit:
                status = "Peringatan"
            room_name = _room_name(room)
            lines.append(
                f"| {row.room_id} | {room_name} | {float(row.total_kwh):.2f} | "
                f"{current_month_kwh:.2f} | {time_pattern} | {_format_idr(estimated_bill)} | {status} |"
            )
            total_month_kwh += current_month_kwh
            total_estimated_bill += estimated_bill

        lines.extend(
            [
                "",
                f"Total konsumsi hari ini: **{total_day_kwh:.2f} kWh**",
                f"Total alert hari ini: **{total_alerts}**",
            ]
        )
        if top_row:
            lines.append(
                f"Pemakaian tertinggi: **{top_row.room_id} ({_room_name(top_room)})** = "
                f"{float(top_row.total_kwh):.2f} kWh"
            )

        lines.extend(
            [
                "",
                f"**Total akumulasi bulan berjalan:** {total_month_kwh:.2f} kWh",
                f"**Estimasi total tagihan bulan ini:** {_format_idr(total_estimated_bill)}",
            ]
        )

        if day_rows:
            best_pattern = analyze_pattern(
                room_id=day_rows[0].room_id,
                monthly_limit_kwh=float(rooms.get(day_rows[0].room_id).monthly_limit_kwh) if rooms.get(day_rows[0].room_id) else 50.0,
            )
            lines.extend(
                [
                    "",
                    "### Insight Waktu",
                    "",
                    f"- Pola utama: {best_pattern.get('time_pattern', '-')}",
                    f"- Detail: {best_pattern.get('time_pattern_detail', '-')}",
                    f"- Rata-rata malam: {float(best_pattern.get('avg_night_kwh') or 0.0):.2f} kWh",
                ]
            )

        if billing_rows:
            total_bill_idr = sum(float(record.total_amount_idr) for record in billing_rows.values())
            lines.append(f"**Billing resmi yang tersedia:** {_format_idr(total_bill_idr)}")

        if alerts:
            lines.extend(
                [
                    "",
                    "### Alert Hari Ini",
                    "",
                    "| Kamar | Jenis | Pesan |",
                    "|---|---|---|",
                ]
            )
            for alert in alerts[:5]:
                lines.append(
                    f"| {alert.room_id} | {alert.alert_type} | {alert.message} |"
                )

        lines.extend(
            [
                "",
                "### Tips Hemat",
                "",
                "> Matikan AC atau kipas lebih cepat kalau sudah tidak dipakai.",
                "> Cabut charger dan alat elektronik yang standby terus.",
                "> Gunakan lampu LED supaya konsumsi malam hari lebih ringan.",
            ]
        )

        return "\n".join(lines)
    finally:
        db_gen.close()
