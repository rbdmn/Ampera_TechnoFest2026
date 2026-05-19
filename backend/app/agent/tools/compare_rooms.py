from __future__ import annotations

from collections import defaultdict
from typing import Any

from langchain.tools import tool
from sqlalchemy import func, select


def _format_idr(value: float) -> str:
    return f"Rp {value:,.0f}".replace(",", ".")


def _parse_room_ids(room_ids: list[str] | str) -> list[str]:
    if isinstance(room_ids, str):
        return [item.strip() for item in room_ids.split(",") if item.strip()]
    return [str(item).strip() for item in room_ids if str(item).strip()]


def _build_table(rows: list[dict[str, Any]], metric_label: str) -> str:
    lines = [f"## Perbandingan Kamar ({metric_label})", ""]
    lines.append("| Peringkat | Kamar | Penghuni | kWh | Tagihan | Orang | kWh/org |")
    lines.append("|---|---|---|---|---|---|---|")
    for i, row in enumerate(rows, start=1):
        lines.append(
            f"| {i} | {row['room_id']} | {row['tenant']} | "
            f"{row['kwh']:.1f} | {_format_idr(row['idr'])} | "
            f"{row['occupants']} | {row['per_capita']:.1f} |"
        )
    total_kwh = sum(r["kwh"] for r in rows)
    total_idr = sum(r["idr"] for r in rows)
    lines.extend(
        [
            "",
            f"**Total:** {total_kwh:.1f} kWh - {_format_idr(total_idr)}",
            "",
        ]
    )
    return "\n".join(lines)


def _build_insight(rows: list[dict[str, Any]], active_metric: str) -> str:
    if not rows:
        return ""

    total_top = max(rows, key=lambda item: item["kwh"])
    per_capita_top = max(rows, key=lambda item: item["per_capita"])
    bill_top = max(rows, key=lambda item: item["idr"])

    total_name = total_top["tenant"] or total_top["room_id"]
    per_capita_name = per_capita_top["tenant"] or per_capita_top["room_id"]
    bill_name = bill_top["tenant"] or bill_top["room_id"]

    lines = ["### Insight", ""]
    lines.append(
        f"- Secara total konsumsi, **{total_top['room_id']} ({total_name})** paling tinggi "
        f"dengan {total_top['kwh']:.1f} kWh."
    )

    if per_capita_top["room_id"] == total_top["room_id"]:
        lines.append(
            f"- Secara per penghuni, **{per_capita_top['room_id']} ({per_capita_name})** juga paling tinggi "
            f"dengan {per_capita_top['per_capita']:.1f} kWh/orang."
        )
    else:
        lines.append(
            f"- Namun per penghuni, **{per_capita_top['room_id']} ({per_capita_name})** lebih boros "
            f"dengan {per_capita_top['per_capita']:.1f} kWh/orang."
        )

    if bill_top["room_id"] != total_top["room_id"]:
        lines.append(
            f"- Jika dilihat dari tagihan, **{bill_top['room_id']} ({bill_name})** yang paling besar "
            f"dengan {_format_idr(bill_top['idr'])}."
        )

    if active_metric == "per_capita":
        lines.append(
            "- Ranking utama disusun berdasarkan kWh per orang, supaya kamar sharing tetap dinilai lebih adil."
        )

    lines.append("")
    return "\n".join(lines)


def _query_by_period(db, selected_room_ids: list[str], period: str, active_metric: str) -> list[dict[str, Any]]:
    """Query billing_records with SUM/GROUP BY for a period."""
    from app.db.models import BillingRecord, Room, User

    period_like = f"{period}-%" if len(period) == 4 else period

    stmt = (
        select(
            BillingRecord.room_id,
            func.sum(BillingRecord.total_kwh).label("total_kwh"),
            func.sum(BillingRecord.total_amount_idr).label("total_idr"),
        )
        .where(BillingRecord.room_id.in_(selected_room_ids))
        .where(BillingRecord.period.like(period_like))
        .group_by(BillingRecord.room_id)
        .order_by(func.sum(BillingRecord.total_kwh).desc())
    )
    bill_rows = db.execute(stmt).all()
    if not bill_rows:
        return []

    rooms = {
        room.room_id: room
        for room in db.scalars(select(Room).where(Room.room_id.in_(selected_room_ids))).all()
    }

    users_by_room: dict[str, list[str]] = defaultdict(list)
    for room_id, full_name, email in db.execute(
        select(User.room_id, User.full_name, User.email).where(
            User.room_id.in_(selected_room_ids),
            User.is_active.is_(True),
        )
    ).all():
        users_by_room[room_id].append(full_name or email or "Tanpa nama")

    rows: list[dict[str, Any]] = []
    for room_id, total_kwh, total_idr in bill_rows:
        total_kwh_f = float(total_kwh)
        total_idr_f = float(total_idr)
        room = rooms.get(room_id)
        occupants = max(len(users_by_room.get(room_id, [])), 1)
        per_capita = total_kwh_f / occupants

        if active_metric == "idr":
            rank_value = total_idr_f
        elif active_metric == "per_capita":
            rank_value = per_capita
        else:
            rank_value = total_kwh_f

        tenant = ", ".join(users_by_room.get(room_id, []))
        if not tenant and room:
            tenant = room.tenant_name or "Belum ada penghuni"
        if not tenant:
            tenant = "Belum ada penghuni"

        rows.append(
            {
                "room_id": room_id,
                "tenant": tenant,
                "kwh": total_kwh_f,
                "idr": total_idr_f,
                "occupants": occupants,
                "per_capita": per_capita,
                "rank_value": rank_value,
            }
        )

    rows.sort(key=lambda item: item["rank_value"], reverse=True)
    return rows


def _query_latest_cumulative(db, selected_room_ids: list[str], active_metric: str) -> list[dict[str, Any]]:
    """Existing logic: latest cumulative_kwh_month per room."""
    from app.db.models import ConsumptionLog, Room, User

    rooms = {
        room.room_id: room
        for room in db.scalars(select(Room).where(Room.room_id.in_(selected_room_ids))).all()
    }
    if not rooms:
        return []

    users_by_room: dict[str, list[str]] = defaultdict(list)
    for room_id, full_name, email in db.execute(
        select(User.room_id, User.full_name, User.email).where(
            User.room_id.in_(list(rooms)),
            User.is_active.is_(True),
        )
    ).all():
        users_by_room[room_id].append(full_name or email or "Tanpa nama")

    rows: list[dict[str, Any]] = []
    for room_id, room in rooms.items():
        latest_log = db.scalar(
            select(ConsumptionLog)
            .where(ConsumptionLog.room_id == room_id)
            .order_by(ConsumptionLog.timestamp.desc())
            .limit(1)
        )
        total_kwh = float(latest_log.cumulative_kwh_month) if latest_log else 0.0
        total_idr = total_kwh * float(room.tariff_per_kwh)
        occupants = max(len(users_by_room.get(room_id, [])), 1)
        per_capita = total_kwh / occupants

        if active_metric == "idr":
            rank_value = total_idr
        elif active_metric == "per_capita":
            rank_value = per_capita
        else:
            rank_value = total_kwh

        rows.append(
            {
                "room_id": room_id,
                "tenant": ", ".join(users_by_room.get(room_id, [])) or room.tenant_name or "Belum ada penghuni",
                "kwh": total_kwh,
                "idr": total_idr,
                "occupants": occupants,
                "per_capita": per_capita,
                "rank_value": rank_value,
            }
        )

    rows.sort(key=lambda item: item["rank_value"], reverse=True)
    return rows


@tool
def compare_rooms(room_ids: list[str] | str, metric: str = "kwh", period: str | None = None) -> str:
    """Bandingkan beberapa kamar berdasarkan kWh, IDR, atau pemakaian per orang."""
    from app.db.database import get_db

    selected_room_ids = _parse_room_ids(room_ids)
    if not selected_room_ids:
        return "Masukkan daftar room_id, contoh: R-101,R-102,R-103."

    active_metric = metric.lower().strip()
    if active_metric not in {"kwh", "idr", "per_capita"}:
        return "Metric tidak dikenal. Gunakan salah satu: kwh, idr, per_capita."

    db_gen = get_db()
    db = next(db_gen)
    try:
        if period:
            rows = _query_by_period(db, selected_room_ids, period, active_metric)
        else:
            rows = _query_latest_cumulative(db, selected_room_ids, active_metric)

        if not rows:
            target = f"periode {period}" if period else "bulan berjalan"
            return f"Belum ada data konsumsi untuk kamar-kamar tersebut di {target}."

        metric_label = {
            "kwh": "total kWh",
            "idr": "estimasi tagihan",
            "per_capita": "pemakaian per orang",
        }[active_metric]

        if period:
            metric_label += f" - {period}"

        table = _build_table(rows, metric_label)
        insight = _build_insight(rows, active_metric)

        return f"{table}\n{insight}".strip() if insight else table
    finally:
        db_gen.close()
