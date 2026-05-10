from __future__ import annotations

import json

from langchain.tools import tool


TOOL_DEFINITIONS = [
    {
        "name": "query_consumption",
        "description": "Ambil data konsumsi listrik terbaru dari database.",
    },
    {
        "name": "analyze_pattern",
        "description": "Deteksi pola pemakaian tidak biasa berdasarkan data konsumsi.",
    },
    {
        "name": "calculate_bill",
        "description": "Hitung estimasi tagihan dari total kWh dan tarif listrik.",
    },
    {
        "name": "send_notification",
        "description": "Simpan notifikasi atau peringatan untuk kamar tertentu.",
    },
    {
        "name": "query_room_details",
        "description": "Lihat detail kamar, penghuni, jumlah orang, limit kWh, dan tarif.",
    },
    {
        "name": "get_billing_summary",
        "description": "Tampilkan ringkasan tagihan per kamar atau semua kamar untuk periode tertentu.",
    },
    {
        "name": "list_anomalies",
        "description": "Tampilkan daftar kamar dengan lonjakan pemakaian dalam beberapa hari terakhir.",
    },
    {
        "name": "compare_rooms",
        "description": "Bandingkan beberapa kamar berdasarkan kWh, tagihan, atau pemakaian per orang.",
    },
]


@tool
def get_all_tools() -> str:
    """Tampilkan semua tool Ampera AI beserta deskripsi singkatnya."""
    return json.dumps(TOOL_DEFINITIONS, ensure_ascii=False, indent=2)
