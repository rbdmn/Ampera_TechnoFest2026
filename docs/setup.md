=========================================================
SETUP DATABASE POSTGRESQL
=========================================================

Berikut langkah setup PostgreSQL untuk project ini di Windows.

  1. Buat Database
  Buka terminal PostgreSQL / pgAdmin / PowerShell kalau psql sudah ada di PATH.

  Contoh via psql:

  psql -U postgres

  Lalu di prompt PostgreSQL:

  CREATE DATABASE ampera_v2;
  \q

  Kalau mau pakai nama ampera, boleh juga, tapi sesuaikan .env.

  2. Buat backend/.env
  Copy dari example:

  Copy-Item backend\.env.example backend\.env

  Edit backend/.env, pastikan DATABASE_URL sesuai user/password PostgreSQL kamu:

  DATABASE_URL=postgresql+psycopg://postgres:password@localhost:5432/dayarukun

  Ganti password dengan password PostgreSQL lokalmu.

  3. Install Dependency Backend
  Dari root repo:

  cd backend
  pip install -r requirements.txt

  Kalau pakai virtualenv, aktifkan dulu sebelum install.

  4. Buat Tabel
  Masih di folder backend:

  python -m app.db.init_db

  Kalau berhasil, output:

  DB tables created

  5. Generate CSV Processed

  Ada 2 opsi:

  OPSI A — Data sintetik terbaru (2020-01 s.d. 2026-05, RECOMMENDED):
  Balik ke root repo, lalu jalankan:

  cd ..
  python data\generate_synthetic.py

  Output akan tersimpan di data/processed_new/.
  Harus muncul row count seperti:

  Output directory: ...\data\processed_new
  - rooms: 10 rows
  - tenants: 12 rows
  - room_occupancies: 12 rows
  - users: 13 rows
  - consumption_logs: 562320 rows
  - meter_readings: 3350 rows
  - billing_records: 770 rows
  - alert_history: 1540 rows

  OPSI B — Data OPSD lama (2015-2019):
  python data\preprocess.py

  Catatan: data OPSD sudah tidak relevan (tahun 2015-2019).
  Disarankan pakai OPSI A.

  6. Seed ke PostgreSQL

  OPSI A (data sintetik baru):
  python backend\data\seed.py --clear --processed-dir data\processed_new

  OPSI B (data OPSD lama):
  python backend\data\seed.py --clear

  Kalau berhasil, akan muncul daftar tabel dan jumlah row yang masuk.

  7. Test DB Berhasil
  Jalankan agent test:

  python backend\app\agent\test_run.py
  Kalau DB terbaca, hasilnya harus mode: 'db', bukan mode: 'mock'.

  Contoh indikasi berhasil:

  Bisa juga test langsung via SQL:

  psql -U postgres -d dayarukun

  Lalu:
  SELECT COUNT(*) FROM alert_history;
  \q

  Expected minimal:

  rooms = 10
  tenants = 12
  consumption_logs > 0
  alert_history > 0

  Urutan Ringkas (RECOMMENDED — Data Sintetik 2020-2026)

  Copy-Item backend\.env.example backend\.env
  # edit DATABASE_URL

  cd backend
  pip install -r requirements.txt
  python -m app.db.init_db

  cd ..
  python data\generate_synthetic.py
  python backend\data\seed.py --clear --processed-dir data\processed_new
  python backend\app\agent\test_run.py

=========================================================
START BACKEND
=========================================================
Pastiin dah download ollama dan udah download model gpt-oss:120b-cloud

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

=========================================================
START FRONTEND
=========================================================
Pastiin dah download next atau node js terbaru

cd frontend
npm run dev

=========================================================
START VENV
=========================================================
venv\Scripts\activate


=========================================================
Tutor setup db baru
=========================================================

buat db baru nama amperava_v2
sesuain database url di env
python -m app.db.init_db
python data\generate_synthetic.py
python backend\data\seed.py --clear --processed-dir data\processed_new
python backend\app\agent\test_run.py