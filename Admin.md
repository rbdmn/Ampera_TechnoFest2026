**Dashboard Admin**

**Penyesuaian `totals` di `GET /dashboard/admin/overview`**

* **Konteks:** Untuk ngisi deretan *Card* di paling atas.  
* **Request:** \* Saat ini `totals` cuma *return* `"rooms": 4`. Tolong diubah jadi `active_rooms` dan `total_rooms` biar di UI bisa tampil "42 / 50".  
  * Tolong tambahkan field `active_alerts_count` untuk ngisi angka merah di card "Active AI Alerts".  
* **Ekspektasi JSON:**  
* JSON

"totals": {  
  "kwh": 12458.2,  
  "estimated\_bill": 18245000,   
  "active\_rooms": 42,  
  "total\_rooms": 50,  
  "users": 45,  
  "active\_alerts\_count": 3  
}

*   
* 

**2\. API Get Top Consumers**

* **Konteks:** Di sebelah kanan grafik, ada *progress bar* untuk kamar-kamar dengan konsumsi listrik tertinggi (Room 304, Room 102, dsb).  
* **Request:** Tolong tambahkan *array* `top_consumers` di dalam *response* `/dashboard/admin/overview` (atau bikin endpoint terpisah `GET /dashboard/admin/top-consumers`).  
* **Ekspektasi JSON:**  
* JSON

"top\_consumers": \[  
  {  
    "room\_id": "Room 304",  
    "usage\_percentage": 92 // Persentase dari limit alokasi bulanan  
  },  
  {  
    "room\_id": "Room 102",  
    "usage\_percentage": 78  
  }  
\]

*   
* 

**3\. API Get Quick Room Status (Untuk Tabel)**

* **Konteks:** Di kiri bawah ada tabel status kamar yang berisi Nama Kamar, Nama Tenant, Usage (MTD), dan Status (Normal/Warning/Exceeded).  
* **Request:** Buatkan endpoint `GET /dashboard/admin/room-status` (atau *embed* di `GET /rooms/` pakai query param). Data ini butuh nge-*join* tabel Rooms, Tenants (penghuni aktif), dan total Consumption bulan berjalan.  
* **Ekspektasi JSON:**  
* JSON

{  
  "data": \[  
    {  
      "room\_id": "Room 101",  
      "tenant\_name": "Acme Corp",  
      "kwh\_usage\_mtd": 458.2,  
      "status": "normal" // "normal", "warning", "exceeded"  
    },  
    {  
      "room\_id": "Room 304",  
      "tenant\_name": "Design Studio X",  
      "kwh\_usage\_mtd": 980.5,  
      "status": "exceeded"  
    }  
  \]

* }  
* 

**Energy Monitoring Admin**

**Karena UI-nya sama, aku butuh tambahan data yang sama persis di endpoint `GET /dashboard/admin/overview` ya (atau kalau mau dipisah jadi `GET /consumption/admin/history` juga boleh):**

**1\. Tambahan `peak_demand_kw` dan `status` di array `series`**

* **Konteks:** Untuk ngisi kolom "Peak Demand (KW)" dan "Status/Notes" (Normal, High Peak, Anomalous) di tabel *Daily Log* admin, dan card *Peak Demand* di atas.  
* **Ekspektasi JSON:**  
* JSON

"series": \[  
  {  
    "ts": "2023-10-14T00:00:00+00:00",   
    "kwh": 42.5,  
    "peak\_demand\_kw": 6.2,  
    "status": "High Peak Detected"  
  }  
\]

*   
* 

**2\. Data Estimasi / Proyeksi (Estimated Base)**

* **Konteks:** Untuk grafik batang abu-abu muda di tanggal yang belum terjadi.  
* **Request:** Sama seperti yang *user*, tolong tambahkan data proyeksinya untuk sisa bulan ini ke dalam *array* data hariannya (atau dipisah).

**3\. Persentase Kenaikan (+4.2% vs last 30 days)**

* **Konteks:** Di bawah tulisan 1,245 kWh (TOTAL CONSUMPTION).  
* **Request:** Ini bebas sih, kalau di *backend* gampang ngitung persentase perbandingannya dengan bulan lalu, tolong tambahin di *object* `totals`. Kalau ribet, nggak apa-apa *skip* aja, nanti aku *fetch* data 60 hari dari *frontend* trus aku hitung manual selisihnya.

*Thank you\! Intinya samain aja format datanya kayak yang history user kemarin, cuma angkanya angka total gedung aja.*

**Billing & Invoices**

**1\. API Get Billing Summary (Untuk Card di atas & Collection Status)**

* **Konteks:** Di UI ada card "Total Building Usage", "Expected Revenue", dan grafik "Collection Status" (Paid, Pending, Unpaid) berdasarkan bulan yang dipilih.  
* **Request:** Buatkan endpoint `GET /billing/summary` (atau `GET /admin/billing/summary`). Tolong *support* query param `?period=YYYY-MM`.  
* **Ekspektasi JSON:**  
* JSON

{  
  "period": "2023-10",  
  "total\_usage\_kwh": 2165,  
  "expected\_revenue": 3247500,  
  "collection": {  
    "total\_collected": 16031250,  
    "rooms\_paid": 34,  
    "rooms\_pending": 6,  
    "rooms\_unpaid": 5  
  }  
}

*   
* 

**2\. API Get All Invoices (Untuk Tabel Admin)**

* **Konteks:** Menampilkan daftar tagihan semua kamar di bulan tertentu. (Beda dengan invoice user kemarin yang cuma nampilin milik 1 user).  
* **Request:** Buatkan endpoint `GET /billing/invoices` (kalau diakses admin, me-return semua invoice). Wajib *support* query params `?period=YYYY-MM&page=1&limit=10`.  
* **Ekspektasi JSON:**  
* JSON

{  
  "data": \[  
    {  
      "invoice\_id": "INV-101-202310",  
      "room\_no": "101",  
      "kwh\_used": 450,  
      "rate": 1500,  
      "total\_amount": 675000,  
      "status": "paid", // "paid", "unpaid", "pending"  
      "payment\_proof\_url": "https://link-ke-gambar-bukti.com/bukti.jpg"   
    },  
    {  
      "invoice\_id": "INV-102-202310",  
      "room\_no": "102",  
      "kwh\_used": 320,  
      "rate": 1500,  
      "total\_amount": 480000,  
      "status": "unpaid",  
      "payment\_proof\_url": null  
    }  
  \],  
  "meta": { "total\_items": 45, "current\_page": 1 }  
}

*   
* 

**3\. API Verifikasi Pembayaran (Update Status)**

* **Konteks:** Di tabel ada status "Pending" (kuning). Biasanya admin bakal ngeklik tombol *Action* (icon mata/dokumen) untuk ngecek bukti transfer, lalu mengubah statusnya jadi "Paid".  
* **Request:** Buatkan endpoint untuk update status invoice, misalnya `PATCH /billing/invoices/{invoice_id}/status`.  
* **Request Payload (JSON):**  
* JSON

{  
  "status": "paid" 

* }  
* 

**Billing & Invoices Details**

**1\. API Get Invoice Detail**

* **Konteks:** Menampilkan detail lengkap untuk satu tagihan/invoice beserta informasi tenant dan bukti pembayarannya.  
* **Request:** Buatkan endpoint `GET /billing/invoices/{invoice_id}`.  
* **Ekspektasi JSON:**  
* JSON

{  
  "invoice\_id": "INV-101-202310",  
  "room\_no": "101",  
  "billing\_period": "Oct 1 \- Oct 31, 2023",  
  "due\_date": "2023-11-05",  
  "status": "unpaid", // "paid", "unpaid", "pending"  
  "tenant": {  
    "name": "Budi Santoso",  
    "email": "budi.santoso@ampera.com"  
  },  
  "usage": {  
    "meter\_reading": "253.88", // Bisa diambil dari latest\_meter\_reading  
    "kwh\_used": 450,  
    "rate\_per\_kwh": 1500  
  },  
  "total\_amount": 675000,  
  "payment\_proof\_url": "https://link-ke-bukti-transfer.com/file.jpg",  
  "recommendation": {  
    "estimated\_savings": 0,  
    "note": "Data tidak tersedia untuk room ini."  
  }

* }  
* 

**Resident Management**

**1\. API Get Rooms Summary (Untuk 4 Card di atas)**

* **Konteks:** Menampilkan angka Total Rooms, Vacant Units, Warnings (Energy), dan Critical (Exceeded).  
* **Request:** Buatkan endpoint `GET /rooms/summary`.  
* **Ekspektasi JSON:**  
* JSON

{  
  "total\_rooms": 142,  
  "vacant\_units": 12,  
  "warnings\_count": 8,  
  "critical\_count": 3  
}

*   
* 

**2\. Penyesuaian API `GET /rooms/` (Untuk Tabel Utama)**

* **Konteks:** Tabel butuh nampilin nama penghuni dan total pemakaian listrik bulan berjalan untuk masing-masing kamar.  
* **Request:** Tolong *update* `GET /rooms/` supaya me- *return* data *join* dengan tenant aktif dan total kWh bulan ini. Wajib *support* query params untuk filter dan pagination: `?floor=1st Floor&status=Normal&search=Alice&page=1&limit=10`.  
* **Ekspektasi JSON:**  
* JSON

{  
  "data": \[  
    {  
      "room\_no": "101",  
      "floor": "1st Floor",  
      "resident\_name": "Alice Johnson", // null jika kosong  
      "monthly\_kwh": 245.5,  
      "estimated\_cost": 368200, // Bebas mau dihitung di BE atau FE  
      "status": "Normal" // "Normal", "Warning", "Exceeded", "Vacant"  
    },  
    {  
      "room\_no": "205",  
      "floor": "2nd Floor",  
      "resident\_name": null,  
      "monthly\_kwh": 5.2, // Listrik standby  
      "estimated\_cost": 7800,  
      "status": "Vacant"  
    }  
  \],  
  "meta": { "total\_items": 142, "current\_page": 1 }  
}

*   
* 

**3\. API Create New Room**

* **Konteks:** Di pojok kanan atas ada tombol biru "Add New Room". Di dokumen belum tertulis ada endpoint POST-nya.  
* **Request:** Buatkan endpoint `POST /rooms/`.  
* **Request Payload (JSON):**  
* JSON

{  
  "room\_no": "401",  
  "floor": "4th Floor",  
  "max\_occupants": 2

* }  
* 

**Resident Management Details Rooms**

**. Enrich API `GET /rooms/{room_id}` (Detail Utama)**

* **Konteks:** Buat ngisi bagian atas (Tenant, Floor, Monthly Limit) dan 3 Card *Summary* (Usage, Cost, Limit Status).  
* **Request:** Tolong tambahkan kalkulasi pemakaian bulan berjalan dan limit ke dalam *response* detail kamar ini.  
* **Ekspektasi JSON:**  
* JSON

{  
  "room\_id": "Room 304",  
  "floor": 3,  
  "tenant\_name": "Design Studio X",  
  "monthly\_limit\_kwh": 450,  
  "current\_month": {  
    "usage\_kwh": 342.5,  
    "estimated\_cost": 513750, // Anggap rate Rp 1.500/kWh  
    "usage\_percentage": 76,  
    "remaining\_kwh": 107.5  
  }  
}

*   
* 

**2\. API Edit Monthly Limit**

* **Konteks:** Ada tombol biru "Edit Limit" di pojok kanan atas.  
* **Request:** Buatkan endpoint `PATCH /rooms/{room_id}` atau `PATCH /rooms/{room_id}/limit` untuk mengubah kuota maksimal bulanan kamar tersebut.  
* **Request Payload (JSON):**  
* JSON

{  
  "monthly\_limit\_kwh": 500  
}

*   
* 

**3\. API Consumption Series per Kamar (Untuk 2 Grafik)**

* **Konteks:** Di UI ada 2 grafik: "Hourly Consumption" (24 jam terakhir) dan "Daily Consumption" (30 hari terakhir).  
* **Request:** Di dokumen ada `GET /consumption/rooms/{room_id}` tapi deskripsinya "Ambil log konsumsi terbaru". Tolong pastikan ini bisa me- *return* array time-series seperti *dashboard* utama, dan *support* parameter `?interval=hour` atau `?interval=day` beserta `start` & `end`.  
* **Ekspektasi JSON:**  
* JSON

{  
  "series": \[  
    {"ts": "2023-10-26T00:00:00Z", "kwh": 1.2},  
    {"ts": "2023-10-26T01:00:00Z", "kwh": 1.5}  
  \]  
}

*   
* 

**4\. Filter Room di API Alerts**

* **Konteks:** Tabel di paling bawah nampilin "Alert History" spesifik untuk kamar ini aja.  
* **Request:** Endpoint `GET /alerts/` yang udah ada tolong ditambahin dukungan *query parameter* `?room_id=Room 304` biar kembaliannya cuma notifikasi milik kamar ini.

*Thank you\! Prioritasnya nomor 1 dan 3 dulu aja biar layout utamanya bisa langsung keisi data asli.*

**Notifications**

**1\. Tambahan Counter Unread Alerts**

* **Konteks:** Di pojok kanan atas UI ada card merah penunjuk jumlah alert yang belum dibaca ("12 UNREAD ALERTS").  
* **Request:** Tolong selipkan field `unread_count` di dalam meta respons `GET /alerts/` atau buatkan endpoint super ringan baru, misalnya `GET /alerts/unread-count`.

**2\. Optimalisasi Query Parameters di `GET /alerts/` (Untuk Filter Tabel)**

* **Konteks:** Admin bisa memfilter data berdasarkan rentang waktu, jenis alert, dan mengetik spesifik nomor kamar tertentu.  
* **Request:** Pastikan endpoint `GET /alerts/` mendukung filter berikut dari frontend:  
  * `?start=...&end=...` (Untuk filter *Date Range*, misal Last 7 Days).  
  * `?type=...` (Untuk filter *Type*, menerima value: `alert`, `insight`, `system`, atau `all`).  
  * `?room_id=...` (Untuk input pencarian *Room*, misal admin mengetik `402`).  
  * `?page=1&limit=10` (Untuk kebutuhan pagination di kanan bawah tabel).  
* **Ekspektasi JSON:**  
* JSON

{  
  "data": \[  
    {  
      "alert\_id": "ALT-992",  
      "status": "pending\_review", // "pending\_review" atau "resolved"  
      "timestamp": "2026-05-19T14:32:00Z",  
      "room\_id": "Room 304",  
      "type": "alert",  
      "message": "Consumption exceeded 5kWh in a single hour."  
    }  
  \],  
  "meta": {  
    "total\_items": 45,  
    "unread\_count": 12,  
    "current\_page": 1  
  }  
}

*   
* 

*Thank you banyak\! Akhirnya semua list kebutuhan API dari sisi Admin dan User udah beres kita list semua. Mantap bgt kerjasamanya\!* 🚀

