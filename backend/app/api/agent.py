from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.agent.agent import build_llm
from app.agent.prompts import CHAT_PROMPT, PERSONA
from app.config import get_settings
from app.agent.tools.get_tool_list import TOOL_DEFINITIONS

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    history: list[dict[str, str]] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str


class RunResponse(BaseModel):
    result: dict[str, Any]


class ToolInfo(BaseModel):
    name: str
    description: str


class ToolsResponse(BaseModel):
    tools: list[ToolInfo]


# ─── Intent Classification ───────────────────────────────────────────

_GREETING_RE = re.compile(
    r"^(halo|hai|hay|pagi|siang|sore|malam|tes|test|hello|hi|hey|"
    r"assalamualaikum|makasih|terima kasih|thanks|thank you|oke|ok|siap)\b",
    re.IGNORECASE,
)

_INTENT_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("ANOMALY_CHECK", re.compile(r"(boros|anomali|aneh|tidak biasa|lonjakan|warning|spike)", re.IGNORECASE)),
    ("CONSUMPTION_CHECK", re.compile(r"(konsumsi|pemakaian|kwh|listrik|meter|usage)", re.IGNORECASE)),
    ("BILLING_CHECK", re.compile(r"(tagihan|billing|invoice|rp|rupiah|bayar|harga|biaya)", re.IGNORECASE)),
    ("ROOM_DETAIL", re.compile(r"(kamar\s*\d{3}|penghuni|detail\s+kamar|siapa\s+di)", re.IGNORECASE)),
    ("COMPARE", re.compile(r"(banding|compare|ranking|paling|tertinggi|terendah|terbanyak)", re.IGNORECASE)),
    ("SEND_NOTIF", re.compile(r"(kirim|notifikasi|peringatan|ingatkan|alert|warning)", re.IGNORECASE)),
    ("REPORT", re.compile(r"(laporan|report|ringkasan|summary|rangkuman)", re.IGNORECASE)),
]

_INTENT_LABELS = {
    "ANOMALY_CHECK": "User menanyakan anomali atau pemakaian boros.",
    "CONSUMPTION_CHECK": "User menanyakan data konsumsi listrik.",
    "BILLING_CHECK": "User menanyakan tagihan atau billing.",
    "ROOM_DETAIL": "User menanyakan detail kamar atau penghuni.",
    "COMPARE": "User ingin perbandingan antar kamar.",
    "SEND_NOTIF": "User meminta mengirim notifikasi/peringatan.",
    "REPORT": "User meminta laporan atau ringkasan.",
    "GREETING": "User menyapa atau ngobrol santai.",
    "UNKNOWN": "Pertanyaan tidak jelas kategorinya.",
}


def _classify_intent(message: str) -> str:
    lowered = message.strip().lower()
    if _GREETING_RE.match(lowered):
        return "GREETING"
    for intent, pattern in _INTENT_PATTERNS:
        if pattern.search(lowered):
            return intent
    return "UNKNOWN"


def _format_history(history: list[dict[str, str]]) -> str:
    if not history:
        return "(Belum ada percakapan sebelumnya)"
    lines = []
    for msg in history[-6:]:
        role = "Anda" if msg.get("role") == "user" else "Ampera AI"
        content = msg.get("content", "").replace("\n", " ")
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


# ─── Greeting Handler ───────────────────────────────────────────────

def _greeting_reply(message: str) -> str:
    lowered = message.lower()
    if any(kata in lowered for kata in ["makasih", "terima kasih", "thanks", "thank you"]):
        return "Sama-sama! Kalau ada yang mau ditanya soal listrik kos, bilang aja ya."
    if any(kata in lowered for kata in ["oke", "ok", "siap"]):
        return "Baik! Kapan-kapan kalau mau cek konsumsi atau tagihan, bilang aja ya."
    return (
        "Halo! Ada yang bisa saya bantu terkait listrik kos hari ini?\n\n"
        "Saya bisa:\n"
        "- Cek konsumsi listrik per kamar\n"
        "- Hitung estimasi tagihan\n"
        "- Deteksi pemakaian boros\n"
        "- Kasih saran hemat energi\n\n"
        "Silakan tanya apa pun!"
    )


# ─── Data Preparation (Chat-Safe) ────────────────────────────────────

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


def _extract_period(message: str) -> str | None:
    lowered = message.lower()
    MONTH_MAP = {
        "januari": "01", "februari": "02", "maret": "03",
        "april": "04", "mei": "05", "juni": "06",
        "juli": "07", "agustus": "08", "september": "09",
        "oktober": "10", "november": "11", "desember": "12",
    }

    # "YYYY-MM" or "YYYY/MM"
    match = re.search(r"\b(\d{4})[-/](\d{2})\b", lowered)
    if match:
        year, month = match.group(1), match.group(2)
        if 1 <= int(month) <= 12:
            return f"{year}-{month}"

    # Month name + year: "April 2018"
    for nama, angka in MONTH_MAP.items():
        if nama in lowered:
            match = re.search(r"\b(\d{4})\b", lowered)
            if match:
                return f"{match.group(1)}-{angka}"
            break

    # "tahun 2018" or "periode 2018"
    tahun_match = re.search(r"\btahun\s+(\d{4})\b", lowered)
    if tahun_match:
        return tahun_match.group(1)

    # Standalone 4-digit year (filter plausible years)
    standalone = re.search(r"(?<!\d)(\d{4})(?!\d)", lowered)
    if standalone:
        y = int(standalone.group(1))
        if 2000 <= y <= 2099:
            return standalone.group(1)

    return None


def _is_notification_confirmation(message: str, history: list[dict[str, str]]) -> bool:
    """Cek apakah user sedang mengkonfirmasi pengiriman notifikasi."""
    confirm_words = ["ya", "iya", "iya kirim", "iya notifikasi", "lanjut", "lanjutkan",
                     "kirim", "kirimkan", "oke kirim", "tolong kirim", "silakan kirim",
                     "ya kirim", "ya lanjut", "iya lanjut"]
    lowered = message.lower().strip()
    is_confirm = any(lowered == kw or lowered.startswith(kw) or lowered.startswith(kw + " ")
                     for kw in confirm_words)

    if not is_confirm:
        return False

    if not history:
        return False

    for msg in reversed(history):
        if msg.get("role") == "assistant":
            last_reply = msg.get("content", "").lower()
            return any(kw in last_reply for kw in
                       ["yakin", "konfirmasi", "kirim", "notifikasi", "peringatan",
                        "setuju", "ingin kirim", "dikirim"])
    return False


def _mock_notification_success(room_ids: list[str]) -> str:
    """Hasilkan mock sukses untuk demo."""
    from app.agent.tools import query_room_details

    ts = datetime.now().strftime("%d %B %Y, %H:%M")
    lines = ["=== NOTIFIKASI BERHASIL DIKIRIM ==="]
    lines.append(f"Waktu: {ts}")
    for rid in room_ids[:3]:
        try:
            detail = query_room_details.invoke({"room_id": rid})
            lines.append(f"Kamar: {rid}")
            for line in detail.split("\n"):
                if "Penghuni" in line or "Kamar" in line:
                    lines.append(f"  {line.strip()}")
        except Exception:
            lines.append(f"Kamar: {rid}")
        lines.append(f"  Tipe notifikasi: ⚠️ Peringatan Pemakaian Boros")
        lines.append(f"  Status: ✅ TERKIRIM")
    lines.append(f"Total kamar: {len(room_ids[:3])}")
    return "\n".join(lines)


def _run_tools_for_intent(intent: str, message: str, history: list[dict[str, str]] | None = None) -> list[str]:
    """Jalankan tool yang relevan berdasarkan intent. Hanya READ, never write."""
    from app.agent.tools import (
        compare_rooms,
        get_billing_summary,
        list_anomalies,
        query_consumption,
        query_room_details,
    )

    results: list[str] = []
    room_ids = _extract_room_ids(message)
    period = _extract_period(message)
    history = history or []

    try:
        if intent == "SEND_NOTIF":
            if not room_ids:
                results.append(
                    "Kamar tidak disebutkan. Coba sebutkan kamar yang ingin dikirimi notifikasi."
                )
            elif _is_notification_confirmation(message, history):
                results.append(_mock_notification_success(room_ids))
            else:
                for rid in room_ids[:3]:
                    results.append(query_room_details.invoke({"room_id": rid}))
                results.append(
                    "KONFIRMASI diperlukan sebelum mengirim. "
                    "Tanyakan ke admin apakah yakin ingin mengirim notifikasi."
                )
            return results

        if intent == "ANOMALY_CHECK":
            results.append(list_anomalies.invoke({"days": 7}))

        if intent == "CONSUMPTION_CHECK":
            if room_ids:
                for rid in room_ids[:3]:
                    results.append(str(query_consumption(room_id=rid, limit=24)))
            else:
                summary = query_consumption(room_id=None, limit=1)
                results.append(str(summary))

        if intent == "BILLING_CHECK":
            room_id = room_ids[0] if room_ids else None
            results.append(get_billing_summary.invoke({"room_id": room_id, "period": period}))

        if intent == "ROOM_DETAIL" and room_ids:
            for rid in room_ids[:3]:
                results.append(query_room_details.invoke({"room_id": rid}))

        if intent == "COMPARE" and room_ids:
            params: dict[str, object] = {"room_ids": room_ids, "metric": "kwh"}
            if period:
                params["period"] = period
            results.append(compare_rooms.invoke(params))

        if intent == "REPORT":
            results.append(str(query_consumption(room_id=None, limit=1)))
            results.append(list_anomalies.invoke({"days": 7}))

    except Exception as e:
        results.append(f"(Gagal ambil data: {e})")

    return results if results else ["(Data tidak tersedia untuk pertanyaan ini)"]


def _chat_safe_compact(tool_results: list[str], intent: str) -> str:
    """Gabungkan hasil tool jadi teks aman — tanpa field teknis mentah."""
    if not tool_results or all(r == "(Data tidak tersedia untuk pertanyaan ini)" for r in tool_results):
        return "Tidak ada data yang tersedia saat ini."

    cleaned = []
    for r in tool_results:
        r = re.sub(r"'z':\s*[\d.]+", "", r)
        r = re.sub(r"'is_anomaly':\s*(True|False)", "", r)
        r = re.sub(r"'status':\s*'ok'", "", r)
        r = re.sub(r"'mode':\s*'db'", "", r)
        r = re.sub(r"'tools_used':\s*\[.*?\]", "", r)
        r = re.sub(r"'flow':\s*\[.*?\]", "", r)
        r = re.sub(r"\s+", " ", r).strip()
        if r:
            cleaned.append(r)

    return "\n".join(cleaned) if cleaned else "Tidak ada data yang tersedia."


# ─── Build Chat Reply ────────────────────────────────────────────────

def _build_chat_reply(message: str, intent: str, tool_results: list[str], history: list[dict[str, str]]) -> str:
    data_text = _chat_safe_compact(tool_results, intent)
    history_text = _format_history(history)
    intent_label = _INTENT_LABELS.get(intent, "Pertanyaan umum.")

    prompt = CHAT_PROMPT.format(
        persona=PERSONA.strip(),
        history=history_text,
        intent=intent_label,
        data=data_text,
        message=message,
    )

    try:
        response = build_llm().invoke(prompt)
        reply = str(getattr(response, "content", response))
        reply = _clean_raw_output(reply)
        return reply
    except Exception as e:
        print(f"LLM error: {e}")
        return _fallback_reply(intent)


def _clean_raw_output(text: str) -> str:
    stripped = text.strip()

    if re.match(r"^\s*[\{\[].*[\}\]]\s*$", stripped, flags=re.DOTALL):
        return "Maaf, saya kurang jelas. Bisa coba tanya lagi dengan kata-kata yang berbeda?"

    cleaned = re.sub(r"```(?:json)?\s*\n.*?```", "", stripped, flags=re.DOTALL)
    cleaned = re.sub(r"\{[^}]*'tool'[^}]*\}", "", cleaned)
    cleaned = re.sub(r"\{[^}]*\"tool\"[^}]*\}", "", cleaned)
    cleaned = cleaned.strip()
    return cleaned if cleaned else "Maaf, saya kurang jelas. Bisa coba tanya lagi?"


def _fallback_reply(intent: str) -> str:
    if intent == "GREETING":
        return "Halo! Ada yang bisa saya bantu?"
    if intent == "SEND_NOTIF":
        return "Maaf, saya tidak bisa mengirim notifikasi sekarang. Silakan coba lagi nanti."
    return (
        "Maaf, saya mengalami gangguan. Silakan coba lagi nanti, "
        "atau tanya dengan kata-kata yang berbeda."
    )


# ─── API Endpoints ───────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    message = payload.message.strip()
    intent = _classify_intent(message)

    if intent == "GREETING":
        return ChatResponse(reply=_greeting_reply(message))

    tool_results = _run_tools_for_intent(intent, message, payload.history)
    reply = _build_chat_reply(message, intent, tool_results, payload.history)
    return ChatResponse(reply=reply)


@router.get("/tools", response_model=ToolsResponse)
async def list_agent_tools() -> ToolsResponse:
    return ToolsResponse(tools=[ToolInfo(**tool) for tool in TOOL_DEFINITIONS])


@router.post("/run", response_model=RunResponse)
async def run_agent() -> RunResponse:
    from app.agent.agent import run_ampera_agent

    result = run_ampera_agent(dry_run=False)
    return RunResponse(result=result)
