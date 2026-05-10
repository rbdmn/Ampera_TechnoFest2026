# Version Notes

## Recent Commits

- `50556a8` - Initial backend codebase added.
- `7959f72` - Documentation update.
- `43aad5c` - Initial commit.

## Current Work

- LangChain agent now uses Ollama instead of OpenAI.
- Current model: `gpt-oss:120b-cloud`.
- No OpenAI API key is required.
- Ollama config is now loaded from `backend/.env`:
  - `OLLAMA_MODEL`
  - `OLLAMA_BASE_URL`
  - `OLLAMA_API_KEY`
  - `OLLAMA_TEMPERATURE`
- Added a simple agent runner at `backend/app/agent/test_run.py`.
- Added `langchain-ollama` dependency in `backend/requirements.txt`.
- `backend/app/config.py` now reads `backend/.env` using an absolute backend path, so scripts can be run from the repository root.

## Session Progress

### Data Pipeline

- Added `data/preprocess.py`.
- Preprocess maps `backend/app/db/household_data_60min_singleindex.csv` into ERD-shaped CSV files under `data/processed/`.
- Output tables now match the updated ERD/backend models:
  - `rooms`
  - `tenants`
  - `room_occupancies`
  - `users`
  - `consumption_logs`
  - `meter_readings`
  - `billing_records`
  - `alert_history`
- `rooms.csv` includes `max_occupants`.
- `users.csv` includes both `tenant_id` and `room_id`.
- Sharing-room simulation is included for `R-103` and `R-107`.

### PostgreSQL Seeding

- Added `backend/data/seed.py`.
- Added `backend/data/README.md`.
- Seed flow:
  ```bash
  python data/preprocess.py
  python backend/data/seed.py --clear
  ```
- `seed.py` calls `init_db()` by default before inserting.
- Insert order follows FK dependencies:
  ```text
  rooms -> tenants -> room_occupancies -> users -> consumption_logs -> meter_readings -> billing_records -> alert_history
  ```
- `seed.py` supports:
  - `--clear`
  - `--upsert`
  - `--no-create-tables`

### Agent + DB Integration

- Updated `backend/app/agent/agent.py` to combine:
  - pulled DB-backed agent loop
  - old Ollama foundation
  - mock fallback when DB is unavailable
- `run_ampera_agent()` now supports:
  - `dry_run`
  - `include_llm_resolution`
- DB-backed loop uses:
  - `query_consumption`
  - `analyze_pattern`
  - `calculate_bill`
  - `send_notification` only when not in dry-run and an anomaly is detected
- Added lazy tool loading in `backend/app/agent/tools/__init__.py` so importing the agent does not fail when `DATABASE_URL` is missing.

### LLM Diagnostic Test

- Added `backend/app/agent/test_llm_db_flow.py`.
- Safe dry-run test:
  ```bash
  venv/Scripts/python.exe backend/app/agent/test_llm_db_flow.py
  ```
- Execute alert writes:
  ```bash
  venv/Scripts/python.exe backend/app/agent/test_llm_db_flow.py --execute
  ```
- The diagnostic prints:
  - mode (`db`, `mock`, or `mock_fallback`)
  - flow
  - tools used
  - rooms checked
  - notification logs
  - Ollama-generated operational resolution
- Current implementation is deterministic tool execution followed by LLM resolution, not full autonomous LLM tool-calling.

## Crucial Notes

- Start Ollama before running the agent:
  ```bash
  ollama serve
  ```
- Install the required model:
  ```bash
  ollama pull gpt-oss:120b-cloud
  ```
- Test the agent:
  ```bash
  venv/Scripts/python.exe backend/app/agent/test_run.py
  ```
- If `python backend/app/agent/test_run.py` returns `mock_fallback` with `No module named 'psycopg'`, use the project venv or install dependencies into the active interpreter:
  ```bash
  venv/Scripts/activate
  pip install -r backend/requirements.txt
  ```
- A successful DB-backed agent run should include:
  ```text
  'mode': 'db'
  'rooms_checked': 10
  ```
