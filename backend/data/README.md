# Data Seed Pipeline

This folder contains database seed scripts that import backend SQLAlchemy models.

## Flow

Run from the repository root:

```powershell
python data\generate_synthetic.py
python backend\data\seed.py --clear --processed-dir data\processed_new
```

`backend\data\seed.py` calls `app.db.init_db.init_db()` by default, so tables are created before the CSV rows are inserted.

The synthetic generator stops at `2026-05-19 16:00 WIB`. It keeps the existing `billing_records` schema intact and shifts `generated_at` to the month-end timestamp for the generated billing rows, so the demo countdown stays aligned with the end of May 2026 without adding columns.

## Inputs

`seed.py` reads ERD-shaped CSV files from:

```text
data/processed_new/
```

Expected files:

- `rooms.csv`
- `tenants.csv`
- `room_occupancies.csv`
- `users.csv`
- `consumption_logs.csv`
- `meter_readings.csv`
- `billing_records.csv`
- `alert_history.csv`

## Options

```powershell
python backend\data\seed.py --help
```

Common modes:

- `--clear`: delete existing Ampera rows before inserting fresh processed data.
- `--upsert`: skip rows that conflict with existing primary or unique keys.
- `--no-create-tables`: skip automatic `init_db()` if tables already exist.

## Environment

Set `DATABASE_URL` in `backend/.env`, for example:

```text
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/ampera
```
