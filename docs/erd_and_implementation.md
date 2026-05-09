# Ampera AI — ERD & Implementasi (MVP)

Dokumen ini menjelaskan:
1) ERD/database schema yang dipakai (PostgreSQL)
2) Fitur backend yang sudah diimplementasikan di workspace
3) Alur end-to-end (E2E) dari seed data → API → agent → notifikasi

> Catatan: ini adalah **MVP untuk lomba** (non-production). Validasi dan constraint tingkat database dibuat sederhana, sebagian aturan dijaga di level API.

---

## 1. Ringkasan ERD

Entitas utama:
- **rooms**: data kamar + konfigurasi limit & tarif + kapasitas penghuni (sharing)
- **tenants**: data penghuni (orang) yang bisa pindah kamar (punya histori)
- **room_occupancies**: histori hunian (tenant tinggal di kamar tertentu dalam rentang waktu)
- **consumption_logs**: data konsumsi listrik per kamar per jam/per input
- **meter_readings**: input angka meteran manual (raw) + delta pemakaian
- **billing_records**: rekap tagihan bulanan per kamar
- **alert_history**: notifikasi/warning/anomali yang dihasilkan sistem
- **users**: akun untuk login (admin/user) yang dapat dihubungkan ke tenant

Relasi paling penting:
- `rooms (1) -> (N) room_occupancies` (riwayat siapa tinggal di kamar)
- `tenants (1) -> (N) room_occupancies`
- `rooms (1) -> (N) consumption_logs`
- `rooms (1) -> (N) meter_readings`
- `rooms (1) -> (N) billing_records`
- `rooms (1) -> (N) alert_history`

### Mermaid ERD (referensi)

```mermaid
erDiagram
  ROOMS {
    varchar room_id PK
    int floor
    varchar tenant_name "nullable (legacy)"
    varchar tenant_email "nullable (legacy)"
    float monthly_limit_kwh
    float tariff_per_kwh
    int max_occupants
    timestamptz created_at
  }

  TENANTS {
    varchar tenant_id PK
    varchar email "UNIQUE, nullable"
    varchar full_name
    varchar phone "nullable"
    timestamptz created_at
  }

  ROOM_OCCUPANCIES {
    varchar occupancy_id PK
    varchar room_id FK
    varchar tenant_id FK
    timestamptz start_at
    timestamptz end_at "NULL = active"
    enum status "active|ended"
    timestamptz created_at
  }

  USERS {
    varchar user_id PK
    varchar email "UNIQUE"
    varchar full_name "nullable"
    varchar password_hash
    enum role "admin|user"
    varchar tenant_id FK "nullable"
    varchar room_id FK "nullable (convenience)"
    boolean is_active
    timestamptz created_at
  }

  METER_READINGS {
    varchar reading_id PK
    varchar room_id FK
    varchar submitted_by "nullable"
    float reading_value_kwh
    float previous_reading_value_kwh "nullable"
    float usage_delta_kwh
    timestamptz reading_period_start
    timestamptz reading_period_end
    timestamptz submitted_at
    enum source "manual_input|seed_dataset"
    enum verification_status "pending|verified|rejected"
  }

  CONSUMPTION_LOGS {
    varchar log_id PK
    varchar room_id FK
    timestamptz timestamp
    float kwh_used
    float cumulative_kwh_month
    enum source "manual_input|seed_dataset"
  }

  BILLING_RECORDS {
    varchar billing_id PK
    varchar room_id FK
    varchar period "YYYY-MM"
    float total_kwh
    float total_amount_idr
    enum status "generated|sent|paid"
    timestamptz generated_at
  }

  ALERT_HISTORY {
    varchar alert_id PK
    varchar room_id FK
    enum alert_type "usage_warning|limit_exceeded|anomaly"
    varchar message
    timestamptz triggered_at
    boolean is_read
  }

  ROOMS ||--o{ ROOM_OCCUPANCIES : has_history
  TENANTS ||--o{ ROOM_OCCUPANCIES : stays_in

  TENANTS ||--o{ USERS : identity_link
  ROOMS ||--o{ USERS : convenience_link

  ROOMS ||--o{ METER_READINGS : has
  ROOMS ||--o{ CONSUMPTION_LOGS : has
  ROOMS ||--o{ BILLING_RECORDS : has
  ROOMS ||--o{ ALERT_HISTORY : has
```

---

## 2. Penjelasan Tabel & Kolom Penting

### 2.1 `rooms`
Menyimpan metadata kamar dan parameter billing + limit.
- **room_id**: PK (contoh: `R-101`)
- **monthly_limit_kwh**: batas pemakaian per bulan
- **tariff_per_kwh**: tarif listrik per kWh
- **max_occupants**: kapasitas penghuni kamar (untuk kos sharing)

Kolom legacy:
- `tenant_name`, `tenant_email` masih ada untuk kompatibilitas awal, namun untuk histori gunakan `tenants + room_occupancies`.

### 2.2 `tenants`
Menyimpan data orang/penghuni.
- **tenant_id**: PK
- **email**: unique (boleh null)
- **full_name**: nama penghuni

### 2.3 `room_occupancies`
Menyimpan histori hunian.
- **end_at NULL** menandakan masih tinggal (aktif)
- `status`: `active|ended`

Aturan MVP (opsi A, dijaga di API):
- **1 tenant hanya boleh punya 1 occupancy aktif** (tidak boleh punya 2 kamar sekaligus)

### 2.4 `consumption_logs`
Data konsumsi yang dianalisis agent.
- `timestamp`, `kwh_used`
- `cumulative_kwh_month`: akumulasi bulan berjalan (MVP sederhana)
- `source`: `seed_dataset` atau `manual_input`

### 2.5 `meter_readings`
Menyimpan input manual angka meteran dan delta pemakaian.
> Endpoint input manual belum dibuat penuh, tapi tabel dan enum sudah tersedia.

### 2.6 `billing_records`
Rekap tagihan per kamar per periode `YYYY-MM`.

### 2.7 `alert_history`
Notifikasi sistem (warning, melebihi limit, anomali).

---

## 3. Implementasi yang Sudah Ada (Backend)

### 3.1 Struktur & Modul
- `backend/app/config.py` — settings (.env)
- `backend/app/main.py` — FastAPI app + router + startup init DB + scheduler
- `backend/app/db/` — SQLAlchemy models + init_db
- `backend/app/services/` — business logic sederhana
- `backend/app/api/` — REST API routers
- `backend/app/agent/` — agent loop + tools

### 3.2 Database Layer
File:
- `app/db/database.py`: engine, session, dependency `get_db()`
- `app/db/models.py`: semua tabel ERD
- `app/db/init_db.py`: create tables (MVP)

### 3.3 Seed Demo
File: `backend/data/seed_demo.py`
- buat rooms (10 kamar)
- buat tenants dan occupancy aktif (beberapa kamar 2 penghuni untuk simulasi sharing)
- generate `consumption_logs` per jam untuk beberapa hari

### 3.4 API Endpoints
#### Agent
- `POST /agent/chat` — chat dev (mengembalikan ringkas status)
- `POST /agent/run` — jalankan agent loop sekali

#### Auth (MVP placeholder)
- `POST /auth/login` — token dummy untuk demo

#### Rooms
- `GET /rooms` — list kamar
- `GET /rooms/{room_id}` — detail kamar
- `GET /rooms/{room_id}/active-occupants` — jumlah penghuni aktif + max_occupants

#### Tenants
- `POST /tenants` — buat tenant
- `GET /tenants` — list tenants

#### Occupancies (Histori Hunian)
- `POST /occupancies/rooms/{room_id}/checkin` — check-in tenant ke kamar
  - validasi tenant belum punya kamar aktif
  - validasi kamar belum penuh
- `POST /occupancies/occupancies/{occupancy_id}/checkout` — checkout
- `GET /occupancies/rooms/{room_id}` — histori occupancy per kamar

#### Consumption
- `GET /consumption/summary` — ringkasan total pemakaian bulan ini (MVP)
- `GET /consumption/rooms/{room_id}` — latest logs per kamar

#### Billing
- `POST /billing/generate` — buat billing records per periode (sum sederhana)

#### Alerts
- `GET /alerts` — list alert history

---

## 4. Agent: Apa yang Dikerjakan

Agent pada MVP ini adalah loop deterministik (belum LLM tool-calling penuh):
1) ambil daftar room_id
2) ambil konsumsi terbaru via tool `query_consumption`
3) deteksi anomali via `analyze_pattern` (z-score sederhana)
4) jika anomali → simpan notifikasi via `send_notification` (masuk `alert_history`)

Tools di `backend/app/agent/tools/`:
- `query_consumption`: baca data DB (latest)
- `analyze_pattern`: hitung mean/std dan deteksi spike
- `send_notification`: tulis alert ke DB

---

## 5. Alur End-to-End (E2E)

Bagian ini menjelaskan alur dari awal sampai akhir untuk demo.

### 5.1 Setup Awal
1) Siapkan Postgres database
2) isi `backend/.env` minimal:
   - `DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/dayarukun`

3) Install dependencies `backend/requirements.txt`
4) Jalankan `python -m app.db.init_db` untuk membuat tabel

### 5.2 Seed Data Demo
1) Jalankan seed:
   - `python data/seed_demo.py`
2) Hasil:
   - rooms terisi
   - tenants terisi
   - room_occupancies terisi (aktif)
   - consumption_logs terisi (data jam-jaman)

### 5.3 Konsumsi & Dashboard
Frontend (Next.js) nantinya memanggil API:
- `GET /rooms` untuk list
- `GET /consumption/rooms/{room_id}` untuk grafik
- `GET /rooms/{room_id}/active-occupants` untuk konteks sharing

### 5.4 Mengelola Histori Penghuni
Contoh flow pindah kamar:
1) checkout occupancy lama (set `end_at`)
2) checkin tenant ke room baru

Aturan demo:
- tenant tidak bisa checkin jika masih ada occupancy aktif (end_at NULL)

### 5.5 Menjalankan Agent
Agent bisa dijalankan:
- manual via `POST /agent/run`
- atau periodik via scheduler (jika `enable_scheduler=true` di env)

Ketika agent mendeteksi anomali:
- insert satu record di `alert_history`

### 5.6 Melihat Notifikasi
- `GET /alerts` → tampilkan daftar alert

---

## 6. Batasan MVP (Untuk Lomba)

- Auth masih dummy (belum JWT sungguhan)
- Input manual meter reading belum dibuat endpoint full (tabel sudah ada)
- Billing masih sum sederhana dengan filter periode `YYYY-MM`
- Constraint kuat (misalnya partial unique index untuk 1 tenant aktif) belum dipasang di level DB (cukup API validation)

---

## 7. Rekomendasi Next Step (Opsional)

Jika ingin ditingkatkan:
1) Endpoint input manual meter reading → otomatis buat consumption_logs dan update cumulative
2) Normalisasi analisis per-orang:
   - `kwh_per_person = kwh_used / active_occupants`
3) JWT auth + role middleware
4) Alembic migrations untuk skema DB production
