from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.config import get_settings
from app.db.database import SessionLocal
from app.db.models import ConsumptionLog, ReadingSource, Room, RoomOccupancy, Tenant


def _ensure_rooms(db) -> list[Room]:
    existing = list(db.scalars(select(Room)).all())
    if existing:
        return existing

    settings = get_settings()
    rooms: list[Room] = []
    for i in range(10):
        room_id = f"R-{101 + i}"
        rooms.append(
            Room(
                room_id=room_id,
                floor=1 if i < 5 else 2,
                tenant_name=None,
                tenant_email=None,
                monthly_limit_kwh=float(settings.default_limit_kwh),
                tariff_per_kwh=float(settings.tariff_per_kwh),
                max_occupants=2 if i in (2, 6) else 1,  # a couple of sharing rooms
            )
        )

    db.add_all(rooms)
    db.commit()
    return rooms


def _ensure_tenants_and_occupancies(db, rooms: list[Room]) -> None:
    # If any occupancy exists, assume already seeded
    existing_occ = db.execute(select(RoomOccupancy.occupancy_id).limit(1)).first()
    if existing_occ:
        return

    now = datetime.now(timezone.utc)

    tenant_idx = 1
    for room in rooms:
        occupants = 2 if room.max_occupants >= 2 else 1

        for _ in range(occupants):
            tenant = Tenant(
                full_name=f"Tenant {tenant_idx}",
                email=f"tenant{tenant_idx}@example.com",
            )
            db.add(tenant)
            db.flush()  # get tenant_id

            occ = RoomOccupancy(
                room_id=room.room_id,
                tenant_id=tenant.tenant_id,
                start_at=now - timedelta(days=30),
                end_at=None,
            )
            db.add(occ)
            tenant_idx += 1

    db.commit()


def seed_demo(days: int = 14) -> None:
    random.seed(42)

    db = SessionLocal()
    try:
        rooms = _ensure_rooms(db)
        _ensure_tenants_and_occupancies(db, rooms)

        # Generate hourly data for last N days
        now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        start = now - timedelta(days=days)

        logs: list[ConsumptionLog] = []
        for room in rooms:
            cumulative = 0.0
            t = start
            while t < now:
                # baseline 0.15 - 0.55 kWh, with occasional spikes
                base = random.uniform(0.15, 0.55)
                if random.random() < 0.02:
                    base *= random.uniform(3.0, 6.0)

                # sharing rooms: slightly higher baseline
                if room.max_occupants >= 2:
                    base *= 1.25

                kwh = float(round(base, 3))
                cumulative += kwh
                logs.append(
                    ConsumptionLog(
                        room_id=room.room_id,
                        timestamp=t,
                        kwh_used=kwh,
                        cumulative_kwh_month=float(round(cumulative, 3)),
                        source=ReadingSource.seed_dataset,
                    )
                )
                t += timedelta(hours=1)

        db.add_all(logs)
        db.commit()
        print(f"Seeded rooms={len(rooms)} logs={len(logs)}")

    finally:
        db.close()


if __name__ == "__main__":
    seed_demo()
