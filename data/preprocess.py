"""Preprocess Open Power System Data into Ampera ERD-shaped CSV files.

The source file is hourly, wide-format energy usage. This script maps selected
source columns into simulated boarding-house rooms, then emits normalized CSVs
that match the ERD in docs/ERD Database.png:

- rooms
- tenants
- room_occupancies
- users
- consumption_logs
- meter_readings
- billing_records
- alert_history
"""

from __future__ import annotations

import argparse
import csv
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT_DIR / "backend" / "app" / "db" / "household_data_60min_singleindex.csv"
DEFAULT_OUTPUT_DIR = ROOT_DIR / "data" / "processed"

DEFAULT_TARIFF_PER_KWH = 1444.70
DEFAULT_MONTHLY_LIMIT_KWH = 50.0
DEFAULT_ROOM_COUNT = 10


@dataclass(frozen=True)
class RoomProfile:
    room_id: str
    floor: int
    tenant_name: str
    tenant_email: str
    max_occupants: int
    monthly_limit_kwh: float
    tariff_per_kwh: float
    source_column: str


@dataclass(frozen=True)
class TenantProfile:
    tenant_id: str
    room_id: str
    full_name: str
    email: str
    phone: str
    occupant_index: int


def parse_timestamp(value: str) -> datetime:
    """Parse timestamps from the OPSD CSV into timezone-aware UTC datetimes."""
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def isoformat_utc(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def period_key(value: datetime) -> str:
    return value.strftime("%Y-%m")


def reading_week_key(value: datetime) -> tuple[int, int]:
    iso_year, iso_week, _ = value.isocalendar()
    return iso_year, iso_week


def stable_id(prefix: str, *parts: object) -> str:
    return "-".join([prefix, *[str(part).replace(":", "").replace("+", "").replace(" ", "_") for part in parts]])


def discover_usage_columns(fieldnames: Iterable[str]) -> list[str]:
    """Prefer residential grid-import columns because they represent imported power."""
    fields = list(fieldnames)
    residential_grid = [
        name
        for name in fields
        if name.startswith("DE_KN_residential") and name.endswith("_grid_import")
    ]
    industrial_room = [
        name
        for name in fields
        if name.startswith("DE_KN_industrial3_area_room_")
    ]

    fallback = [
        name
        for name in fields
        if name not in {"utc_timestamp", "cet_cest_timestamp", "interpolated"}
        and not name.endswith("_grid_export")
        and not name.endswith("_pv")
    ]

    ordered: list[str] = []
    for group in (residential_grid, industrial_room, fallback):
        for name in group:
            if name not in ordered:
                ordered.append(name)
    return ordered


def build_rooms(columns: list[str], room_count: int, tariff: float, limit: float) -> list[RoomProfile]:
    selected_columns = columns[:room_count]
    if len(selected_columns) < room_count:
        raise ValueError(
            f"Only found {len(selected_columns)} usable source columns, cannot build {room_count} rooms."
        )

    names = [
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

    rooms: list[RoomProfile] = []
    for index, source_column in enumerate(selected_columns, start=1):
        room_number = 100 + index
        tenant_slug = names[(index - 1) % len(names)].lower().replace(" ", ".")
        max_occupants = 2 if index in {3, 7} else 1
        rooms.append(
            RoomProfile(
                room_id=f"R-{room_number}",
                floor=1 if index <= 5 else 2,
                tenant_name=names[(index - 1) % len(names)],
                tenant_email=f"{tenant_slug}@ampera.local",
                max_occupants=max_occupants,
                monthly_limit_kwh=limit,
                tariff_per_kwh=tariff,
                source_column=source_column,
            )
        )
    return rooms


def build_tenants(rooms: list[RoomProfile]) -> list[TenantProfile]:
    tenants: list[TenantProfile] = []
    counter = 1
    for room in rooms:
        for occupant_index in range(1, room.max_occupants + 1):
            if occupant_index == 1:
                full_name = room.tenant_name
                email = room.tenant_email
            else:
                full_name = f"{room.tenant_name} {occupant_index}"
                local_part = room.tenant_email.split("@", maxsplit=1)[0]
                email = f"{local_part}.{occupant_index}@ampera.local"

            tenants.append(
                TenantProfile(
                    tenant_id=f"TEN-{counter:03d}",
                    room_id=room.room_id,
                    full_name=full_name,
                    email=email,
                    phone=f"+628120000{counter:04d}",
                    occupant_index=occupant_index,
                )
            )
            counter += 1

    return tenants


def write_csv(path: Path, fieldnames: list[str], rows: Iterable[dict[str, object]]) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
            count += 1
    return count


def format_float(value: float) -> str:
    return f"{value:.4f}"


def build_static_rows(
    rooms: list[RoomProfile],
    created_at: datetime,
) -> tuple[
    list[dict[str, object]],
    list[dict[str, object]],
    list[dict[str, object]],
    list[dict[str, object]],
]:
    room_rows = []
    tenant_rows = []
    occupancy_rows = []
    user_rows = []
    tenants = build_tenants(rooms)
    primary_tenant_by_room = {
        tenant.room_id: tenant for tenant in tenants if tenant.occupant_index == 1
    }

    for room in rooms:
        primary_tenant = primary_tenant_by_room[room.room_id]
        room_rows.append(
            {
                "room_id": room.room_id,
                "floor": room.floor,
                "tenant_name": primary_tenant.full_name,
                "tenant_email": primary_tenant.email,
                "monthly_limit_kwh": format_float(room.monthly_limit_kwh),
                "tariff_per_kwh": format_float(room.tariff_per_kwh),
                "max_occupants": room.max_occupants,
                "created_at": isoformat_utc(created_at),
            }
        )

    for tenant in tenants:
        tenant_rows.append(
            {
                "tenant_id": tenant.tenant_id,
                "email": tenant.email,
                "full_name": tenant.full_name,
                "phone": tenant.phone,
                "created_at": isoformat_utc(created_at),
            }
        )
        occupancy_rows.append(
            {
                "occupancy_id": stable_id("OCC", tenant.room_id, tenant.tenant_id),
                "room_id": tenant.room_id,
                "tenant_id": tenant.tenant_id,
                "start_at": isoformat_utc(created_at),
                "end_at": "",
                "status": "active",
                "created_at": isoformat_utc(created_at),
            }
        )
        user_rows.append(
            {
                "user_id": f"USR-{tenant.tenant_id.replace('-', '')}",
                "email": tenant.email,
                "full_name": tenant.full_name,
                "password_hash": "demo-password-hash",
                "role": "user",
                "tenant_id": tenant.tenant_id,
                "room_id": tenant.room_id,
                "is_active": True,
                "created_at": isoformat_utc(created_at),
            }
        )

    user_rows.insert(
        0,
        {
            "user_id": "USR-ADMIN",
            "email": "admin@ampera.local",
            "full_name": "Admin Pengelola",
            "password_hash": "demo-password-hash",
            "role": "admin",
            "tenant_id": "",
            "room_id": "",
            "is_active": True,
            "created_at": isoformat_utc(created_at),
        },
    )
    return room_rows, tenant_rows, occupancy_rows, user_rows


def preprocess(
    input_path: Path,
    output_dir: Path,
    room_count: int,
    tariff_per_kwh: float,
    monthly_limit_kwh: float,
) -> dict[str, int]:
    with input_path.open("r", newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        if not reader.fieldnames:
            raise ValueError("Input CSV has no header row.")

        usage_columns = discover_usage_columns(reader.fieldnames)
        rooms = build_rooms(usage_columns, room_count, tariff_per_kwh, monthly_limit_kwh)
        room_by_column = {room.source_column: room for room in rooms}

        consumption_rows: list[dict[str, object]] = []
        monthly_totals: dict[tuple[str, str], float] = defaultdict(float)
        weekly_totals: dict[tuple[str, int, int], dict[str, object]] = {}
        monthly_cumulative: dict[tuple[str, str], float] = defaultdict(float)
        previous_meter_value: dict[str, float] = {}
        alert_rows: list[dict[str, object]] = []
        warned_months: set[tuple[str, str, str]] = set()

        first_timestamp: datetime | None = None
        for row in reader:
            raw_timestamp = row.get("utc_timestamp", "")
            if not raw_timestamp:
                continue

            timestamp = parse_timestamp(raw_timestamp)
            first_timestamp = first_timestamp or timestamp
            month = period_key(timestamp)
            week_year, week = reading_week_key(timestamp)

            for column, room in room_by_column.items():
                raw_kwh = row.get(column, "")
                if raw_kwh in {"", None}:
                    continue

                current_meter_value = max(float(raw_kwh), 0.0)
                previous_value = previous_meter_value.get(room.room_id)
                previous_meter_value[room.room_id] = current_meter_value

                if previous_value is None:
                    kwh_used = 0.0
                else:
                    kwh_used = max(current_meter_value - previous_value, 0.0)
                monthly_key = (room.room_id, month)
                monthly_cumulative[monthly_key] += kwh_used
                monthly_totals[monthly_key] += kwh_used

                log_id = stable_id("LOG", timestamp.strftime("%Y%m%dT%H%M%SZ"), room.room_id)
                consumption_rows.append(
                    {
                        "log_id": log_id,
                        "room_id": room.room_id,
                        "timestamp": isoformat_utc(timestamp),
                        "kwh_used": format_float(kwh_used),
                        "cumulative_kwh_month": format_float(monthly_cumulative[monthly_key]),
                        "source": "seed_dataset",
                    }
                )

                weekly_key = (room.room_id, week_year, week)
                bucket = weekly_totals.setdefault(
                    weekly_key,
                    {
                        "room": room,
                        "start": timestamp,
                        "end": timestamp,
                        "usage": 0.0,
                    },
                )
                bucket["end"] = timestamp
                bucket["usage"] = float(bucket["usage"]) + kwh_used

                usage_ratio = monthly_cumulative[monthly_key] / room.monthly_limit_kwh
                if usage_ratio >= 1.0 and (room.room_id, month, "limit_exceeded") not in warned_months:
                    warned_months.add((room.room_id, month, "limit_exceeded"))
                    alert_rows.append(
                        {
                            "alert_id": stable_id("ALT", month, room.room_id, "LIMIT"),
                            "room_id": room.room_id,
                            "alert_type": "limit_exceeded",
                            "message": (
                                f"Penggunaan {room.room_id} melewati batas bulanan "
                                f"{room.monthly_limit_kwh:.0f} kWh."
                            ),
                            "triggered_at": isoformat_utc(timestamp),
                            "is_read": False,
                        }
                    )
                elif usage_ratio >= 0.8 and (room.room_id, month, "usage_warning") not in warned_months:
                    warned_months.add((room.room_id, month, "usage_warning"))
                    alert_rows.append(
                        {
                            "alert_id": stable_id("ALT", month, room.room_id, "WARN"),
                            "room_id": room.room_id,
                            "alert_type": "usage_warning",
                            "message": (
                                f"Penggunaan {room.room_id} sudah mencapai 80% batas bulanan."
                            ),
                            "triggered_at": isoformat_utc(timestamp),
                            "is_read": False,
                        }
                    )

    if first_timestamp is None:
        raise ValueError("Input CSV did not contain any usable timestamped data.")

    room_rows, tenant_rows, occupancy_rows, user_rows = build_static_rows(rooms, first_timestamp)

    meter_rows: list[dict[str, object]] = []
    cumulative_meter: dict[str, float] = defaultdict(float)
    for (room_id, year, week), bucket in sorted(weekly_totals.items()):
        room = bucket["room"]
        usage = float(bucket["usage"])
        previous_value = cumulative_meter[room_id]
        current_value = previous_value + usage
        cumulative_meter[room_id] = current_value
        start = bucket["start"]
        end = bucket["end"]
        meter_rows.append(
            {
                "reading_id": stable_id("READ", year, f"W{week:02d}", room_id),
                "room_id": room_id,
                "submitted_by": room.tenant_email,
                "reading_value_kwh": format_float(current_value),
                "previous_reading_value_kwh": format_float(previous_value),
                "usage_delta_kwh": format_float(usage),
                "reading_period_start": isoformat_utc(start),
                "reading_period_end": isoformat_utc(end),
                "submitted_at": isoformat_utc(end),
                "source": "seed_dataset",
                "verification_status": "verified",
            }
        )

    billing_rows: list[dict[str, object]] = []
    for (room_id, month), total_kwh in sorted(monthly_totals.items()):
        room = next(room for room in rooms if room.room_id == room_id)
        billing_rows.append(
            {
                "billing_id": stable_id("BILL", month, room_id),
                "room_id": room_id,
                "period": month,
                "total_kwh": format_float(total_kwh),
                "total_amount_idr": round(total_kwh * room.tariff_per_kwh),
                "status": "generated",
                "generated_at": f"{month}-01T00:00:00Z",
            }
        )

    counts = {
        "rooms": write_csv(
            output_dir / "rooms.csv",
            [
                "room_id",
                "floor",
                "tenant_name",
                "tenant_email",
                "monthly_limit_kwh",
                "tariff_per_kwh",
                "max_occupants",
                "created_at",
            ],
            room_rows,
        ),
        "tenants": write_csv(
            output_dir / "tenants.csv",
            ["tenant_id", "email", "full_name", "phone", "created_at"],
            tenant_rows,
        ),
        "room_occupancies": write_csv(
            output_dir / "room_occupancies.csv",
            ["occupancy_id", "room_id", "tenant_id", "start_at", "end_at", "status", "created_at"],
            occupancy_rows,
        ),
        "users": write_csv(
            output_dir / "users.csv",
            [
                "user_id",
                "email",
                "full_name",
                "password_hash",
                "role",
                "tenant_id",
                "room_id",
                "is_active",
                "created_at",
            ],
            user_rows,
        ),
        "consumption_logs": write_csv(
            output_dir / "consumption_logs.csv",
            ["log_id", "room_id", "timestamp", "kwh_used", "cumulative_kwh_month", "source"],
            consumption_rows,
        ),
        "meter_readings": write_csv(
            output_dir / "meter_readings.csv",
            [
                "reading_id",
                "room_id",
                "submitted_by",
                "reading_value_kwh",
                "previous_reading_value_kwh",
                "usage_delta_kwh",
                "reading_period_start",
                "reading_period_end",
                "submitted_at",
                "source",
                "verification_status",
            ],
            meter_rows,
        ),
        "billing_records": write_csv(
            output_dir / "billing_records.csv",
            ["billing_id", "room_id", "period", "total_kwh", "total_amount_idr", "status", "generated_at"],
            billing_rows,
        ),
        "alert_history": write_csv(
            output_dir / "alert_history.csv",
            ["alert_id", "room_id", "alert_type", "message", "triggered_at", "is_read"],
            alert_rows,
        ),
    }
    return counts


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert OPSD household CSV into Ampera ERD-shaped processed CSVs."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="Path to raw OPSD CSV.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR, help="Directory for processed CSVs.")
    parser.add_argument("--room-count", type=int, default=DEFAULT_ROOM_COUNT, help="Number of simulated rooms to create.")
    parser.add_argument("--tariff", type=float, default=DEFAULT_TARIFF_PER_KWH, help="Tariff per kWh in IDR.")
    parser.add_argument("--monthly-limit", type=float, default=DEFAULT_MONTHLY_LIMIT_KWH, help="Monthly room limit in kWh.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    counts = preprocess(
        input_path=args.input,
        output_dir=args.output_dir,
        room_count=args.room_count,
        tariff_per_kwh=args.tariff,
        monthly_limit_kwh=args.monthly_limit,
    )

    print(f"Processed source: {args.input}")
    print(f"Output directory: {args.output_dir}")
    for table, count in counts.items():
        print(f"- {table}: {count} rows")


if __name__ == "__main__":
    main()
