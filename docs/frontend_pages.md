# DayaRukun AI — Frontend Pages

> Daftar halaman frontend untuk dua role: **Admin (Pengelola)** dan **User (Penghuni)**.  
> Stack: Next.js (App Router) · Recharts · Tailwind CSS

---

## Struktur Route

```
/
├── /login                          ← shared
├── /admin/
│   ├── dashboard                   ← overview utama
│   ├── rooms                       ← daftar semua kamar
│   ├── rooms/[id]                  ← detail 1 kamar
│   ├── billing                     ← laporan tagihan
│   ├── tenants                     ← manajemen penghuni
│   ├── alerts                      ← riwayat alert agent
│   └── chat                        ← chatbot AI agent
└── /user/
    ├── dashboard                   ← ringkasan konsumsi pribadi
    ├── history                     ← riwayat penggunaan
    └── notifications               ← notifikasi dari agent
```

---

## Shared Pages

---

### `/login`

**Tujuan:** Autentikasi pengguna, redirect ke dashboard sesuai role.

**Konten:**
- Form login (email + password)
- Sistem deteksi role otomatis → redirect ke `/admin/dashboard` atau `/user/dashboard`
- Tidak ada register publik — akun dibuat oleh admin

---

## Admin Pages

---

### `/admin/dashboard`

**Tujuan:** Pusat kontrol utama pengelola. Gambaran besar kondisi gedung.

**Konten:**

| Komponen | Detail |
|---|---|
| Metric cards (4 buah) | Total kWh bulan ini, Estimasi tagihan gedung, Jumlah kamar aktif, Jumlah alert aktif |
| Bar chart konsumsi harian | Konsumsi total gedung 30 hari terakhir (Recharts `BarChart`) |
| Tabel ringkas per kamar | Nama penghuni, kWh bulan ini, status (Normal / Peringatan / Melebihi) |
| Progress bar per kamar | % penggunaan vs batas bulanan masing-masing kamar |
| Panel alert terbaru | 3–5 alert terbaru dari AI agent, link ke `/admin/alerts` |
| Status agent | Indikator apakah agent sedang aktif + timestamp loop terakhir |

---

### `/admin/rooms`

**Tujuan:** Daftar seluruh kamar dan status konsumsi masing-masing.

**Konten:**
- Tabel lengkap semua kamar: nomor kamar, lantai, nama penghuni, kWh bulan ini, estimasi tagihan, status
- Filter: lantai, status (Normal / Peringatan / Melebihi / Kosong)
- Tombol: tambah kamar baru, export CSV

---

### `/admin/rooms/[id]`

**Tujuan:** Detail satu kamar — konsumsi, riwayat, dan profil penghuni.

**Konten:**

| Komponen | Detail |
|---|---|
| Header kamar | Nomor kamar, nama penghuni, lantai, batas kWh bulanan |
| Metric cards | kWh bulan ini, estimasi tagihan, % dari batas |
| Line chart konsumsi per jam | 24 jam terakhir (Recharts `LineChart`) |
| Bar chart konsumsi harian | 30 hari terakhir |
| Riwayat alert kamar ini | Tabel alert yang pernah dipicu untuk kamar ini |
| Tombol aksi | Edit batas kWh, ganti penghuni, reset data |

---

### `/admin/billing`

**Tujuan:** Generate dan kelola laporan tagihan bulanan.

**Konten:**
- Selector bulan/tahun
- Tabel tagihan per kamar: kWh, tarif, total (IDR), status (Lunas / Belum)
- Baris total gedung
- Tombol: **Generate Laporan** (trigger ke agent), **Export CSV**, **Export PDF**
- Riwayat laporan bulan-bulan sebelumnya

**Catatan:** Laporan hanya bisa di-generate setelah akhir bulan atau secara manual oleh admin.

---

### `/admin/tenants`

**Tujuan:** Manajemen data penghuni.

**Konten:**
- Tabel penghuni: nama, email, nomor kamar, tanggal masuk, batas kWh
- Tombol: tambah penghuni, edit, nonaktifkan akun
- Form tambah/edit penghuni (modal): nama, email, nomor kamar, batas kWh bulanan

---

### `/admin/alerts`

**Tujuan:** Riwayat lengkap semua alert yang pernah dikirim agent.

**Konten:**
- Tabel alert: waktu, kamar, jenis alert, pesan, status (Dibaca / Belum)
- Filter: jenis alert (`usage_warning` / `limit_exceeded` / `anomaly`), kamar, rentang tanggal
- Badge jumlah alert belum ditindak

---

### `/admin/chat` ⭐

**Tujuan:** Chatbot berbasis LangChain untuk admin — tanya-jawab langsung ke AI agent soal data konsumsi, tagihan, dan insight gedung.

**Konten:**
- Chat interface (bubble chat, input teks)
- Agent bisa menjawab pertanyaan seperti:

```
"Kamar mana yang paling boros bulan ini?"
"Berapa total tagihan gedung bulan April?"
"Siapa saja penghuni yang melebihi batas minggu ini?"
"Buatkan ringkasan konsumsi kamar 102."
"Apakah ada anomali yang terdeteksi hari ini?"
```

- Agent menggunakan tools: `query_consumption`, `analyze_pattern`, `calculate_bill`
- Respons bisa berupa teks, tabel sederhana, atau angka ringkas
- Riwayat chat disimpan per sesi (tidak permanen)

**Catatan teknis:**
- Frontend: komponen chat dengan `useState` untuk history
- Backend: endpoint `POST /agent/chat` → LangChain agent → respons streaming
- Tidak perlu menyimpan history ke DB — cukup in-memory per sesi

---

## User Pages

---

### `/user/dashboard`

**Tujuan:** Ringkasan konsumsi pribadi penghuni di bulan berjalan.

**Konten:**

| Komponen | Detail |
|---|---|
| Metric cards (3 buah) | kWh terpakai, Estimasi tagihan bulan ini, Sisa hari bulan ini |
| Gauge / progress bar besar | % penggunaan vs batas bulanan, dengan warna: hijau / kuning / merah |
| Area chart konsumsi per jam | Hari ini, 24 jam (Recharts `AreaChart`) |
| Proyeksi akhir bulan | "Dengan pola ini, estimasi Anda akan memakai X kWh (Rp Y)" |
| Panel notifikasi terbaru | 2–3 notif terbaru, link ke `/user/notifications` |
| Tips hemat energi | 1–2 tips dari agent berdasarkan pola konsumsi kamar penghuni |

---

### `/user/history`

**Tujuan:** Riwayat konsumsi per hari dan per bulan.

**Konten:**
- Tab: **Harian** / **Bulanan**
- Harian: bar chart konsumsi 30 hari terakhir + tabel ringkas
- Bulanan: tabel kWh per bulan + total tagihan per bulan
- Filter rentang tanggal

---

### `/user/notifications`

**Tujuan:** Semua notifikasi dari agent untuk kamar penghuni.

**Konten:**
- Daftar notifikasi: waktu, jenis, pesan
- Badge "belum dibaca"
- Warna border berdasarkan jenis: merah (melebihi batas), kuning (peringatan), hijau (info)

---

## Ringkasan Halaman

| Route | Role | Prioritas |
|---|---|---|
| `/login` | Shared | Wajib |
| `/admin/dashboard` | Admin | Wajib |
| `/admin/rooms` | Admin | Wajib |
| `/admin/rooms/[id]` | Admin | Wajib |
| `/admin/billing` | Admin | Wajib |
| `/admin/tenants` | Admin | Wajib |
| `/admin/alerts` | Admin | Disarankan |
| `/admin/chat` | Admin | Wajib (fitur unggulan) |
| `/user/dashboard` | User | Wajib |
| `/user/history` | User | Wajib |
| `/user/notifications` | User | Wajib |

---

## Catatan Implementasi

- **Auth & role guard:** Middleware Next.js cek JWT token + role sebelum render halaman
- **Shared layout:** Sidebar dan topbar dibungkus di `layout.tsx` per role (`/admin/layout.tsx`, `/user/layout.tsx`)
- **Realtime:** Tidak perlu WebSocket — cukup polling tiap 5 menit via `setInterval` + `fetch` ke `/api/consumption/latest`
- **Mobile:** Dashboard user perlu mobile-friendly (penghuni akses lewat HP); admin dashboard boleh desktop-first

---

*DayaRukun AI · Frontend Pages · v1.0*
