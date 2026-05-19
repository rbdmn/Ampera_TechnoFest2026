# Setup Deployment

Panduan ini dipakai saat Ampera AI akan di-deploy atau di-host di environment produksi.

---

## 1. Siapkan Environment

Gunakan environment variables produksi yang aman:

```env
APP_NAME=Ampera AI
ENVIRONMENT=production
DATABASE_URL=postgresql+psycopg://<user>:<password>@<host>:5432/<db>
SECRET_KEY=<strong-secret>
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_TEMPERATURE=0.0
ENABLE_SCHEDULER=true
```

Catatan:
- Untuk deployment, database sebaiknya memakai PostgreSQL terkelola atau instance server yang memang disiapkan untuk produksi.
- `OLLAMA_BASE_URL` bisa diarahkan ke endpoint Ollama yang tersedia di server host, atau diubah ke service internal yang kamu sediakan.

---

## 2. Install Dependency

```bash
cd backend
pip install -r requirements.txt
cd ../frontend
npm install
```

---

## 3. Jalankan Inisialisasi Schema

Jika schema belum ada di database target, jalankan:

```bash
cd backend
python -m app.db.init_db
```

Langkah ini menyiapkan tabel berdasarkan model backend. Pada deployment yang memakai migrasi terpisah, sesuaikan dengan pipeline host kamu.

---

## 4. Build Frontend

```bash
cd frontend
npm run build
```

Setelah itu jalankan frontend sesuai platform hosting yang dipakai.

---

## 5. Jalankan Backend Production

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Jika memakai process manager seperti systemd, PM2, Docker, atau platform cloud, gunakan command yang setara di environment tersebut.

---

## 6. Seed Data Demo

Untuk deployment demo yang membutuhkan data awal, seed CSV hanya dijalankan sekali saat staging atau bootstrap pertama:

```bash
python backend\data\seed.py --clear --processed-dir data/processed_new
```

Jangan jalankan seed berulang di production kecuali memang ingin mengganti seluruh data demo secara sadar.

---

## 7. Checklist Deployment

- `DATABASE_URL` mengarah ke database produksi yang benar
- `SECRET_KEY` diganti dari nilai default
- `OLLAMA_BASE_URL` dan `OLLAMA_MODEL` sesuai environment host
- `frontend/.env.local` atau env hosting sudah menunjuk ke backend production
- schema database sudah dibuat
- backend dan frontend bisa diakses dari domain target
