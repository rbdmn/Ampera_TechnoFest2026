from __future__ import annotations

from collections import defaultdict
from datetime import timedelta
from statistics import mean, pstdev

from langchain.tools import tool
from sqlalchemy import func, select


def _tenant_name_by_room(db, room_ids: list[str]) -> dict[str, str]:
    from app.db.models import User

    rows = db.execute(
        select(User.room_id, User.full_name, User.email).where(
            User.room_id.in_(room_ids),
            User.is_active.is_(True),
        )
    ).all()
    names: dict[str, list[str]] = defaultdict(list)
    for room_id, full_name, email in rows:
        names[room_id].append(full_name or email or "Tanpa nama")
    return {
        room_id: ", ".join(values)
        for room_id, values in names.items()
    }


@tool
def list_anomalies(days: int = 7) -> str:
    """Daftar anomali konsumsi listrik dalam N hari terakhir dari data terbaru."""
    from app.db.database import get_db
    from app.db.models import ConsumptionLog, Room

    db_gen = get_db()
    db = next(db_gen)
    try:
        latest_timestamp = db.scalar(select(func.max(ConsumptionLog.timestamp)))
        if latest_timestamp is None:
            return "Belum ada data konsumsi listrik untuk dianalisis."

        start_at = latest_timestamp - timedelta(days=max(int(days), 1))
        logs = list(
            db.scalars(
                select(ConsumptionLog)
                .where(ConsumptionLog.timestamp >= start_at)
                .order_by(ConsumptionLog.room_id.asc(), ConsumptionLog.timestamp.asc())
            ).all()
        )
        if not logs:
            return f"Tidak ada data konsumsi dalam {days} hari terakhir."

        logs_by_room: dict[str, list[ConsumptionLog]] = defaultdict(list)
        for log in logs:
            logs_by_room[log.room_id].append(log)

        room_names = _tenant_name_by_room(db, list(logs_by_room))
        room_rows = {
            room.room_id: room
            for room in db.scalars(select(Room).where(Room.room_id.in_(list(logs_by_room)))).all()
        }

        findings: list[tuple[str, str, float, str, float]] = []
        for room_id, room_logs in logs_by_room.items():
            if len(room_logs) < 10:
                continue
            values = [float(log.kwh_used) for log in room_logs]
            mu = mean(values)
            sigma = pstdev(values) or 1e-9
            for log in room_logs:
                z_score = (float(log.kwh_used) - mu) / sigma
                if z_score > 2.0:
                    room = room_rows.get(room_id)
                    tenant = room_names.get(room_id) or (room.tenant_name if room else None) or "Belum ada data penghuni"
                    findings.append((room_id, tenant, float(log.kwh_used), log.timestamp.isoformat(), z_score))

        if not findings:
            return f"Tidak ada anomali konsumsi dalam {days} hari terakhir dari data terbaru."

        findings.sort(key=lambda item: item[2], reverse=True)
        lines = [
            f"Anomali konsumsi dalam {days} hari terakhir dari data terbaru "
            f"({start_at.isoformat()} sampai {latest_timestamp.isoformat()}):"
        ]
        for room_id, tenant, kwh, timestamp, _ in findings[:10]:
            lines.append(
                f"- {room_id} ({tenant}): lonjakan {kwh:.2f} kWh pada {timestamp}. "
                "Perlu cek perangkat yang menyala terus atau validasi meter."
            )
        return "\n".join(lines)
    finally:
        db_gen.close()
