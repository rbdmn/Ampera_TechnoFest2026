from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


sys.dont_write_bytecode = True

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.agent.agent import run_ampera_agent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the DB-backed Ampera agent and ask Ollama for a final resolution."
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually write notifications to alert_history. Default is dry-run.",
    )
    return parser.parse_args()


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    args = parse_args()
    result = run_ampera_agent(
        dry_run=not args.execute,
        include_llm_resolution=True,
    )

    summary = {
        "mode": result.get("mode"),
        "dry_run": result.get("dry_run"),
        "flow": result.get("flow"),
        "tools_used": result.get("tools_used"),
        "rooms_checked": result.get("rooms_checked"),
        "total_latest_kwh": result.get("total_latest_kwh"),
        "estimated_bill": result.get("estimated_bill"),
        "notification_logs": result.get("notification_logs"),
        "llm_resolution": result.get("llm_resolution"),
    }

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
