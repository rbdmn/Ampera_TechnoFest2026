from __future__ import annotations

import json

from app.agent.prompts import AGENT_SYSTEM_PROMPT, PERSONA
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
                    "Halo! Saya deteksi pemakaian listrik lagi tinggi nih. "
                    f"Total pemakaian: {total_kwh} kWh. "
                    f"Estimasi tagihan: Rp {estimated_bill:,.0f}."
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


def _db_agent_loop(tariff: float, dry_run: bool = False) -> dict[str, object]:
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
    tools_used: list[str] = ["query_consumption", "analyze_pattern", "calculate_bill"]
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
                latest = analysis.get("latest_kwh", 0)
                mean_val = analysis.get("mean_kwh", 0)
                message = (
                    f"Kamar {room_id} lagi boros nih! "
                    f"Pemakaian terbaru {latest:.1f} kWh — jauh di atas rata-rata ({mean_val:.1f} kWh). "
                    "Coba cek apakah ada AC atau dispenser yang nyala terus."
                )
                if dry_run:
                    notification = {
                        "status": "dry_run",
                        "room_id": room_id,
                        "alert_type": "anomaly",
                        "message": message,
                    }
                else:
                    notification = send_notification(
                        room_id=room_id,
                        message=message,
                        alert_type="anomaly",
                    )
                    if "send_notification" not in tools_used:
                        tools_used.append("send_notification")
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
        "dry_run": dry_run,
        "flow": ["Observe", "Think", "Plan", "Act", "Evaluate"],
        "tools_used": tools_used,
        "rooms_checked": len(room_ids),
        "room_results": room_results,
        "total_latest_kwh": round(total_latest_kwh, 4),
        "estimated_bill": round(total_estimated_bill, 2),
        "notification_logs": notification_logs,
    }


def build_llm_resolution(agent_result: dict[str, object]) -> dict[str, object]:
    """Ask Ollama to produce the final operational resolution from DB tool output."""
    compact_rooms = []
    for item in agent_result.get("room_results", []):
        if not isinstance(item, dict):
            continue
        analysis = item.get("analysis", {})
        if not isinstance(analysis, dict):
            analysis = {}
        compact_rooms.append(
            {
                "room_id": item.get("room_id"),
                "latest_kwh": item.get("latest_kwh"),
                "cumulative_kwh_month": item.get("cumulative_kwh_month"),
                "estimated_bill": item.get("estimated_bill"),
                "analysis_status": analysis.get("status"),
                "z_score": analysis.get("z"),
                "is_anomaly": analysis.get("is_anomaly"),
                "notification": item.get("notification"),
            }
        )

    payload = {
        "mode": agent_result.get("mode"),
        "dry_run": agent_result.get("dry_run"),
        "flow": agent_result.get("flow"),
        "tools_used": agent_result.get("tools_used"),
        "rooms_checked": agent_result.get("rooms_checked"),
        "total_latest_kwh": agent_result.get("total_latest_kwh"),
        "estimated_bill": agent_result.get("estimated_bill"),
        "notification_logs": agent_result.get("notification_logs"),
        "rooms": compact_rooms,
    }
    prompt = (
        f"{PERSONA}\n\n"
        "Kamu baru saja selesai ngecek semua kamar. Berikut data ringkasan hasil kerjanya.\n"
        "Jelaskan ke admin dalam bahasa Indonesia yang santai dan ramah:\n"
        "- Kamar mana saja yang perlu perhatian dan kenapa\n"
        "- Ada berapa notifikasi yang dibuat/direncanakan\n"
        "- Estimasi tagihan gedung saat ini\n"
        "JANGAN pake istilah teknis (z-score, standar deviasi, anomaly).\n"
        "JANGAN output JSON atau data mentah — jawab dalam bentuk kalimat biasa.\n"
        "Kasih saran hemat energi yang konkret di akhir.\n\n"
        f"DATA RINGKAS:\n{json.dumps(payload, ensure_ascii=False, indent=2)}"
    )

    try:
        response = build_llm().invoke(prompt)
        content = getattr(response, "content", str(response))
        return {
            "status": "ok",
            "model": get_settings().ollama_model,
            "resolution": content,
        }
    except Exception as exc:
        return {
            "status": "error",
            "model": get_settings().ollama_model,
            "error": str(exc),
            "resolution": None,
        }


def run_ampera_agent(
    tariff: float | None = None,
    dry_run: bool = False,
    include_llm_resolution: bool = False,
) -> dict[str, object]:
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
        result = _mock_agent_loop(active_tariff)
        if include_llm_resolution:
            result["llm_resolution"] = build_llm_resolution(result)
        return result

    try:
        result = _db_agent_loop(active_tariff, dry_run=dry_run)
    except Exception as exc:
        result = _mock_agent_loop(active_tariff)
        result["mode"] = "mock_fallback"
        result["db_error"] = str(exc)

    if include_llm_resolution:
        result["llm_resolution"] = build_llm_resolution(result)

    return result


async def chat_with_agent(message: str) -> str:
    """(Legacy) Simple reply for the old compatibility router."""
    return "Halo! Ada yang bisa saya bantu terkait listrik kos?"


async def run_agent_loop() -> dict[str, object]:
    """Compatibility wrapper for the scheduler/API import."""
    return run_ampera_agent()
