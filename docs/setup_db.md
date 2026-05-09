Berikut langkah setup PostgreSQL untuk project ini di Windows.

  1. Buat Database
  Buka terminal PostgreSQL / pgAdmin / PowerShell kalau psql sudah ada di PATH.

  Contoh via psql:

  psql -U postgres

  Lalu di prompt PostgreSQL:

  CREATE DATABASE dayarukun;
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
  Balik ke root repo:

  cd ..
  python data\preprocess.py

  Harus muncul row count seperti:

  rooms: 10
  tenants: 12
  room_occupancies: 12
  users: 13
  ...

  6. Seed ke PostgreSQL
  Dari root repo:

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

  Urutan Ringkas

  Copy-Item backend\.env.example backend\.env
  # edit DATABASE_URL

  cd backend
  pip install -r requirements.txt
  python -m app.db.init_db

  cd ..
  python data\preprocess.py
  python backend\data\seed.py --clear
  python backend\app\agent\test_run.p