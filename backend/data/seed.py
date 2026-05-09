from __future__ import annotations

import argparse
import csv
import os
import sys
from collections.abc import Iterable
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError


BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT_DIR = BACKEND_DIR.parent
DEFAULT_PROCESSED_DIR = ROOT_DIR / "data" / "processed"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


TABLE_ORDER = [
    "rooms",
    "tenants",
    "room_occupancies",
    "users",
    "consumption_logs",
    "meter_readings",
    "billing_records",
    "alert_history",
]


BOOL_FIELDS = {
    "users": {"is_active"},
    "alert_history": {"is_read"},
}


INT_FIELDS = {
    "rooms": {"floor", "max_occupants"},
}


FLOAT_FIELDS = {
    "rooms": {"monthly_limit_kwh", "tariff_per_kwh"},
    "consumption_logs": {"kwh_used", "cumulative_kwh_month"},
    "meter_readings": {
        "reading_value_kwh",
        "previous_reading_value_kwh",
        "usage_delta_kwh",
    },
    "billing_records": {"total_kwh", "total_amount_idr"},
}


DATETIME_FIELDS = {
    "rooms": {"created_at"},
    "tenants": {"created_at"},
    "room_occupancies": {"start_at", "end_at", "created_at"},
    "users": {"created_at"},
    "consumption_logs": {"timestamp"},
    "meter_readings": {
        "reading_period_start",
        "reading_period_end",
        "submitted_at",
    },
    "billing_records": {"generated_at"},
    "alert_history": {"triggered_at"},
}


DELETE_ORDER = [
    "alert_history",
    "billing_records",
    "meter_readings",
    "consumption_logs",
    "users",
    "room_occupancies",
    "tenants",
    "rooms",
]


def get_session_local():
    load_backend_env()
    from app.db.database import SessionLocal

    return SessionLocal


def get_model_by_table() -> dict[str, Any]:
    load_backend_env()
    from app.db.models import (
        AlertHistory,
        BillingRecord,
        ConsumptionLog,
        MeterReading,
        Room,
        RoomOccupancy,
        Tenant,
        User,
    )

    return {
        "rooms": Room,
        "tenants": Tenant,
        "room_occupancies": RoomOccupancy,
        "users": User,
        "consumption_logs": ConsumptionLog,
        "meter_readings": MeterReading,
        "billing_records": BillingRecord,
        "alert_history": AlertHistory,
    }


def get_enum_fields() -> dict[str, dict[str, Any]]:
    load_backend_env()
    from app.db.models import (
        AlertType,
        BillingStatus,
        OccupancyStatus,
        ReadingSource,
        UserRole,
        VerificationStatus,
    )

    return {
        "room_occupancies": {"status": OccupancyStatus},
        "users": {"role": UserRole},
        "consumption_logs": {"source": ReadingSource},
        "meter_readings": {
            "source": ReadingSource,
            "verification_status": VerificationStatus,
        },
        "billing_records": {"status": BillingStatus},
        "alert_history": {"alert_type": AlertType},
    }


def parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def load_backend_env() -> None:
    """Load backend/.env when seed.py is run from the repository root."""
    env_path = BACKEND_DIR / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", maxsplit=1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def parse_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "t", "yes", "y"}


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def coerce_row(table_name: str, row: dict[str, str]) -> dict[str, Any]:
    coerced: dict[str, Any] = {}
    enum_fields = get_enum_fields().get(table_name, {})
    bool_fields = BOOL_FIELDS.get(table_name, set())
    int_fields = INT_FIELDS.get(table_name, set())
    float_fields = FLOAT_FIELDS.get(table_name, set())
    datetime_fields = DATETIME_FIELDS.get(table_name, set())

    for key, value in row.items():
        if value == "":
            coerced[key] = None
        elif key in enum_fields:
            coerced[key] = enum_fields[key](value)
        elif key in bool_fields:
            coerced[key] = parse_bool(value)
        elif key in int_fields:
            coerced[key] = int(value)
        elif key in float_fields:
            coerced[key] = float(value)
        elif key in datetime_fields:
            coerced[key] = parse_datetime(value)
        else:
            coerced[key] = value

    return coerced


def chunked(rows: list[dict[str, Any]], size: int) -> Iterable[list[dict[str, Any]]]:
    for index in range(0, len(rows), size):
        yield rows[index : index + size]


def clear_tables() -> None:
    session_local = get_session_local()
    model_by_table = get_model_by_table()

    db = session_local()
    try:
        for table_name in DELETE_ORDER:
            db.execute(delete(model_by_table[table_name]))
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def insert_table(table_name: str, csv_path: Path, batch_size: int, upsert: bool) -> int:
    rows = read_csv_rows(csv_path)
    if not rows:
        return 0

    model = get_model_by_table()[table_name]
    mapped_rows = [coerce_row(table_name, row) for row in rows]
    inserted = 0

    session_local = get_session_local()
    db = session_local()
    try:
        for batch in chunked(mapped_rows, batch_size):
            if upsert:
                stmt = pg_insert(model).values(batch)
                stmt = stmt.on_conflict_do_nothing()
                result = db.execute(stmt)
                inserted += result.rowcount or 0
            else:
                db.bulk_insert_mappings(model, batch)
                inserted += len(batch)
            db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise RuntimeError(
            f"Failed seeding {table_name}. Existing data may conflict; "
            "rerun with --clear or --upsert."
        ) from exc
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    return inserted


def seed(processed_dir: Path, batch_size: int, clear: bool, upsert: bool, create_tables: bool) -> dict[str, int]:
    if create_tables:
        load_backend_env()
        from app.db.init_db import init_db

        init_db()

    missing = [name for name in TABLE_ORDER if not (processed_dir / f"{name}.csv").exists()]
    if missing:
        missing_files = ", ".join(f"{name}.csv" for name in missing)
        raise FileNotFoundError(f"Missing processed CSV file(s): {missing_files}")

    if clear:
        clear_tables()

    counts: dict[str, int] = {}
    for table_name in TABLE_ORDER:
        counts[table_name] = insert_table(
            table_name=table_name,
            csv_path=processed_dir / f"{table_name}.csv",
            batch_size=batch_size,
            upsert=upsert,
        )

    return counts


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed PostgreSQL from data/processed CSV files generated by preprocess.py."
    )
    parser.add_argument(
        "--processed-dir",
        type=Path,
        default=DEFAULT_PROCESSED_DIR,
        help="Directory containing ERD-shaped CSV files.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=5000,
        help="Rows per DB insert batch.",
    )
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Delete existing Ampera rows before inserting processed CSV data.",
    )
    parser.add_argument(
        "--upsert",
        action="store_true",
        help="Skip rows that conflict with existing primary/unique keys.",
    )
    parser.add_argument(
        "--no-create-tables",
        action="store_true",
        help="Do not call init_db() before seeding.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    counts = seed(
        processed_dir=args.processed_dir,
        batch_size=args.batch_size,
        clear=args.clear,
        upsert=args.upsert,
        create_tables=not args.no_create_tables,
    )

    print(f"Seeded from: {args.processed_dir}")
    for table_name in TABLE_ORDER:
        print(f"- {table_name}: {counts[table_name]} rows")


if __name__ == "__main__":
    main()
