# Ampera AI - Agentic AI Status

Dokumen ini sudah saya sesuaikan dengan kondisi repo saat ini.  
Tujuannya: jadi checklist kerja yang nyata, bukan daftar lama yang sudah tidak akurat.

## Ringkasan Cepat

- Sudah aman:
  - prioritas 1
  - prioritas 2
  - prioritas 3
  - prioritas 4
  - prioritas 5
  - `send_notification` sebagai tool DB
  - `run_agent_loop()` sudah sync
  - logging agent sudah aktif
  - output laporan dan tabel markdown sudah rapi
- Perlu revisi:
  - tidak ada
- Belum dibuat:
  - tidak ada

---

## Prioritas Dan Status

| Prioritas | Fokus | Status | Catatan |
|---|---|---|---|
| 1 | Otonom dan threshold alert | Aman | `backend/app/agent/agent.py` sudah bandingkan `cumulative_kwh_month` dengan `monthly_limit_kwh`, dan `backend/app/agent/tools/analyze_pattern.py` sudah mengembalikan `pct_of_limit` serta `limit_alert_type` (`usage_warning` / `limit_exceeded`). |
| 2 | Ollama lokal | Aman | `backend/app/config.py` sekarang punya hybrid fallback: `OLLAMA_BASE_URL` dan `OLLAMA_MODEL` dibaca dari environment, lalu fallback ke `http://localhost:11434` dan `llama3` kalau nilainya kosong atau tidak ada. |
| 3 | Scheduler otonom | Aman | `backend/.env` sudah `ENABLE_SCHEDULER=true`, `backend/app/main.py` sudah punya `shutdown()` untuk `stop_scheduler()`, dan `backend/app/agent/scheduler.py` sudah interval `minutes=5`. |
| 4 | Insight dan deteksi anomali | Aman | `backend/app/agent/tools/analyze_pattern.py` sekarang mengembalikan `time_pattern`, `peak_hours`, `avg_night_kwh`, `daily_trend`, `time_pattern_detail`, dan `daily_trend_ratio`. `backend/app/agent/prompts.py` dan `build_llm_resolution()` juga sudah diarahkan untuk menjelaskan insight waktu. |
| 5 | Chat dan notifikasi | Aman | Flow `SEND_NOTIF` di `backend/app/api/agent.py` sekarang memakai `send_notification()` saat user mengonfirmasi, sehingga alert benar-benar ditulis ke `alert_history` dan respons sukses memakai data insert DB. |
| 6 | Pelengkap | Aman | `run_agent_loop()` sudah sync, logging agent sudah aktif, output laporan sudah lebih rapi, dan `pandas` sudah masuk ke `backend/requirements.txt`. |

---

## Detail Status Per Item

### Aman

- `backend/app/agent/agent.py`
  - `run_ampera_agent()` sudah punya mode DB first dan mock fallback.
  - `_db_agent_loop()` sudah memakai `query_consumption`, `analyze_pattern`, `calculate_bill`, dan `send_notification`.
- `backend/app/agent/scheduler.py`
  - Scheduler aktif bila `ENABLE_SCHEDULER=true`.
  - Interval sudah dibuat lebih cepat untuk demo.
- `backend/app/main.py`
  - Sudah ada `startup()` dan `shutdown()` untuk scheduler.
- `backend/app/agent/tools/send_notification.py`
  - Fungsi sudah benar-benar menyimpan alert ke DB.
- `backend/app/agent/tools/analyze_pattern.py`
  - Sudah mendukung threshold bulanan, pola waktu, `peak_hours`, `avg_night_kwh`, `daily_trend`, `time_pattern_detail`, `daily_trend_ratio`, dan return `pct_of_limit` / `limit_alert_type`.
- `backend/app/api/agent.py`
  - Intent laporan harian dan bulanan sudah dipisah.
  - `REPORT` untuk akhir hari dan bulanan sudah punya jalur yang lebih spesifik.
  - Logging chat dan tool execution sudah aktif untuk debug terminal.
  - Konfirmasi `SEND_NOTIF` sudah memanggil `send_notification()` dan menulis ke `alert_history`.
- `backend/app/agent/tools/compare_rooms.py`
  - Output sudah membedakan konsumsi total dan `kWh per person`, jadi insight lebih adil untuk kamar yang dihuni lebih dari satu orang.
- `frontend/components/chat/ChatMarkdown.tsx`
  - Tabel markdown tidak lagi dipindahkan ke bawah semua; renderer sekarang mempertahankan urutan asli output.
- `backend/app/agent/tools/end_of_day_report.py`
  - Laporan akhir hari sekarang mengangkat tabel ringkasan ke atas agar langsung terlihat setelah judul.
- `backend/app/agent/tools/billing_summary.py`
  - Laporan bulanan dan tahunan sudah memakai tabel markdown yang rapi di bagian awal output.

### Perlu Revisi

- Tidak ada item terbuka di fase ini.

### Belum Dibuat

- Tidak ada item terbuka di fase ini.

---

## Progress Sesi Ini

Yang sudah dibereskan di sesi ini:

- Laporan akhir hari dan laporan bulanan sudah lebih rapih secara format markdown.
- Tabel sekarang tampil di atas, tepat setelah judul, bukan dikumpulkan di bawah semua respons.
- Insight kamar paling boros sekarang membedakan total konsumsi dan konsumsi per penghuni.
- Logging agent dan verbose callback untuk debug sudah diaktifkan di backend.
- `pandas` sudah ditambahkan ke `backend/requirements.txt`.

Yang masih perlu revisi:

- Tidak ada item terbuka di fase ini.

---

## Rekomendasi Urutan Kerja

Kalau targetnya membuat klaim agentic AI lebih kuat dan konsisten, urutan yang paling masuk akal adalah:

1. Tidak ada item terbuka di fase ini.

---

## Catatan

- Saya tidak menghapus isi lama secara mentah, tapi saya ubah isinya agar sesuai dengan keadaan repo sekarang.
- Kalau nanti implementasi berubah lagi, dokumen ini perlu di-update supaya tetap jadi sumber kebenaran yang akurat.
