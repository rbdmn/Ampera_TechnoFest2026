from __future__ import annotations

from langchain.tools import tool
from sqlalchemy import select


def _format_idr(value: float) -> str:
    return f"Rp {value:,.0f}".replace(",", ".")


@tool
def query_room_details(room_id: str) -> str:
    """Ambil detail kamar, penghuni, limit kWh, dan tarif listrik."""
    from app.db.database import get_db
    from app.db.models import Room, User

    db_gen = get_db()
    db = next(db_gen)
    try:
        room = db.get(Room, room_id)
        if not room:
            return f"Kamar {room_id} tidak ditemukan di database."

        users = list(
            db.scalars(
                select(User).where(
                    User.room_id == room_id,
                    User.is_active.is_(True),
                )
            ).all()
        )
        occupant_names = [
            user.full_name or user.email
            for user in users
            if user.full_name or user.email
        ]

        if not occupant_names and room.tenant_name:
            occupant_names = [room.tenant_name]

        occupants_text = ", ".join(occupant_names) if occupant_names else "Belum ada data penghuni aktif"

        return (
            f"Kamar {room.room_id} berada di lantai {room.floor or '-'}.\n"
            f"Penghuni: {occupants_text}.\n"
            f"Jumlah orang: {len(occupant_names)} dari kapasitas {room.max_occupants}.\n"
            f"Limit bulanan: {room.monthly_limit_kwh:.1f} kWh.\n"
            f"Tarif listrik: {_format_idr(float(room.tariff_per_kwh))} per kWh."
        )
    finally:
        db_gen.close()
