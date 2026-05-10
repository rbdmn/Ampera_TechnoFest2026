from __future__ import annotations

import json
import re
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.agent.agent import build_llm, run_ampera_agent
from app.config import get_settings
from app.agent.tools.get_tool_list import TOOL_DEFINITIONS

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)


class ChatResponse(BaseModel):
    reply: str


class RunResponse(BaseModel):
    result: dict[str, Any]


class ToolInfo(BaseModel):
    name: str
    description: str


class ToolsResponse(BaseModel):
    tools: list[ToolInfo]


def _compact_agent_result(result: dict[str, Any]) -> dict[str, Any]:
    rooms: list[dict[str, Any]] = []
    for item in result.get("room_results", []):
        if not isinstance(item, dict):
            continue
        analysis = item.get("analysis", {})
        if not isinstance(analysis, dict):
            analysis = {}
        rooms.append(
            {
                "room_id": item.get("room_id"),
                "latest_kwh": item.get("latest_kwh"),
                "cumulative_kwh_month": item.get("cumulative_kwh_month"),
                "estimated_bill": item.get("estimated_bill"),
                "is_anomaly": analysis.get("is_anomaly"),
                "analysis_status": analysis.get("status"),
                "z_score": analysis.get("z"),
                "error": item.get("error"),
            }
        )

    return {
        "mode": result.get("mode"),
        "dry_run": result.get("dry_run"),
        "flow": result.get("flow"),
        "tools_used": result.get("tools_used"),
        "rooms_checked": result.get("rooms_checked"),
        "total_latest_kwh": result.get("total_latest_kwh"),
        "estimated_bill": result.get("estimated_bill"),
        "notification_logs": result.get("notification_logs"),
        "rooms": rooms,
    }


def _fallback_reply(message: str, result: dict[str, Any]) -> str:
    notifications = result.get("notification_logs", [])
    return (
        "Ampera AI selesai menjalankan monitoring loop. "
        f"Konteks pertanyaan: {message}. "
        f"Mode: {result.get('mode', 'unknown')}. "
        f"Kamar dicek: {result.get('rooms_checked', 0)}. "
        f"Notifikasi dibuat/direncanakan: {len(notifications) if isinstance(notifications, list) else 0}. "
        f"Estimasi tagihan aktif: Rp {float(result.get('estimated_bill') or 0):,.0f}."
    )


def _extract_room_ids(message: str) -> list[str]:
    found: list[str] = []
    for start, end in re.findall(r"\b(?:R-)?(\d{3})\s*-\s*(?:R-)?(\d{3})\b", message, flags=re.IGNORECASE):
        for number in range(int(start), int(end) + 1):
            found.append(f"R-{number}")

    for number in re.findall(r"\bR-?(\d{3})\b|\bkamar\s+(\d{3})\b", message, flags=re.IGNORECASE):
        value = next(item for item in number if item)
        found.append(f"R-{value}")

    unique: list[str] = []
    for room_id in found:
        if room_id not in unique:
            unique.append(room_id)
    return unique


def _collect_tool_context(message: str) -> list[str]:
    from app.agent.tools import compare_rooms, get_billing_summary, list_anomalies, query_room_details

    lowered = message.lower()
    room_ids = _extract_room_ids(message)
    context: list[str] = []

    if room_ids and any(keyword in lowered for keyword in ["penghuni", "siapa", "detail", "kamar"]):
        for room_id in room_ids[:5]:
            context.append(query_room_details.invoke({"room_id": room_id}))

    if room_ids and any(keyword in lowered for keyword in ["banding", "compare", "ranking"]):
        context.append(compare_rooms.invoke({"room_ids": room_ids, "metric": "kwh"}))

    if any(keyword in lowered for keyword in ["tagihan", "billing", "bill", "invoice"]):
        room_id = room_ids[0] if room_ids else None
        context.append(get_billing_summary.invoke({"room_id": room_id, "period": None}))

    if any(keyword in lowered for keyword in ["anomali", "aneh", "tidak biasa", "boros", "lonjakan"]):
        context.append(list_anomalies.invoke({"days": 7}))

    return context


def _build_chat_reply(message: str, result: dict[str, Any]) -> str:
    payload = _compact_agent_result(result)
    tool_context = _collect_tool_context(message)
    prompt = (
        "You are Ampera AI, an Indonesian energy monitoring assistant for boarding houses.\n"
        "Answer the admin's message using only the agent result JSON.\n"
        "You have 8 tools available:\n"
        "1. query_consumption: cek konsumsi listrik terbaru.\n"
        "2. analyze_pattern: cari pemakaian yang tidak biasa.\n"
        "3. calculate_bill: hitung estimasi tagihan.\n"
        "4. send_notification: buat notifikasi/peringatan.\n"
        "5. query_room_details: cek lantai, penghuni, jumlah orang, limit, dan tarif kamar.\n"
        "6. get_billing_summary: lihat tagihan kamar atau semua kamar per periode.\n"
        "7. list_anomalies: daftar lonjakan pemakaian beberapa hari terakhir.\n"
        "8. compare_rooms: bandingkan kamar berdasarkan kWh, tagihan, atau per orang.\n"
        "If the admin asks about penghuni, kamar detail, or 'siapa penghuni kamar 103', use room detail context.\n"
        "If the admin asks to compare rooms, such as 'bandingkan kamar 101-105', use comparison context.\n"
        "If the admin asks about bills, use billing context. If they ask about unusual usage, use anomaly context.\n"
        "Use friendly Indonesian with 'Anda'. Keep it conversational, simple, and easy to understand.\n"
        "Avoid technical jargon like z-score, telemetry, standard deviation, anomaly, tool output, or JSON. "
        "Use simple words like 'boros', 'tidak biasa', 'tagihan naik', or 'perlu dicek'.\n"
        "Focus on what happened, why it matters for the bill, and what the admin or tenant should do next.\n"
        "Keep each insight short: maximum 2-3 sentences. If there are multiple rooms, use short bullet points. "
        "Mention only rooms that need attention unless the admin asks for all rooms.\n"
        "Do not dump raw data. Round numbers and include kWh or rupiah only when it makes the advice clearer.\n\n"
        "Example response style:\n"
        "- Kamar 103 agak boros nih. AC menyala 16 jam/hari. Coba kurangi jadi 12 jam, bisa hemat ~30% tagihan.\n"
        "- Kamar 107 sudah mendekati batas bulanan. Anda bisa ingatkan penghuni untuk cek AC, dispenser, atau charger yang menyala terus.\n"
        "- Tidak ada kamar yang terlihat boros hari ini. Tetap pantau pemakaian malam hari karena biasanya tagihan naik dari perangkat yang lupa dimatikan.\n\n"
        f"ADMIN_MESSAGE:\n{message}\n\n"
        f"TOOL_CONTEXT:\n{chr(10).join(tool_context) if tool_context else 'Tidak ada konteks tool tambahan.'}\n\n"
        f"AGENT_RESULT_JSON:\n{json.dumps(payload, ensure_ascii=False, indent=2)}"
    )
    try:
        response = build_llm().invoke(prompt)
        return str(getattr(response, "content", response))
    except Exception as e:
        # Log error untuk debugging
        print(f"LLM error: {e}")
        return _fallback_reply(message, result)


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    # Selalu dry_run untuk chat — tidak menulis ke DB, hanya analisis
    result = run_ampera_agent(dry_run=True)
    reply = _build_chat_reply(payload.message, result)
    return ChatResponse(reply=reply)


@router.get("/tools", response_model=ToolsResponse)
async def list_agent_tools() -> ToolsResponse:
    return ToolsResponse(tools=[ToolInfo(**tool) for tool in TOOL_DEFINITIONS])


@router.post("/run", response_model=RunResponse)
async def run_agent() -> RunResponse:
    result = run_ampera_agent(dry_run=False)
    return RunResponse(result=result)
