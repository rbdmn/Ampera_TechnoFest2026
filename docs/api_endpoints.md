# Ampera API Endpoints (MVP)

Base URL (local): `http://localhost:8000`

> Notes
> - Semua endpoint di bawah **dinamis via Postgres + SQLAlchemy**.
> - Auth masih **MVP (belum JWT)**: `/auth/login` hanya mengembalikan *dev token* (belum dipakai untuk proteksi endpoint).
> - Dashboard user saat ini identifikasi user menggunakan query param `email` (sementara).

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
  "totals": {"rooms": 4, "users": 4, "kwh": 123.45},
  "series": [
    {"ts": "2020-01-01T00:00:00+00:00", "kwh": 12.3},
    {"ts": "2020-01-02T00:00:00+00:00", "kwh": 10.8}
  ]
}
```

### (User) `GET /dashboard/user/overview`
Ringkasan dashboard user per akun (series pemakaian + latest meter reading).

**Query params**
- `email` (required): email user
- `start` (optional): ISO datetime
- `end` (optional): ISO datetime
- `interval` (optional): `day` atau `hour`

**Response (200)**
```json
{
  "user": {"user_id": "USR-TEN001", "email": "budi.santoso@ampera.local", "role": "user"},
  "room": {"room_id": "R-101"},
  "range": {"start": "...", "end": "...", "interval": "day"},
  "totals": {"kwh": 55.2},
  "series": [{"ts": "...", "kwh": 1.2}],
  "latest_meter_reading": {
    "reading_id": "READ-2020-W04-R-101",
    "room_id": "R-101",
    "reading_value_kwh": 253.8861,
    "usage_delta_kwh": 71.0223,
    "period_start": "2020-01-20T00:00:00+00:00",
    "period_end": "2020-01-26T23:00:00+00:00",
    "source": "seed_dataset",
    "verification_status": "verified"
  }
}
```

---

## Rooms

### `GET /rooms/`
List semua kamar.

### `GET /rooms/{room_id}`
Detail kamar.

### `GET /rooms/{room_id}/active-occupants`
Jumlah penghuni aktif + kapasitas.

**Response (200)**
```json
{ "room_id": "R-103", "active_occupants": 1, "max_occupants": 2 }
```

---

## Tenants

### `POST /tenants/`
Buat tenant.

**Request**
```json
{ "full_name": "Nama", "email": "nama@ampera.com", "phone": "08..." }
```

### `GET /tenants/`
List tenant.

---

## Occupancies (riwayat penghuni kamar)

### `POST /occupancies/rooms/{room_id}/checkin`
Check-in tenant ke kamar.

**Request**
```json
{ "tenant_id": "TEN-001", "start_at": "2020-01-02T00:00:00Z" }
```

Rules yang di-enforce:
- 1 tenant hanya boleh punya 1 occupancy aktif
- room tidak boleh melebihi `rooms.max_occupants`

### `POST /occupancies/occupancies/{occupancy_id}/checkout`
Check-out/akhiri occupancy.

**Request**
```json
{ "end_at": "2020-02-01T00:00:00Z" }
```

### `GET /occupancies/rooms/{room_id}`
Riwayat occupancy untuk satu kamar.

---

## Consumption

### `GET /consumption/summary`
Ringkasan total pemakaian bulan berjalan (berdasarkan data `consumption_logs`).

### `GET /consumption/rooms/{room_id}`
Ambil log konsumsi terbaru untuk kamar.

---

## Billing

### `POST /billing/generate`
Generate billing records untuk periode tertentu (format `YYYY-MM`).

**Request**
```json
{ "period": "2020-01" }
```

---

## Alerts

### `GET /alerts/`
List alert history.

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