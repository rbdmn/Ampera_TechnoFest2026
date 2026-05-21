# Setup Lokal

Panduan ini dipakai untuk menjalankan Ampera AI di mesin lokal saat development atau demo.

---

## 1. Clone Repositori

```bash
git clone <repository-url>
cd Ampera_TechnoFest2026
```

---

## 2. Siapkan PostgreSQL

Buat database PostgreSQL lokal terlebih dulu.

```sql
CREATE DATABASE ampera;
```

Kalau memakai `psql`, langkahnya seperti ini:

```bash
psql -U postgres
CREATE DATABASE ampera;
\q
```

Jika kamu memakai nama database lain seperti `ampera_v2`, sesuaikan `DATABASE_URL` di `backend/.env`.

---

## 3. Siapkan Backend `.env`

Buat atau salin file environment backend:

```bash
Copy-Item backend\.env.example backend\.env
```

Lalu isi minimal seperti ini:

```env
APP_NAME=Ampera AI
ENVIRONMENT=development
DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/ampera
SECRET_KEY=change-me
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_TEMPERATURE=0.0
ENABLE_SCHEDULER=true
```

Catatan:
- `OLLAMA_BASE_URL` dan `OLLAMA_MODEL` sudah punya fallback aman di kode backend.
- Kalau environment kosong, backend tetap mencoba `http://localhost:11434` dan `llama3`.

---

## 4. Instal Dependency Backend

```bash
cd backend
pip install -r requirements.txt
```

Jika memakai virtual environment, aktifkan dulu sebelum instalasi.

---

## 5. Buat Tabel Database

```bash
python -m app.db.init_db
```

Perintah ini membuat tabel SQLAlchemy sesuai model backend.

---

## 6. Generate Data Demo

Gunakan dataset synthetic terbaru dari folder `data/`:

```bash
cd ..
python data\generate_synthetic.py
```

Hasilnya akan tersimpan di `data/processed_new/`.

---

## 7. Seed ke PostgreSQL

```bash
python backend\data\seed.py --clear --processed-dir data/processed_new
```

Perintah ini akan:
- mengosongkan data lama milik Ampera jika `--clear` dipakai
- memasukkan CSV processed ke PostgreSQL
- menyiapkan data untuk dashboard, billing, dan agent

---

## 8. Jalankan Backend

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## 9. Siapkan Frontend

Buat `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Lalu jalankan frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend akan berjalan di `http://localhost:3000` dan backend di `http://127.0.0.1:8000`.

---

## Akun Demo

Dua akun tersedia setelah proses seed selesai:

| Role | Email | Password |
|---|---|---|
| Admin (Pengelola) | `admin@ampera.com` | `admin` |
| User (Penghuni) | `rizky.pratama@ampera.com` | `user` |

---

## Catatan untuk Deployment (Render + Neon + Vercel)

Jika kamu mengakses versi yang sudah di-deploy (bukan lokal), perhatikan hal berikut:

### Cold Start Render (Free Tier)

Backend di-host di **Render free tier** yang akan tidur otomatis saat tidak ada request masuk dalam beberapa waktu. Ketika pertama kali dibuka atau setelah lama tidak dipakai, server perlu waktu **1–2 menit** untuk bangun kembali.

**Cara mengatasinya:**

1. Buka halaman login.
2. Masukkan kredensial lalu klik **Sign In**.
3. Jika login gagal atau loading sangat lama (lebih dari 15 detik), tunggu sebentar.
4. Setelah 1–2 menit, coba login kembali — server sudah aktif dan login akan berhasil.

Informasi ini juga sudah ditampilkan langsung di halaman login aplikasi.
