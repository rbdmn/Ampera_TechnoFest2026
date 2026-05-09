from __future__ import annotations

from app.agent.prompts import AGENT_SYSTEM_PROMPT
from app.agent.tools.calculate_bill import calculate_bill
from app.agent.tools.get_mock_consumption import get_mock_consumption
from app.config import get_settings


DEFAULT_TARIFF_IDR = 1444.7
HIGH_USAGE_KWH = 25.0


def build_llm():
    """Create the LangChain chat model used by the agent foundation."""
    from langchain_ollama import ChatOllama

    settings = get_settings()
    client_kwargs = {}
    if settings.ollama_api_key:
        client_kwargs["headers"] = {
            "Authorization": f"Bearer {settings.ollama_api_key}",
        }

    return ChatOllama(
        model=settings.ollama_model,
        base_url=settings.ollama_base_url,
        temperature=settings.ollama_temperature,
        client_kwargs=client_kwargs,
    )


def _mock_agent_loop(tariff: float) -> dict[str, object]:
    """Fallback loop from old_agent.py for development without a configured DB."""
    from app.agent.tools.get_mock_consumption import get_mock_consumption

    data = get_mock_consumption()
    values = [{"kwh": float(item["kwh"])} for item in data]
    total_kwh = sum(item["kwh"] for item in values)
    estimated_bill = calculate_bill(total_kwh=total_kwh, tariff=tariff)

    mean_kwh = total_kwh / len(values) if values else 0.0
    anomalies = [item for item in values if item["kwh"] >= HIGH_USAGE_KWH]
    analysis = {
        "status": "mock",
        "has_anomaly": bool(anomalies),
        "mean_kwh": round(mean_kwh, 2),
        "anomalies": anomalies,
    }

    notification_logs: list[dict[str, str]] = []
    if analysis["has_anomaly"] or total_kwh >= HIGH_USAGE_KWH:
        notification_logs.append(
            {
                "status": "mock",
                "message": (
                    "Ampera AI detected unusual or high electricity usage. "
                    f"Total usage: {total_kwh} kWh. "
                    f"Estimated bill: Rp {estimated_bill:,.0f}."
                ),
            }
        )

    return {
        "mode": "mock",
        "flow": ["Observe", "Think", "Plan", "Act", "Evaluate"],
        "usage_data": data,
        "room_results": [],
        "anomaly_result": analysis,
        "total_kwh": total_kwh,
        "estimated_bill": round(estimated_bill, 2),
        "notification_logs": notification_logs,
    }


def _db_agent_loop(tariff: float) -> dict[str, object]:
    """DB-backed observe-think-act loop integrated with the pulled database layer."""
    from app.agent.tools.analyze_pattern import analyze_pattern
    from app.agent.tools.query_consumption import query_consumption
    from app.agent.tools.send_notification import send_notification
    from app.db.database import SessionLocal
    from app.db.models import Room

    db = SessionLocal()
    try:
        rooms = db.query(Room).all()
        room_ids = [room.room_id for room in rooms]
        tariff_by_room = {
            room.room_id: float(room.tariff_per_kwh or tariff)
            for room in rooms
        }
    finally:
        db.close()

    room_results: list[dict[str, object]] = []
    notification_logs: list[dict[str, str]] = []
    total_latest_kwh = 0.0
    total_estimated_bill = 0.0

    for room_id in room_ids:
        try:
            consumption = query_consumption(room_id=room_id, limit=168)
            logs = consumption.get("logs", [])
            latest_kwh = float(logs[0]["kwh_used"]) if logs else 0.0
            cumulative_kwh = float(logs[0]["cumulative_kwh_month"]) if logs else 0.0
            room_tariff = tariff_by_room.get(room_id, tariff)
            estimated_bill = calculate_bill(total_kwh=cumulative_kwh, tariff=room_tariff)
            analysis = analyze_pattern(room_id=room_id)

            total_latest_kwh += latest_kwh
            total_estimated_bill += estimated_bill

            notification: dict[str, str] | None = None
            if analysis.get("is_anomaly"):
                message = (
                    "Terdeteksi anomali konsumsi listrik. "
                    f"kWh terbaru={analysis.get('latest_kwh'):.3f}, "
                    f"baseline mean={analysis.get('mean_kwh'):.3f}, "
                    f"z={analysis.get('z'):.2f}."
                )
                notification = send_notification(
                    room_id=room_id,
                    message=message,
                    alert_type="anomaly",
                )
                notification_logs.append(notification)

            room_results.append(
                {
                    "room_id": room_id,
                    "latest_kwh": latest_kwh,
                    "cumulative_kwh_month": cumulative_kwh,
                    "estimated_bill": round(estimated_bill, 2),
                    "analysis": analysis,
                    "notification": notification,
                }
            )
        except Exception as exc:
            room_results.append(
                {
                    "room_id": room_id,
                    "status": "error",
                    "error": str(exc),
                }
            )

    return {
        "mode": "db",
        "flow": ["Observe", "Think", "Plan", "Act", "Evaluate"],
        "rooms_checked": len(room_ids),
        "room_results": room_results,
        "total_latest_kwh": round(total_latest_kwh, 4),
        "estimated_bill": round(total_estimated_bill, 2),
        "notification_logs": notification_logs,
    }


def run_ampera_agent(tariff: float | None = None) -> dict[str, object]:
    """Run one Ampera agent loop.

    The agent keeps the old Ollama foundation while preferring the pulled
    DB-backed implementation when DATABASE_URL is configured.
    """
    settings = get_settings()
    active_tariff = float(tariff if tariff is not None else settings.tariff_per_kwh)

    _ = AGENT_SYSTEM_PROMPT
    try:
        _ = build_llm()
    except Exception:
        # The loop itself is deterministic; Ollama can be offline during backend tests.
        pass

    if not settings.database_url:
        return _mock_agent_loop(active_tariff)

    try:
        return _db_agent_loop(active_tariff)
    except Exception as exc:
        result = _mock_agent_loop(active_tariff)
        result["mode"] = "mock_fallback"
        result["db_error"] = str(exc)
        return result


async def chat_with_agent(message: str) -> str:
    """Compatibility entrypoint for the existing API router."""
    result = run_ampera_agent()
    mode = result.get("mode", "unknown")

    if mode == "db":
        return (
            "Ampera AI agent finished one DB-backed monitoring loop. "
            f"Message received: {message}. "
            f"Rooms checked: {result.get('rooms_checked', 0)}. "
            f"Notifications created: {len(result.get('notification_logs', []))}. "
            f"Estimated active bill: Rp {result.get('estimated_bill', 0):,.0f}."
        )

    return (
        "Ampera AI agent finished one mock monitoring loop. "
        f"Message received: {message}. "
        f"Estimated bill: Rp {result.get('estimated_bill', 0):,.0f}."
    )


async def run_agent_loop() -> dict[str, object]:
    """Compatibility wrapper for the scheduler/API import."""
    return run_ampera_agent()
