# Ampera AI — System Overview

> AI Agent untuk pengelolaan listrik bersama di lingkungan kos/rusun.  
> Hemat energi · Tagihan adil · Kurangi konflik sosial

---

## 1. Overview

**Ampera AI** (Arti: Gabungan Ampere + Bersama) adalah sistem berbasis AI agent tunggal (single-agent) yang membantu pengelola dan penghuni kos/rusun dalam:

- Memantau konsumsi listrik secara real-time
- Membagi tagihan listrik secara proporsional dan transparan
- Mendeteksi penggunaan anomali dan memberikan notifikasi proaktif
- Menghasilkan insight hemat energi berbasis pola historis

---

## 2. Problem Statement

| Masalah | Dampak |
|---|---|
| Tagihan listrik dibagi rata meski pemakaian berbeda | Ketidakadilan, konflik antar penghuni |
| Tidak ada visibilitas konsumsi per kamar | Sulit mendeteksi pemborosan |
| Tidak ada peringatan dini penggunaan berlebih | Tagihan membengkak di akhir bulan |
| Pengelola tidak punya data untuk pengambilan keputusan | Manajemen reaktif, bukan proaktif |

---

## 3. Solution Overview

```
Sensor/Data → Ampera AI Agent → Dashboard + Notifikasi
```

- Agent membaca data konsumsi listrik periodik (per jam)
- Menghitung penggunaan per kamar dan total gedung
- Mendeteksi pola abnormal, memproyeksikan tagihan akhir bulan
- Mengirim notifikasi otomatis ke penghuni yang melebihi batas
- Menghasilkan laporan tagihan siap pakai untuk pengelola

---

## 4. Use Case

### 👤 Admin (Pengelola Kos)

- Melihat total konsumsi listrik gedung (harian/bulanan)
- Melihat breakdown penggunaan per kamar
- Mengunduh laporan tagihan bulanan (PDF/CSV)
- Mendapat insight: kamar mana yang paling boros, tren penggunaan

### 🙋 User (Penghuni Kos)

- Melihat konsumsi listrik kamar sendiri
- Melihat estimasi tagihan bulan berjalan
- Menerima notifikasi jika penggunaan mendekati/melebihi batas
- Melihat tips hemat energi yang dipersonalisasi

---

## 5. Tech Stack

| Layer | Teknologi | Keterangan |
|---|---|---|
| Frontend | Next.js (React) | Dashboard admin & user |
| Backend | FastAPI (Python) | REST API, business logic |
| AI Agent | LangChain | Agentic loop, reasoning, tool calls |
| Database | PostgreSQL | Penyimpanan data konsumsi & pengguna |
| Data Processing | Pandas | Agregasi, analisis pola, baseline |
| Charting | Recharts | Visualisasi grafik konsumsi |

---

## 6. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│   ┌──────────────────┐      ┌──────────────────┐        │
│   │  Admin Dashboard │      │  User Dashboard  │        │
│   │   (Next.js)      │      │   (Next.js)      │        │
│   └────────┬─────────┘      └────────┬─────────┘        │
└────────────┼────────────────────────┼─────────────────── ┘
             │         REST API        │
             ▼                         ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND LAYER                         │
│                   FastAPI (Python)                       │
│   ┌────────────────────────────────────────────────┐    │
│   │              Ampera AI Agent                │    │
│   │              (LangChain)                       │    │
│   │                                                │    │
│   │  Observe → Think → Plan → Act → Evaluate       │    │
│   │                    ↑__________________________ │    │
│   │                    Adaptive Loop               │    │
│   └──────────────────────┬─────────────────────────┘    │
│                          │                               │
│        ┌─────────────────┼──────────────────┐           │
│        ▼                 ▼                  ▼            │
│   [Tool: Query DB] [Tool: Analyze]  [Tool: Notify]      │
└──────────────────────────┼──────────────────────────────┘
                           │
             ┌─────────────▼──────────────┐
             │        PostgreSQL           │
             │  - consumption_logs         │
             │  - rooms / users            │
             │  - billing_records          │
             │  - alert_history            │
             └────────────────────────────┘
```

---

## 7. Agentic Loop Explanation

Agent berjalan dalam loop periodik (setiap jam atau on-demand):

```
┌──────────┐
│ OBSERVE  │  ← Baca data konsumsi terbaru dari DB
└────┬─────┘
     │
┌────▼─────┐
│  THINK   │  ← Bandingkan dengan baseline & threshold
└────┬─────┘
     │
┌────▼─────┐
│   PLAN   │  ← Tentukan aksi: notifikasi? laporan? insight?
└────┬─────┘
     │
┌────▼─────┐
│   ACT    │  ← Eksekusi: tulis ke DB, kirim notif, generate laporan
└────┬─────┘
     │
┌────▼─────┐
│ EVALUATE │  ← Apakah aksi berhasil? Ada error?
└────┬─────┘
     │
┌────▼──────────────┐
│  ADAPTIVE LOOP    │  ← Update threshold / rekomendasi jika pola berubah
└───────────────────┘
```

**Tools yang dimiliki agent:**

| Tool | Fungsi |
|---|---|
| `query_consumption` | Ambil data konsumsi dari DB |
| `analyze_pattern` | Analisis tren & deteksi anomali (Pandas) |
| `calculate_bill` | Hitung estimasi tagihan per kamar |
| `send_notification` | Kirim notifikasi ke penghuni |
| `generate_report` | Buat laporan billing bulanan |

---

## 8. Data Source

**Dataset:** [Open Power System Data — Household Data (2020-04-15)](https://data.open-power-system-data.org/household_data/2020-04-15)

| Kegunaan | Detail |
|---|---|
| Simulasi konsumsi listrik | Data penggantian sensor per kamar (kWh/jam) |
| Baseline usage | Rata-rata konsumsi rumah tangga sebagai acuan normal |
| Pattern analysis | Identifikasi jam sibuk, pola harian/mingguan |

**Cara penggunaan:**
- Data di-load via Pandas, di-resample ke interval per jam
- Tiap kolom rumah tangga dipetakan ke 1 kamar kos (simulasi)
- Digunakan untuk seed database PostgreSQL saat development/demo

```python
import pandas as pd

df = pd.read_csv("household_data.csv", index_col=0, parse_dates=True)
df_hourly = df.resample("1H").mean()  # Resample ke per jam
df_room = df_hourly.iloc[:, :10]      # Ambil 10 kolom = 10 kamar
df_room.columns = [f"room_{i+1}" for i in range(10)]
```

---

## 9. Data Model

### Tabel `rooms`
```json
{
  "room_id": "R-101",
  "floor": 1,
  "tenant_name": "Budi Santoso",
  "tenant_email": "budi@email.com",
  "monthly_limit_kwh": 50.0,
  "tariff_per_kwh": 1444.7
}
```

### Tabel `consumption_logs`
```json
{
  "log_id": "LOG-20240501-R101-14",
  "room_id": "R-101",
  "timestamp": "2024-05-01T14:00:00",
  "kwh_used": 0.42,
  "cumulative_kwh_month": 18.6
}
```

### Tabel `billing_records`
```json
{
  "billing_id": "BILL-2024-05-R101",
  "room_id": "R-101",
  "period": "2024-05",
  "total_kwh": 47.3,
  "total_amount_idr": 68334,
  "status": "generated",
  "generated_at": "2024-05-31T23:59:00"
}
```

### Tabel `alert_history`
```json
{
  "alert_id": "ALT-20240520-R101",
  "room_id": "R-101",
  "alert_type": "usage_warning",
  "message": "Penggunaan listrik Anda sudah mencapai 80% dari batas bulanan.",
  "triggered_at": "2024-05-20T09:00:00",
  "is_read": false
}
```

---

## 10. Core Logic

### Perhitungan Tagihan

```
Tagihan (IDR) = Total kWh bulan × Tarif per kWh (PLN)

Contoh:
  Total kWh   = 47.3 kWh
  Tarif PLN   = Rp 1.444,70 / kWh (golongan R-1 900 VA)
  Tagihan     = 47.3 × 1.444,70 = Rp 68.334
```

### Threshold & Alert Rules

```
Jika cumulative_kwh_month >= 0.8 × monthly_limit_kwh
  → Kirim alert: "Peringatan 80% batas"

Jika cumulative_kwh_month >= monthly_limit_kwh
  → Kirim alert: "Batas terlampaui"

Jika kwh_used (per jam) > mean + 2 × std_dev (baseline)
  → Flag sebagai anomali, simpan ke log
```

### Estimasi Tagihan Berjalan

```
Hari berjalan     = hari_ini - awal_bulan
Sisa hari         = akhir_bulan - hari_ini
Rate harian       = cumulative_kwh / hari_berjalan
Proyeksi akhir    = cumulative_kwh + (rate_harian × sisa_hari)
Estimasi tagihan  = proyeksi_akhir × tarif_per_kwh
```

---

## 11. Example Workflow

**Skenario:** Penghuni kamar 101 menyalakan AC terus-menerus

```
[06:00] Agent OBSERVE  → Baca log jam 05:00–06:00
                         kwh_used R-101 = 1.8 kWh (sangat tinggi)

[06:00] Agent THINK    → Bandingkan dengan baseline:
                         mean = 0.3 kWh, std = 0.1
                         1.8 >> mean + 2×std (0.5) → ANOMALI

[06:00] Agent PLAN     → Hitung proyeksi bulan:
                         Sudah 38 kWh dari batas 50 kWh
                         Proyeksi akhir bulan = 62 kWh → melebihi batas

[06:00] Agent ACT      → Kirim notifikasi ke Budi Santoso:
                         "Perhatian: Penggunaan listrik Anda melebihi batas normal.
                          Estimasi tagihan bulan ini: Rp 89.571"
                         Simpan alert ke DB

[06:00] Agent EVALUATE → Notifikasi terkirim ✓
                         Update threshold adaptif jika pola berulang

[07:00] Loop ulang...
```

---

## 12. Output

### Dashboard Admin

- **Grafik** total konsumsi gedung (harian/bulanan) — Recharts `LineChart`
- **Tabel** konsumsi per kamar + status tagihan
- **Highlight** kamar dengan penggunaan tertinggi / anomali
- **Tombol** generate laporan billing (export CSV/PDF)

### Dashboard Penghuni

- **Gauge** persentase penggunaan vs batas bulanan
- **Grafik** konsumsi per jam / per hari — Recharts `AreaChart`
- **Estimasi tagihan** bulan berjalan (diperbarui setiap jam)
- **Riwayat notifikasi** penggunaan berlebih

### Notifikasi (In-App)

```
⚠️ [Ampera AI] Kamar 101 — 20 Mei 2024, 06:00
Penggunaan listrik Anda sudah mencapai 76% dari batas bulanan (38/50 kWh).
Estimasi tagihan akhir bulan: Rp 89.571.
Tips: Matikan AC saat tidak di kamar untuk menghemat ~20% energi.
```

---

## 13. Impact

### 🌱 Lingkungan

- Mendorong penghuni untuk sadar konsumsi energi
- Potensi penghematan **10–20% kWh** per bulan per gedung
- Mengurangi jejak karbon dari penggunaan listrik berlebih

### 🤝 Sosial

- Tagihan berbasis data aktual → **lebih adil, lebih transparan**
- Mengurangi konflik "kenapa tagihan saya besar?" antar penghuni
- Pengelola punya data solid untuk pengambilan keputusan

---

## 14. Why This Is Agentic

Ampera AI bukan sekadar sistem rule-based atau dashboard biasa.

| Aspek | Penjelasan |
|---|---|
| **Autonomy** | Agent berjalan mandiri tiap jam tanpa trigger manual |
| **Tool Use** | Agent memanggil tools (query DB, analisis, notif) sesuai konteks |
| **Reasoning** | Agent memutuskan kapan harus alert vs diam berdasarkan konteks data |
| **Adaptivity** | Agent memperbarui threshold berdasarkan pola historis per kamar |
| **Goal-directed** | Semua aksi diarahkan pada tujuan: hemat energi & tagihan adil |

> Agent tidak hanya membaca data — ia **mengamati, berpikir, merencanakan, bertindak, dan belajar** dari setiap siklus.

---

*Ampera AI · v1.0 · Dokumentasi Teknis*
