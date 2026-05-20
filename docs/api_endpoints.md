# Ampera API Endpoints (MVP)

Base URL (local): `http://localhost:8000`

> Notes
> - Semua endpoint di bawah **dinamis via Postgres + SQLAlchemy**.
> - Auth masih **MVP (belum JWT)**: `/auth/login` hanya mengembalikan *dev token* (belum dipakai untuk proteksi endpoint).
> - Dashboard user saat ini identifikasi user menggunakan query param `email` (sementara).
>   - **Update**: `email` sekarang **optional**. Kalau tidak dikirim, backend memilih user aktif pertama (untuk demo).
> - `room_id` untuk endpoint legacy `GET /rooms/{room_id}` mengikuti pattern: `R-<...>` (contoh: `R-401`).

---

## Health

### `GET /`
**Response (200)**
```json
{ "message": "Ampera AI API is running" }
```

### `GET /health`
**Response (200)**
```json
{ "status": "ok" }
```

---

## Auth

### `POST /auth/login`
Login untuk admin/user (berdasarkan tabel `users`).

**Request**
```json
{
  "email": "admin@ampera.com",
  "password": "admin"
}
```

**Response (200)**
```json
{
  "access_token": "dev-admin-<hash>",
  "token_type": "bearer",
  "role": "admin"
}
```

**Response (401)**
```json
{ "detail": "invalid_credentials" }
```

Password rule (sementara untuk seed dataset):
- Jika `password_hash` di DB = `demo-password-hash`, maka password yang diterima: `admin` atau `user`.

### `POST /auth/register`
Registrasi akun user (buat **Tenant** + **User**) dan mengaitkan ke `room_id`.

Catatan:
- Endpoint ini untuk role **user** saja (admin dibuat via seed).
- Akan membuat `room_occupancies` aktif jika belum ada.
- Validasi:
  - `password` harus sama dengan `confirm_password`
  - email tidak boleh sudah terdaftar di `users`
  - `room_id` harus ada
  - kapasitas `rooms.max_occupants` tidak boleh penuh

**Request**
```json
{
  "full_name": "Jane Doe",
  "room_id": "R-101",
  "email": "jane.doe@ampera.com",
  "password": "rahasia123",
  "confirm_password": "rahasia123"
}
```

**Response (201)**
```json
{
  "user_id": "USR-...",
  "tenant_id": "TEN-...",
  "room_id": "R-101",
  "email": "jane.doe@ampera.com",
  "role": "user"
}
```

**Error umum**
- `409 email_already_registered`
- `404 room_not_found`
- `409 room_is_full`
- `409 tenant_already_has_active_room`
- `422 password_mismatch`

---

## Dashboard

### (Admin) `GET /dashboard/admin/overview`
Ringkasan dashboard admin (totals + time-series pemakaian listrik).

**Query params**
- `start` (optional): ISO datetime, contoh `2020-01-01T00:00:00Z`
- `end` (optional): ISO datetime
- `interval` (optional): `day` (default) atau `hour`

**Response (200)**
```json
{
  "range": {"start": "...", "end": "...", "interval": "day"},
  "totals": {
    "kwh": 12458.2,
    "estimated_bill": 18245000,
    "active_rooms": 42,
    "total_rooms": 50,
    "users": 45,
    "active_alerts_count": 3
  },
  "top_consumers": [
    {"room_id": "R-304", "usage_percentage": 92},
    {"room_id": "R-102", "usage_percentage": 78}
  ],
  "series": [
    {"ts": "2020-01-01T00:00:00+00:00", "kwh": 12.3, "peak_demand_kw": 2.1, "status": "Normal"}
  ]
}
```

### (User) `GET /dashboard/user/overview`
Ringkasan dashboard user per akun.

**Query params**
- `email` (optional): email user. Jika tidak dikirim, backend memilih user aktif pertama (demo).
- `start` (optional): ISO datetime
- `end` (optional): ISO datetime
- `interval` (optional): `day` atau `hour`

**Response (200)**
```json
{
  "user": {"user_id": "USR-...", "email": "jane.doe@ampera.com", "role": "user"},
  "room": {"room_id": "R-101", "tenant_name": "Jane Doe"},
  "range": {"start": "...", "end": "...", "interval": "day"},
  "totals": {"kwh": 342.5, "bill": 513750},
  "settings": {"rate_per_kwh": 1500, "monthly_limit_kwh": 500},
  "projection": {"projected_kwh": 485.2, "projected_bill": 727800},
  "series": [
    {"ts": "2020-01-01T00:00:00+00:00", "kwh": 42.5, "peak_demand_kw": 6.2, "status": "High Peak Detected"}
  ],
  "latest_meter_reading": null
}
```

Catatan:
- Jika user tidak punya `room_id` (mis. admin), response akan berisi `room: null`, `totals: null`, dan `series: []`.

---

## Rooms

### `GET /rooms/`
List semua kamar (raw rooms).

### `GET /rooms/table`
**Endpoint baru (aman, untuk tabel admin)**: list kamar versi tabel dengan join occupant aktif + pemakaian MTD + filter & pagination.

**Query params**
- `floor` (optional): int
- `status` (optional): `Normal|Warning|Exceeded|Vacant`
- `search` (optional): cari `room_id` / nama tenant
- `page` (optional): default 1
- `limit` (optional): default 10

**Response (200)**
```json
{
  "data": [
    {
      "room_no": "101",
      "room_id": "R-101",
      "floor": 1,
      "resident_name": "Jane Doe",
      "monthly_kwh": 245.5,
      "estimated_cost": 368200,
      "status": "Normal"
    }
  ],
  "meta": {"total_items": 142, "current_page": 1}
}
```

### `GET /rooms/summary`
Summary resident management cards.

**Response (200)**
```json
{
  "total_rooms": 50,
  "vacant_units": 8,
  "warnings_count": 6,
  "critical_count": 2
}
```

### `GET /rooms/admin/room-status`
Quick room status untuk tabel kecil (room_id, tenant_name, kwh_usage_mtd, status).

**Response (200)**
```json
{
  "data": [
    {"room_id": "R-101", "tenant_name": "Jane Doe", "kwh_usage_mtd": 245.5, "status": "warning"}
  ]
}
```

### `POST /rooms/`
Create new room.

**Request**
```json
{ "room_no": "401", "floor": 4, "max_occupants": 2 }
```

### `PATCH /rooms/{room_id}/limit`
Update limit bulanan kamar.

**Request**
```json
{ "monthly_limit_kwh": 500 }
```

### `GET /rooms/{room_id}`
Detail kamar (raw room).

### `GET /rooms/{room_id}/detail`
Detail kamar yang sudah diperkaya dengan kalkulasi pemakaian bulan berjalan.

---

## Consumption

### `GET /consumption/summary`
Ringkasan total pemakaian bulan berjalan.

### `GET /consumption/rooms/{room_id}`
Time-series konsumsi per kamar.

**Query params**
- `interval` (optional): `hour` (default) atau `day`
- `start` (optional): ISO datetime
- `end` (optional): ISO datetime

**Response (200)**
```json
{
  "room_id": "R-101",
  "range": {"start": "...", "end": "...", "interval": "day"},
  "series": [{"ts": "...", "kwh": 1.2}]
}
```

---

## Billing

### `POST /billing/generate`
Generate billing records untuk periode tertentu (format `YYYY-MM`).

**Request**
```json
{ "period": "2020-01" }
```

### `GET /billing/summary`
Billing summary (admin).

**Query params**
- `period` (required): `YYYY-MM`

Catatan:
- Jika `period` tidak dikirim, FastAPI akan mengembalikan `422 Field required` (expected).

### `GET /billing/invoices`
List invoices (admin) + pagination.

**Query params**
- `period` (required): `YYYY-MM`
- `page` (optional)
- `limit` (optional)

Catatan:
- Jika `period` tidak dikirim, FastAPI akan mengembalikan `422 Field required` (expected).

### `PATCH /billing/invoices/{invoice_id}/status`
Update status invoice.

**Request**
```json
{ "status": "paid" }
```

### `GET /billing/invoices/{invoice_id}`
Invoice detail (admin).

### `GET /billing/my-invoices`
List invoices untuk user yang sedang login (berdasarkan room_id dari token auth).

**Auth:** User (Bearer token)

**Response (200)**
```json
{
  "data": [
    {
      "invoice_id": "BILL-ABC123...",
      "room_id": "R-101",
      "period": "2026-05",
      "kwh_used": 142.5,
      "rate": 1444.7,
      "total_amount": 205820.75,
      "status": "generated",
      "generated_at": "2026-05-20T12:00:00+00:00"
    }
  ],
  "meta": {
    "total_items": 12
  }
}
```

**Status values:** `generated` (Unpaid), `sent` (Pending), `paid` (Paid)

---

## Alerts

### `GET /alerts/`
List alert history + filter + pagination.

**Query params**
- `room_id` (optional)
- `start` (optional): ISO datetime
- `end` (optional): ISO datetime
- `type` (optional): `alert|insight|system|all`
- `page` (optional)
- `limit` (optional)

Response berformat:
```json
{ "data": [], "meta": {"total_items": 0, "unread_count": 0, "current_page": 1} }
```

### `GET /alerts/unread-count`
Ambil counter unread alerts.

---

## Agent (LLM)

> Ini fitur demo (agentic assistant). Tidak semua workspace punya LLM yang siap.

### `POST /agent/chat`
Chat endpoint.

**Request**
```json
{ "message": "cek konsumsi kamar 101", "history": [] }
```

### `GET /agent/tools`
List tool yang tersedia.

### `POST /agent/run`
Jalankan agent loop (akan menjalankan logika agent di server).

---