from __future__ import annotations

from collections import defaultdict
from typing import Any

from langchain.tools import tool
from sqlalchemy import select


def _format_idr(value: float) -> str:
    return f"Rp {value:,.0f}".replace(",", ".")


def _parse_room_ids(room_ids: list[str] | str) -> list[str]:
    if isinstance(room_ids, str):
        return [item.strip() for item in room_ids.split(",") if item.strip()]
    return [str(item).strip() for item in room_ids if str(item).strip()]


@tool
def compare_rooms(room_ids: list[str] | str, metric: str = "kwh") -> str:
    """Bandingkan beberapa kamar berdasarkan kWh, IDR, atau pemakaian per orang."""
    from app.db.database import get_db
    from app.db.models import ConsumptionLog, Room, User

    selected_room_ids = _parse_room_ids(room_ids)
    if not selected_room_ids:
        return "Masukkan daftar room_id, contoh: R-101,R-102,R-103."

    active_metric = metric.lower().strip()
    if active_metric not in {"kwh", "idr", "per_capita"}:
        return "Metric tidak dikenal. Gunakan salah satu: kwh, idr, per_capita."

    db_gen = get_db()
    db = next(db_gen)
    try:
        rooms = {
            room.room_id: room
            for room in db.scalars(select(Room).where(Room.room_id.in_(selected_room_ids))).all()
        }
        if not rooms:
            return "Tidak ada kamar yang cocok dengan daftar room_id tersebut."

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

        metric_label = {
            "kwh": "total kWh bulan berjalan",
            "idr": "estimasi tagihan",
            "per_capita": "pemakaian per orang",
        }[active_metric]
        lines = [f"Perbandingan kamar berdasarkan {metric_label}:"]
        for index, row in enumerate(rows, start=1):
            lines.append(
                f"{index}. {row['room_id']} ({row['tenant']}): "
                f"{row['kwh']:.2f} kWh, {_format_idr(row['idr'])}, "
                f"{row['occupants']} orang, {row['per_capita']:.2f} kWh/orang."
            )
        return "\n".join(lines)
    finally:
        db_gen.close()
