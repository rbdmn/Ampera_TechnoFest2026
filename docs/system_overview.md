# Ampera AI — System Overview

> AI Agent untuk pengelolaan listrik bersama di lingkungan kos/rusun.  
> Hemat energi · Tagihan adil · Kurangi konflik sosial

---

## 1. Overview

**Ampera AI** (Arti: Gabungan Ampere + Bersama) adalah sistem berbasis AI agent tunggal (single-agent) yang membantu pengelola dan penghuni kos/rusun dalam:

- Memantau konsumsi listrik per kamar secara berkala dan terstruktur
- Membagi tagihan listrik secara proporsional dan transparan
- Mendeteksi penggunaan anomali dan memberikan notifikasi proaktif
- Menghasilkan insight hemat energi berbasis pola historis

Dalam konteks implementasi lomba, Ampera AI tidak bergantung pada hardware sensor fisik. Sistem menggunakan dua pendekatan sumber data:

1. **Input manual oleh penghuni untuk data baru**  
   Penghuni memasukkan angka meteran listrik kamarnya secara berkala, misalnya setiap minggu atau setiap awal/akhir bulan. Sistem menghitung selisih dari pembacaan sebelumnya, lalu agent menganalisis konsumsi tersebut.

2. **Simulasi dataset untuk data lama/dummy**  
   Data historis disimulasikan dari dataset Open Power System Data yang di-seed ke PostgreSQL. Agent membaca data tersebut seolah-olah data konsumsi masuk otomatis dari sensor. Pendekatan ini paling realistis untuk demo lomba karena fokus penilaian ada pada logika sistem, transparansi tagihan, dan kemampuan AI agent.

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
Manual Meter Input + Seeded Dataset → PostgreSQL → Ampera AI Agent → Dashboard + Notifikasi
```

- Penghuni menginput angka meteran baru secara berkala melalui aplikasi
- Sistem menghitung konsumsi dari selisih angka meteran saat ini dan angka meteran sebelumnya
- Dataset historis digunakan untuk mengisi data lama/dummy saat development dan demo
- Agent membaca data konsumsi dari PostgreSQL, bukan langsung dari hardware sensor
- Menghitung penggunaan per kamar dan total gedung
- Mendeteksi pola abnormal, memproyeksikan tagihan akhir bulan
- Mengirim notifikasi otomatis ke penghuni yang melebihi batas
- Menghasilkan laporan tagihan siap pakai untuk pengelola

### Data Flow Utama

**Data baru:**

```
Penghuni input angka meteran → Backend validasi → Hitung selisih kWh → Simpan ke DB → Agent analisis
```

**Data lama/dummy untuk demo:**

```
Dataset CSV → Preprocess Pandas → Seed PostgreSQL → Agent baca dari DB → Analisis → Notifikasi
```

### Batasan Pendekatan

| Pendekatan | Kelebihan | Risiko/Batasan | Mitigasi |
|---|---|---|---|
| Input manual penghuni | Murah, tidak butuh hardware, mudah diterapkan di kos/rusun kecil | Rawan telat input atau tidak jujur | Riwayat input, validasi angka tidak boleh turun, deteksi lonjakan tidak wajar, admin dapat verifikasi |
| Dataset simulasi | Cocok untuk demo lomba, realistis untuk pola historis, tidak butuh sensor | Bukan data live dari gedung asli | Dijelaskan sebagai simulasi data historis untuk membuktikan logika sistem dan AI |

---

## 4. Use Case

### 👤 Admin (Pengelola Kos)

- Melihat total konsumsi listrik gedung (harian/bulanan)
- Melihat breakdown penggunaan per kamar
- Memantau dan memverifikasi riwayat input meteran penghuni
- Mengunduh laporan tagihan bulanan (PDF/CSV)
- Mendapat insight: kamar mana yang paling boros, tren penggunaan

### 🙋 User (Penghuni Kos)

- Menginput angka meteran listrik kamar secara berkala
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
│   │      Manual Meter Reading API                  │    │
│   │      - input angka meteran                     │    │
│   │      - validasi pembacaan                      │    │
│   │      - hitung selisih kWh                      │    │
│   └──────────────────────┬─────────────────────────┘    │
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
             │  - meter_readings           │
             │  - consumption_logs         │
             │  - rooms / users            │
             │  - billing_records          │
             │  - alert_history            │
             └────────────────────────────┘

             ┌────────────────────────────┐
             │ Seeded Historical Dataset  │
             │ Open Power System Data CSV │
             └────────────────────────────┘
```

---

## 7. Agentic Loop Explanation

Agent berjalan secara on-demand dan periodik. Pada implementasi demo, agent dapat dijalankan setelah ada input meteran baru, setelah proses seed dataset selesai, atau melalui scheduler backend.

```
┌──────────┐
│ OBSERVE  │  ← Baca data meteran/konsumsi terbaru dari DB
└────┬─────┘
     │
┌────▼─────┐
│  THINK   │  ← Bandingkan dengan baseline historis & threshold
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

Ampera AI menggunakan dua jenis sumber data agar sistem tetap masuk akal untuk produk nyata sekaligus kuat untuk demo lomba.

### 8.1 Data Baru: Input Manual Penghuni

Untuk data konsumsi terbaru, penghuni melakukan input angka meteran listrik kamarnya melalui aplikasi.

**Alur:**

```
Penghuni buka app → pilih kamar/akun → input angka meteran → submit → backend hitung selisih → simpan consumption log
```

**Contoh:**

| Tanggal | Angka Meteran | Selisih dari Input Sebelumnya | Konsumsi Dicatat |
|---|---:|---:|---:|
| 1 Mei | 1.250,0 kWh | - | baseline awal |
| 8 Mei | 1.278,5 kWh | 28,5 kWh | 28,5 kWh |
| 15 Mei | 1.304,2 kWh | 25,7 kWh | 25,7 kWh |

**Validasi minimum:**

- Angka meteran baru tidak boleh lebih kecil dari angka sebelumnya
- Input harus memiliki timestamp dan identitas kamar/penghuni
- Jika selisih terlalu besar dibanding pola historis, agent menandai sebagai anomali
- Admin dapat melihat riwayat input untuk audit sederhana

**Keterbatasan:**

- Tidak real-time karena bergantung pada jadwal input penghuni
- Ada risiko penghuni telat input atau memasukkan angka tidak jujur
- Sistem perlu fitur audit/verifikasi admin untuk penggunaan nyata

### 8.2 Data Lama/Dummy: Simulasi Dataset

**Dataset:** [Open Power System Data — Household Data (2020-04-15)](https://data.open-power-system-data.org/household_data/2020-04-15)

| Kegunaan | Detail |
|---|---|
| Simulasi konsumsi listrik | Data historis konsumsi listrik yang dipetakan ke kamar kos |
| Baseline usage | Rata-rata konsumsi rumah tangga sebagai acuan normal |
| Pattern analysis | Identifikasi jam sibuk, pola harian/mingguan |
| Demo lomba | Membuktikan agent bisa membaca data, menganalisis pola, dan memicu notifikasi tanpa hardware |

**Cara penggunaan:**
- Data di-load via Pandas, di-resample ke interval per jam
- Tiap kolom rumah tangga dipetakan ke 1 kamar kos (simulasi)
- Digunakan untuk seed database PostgreSQL saat development/demo
- Setelah masuk DB, agent memperlakukan data ini sebagai riwayat konsumsi historis

```python
import pandas as pd

df = pd.read_csv("household_data.csv", index_col=0, parse_dates=True)
df_hourly = df.resample("1H").mean()  # Resample ke per jam
df_room = df_hourly.iloc[:, :10]      # Ambil 10 kolom = 10 kamar
df_room.columns = [f"room_{i+1}" for i in range(10)]
```

### 8.3 Strategi Demo Lomba

Untuk presentasi lomba, alur yang disarankan:

1. Seed database dengan dataset historis agar dashboard dan agent punya data lama.
2. Tampilkan admin dashboard berisi tren konsumsi per kamar.
3. Simulasikan penghuni menginput angka meteran baru.
4. Backend menghitung selisih konsumsi.
5. Agent membaca perubahan terbaru, membandingkan dengan baseline historis, lalu menghasilkan alert/insight.

Dengan strategi ini, sistem terlihat realistis tanpa perlu memasang sensor fisik.

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

### Tabel `meter_readings`
```json
{
  "reading_id": "READ-20240508-R101",
  "room_id": "R-101",
  "submitted_by": "budi@email.com",
  "reading_value_kwh": 1278.5,
  "previous_reading_value_kwh": 1250.0,
  "usage_delta_kwh": 28.5,
  "reading_period_start": "2024-05-01T00:00:00",
  "reading_period_end": "2024-05-08T00:00:00",
  "submitted_at": "2024-05-08T08:30:00",
  "source": "manual_input",
  "verification_status": "pending"
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

Catatan:

- `meter_readings` menyimpan angka meteran mentah yang diinput penghuni.
- `consumption_logs` menyimpan hasil konsumsi yang sudah dihitung dan siap dianalisis.
- Untuk dataset simulasi, `source` dapat ditandai sebagai `seed_dataset`.
- Untuk input penghuni, `source` ditandai sebagai `manual_input`.

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

### Perhitungan dari Input Meteran Manual

```
Konsumsi periode ini = angka_meteran_baru - angka_meteran_sebelumnya

Contoh:
  Meteran sebelumnya = 1.250,0 kWh
  Meteran baru       = 1.278,5 kWh
  Konsumsi periode   = 1.278,5 - 1.250,0 = 28,5 kWh
```

Jika angka meteran baru lebih kecil dari angka sebelumnya, input ditolak karena meteran listrik normalnya bersifat kumulatif.

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

Jika usage_delta_kwh atau kwh_used > mean + 2 × std_dev (baseline)
  → Flag sebagai anomali, simpan ke log
```

Untuk data manual mingguan, baseline dapat dihitung dari rata-rata konsumsi harian/mingguan historis. Untuk data dataset simulasi, baseline dapat dihitung per jam karena data historisnya lebih granular.

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

### 11.1 Workflow Demo dengan Dataset

**Skenario:** Dataset historis menunjukkan kamar 101 memiliki konsumsi tidak biasa pada jam tertentu.

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

### 11.2 Workflow Data Baru dari Input Manual

**Skenario:** Penghuni kamar 101 menginput angka meteran mingguan.

```
[08:30] User INPUT     → Budi memasukkan angka meteran R-101:
                         previous_reading = 1.250,0 kWh
                         current_reading  = 1.278,5 kWh

[08:30] Backend CHECK  → Validasi angka baru >= angka sebelumnya
                         Hitung usage_delta = 28,5 kWh
                         Simpan ke meter_readings dan consumption_logs

[08:31] Agent OBSERVE  → Baca konsumsi terbaru R-101 dari DB
                         usage_delta_kwh = 28,5 kWh dalam 7 hari

[08:31] Agent THINK    → Bandingkan dengan baseline mingguan kamar 101
                         baseline = 20 kWh/minggu
                         28,5 kWh lebih tinggi dari pola normal

[08:31] Agent PLAN     → Hitung proyeksi akhir bulan
                         Jika pola berlanjut, estimasi melewati batas bulanan

[08:31] Agent ACT      → Buat notifikasi:
                         "Penggunaan minggu ini lebih tinggi dari biasanya.
                          Periksa perangkat listrik yang menyala lama."

[08:31] Agent EVALUATE → Alert tersimpan dan muncul di dashboard/notifikasi
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
- **Grafik** konsumsi per input / per hari — Recharts `AreaChart`
- **Estimasi tagihan** bulan berjalan (diperbarui setelah input baru atau proses analisis agent)
- **Riwayat notifikasi** penggunaan berlebih
- **Form input meteran** untuk memasukkan angka meteran terbaru
- **Riwayat input meteran** agar penghuni dan admin dapat melihat catatan sebelumnya

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
| **Autonomy** | Agent dapat berjalan setelah input baru, setelah seed data, atau via scheduler |
| **Tool Use** | Agent memanggil tools (query DB, analisis, notif) sesuai konteks |
| **Reasoning** | Agent memutuskan kapan harus alert vs diam berdasarkan konteks input manual dan data historis |
| **Adaptivity** | Agent memperbarui threshold berdasarkan pola historis per kamar, baik dari dataset maupun input penghuni |
| **Goal-directed** | Semua aksi diarahkan pada tujuan: hemat energi & tagihan adil |

> Agent tidak hanya membaca data — ia **mengamati, berpikir, merencanakan, bertindak, dan belajar** dari setiap siklus.

---

*Ampera AI · v1.0 · Dokumentasi Teknis*
