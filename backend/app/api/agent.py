from __future__ import annotations

import logging
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
logger = logging.getLogger("ampera.agent.chat")


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
    ("COMPARE", re.compile(r"(banding|compare|ranking|paling|tertinggi|terendah|terbanyak)", re.IGNORECASE)),
    ("ANOMALY_CHECK", re.compile(r"(boros|anomali|aneh|tidak biasa|lonjakan|warning|spike)", re.IGNORECASE)),
    ("SEND_NOTIF", re.compile(r"(kirim|notifikasi|peringatan|ingatkan|alert|warning)", re.IGNORECASE)),
    ("CONSUMPTION_CHECK", re.compile(r"(konsumsi|pemakaian|kwh|listrik|meter|usage)", re.IGNORECASE)),
    ("BILLING_CHECK", re.compile(r"(tagihan|billing|invoice|rp|rupiah|bayar|harga|biaya)", re.IGNORECASE)),
    ("ROOM_DETAIL", re.compile(r"(kamar\s*\d{3}|penghuni|detail\s+kamar|siapa\s+di)", re.IGNORECASE)),
    (
        "REPORT",
        re.compile(
            r"(laporan|report|ringkasan|summary|rangkuman|akhir\s+hari|harian|end\s+of\s+day)",
            re.IGNORECASE,
        ),
    ),
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

    room_patterns = [
        r"\bR[-\s]?(\d{3})\b",
        r"\bRoom\s+(\d{3})\b",
        r"\bKamar\s+(\d{3})\b",
        r"\broom\s+(\d{3})\b",
        r"\bkamar\s+(\d{3})\b",
    ]
    for pattern in room_patterns:
        for value in re.findall(pattern, message, flags=re.IGNORECASE):
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

    # Month name + year: "April 2018", or just month name: "April"
    for nama, angka in MONTH_MAP.items():
        if nama in lowered:
            match = re.search(r"\b(\d{4})\b", lowered)
            if match:
                return f"{match.group(1)}-{angka}"
            return f"{datetime.now().year}-{angka}"

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


def _extract_report_scope(message: str) -> dict[str, str | None]:
    lowered = message.lower()
    has_daily_hint = any(
        phrase in lowered
        for phrase in (
            "akhir hari",
            "laporan harian",
            "harian",
            "hari ini",
            "end of day",
            "daily",
        )
    )
    has_month_hint = any(
        phrase in lowered
        for phrase in (
            "bulan",
            "bulanan",
            "month",
            "monthly",
            "periode",
        )
    )

    period = _extract_period(message)

    if has_daily_hint:
        return {"mode": "daily", "period": period}

    if period and len(period) == 7:
        return {"mode": "monthly", "period": period}

    if has_month_hint:
        return {"mode": "monthly", "period": period or datetime.now().strftime("%Y-%m")}

    if period and len(period) == 4:
        return {"mode": "yearly", "period": period}

    return {"mode": "monthly", "period": datetime.now().strftime("%Y-%m")}


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


def _history_text(history: list[dict[str, str]]) -> str:
    return "\n".join(str(msg.get("content", "")) for msg in history if msg.get("content"))


def _parse_iso_timestamp(value: str) -> str | None:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).isoformat()
    except ValueError:
        return None


def _extract_notification_targets(message: str, history: list[dict[str, str]]) -> list[dict[str, str | None]]:
    """Extract room targets and, when present, the source timestamp for each target."""
    current_text = message.strip()
    current_lines = [line.strip() for line in current_text.splitlines() if line.strip()]
    history_text = _history_text(history)
    history_lines = [line.strip() for line in history_text.splitlines() if line.strip()]

    targets: list[dict[str, str | None]] = []
    seen: set[str] = set()

    def _collect(lines: list[str]) -> None:
        for line in lines:
            room_ids = _extract_room_ids(line)
            if not room_ids:
                continue
            triggered_at = None
            match = re.search(
                r"\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)?)\b",
                line,
            )
            if match:
                triggered_at = _parse_iso_timestamp(match.group(1))

            for room_id in room_ids:
                if room_id in seen:
                    continue
                seen.add(room_id)
                targets.append({"room_id": room_id, "triggered_at": triggered_at})

    _collect(current_lines)
    if targets:
        return targets

    # If the confirmation message itself does not include room ids, fall back to history.
    _collect(history_lines)
    if targets:
        return targets

    # Fallback for very short confirmation replies: use the full combined text.
    combined_text = f"{current_text}\n{history_text}"
    for room_id in _extract_room_ids(combined_text):
        if room_id in seen:
            continue
        seen.add(room_id)
        targets.append({"room_id": room_id, "triggered_at": None})

    return targets


def _extract_notification_room_ids(message: str, history: list[dict[str, str]]) -> list[str]:
    return [item["room_id"] for item in _extract_notification_targets(message, history)]


def _extract_alert_type(message: str, history: list[dict[str, str]]) -> str:
    text = f"{message}\n{_history_text(history)}".lower()
    if any(word in text for word in ("limit", "batas", "over limit", "melebihi")):
        return "limit_exceeded"
    if any(word in text for word in ("anomali", "spike", "lonjakan", "tidak biasa")):
        return "anomaly"
    return "usage_warning"


def _extract_notification_message(message: str, history: list[dict[str, str]], room_id: str) -> str:
    text = f"{message}\n{_history_text(history)}"
    match = re.search(r"(?:pesan|message)\s*[:=]\s*(.+)", text, flags=re.IGNORECASE)
    if match:
        candidate = match.group(1).strip().splitlines()[0].strip(" .")
        if candidate:
            return candidate[:1000]

    return (
        f"Peringatan pemakaian listrik untuk kamar {room_id}. "
        "Pemakaian terpantau tinggi, mohon cek perangkat yang menyala dan mulai hemat energi."
    )


def _send_confirmed_notifications(
    targets: list[dict[str, str | None]],
    alert_type: str,
    message: str,
) -> str:
    from app.agent.tools.send_notification import send_notification
    from app.db.database import SessionLocal
    from app.db.models import Room

    db = SessionLocal()
    try:
        valid_room_ids = {
            row[0]
            for row in db.query(Room.room_id).filter(Room.room_id.in_([str(t["room_id"]) for t in targets])).all()
        }
    finally:
        db.close()

    sent_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [
        "## Notifikasi Berhasil Dikirim",
        "",
        "| Kamar | Alert ID | Jenis Alert | Waktu DB | Status |",
        "|---|---|---|---|---|",
    ]
    saved_count = 0
    for target in targets:
        rid = str(target["room_id"])
        triggered_at = target.get("triggered_at")
        if rid not in valid_room_ids:
            logger.warning("[CHAT][TOOLS] skip invalid room_id=%s", rid)
            lines.append(f"| {rid} | - | {alert_type} | {sent_at} | ❌ room tidak ditemukan |")
            continue
        if message.startswith("Peringatan pemakaian listrik untuk kamar "):
            room_message = _extract_notification_message("", [], rid)
        else:
            room_message = message
        logger.info(
            "[CHAT][TOOLS] send_notification(room_id=%s, alert_type=%s, message=%s, triggered_at=%s)",
            rid,
            alert_type,
            room_message,
            triggered_at,
        )
        result = send_notification(
            room_id=rid,
            message=room_message,
            alert_type=alert_type,
            triggered_at=triggered_at,
        )
        logger.info("[CHAT][TOOLS][RESULT] send_notification result=%s", result)
        saved_count += 1
        lines.append(
            f"| {result.get('room_id', rid)} | {result.get('alert_id', '-')} | "
            f"{result.get('alert_type', alert_type)} | {result.get('triggered_at', sent_at)} | "
            "✅ saved |"
        )

    lines.extend(
        [
            "",
            f"Verifikasi: ✅ {saved_count} notifikasi tersimpan ke `alert_history`.",
            f"Waktu eksekusi API: {sent_at}",
            f"Pesan: {message}",
        ]
    )
    return "\n".join(lines)


def _run_tools_for_intent(intent: str, message: str, history: list[dict[str, str]] | None = None) -> list[str]:
    """Jalankan tool yang relevan berdasarkan intent. Hanya READ, never write."""
    from app.agent.tools.anomalies import list_anomalies
    from app.agent.tools.billing_summary import get_billing_summary
    from app.agent.tools.compare_rooms import compare_rooms
    from app.agent.tools.end_of_day_report import get_end_of_day_report
    from app.agent.tools.query_consumption import query_consumption
    from app.agent.tools.room_details import query_room_details

    results: list[str] = []
    room_ids = _extract_room_ids(message)
    notification_targets = _extract_notification_targets(message, history or [])
    notification_room_ids = [item["room_id"] for item in notification_targets]
    period = _extract_period(message)
    report_scope = _extract_report_scope(message)
    history = history or []

    try:
        logger.info("[CHAT] intent=%s message=%s", intent, message)
        if intent == "SEND_NOTIF":
            if not notification_room_ids:
                results.append(
                    "Kamar tidak disebutkan. Coba sebutkan kamar yang ingin dikirimi notifikasi."
                )
            elif _is_notification_confirmation(message, history):
                alert_type = _extract_alert_type(message, history)
                notification_message = _extract_notification_message(
                    message,
                    history,
                    notification_room_ids[0],
                )
                logger.info(
                    "[CHAT][CONFIRM] SEND_NOTIF rooms=%s alert_type=%s",
                    notification_room_ids,
                    alert_type,
                )
                results.append(
                    _send_confirmed_notifications(
                        targets=notification_targets,
                        alert_type=alert_type,
                        message=notification_message,
                    )
                )
            else:
                for rid in notification_room_ids[:3]:
                    results.append(query_room_details.invoke({"room_id": rid}))
                results.append(
                    "KONFIRMASI diperlukan sebelum mengirim. "
                    "Tanyakan ke admin apakah yakin ingin mengirim notifikasi."
                )
            return results

        if intent == "ANOMALY_CHECK":
            logger.info("[CHAT][TOOLS] list_anomalies(days=7)")
            results.append(list_anomalies.invoke({"days": 7}))

        if intent == "CONSUMPTION_CHECK":
            if room_ids:
                for rid in room_ids[:3]:
                    logger.info("[CHAT][TOOLS] query_consumption(room_id=%s, limit=24)", rid)
                    results.append(str(query_consumption(room_id=rid, limit=24)))
            else:
                logger.info("[CHAT][TOOLS] query_consumption(room_id=None, limit=1)")
                summary = query_consumption(room_id=None, limit=1)
                results.append(str(summary))

        if intent == "BILLING_CHECK":
            room_id = room_ids[0] if room_ids else None
            logger.info("[CHAT][TOOLS] get_billing_summary(room_id=%s, period=%s)", room_id, period)
            results.append(get_billing_summary.invoke({"room_id": room_id, "period": period}))

        if intent == "ROOM_DETAIL" and room_ids:
            for rid in room_ids[:3]:
                logger.info("[CHAT][TOOLS] query_room_details(room_id=%s)", rid)
                results.append(query_room_details.invoke({"room_id": rid}))

        if intent == "COMPARE" and room_ids:
            logger.info("[CHAT][TOOLS] compare_rooms(room_ids=%s, period=%s)", room_ids, period)
            results.append(
                compare_rooms.invoke(
                    {
                        "room_ids": room_ids,
                        "metric": "kwh",
                        "period": period,
                    }
                )
            )
            return results

        if intent == "COMPARE":
            all_rooms = query_consumption(room_id=None, limit=1).get("rooms", {})
            selected_room_ids = list(all_rooms.keys())
            if not selected_room_ids:
                results.append("(Data tidak tersedia untuk pertanyaan ini)")
                return results
            logger.info("[CHAT][TOOLS] compare_rooms(room_ids=%s, period=%s)", selected_room_ids, period)
            params: dict[str, object] = {"room_ids": room_ids, "metric": "kwh"}
            if period:
                params["period"] = period
            params["room_ids"] = selected_room_ids
            results.append(compare_rooms.invoke(params))
            return results

        if intent == "REPORT":
            room_id = room_ids[0] if room_ids else None
            if report_scope["mode"] == "daily":
                logger.info("[CHAT][TOOLS] get_end_of_day_report(room_id=%s, reference_date=%s)", room_id, period)
                results.append(
                    get_end_of_day_report.invoke(
                        {
                            "room_id": room_id,
                            "reference_date": period if period and len(period) == 10 else None,
                        }
                    )
                )
            elif report_scope["mode"] == "yearly":
                logger.info("[CHAT][TOOLS] get_billing_summary(room_id=%s, period=%s)", room_id, report_scope["period"])
                results.append(
                    get_billing_summary.invoke(
                        {
                            "room_id": room_id,
                            "period": report_scope["period"],
                        }
                    )
                )
            else:
                logger.info("[CHAT][TOOLS] get_billing_summary(room_id=%s, period=%s)", room_id, report_scope["period"])
                results.append(
                    get_billing_summary.invoke(
                        {
                            "room_id": room_id,
                            "period": report_scope["period"],
                        }
                    )
                )

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


def _hoist_markdown_tables(text: str) -> str:
    """Move markdown tables toward the top of the answer."""
    lines = text.splitlines()
    if not lines:
        return text

    table_blocks: list[list[str]] = []
    kept_lines: list[str] = []

    i = 0
    while i < len(lines):
        line = lines[i]
        next_line = lines[i + 1] if i + 1 < len(lines) else ""
        if (
            not table_blocks
            and line.strip().startswith("|")
            and re.match(r"^\s*\|?[\s:-]+\|[\s|:-]*$", next_line)
        ):
            block = [line, next_line]
            i += 2
            while i < len(lines) and lines[i].strip().startswith("|"):
                block.append(lines[i])
                i += 1
            table_blocks.append(block)
            continue

        kept_lines.append(line)
        i += 1

    if not table_blocks:
        return text

    heading_lines: list[str] = []
    body_lines: list[str] = []
    seen_body = False
    for line in kept_lines:
        if not seen_body and (not line.strip() or line.strip().startswith("#")):
            heading_lines.append(line)
            continue
        seen_body = True
        body_lines.append(line)

    output: list[str] = []
    output.extend(heading_lines)
    if output and output[-1].strip():
        output.append("")

    for idx, block in enumerate(table_blocks):
        output.extend(block)
        if idx != len(table_blocks) - 1:
            output.append("")

    if body_lines:
        if output and output[-1].strip():
            output.append("")
        output.extend(body_lines)

    return "\n".join(output).strip()


def _format_agent_reply(text: str) -> str:
    """Final response formatter used by both direct tool output and LLM output."""
    return _hoist_markdown_tables(text).strip()


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
        return _format_agent_reply(reply)
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
    if intent in {"UNKNOWN", "GREETING"} and _is_notification_confirmation(message, payload.history):
        intent = "SEND_NOTIF"
    report_scope = _extract_report_scope(message) if intent == "REPORT" else None

    logger.info("[CHAT] incoming message=%s", message)
    logger.info("[CHAT] classified intent=%s report_scope=%s", intent, report_scope)

    if intent == "GREETING":
        return ChatResponse(reply=_greeting_reply(message))

    tool_results = _run_tools_for_intent(intent, message, payload.history)
    logger.info("[CHAT] tool_results_count=%s", len(tool_results))
    if intent in {"REPORT", "COMPARE"} and tool_results:
        logger.info("[CHAT] returning direct tool output")
        return ChatResponse(reply=_format_agent_reply(tool_results[0]))
    if intent == "SEND_NOTIF" and tool_results:
        logger.info("[CHAT] returning direct notification tool output")
        return ChatResponse(reply=_format_agent_reply("\n\n".join(tool_results)))

    reply = _build_chat_reply(message, intent, tool_results, payload.history)
    logger.info("[CHAT] final reply ready")
    return ChatResponse(reply=reply)


@router.get("/tools", response_model=ToolsResponse)
async def list_agent_tools() -> ToolsResponse:
    return ToolsResponse(tools=[ToolInfo(**tool) for tool in TOOL_DEFINITIONS])


@router.post("/run", response_model=RunResponse)
async def run_agent() -> RunResponse:
    from app.agent.agent import run_ampera_agent

    logger.info("[CHAT] /agent/run invoked")
    result = run_ampera_agent(dry_run=False)
    logger.info("[CHAT] /agent/run completed mode=%s notifications=%s", result.get("mode"), len(result.get("notification_logs", [])))
    return RunResponse(result=result)
