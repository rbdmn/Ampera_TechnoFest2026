"""Generate synthetic consumption data (2020-01 to 2026-05) for Ampera AI.

Outputs ERD-shaped CSV files to data/processed_new/ that are compatible
with backend/data/seed.py, without requiring the old OPSD dataset.
"""

from __future__ import annotations

import argparse
import csv
import math
import random
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = ROOT_DIR / "data" / "processed_new"

TARIFF_PER_KWH = 1444.70
MONTHLY_LIMIT_KWH = 50.0
ROOM_COUNT = 10
START_DATE = datetime(2020, 1, 1, tzinfo=timezone.utc)

ROOM_NAMES = [
    "Budi Santoso",
    "Siti Aminah",
    "Rizky Pratama",
    "Dewi Lestari",
    "Andi Wijaya",
    "Maya Putri",
    "Fajar Nugroho",
    "Nadia Rahma",
    "Agus Saputra",
    "Lina Kartika",
]


@dataclass(frozen=True)
class RoomProfile:
    room_id: str
    floor: int
    tenant_name: str
    tenant_email: str
    max_occupants: int
    monthly_limit_kwh: float
    tariff_per_kwh: float
    base_kwh_per_hour: float


@dataclass(frozen=True)
class TenantProfile:
    tenant_id: str
    room_id: str
    full_name: str
    email: str
    phone: str
    occupant_index: int


def stable_id(prefix: str, *parts: object) -> str:
    return "-".join(
        [prefix, *[str(p).replace(":", "").replace("+", "").replace(" ", "_") for p in parts]]
    )


def isoformat_utc(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def period_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m")


def write_csv(path: Path, fieldnames: list[str], rows: Iterable[dict[str, object]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
            count += 1
    return count


def build_rooms() -> list[RoomProfile]:
    rooms: list[RoomProfile] = []
    base_values = [0.42, 0.38, 0.48, 0.35, 0.40, 0.36, 0.50, 0.33, 0.44, 0.37]
    for i in range(ROOM_COUNT):
        room_number = 101 + i
        name = ROOM_NAMES[i]
        slug = name.lower().replace(" ", ".")
        max_occ = 2 if room_number in {103, 107} else 1
        rooms.append(
            RoomProfile(
                room_id=f"R-{room_number}",
                floor=1 if i < 5 else 2,
                tenant_name=name,
                tenant_email=f"{slug}@ampera.local",
                max_occupants=max_occ,
                monthly_limit_kwh=MONTHLY_LIMIT_KWH,
                tariff_per_kwh=TARIFF_PER_KWH,
                base_kwh_per_hour=base_values[i],
            )
        )
    return rooms


def build_tenants(rooms: list[RoomProfile]) -> list[TenantProfile]:
    tenants: list[TenantProfile] = []
    counter = 1
    for room in rooms:
        for occ_idx in range(1, room.max_occupants + 1):
            if occ_idx == 1:
                full_name = room.tenant_name
                email = room.tenant_email
            else:
                full_name = f"{room.tenant_name} {occ_idx}"
                local_part = room.tenant_email.split("@", maxsplit=1)[0]
                email = f"{local_part}.{occ_idx}@ampera.local"
            tenants.append(
                TenantProfile(
                    tenant_id=f"TEN-{counter:03d}",
                    room_id=room.room_id,
                    full_name=full_name,
                    email=email,
                    phone=f"+628120000{counter:04d}",
                    occupant_index=occ_idx,
                )
            )
            counter += 1
    return tenants


def hourly_consumption(room: RoomProfile, dt: datetime) -> float:
    """Generate a realistic hourly kWh value based on time patterns."""
    random.seed(hash((room.room_id, dt)))
    hour = dt.hour
    weekday = dt.weekday()
    month = dt.month

    base = room.base_kwh_per_hour

    shared_mult = 1.25 if room.max_occupants >= 2 else 1.0

    if hour < 5:
        tod_mult = 0.3
    elif hour < 7:
        tod_mult = 0.6
    elif hour < 9:
        tod_mult = 1.2
    elif hour < 12:
        tod_mult = 0.9
    elif hour < 14:
        tod_mult = 0.7
    elif hour < 17:
        tod_mult = 0.8
    elif hour < 20:
        tod_mult = 1.1
    elif hour < 22:
        tod_mult = 1.3
    else:
        tod_mult = 0.7

    weekend_mult = 1.15 if weekday >= 5 else 1.0

    if month in {1, 2, 12}:
        season_mult = 1.15
    elif month in {6, 7, 8, 9}:
        season_mult = 1.20
    else:
        season_mult = 0.95

    noise = random.uniform(0.75, 1.25)

    kwh = base * shared_mult * tod_mult * weekend_mult * season_mult * noise

    if random.random() < 0.008:
        kwh *= random.uniform(3.0, 6.0)

    kwh = max(kwh, 0.01)
    return round(kwh, 4)


def generate_data(
    output_dir: Path,
    end_date: datetime | None = None,
) -> dict[str, int]:
    if end_date is None:
        end_date = datetime(2026, 5, 1, tzinfo=timezone.utc)
    end_date = end_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end_date += timedelta(days=32)
    end_date = end_date.replace(day=1)

    rooms = build_rooms()
    tenants = build_tenants(rooms)
    primary_tenant_by_room = {t.room_id: t for t in tenants if t.occupant_index == 1}
    created_at = START_DATE

    room_rows: list[dict] = []
    for room in rooms:
        pt = primary_tenant_by_room[room.room_id]
        room_rows.append({
            "room_id": room.room_id,
            "floor": room.floor,
            "tenant_name": pt.full_name,
            "tenant_email": pt.email,
            "monthly_limit_kwh": f"{room.monthly_limit_kwh:.4f}",
            "tariff_per_kwh": f"{room.tariff_per_kwh:.4f}",
            "max_occupants": room.max_occupants,
            "created_at": isoformat_utc(created_at),
        })

    tenant_rows: list[dict] = []
    occupancy_rows: list[dict] = []
    user_rows: list[dict] = []
    for tenant in tenants:
        tenant_rows.append({
            "tenant_id": tenant.tenant_id,
            "email": tenant.email,
            "full_name": tenant.full_name,
            "phone": tenant.phone,
            "created_at": isoformat_utc(created_at),
        })
        occupancy_rows.append({
            "occupancy_id": stable_id("OCC", tenant.room_id, tenant.tenant_id),
            "room_id": tenant.room_id,
            "tenant_id": tenant.tenant_id,
            "start_at": isoformat_utc(created_at),
            "end_at": "",
            "status": "active",
            "created_at": isoformat_utc(created_at),
        })
        user_rows.append({
            "user_id": f"USR-{tenant.tenant_id.replace('-', '')}",
            "email": tenant.email,
            "full_name": tenant.full_name,
            "password_hash": "demo-password-hash",
            "role": "user",
            "tenant_id": tenant.tenant_id,
            "room_id": tenant.room_id,
            "is_active": True,
            "created_at": isoformat_utc(created_at),
        })

    user_rows.insert(0, {
        "user_id": "USR-ADMIN",
        "email": "admin@ampera.local",
        "full_name": "Admin Pengelola",
        "password_hash": "demo-password-hash",
        "role": "admin",
        "tenant_id": "",
        "room_id": "",
        "is_active": True,
        "created_at": isoformat_utc(created_at),
    })

    consumption_rows: list[dict] = []
    monthly_cumulative: dict[tuple[str, str], float] = defaultdict(float)
    monthly_totals: dict[tuple[str, str], float] = defaultdict(float)
    weekly_totals: dict[tuple[str, int, int], dict] = {}
    previous_meter_value: dict[str, float] = defaultdict(float)
    cumulative_meter: dict[str, float] = defaultdict(float)
    meter_start: dict[str, datetime] = {}
    meter_current: dict[str, datetime] = {}
    alert_rows: list[dict] = []
    warned_months: set[tuple[str, str, str]] = set()
    warned_80: set[tuple[str, str]] = set()
    warned_100: set[tuple[str, str]] = set()

    t = START_DATE
    while t < end_date:
        month = period_key(t)
        iso_year, iso_week, _ = t.isocalendar()

        for room in rooms:
            kwh = hourly_consumption(room, t)
            monthly_key = (room.room_id, month)
            monthly_cumulative[monthly_key] += kwh
            monthly_totals[monthly_key] += kwh

            consumption_rows.append({
                "log_id": stable_id("LOG", t.strftime("%Y%m%dT%H%M%SZ"), room.room_id),
                "room_id": room.room_id,
                "timestamp": isoformat_utc(t),
                "kwh_used": f"{kwh:.4f}",
                "cumulative_kwh_month": f"{monthly_cumulative[monthly_key]:.4f}",
                "source": "seed_dataset",
            })

            weekly_key = (room.room_id, iso_year, iso_week)
            bucket = weekly_totals.setdefault(weekly_key, {
                "room": room,
                "start": t,
                "end": t,
                "usage": 0.0,
            })
            bucket["end"] = t
            bucket["usage"] += kwh

            if previous_meter_value[room.room_id] == 0.0:
                previous_meter_value[room.room_id] = kwh
                meter_start[room.room_id] = t
            previous_meter_value[room.room_id] += kwh
            meter_current[room.room_id] = t

            cum = monthly_cumulative[monthly_key]
            limit = room.monthly_limit_kwh
            warn_key_80 = (room.room_id, month)
            warn_key_100 = (room.room_id, month)

            if cum >= limit and warn_key_100 not in warned_100:
                warned_100.add(warn_key_100)
                warned_80.discard(warn_key_80)
                alert_rows.append({
                    "alert_id": stable_id("ALT", month, room.room_id, "LIMIT"),
                    "room_id": room.room_id,
                    "alert_type": "limit_exceeded",
                    "message": f"Penggunaan {room.room_id} melewati batas bulanan {limit:.0f} kWh.",
                    "triggered_at": isoformat_utc(t),
                    "is_read": False,
                })
            elif cum >= limit * 0.8 and warn_key_80 not in warned_80 and warn_key_100 not in warned_100:
                warned_80.add(warn_key_80)
                alert_rows.append({
                    "alert_id": stable_id("ALT", month, room.room_id, "WARN"),
                    "room_id": room.room_id,
                    "alert_type": "usage_warning",
                    "message": f"Penggunaan {room.room_id} sudah mencapai 80% batas bulanan.",
                    "triggered_at": isoformat_utc(t),
                    "is_read": False,
                })

        t += timedelta(hours=1)

    meter_rows: list[dict] = []
    for (room_id, year, week), bucket in sorted(weekly_totals.items()):
        room = bucket["room"]
        usage = round(bucket["usage"], 4)
        prev_val = cumulative_meter[room_id]
        curr_val = prev_val + usage
        cumulative_meter[room_id] = curr_val
        meter_rows.append({
            "reading_id": stable_id("READ", year, f"W{week:02d}", room_id),
            "room_id": room_id,
            "submitted_by": room.tenant_email,
            "reading_value_kwh": f"{curr_val:.4f}",
            "previous_reading_value_kwh": f"{prev_val:.4f}",
            "usage_delta_kwh": f"{usage:.4f}",
            "reading_period_start": isoformat_utc(bucket["start"]),
            "reading_period_end": isoformat_utc(bucket["end"]),
            "submitted_at": isoformat_utc(bucket["end"]),
            "source": "seed_dataset",
            "verification_status": "verified",
        })

    billing_rows: list[dict] = []
    for (room_id, month), total_kwh_val in sorted(monthly_totals.items()):
        room = next(r for r in rooms if r.room_id == room_id)
        total_kwh_val = round(total_kwh_val, 4)
        billing_rows.append({
            "billing_id": stable_id("BILL", month, room_id),
            "room_id": room_id,
            "period": month,
            "total_kwh": f"{total_kwh_val:.4f}",
            "total_amount_idr": round(total_kwh_val * room.tariff_per_kwh),
            "status": "generated",
            "generated_at": f"{month}-01T00:00:00Z",
        })

    counts = {
        "rooms": write_csv(
            output_dir / "rooms.csv",
            ["room_id", "floor", "tenant_name", "tenant_email",
             "monthly_limit_kwh", "tariff_per_kwh", "max_occupants", "created_at"],
            room_rows,
        ),
        "tenants": write_csv(
            output_dir / "tenants.csv",
            ["tenant_id", "email", "full_name", "phone", "created_at"],
            tenant_rows,
        ),
        "room_occupancies": write_csv(
            output_dir / "room_occupancies.csv",
            ["occupancy_id", "room_id", "tenant_id", "start_at",
             "end_at", "status", "created_at"],
            occupancy_rows,
        ),
        "users": write_csv(
            output_dir / "users.csv",
            ["user_id", "email", "full_name", "password_hash", "role",
             "tenant_id", "room_id", "is_active", "created_at"],
            user_rows,
        ),
        "consumption_logs": write_csv(
            output_dir / "consumption_logs.csv",
            ["log_id", "room_id", "timestamp", "kwh_used",
             "cumulative_kwh_month", "source"],
            consumption_rows,
        ),
        "meter_readings": write_csv(
            output_dir / "meter_readings.csv",
            ["reading_id", "room_id", "submitted_by", "reading_value_kwh",
             "previous_reading_value_kwh", "usage_delta_kwh",
             "reading_period_start", "reading_period_end", "submitted_at",
             "source", "verification_status"],
            meter_rows,
        ),
        "billing_records": write_csv(
            output_dir / "billing_records.csv",
            ["billing_id", "room_id", "period", "total_kwh",
             "total_amount_idr", "status", "generated_at"],
            billing_rows,
        ),
        "alert_history": write_csv(
            output_dir / "alert_history.csv",
            ["alert_id", "room_id", "alert_type", "message",
             "triggered_at", "is_read"],
            alert_rows,
        ),
    }
    return counts


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate synthetic consumption data (2020-01 to 2026-05) for Ampera AI."
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Output directory for generated CSV files.",
    )
    parser.add_argument(
        "--end-date",
        type=str,
        default=None,
        help="End date in YYYY-MM format (default: 2026-05).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    end_date = None
    if args.end_date:
        parts = args.end_date.split("-")
        end_date = datetime(int(parts[0]), int(parts[1]), 1, tzinfo=timezone.utc)

    counts = generate_data(output_dir=args.output_dir, end_date=end_date)

    print(f"Output directory: {args.output_dir}")
    for table, count in counts.items():
        print(f"- {table}: {count} rows")


if __name__ == "__main__":
    main()
