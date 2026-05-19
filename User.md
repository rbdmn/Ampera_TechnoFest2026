**Dashboard user**

1. **Halo tim Backend\! 👋 Mau minta tolong *update* sedikit untuk *response* endpoint `GET /dashboard/user/overview` (Dashboard User).**

**Saat ini tarif per kWh, limit kuota kamar, dan angka proyeksi akhir bulan masih aku *hardcode* di frontend. Biar datanya dinamis dan akurat, boleh tolong tambahkan objek `settings` dan `projection` di dalam *response*\-nya?**

**Berikut ekspektasi struktur JSON baru yang aku butuhin:**

JSON

{

  "totals": {

    "kwh": 342.5,

    "bill": 513750

  },

  "settings": {

    "rate\_per\_kwh": 1500,       // Tarif listrik aktif saat ini

    "monthly\_limit\_kwh": 500    // Limit kuota khusus untuk kamar user ini

  },

  "projection": {

    "projected\_kwh": 485.2,     // Prediksi total kWh sampai akhir bulan

    "projected\_bill": 727800    // Prediksi total tagihan (projected\_kwh \* rate\_per\_kwh)

  },

  "series": \[

    {

      "ts": "2023-10-14T00:00:00+00:00",

      "kwh": 12.5

    }

  \]

}

2. **Tambahan Field "Peak Demand (kW)" di Data Harian**  
* **Konteks:** Di UI ada Card "Peak Demand" dan kolom tabel "Peak Demand (KW)". Saat ini API (`/dashboard/user/overview`) baru mengirimkan `kwh` (total energi), belum ada `kw` (beban puncak).  
* **Request:** Tolong tambahkan field `peak_demand_kw` di dalam masing-masing object pada array `series` (atau buatkan endpoint khusus *history* kalau dirasa datanya terlalu berat).  
* **Ekspektasi JSON:** \`\`\`json "series": \[ { "ts": "2023-10-14T00:00:00+00:00", "kwh": 42.5, "peak\_demand\_kw": 6.2 } \]

**3\. Tambahan Field "Status / Anomaly Note" di Data Harian**

* **Konteks:** Di tabel *Daily Log*, ada kolom status untuk tiap harinya (misal: "Normal", "High Peak Detected", "Anomalous Usage").  
* **Request:** Minta tolong di- *inject* sekalian logika deteksi anomali ini ke balikan data harian.  
* **Ekspektasi JSON:**  
* JSON

"series": \[  
  {  
    "ts": "2023-10-14T00:00:00+00:00",   
    "kwh": 42.5,  
    "status": "High Peak Detected"   
  }  
\]

*   
* 

**4\. Data Proyeksi / Estimasi Sisa Bulan (Estimated Base)**

* **Konteks:** Di ujung kanan grafik batang, UI butuh menampilkan data prediksi konsumsi (warna biru muda) untuk tanggal-tanggal yang belum terjadi di bulan ini.  
* **Request:** Boleh buatkan endpoint baru (misal: `GET /consumption/projection`) atau gabung di endpoint overview. Isinya mengembalikan array `series` berisi tanggal-tanggal masa depan beserta estimasi `kwh`\-nya.

**5\. Data "Typical Range" (Rentang Normal Historis)**

* **Konteks:** Di Card "Average Daily Use", ada teks *"Typical range: 35-45 kWh"*.  
* **Request:** Tolong tambahkan rentang batas bawah dan atas rata-rata historis *user* tersebut ke dalam object `totals` atau ringkasan *dashboard*.  
* **Ekspektasi JSON:**  
* JSON

"totals": {  
  "kwh": 1245,  
  "average\_daily\_kwh": 41.5,  
  "typical\_range\_min": 35.0,  
  "typical\_range\_max": 45.0

* }


**Billing & invoices user**

**1\. API Get List Invoices (Riwayat Tagihan)**

* **Konteks:** Untuk mengisi tabel "Billing History" dan card "Current Invoice" di paling atas.  
* **Request:** Buatkan endpoint `GET /billing/invoices` (pakai auth/token user yang login).  
* **Kebutuhan Field:** Tiap *invoice* harus me- *return* data: `invoice_no`, `billing_period` (bulan/tahun atau tanggal mulai & akhir), `usage_kwh`, `amount` (total tagihan dalam Rupiah), `status` ("paid" atau "unpaid"), dan khusus yang unpaid butuh `due_date`.  
* **Kebutuhan Pagination:** Karena di tabel UI ada angka halaman (1, 2, Next) dan tulisan "Showing 1 to 4 of 12", tolong endpoint ini di- *support* query params `?page=1&limit=10` dan kembalikan juga meta data `total_items`.  
* **Ekspektasi JSON:**  
* JSON

{

  "data": \[

    {

      "invoice\_no": "INV-2023-09",

      "period\_start": "2023-09-01",

      "period\_end": "2023-09-30",

      "usage\_kwh": 450,

      "amount": 675000,

      "status": "paid",

      "due\_date": null

    }

  \],

  "meta": { "total\_items": 12, "current\_page": 1 }

}

*   
* 

**2\. API Payment / Checkout (Bayar Tagihan)**

* **Konteks:** Di UI ada tombol biru "Pay Now" untuk tagihan yang statusnya "UNPAID".  
* **Request:** Buatkan endpoint `POST /billing/invoices/{invoice_no}/pay`.  
* **Catatan:** Untuk tahap MVP ini, API ini cukup mengembalikan status sukses dan langsung mengubah status *invoice* di DB menjadi "paid". *(Kecuali kalau tim kita mau sekalian integrasi Payment Gateway kayak Midtrans/Xendit, berarti API ini yang nge-return Snap Token/URL pembayarannya).*

**3\. (Opsional) API Generate PDF**

* **Konteks:** Ada tombol "PDF" di UI.  
* **Request:** Kalau dari *backend* gampang generate file-nya (misal pakai library *pdfkit* di Python), boleh buatin endpoint `GET /billing/invoices/{invoice_no}/pdf` yang mengembalikan file PDF.  
* *(Note dari Frontend: Tapi kalau ribet, skip aja bagian PDF ini, nanti aku handle langsung dari browser frontend).*

**Admin Feedback User**

**1\. API Get List Admin Messages**

* **Konteks:** Untuk menampilkan daftar pesan di halaman Admin Feedback dan mendukung fitur *Search*.  
* **Request:** Buatkan endpoint `GET /admin-messages/` (atau nama endpoint lain yang sesuai, misal `/messages`). Endpoint ini hanya memunculkan pesan yang ditujukan untuk user yang sedang login (bisa spesifik ke user, atau *broadcast* ke semua user).  
* **Query Params:** Tolong *support* parameter `?search=...` untuk fitur "Cari pesan admin..." di pojok kanan atas.  
* **Ekspektasi JSON:**  
* JSON

{

  "data": \[

    {

      "message\_id": "MSG-001",

      "title": "Pembayaran Invoice Bulan Ini",

      "content": "Halo, mohon segera upload bukti pembayaran untuk invoice Oktober...",

      "created\_at": "2026-05-10T10:00:00Z",

      "is\_read": false 

    },

    {

      "message\_id": "MSG-002",

      "title": "Perubahan Jadwal Pemeliharaan",

      "content": "Ada jadwal pemeliharaan listrik pada 15 Mei 2026...",

      "created\_at": "2026-05-05T08:00:00Z",

      "is\_read": true

    }

  \]

}

*   
* 

**2\. API Mark Message as Read**

* **Konteks:** Di UI ada tombol "Mark as Read" untuk setiap pesan yang masih *Unread*.  
* **Request:** Buatkan endpoint untuk mengubah status pesan menjadi sudah dibaca. Bisa pakai `PATCH /admin-messages/{message_id}/read`.  
* **Ekspektasi:** Cukup kembalikan status `200 OK` saat sukses di-update.

**Notification User**

**PAPI Get User Notifications**

* **Request: `GET /users/me/notifications` (atau `GET /notifications/user`)**  
* **Konteks: Endpoint ini otomatis membaca token user yang login, lalu mengembalikan daftar notifikasi, alert, atau insight yang hanya berkaitan dengan kamar/akun user tersebut.**  
* **Query Params: Tolong *support* `?page=1&limit=10` dan kalau bisa opsi filter `?type=insight` atau `?type=alert`.**  
* **Ekspektasi JSON:**  
* **JSON**

**{**

  **"data": \[**

    **{**

      **"notification\_id": "NOTIF-001",**

      **"type": "alert",            // "alert", "insight", atau "system"**

      **"title": "Usage Limit Approaching",**

      **"message": "Your projected energy usage for this billing cycle is set to exceed...",**

      **"created\_at": "2026-05-19T14:34:00Z",**

      **"is\_read": false**

    **},**

    **{**

      **"notification\_id": "NOTIF-002",**

      **"type": "system",**

      **"title": "Invoice Generated: October",**

      **"message": "Your monthly electricity invoice for October has been generated...",**

      **"created\_at": "2026-05-18T09:00:00Z",**

      **"is\_read": true**

    **}**

  **\],**

  **"meta": {**

    **"total\_items": 15,**

    **"current\_page": 1**

  **}**

**}**

*   
* 

**2\. API Mark User Notification as Read**

* **Request: `PATCH /users/me/notifications/{notification_id}/read`**  
* **Konteks: Mengubah status satu notifikasi spesifik milik user menjadi sudah dibaca (`is_read: true`).**

**3\. API Mark All User Notifications as Read**

* **Request: `POST /users/me/notifications/mark-all-read`**  
* **Konteks: Untuk tombol "Mark all as read" di pojok kanan atas halaman notifikasi user**

**Profile User**

**API Get Current User Profile**

* **Konteks:** Untuk mengisi nilai *default* di *form* saat halaman pertama kali dibuka (Foto, Nama, Email, dan Kamar).  
* **Request:** Buatkan endpoint `GET /users/me` (atau `GET /profile`). Endpoint ini membaca *token bearer* dari *header* untuk tahu siapa *user*\-nya.  
* **Ekspektasi JSON:**  
* JSON

{

  "user\_id": "USR-TEN001",

  "full\_name": "Jane Doe",

  "email": "jane.doe@example.com",

  "room\_id": "Apt 4B", 

  "avatar\_url": "https://url-ke-foto-profil.com/img.jpg" // (Opsional, kalau belum ada storage bisa dikosongin dulu)

}

*   
* 

**2\. API Update Personal Information**

* **Konteks:** Saat *user* klik tombol "Save Changes" di *form* profil.  
* **Request:** Buatkan endpoint `PATCH /users/me`.  
* **Catatan Penting:** Dari UI-nya, *field* "Room / Unit" statusnya **Locked** (tidak bisa diedit oleh *user*). Jadi API ini cukup menerima *update* untuk nama dan email saja.  
* **Request Payload (JSON):**  
* JSON

{

  "full\_name": "Jane Doe Updated",

  "email": "jane.baru@example.com"

}

*   
* 

**3\. API Change/Update Password**

* **Konteks:** Untuk bagian "Security & Password" di bawah.  
* **Request:** Buatkan endpoint khusus, misalnya `POST /auth/change-password` atau `POST /users/me/password`.  
* **Catatan:** *Backend* harus memvalidasi `current_password` (dicocokkan dengan *hash* di *database*). Untuk `confirm_password` akan di- *handle* validasinya di *frontend* saja biar simpel, jadi *frontend* cuma kirim 2 parameter.  
* **Request Payload (JSON):**  
* JSON

{

  "current\_password": "password\_lama\_123",

  "new\_password": "password\_baru\_Aman1\!"

}

*   
* 

**4\. (Opsional) API Upload Photo Profile**

* **Konteks:** Untuk tombol "Change Photo".  
* **Request:** Kalau dari *backend* ada waktu untuk *setup storage* (simpan file gambar), tolong buatin `POST /users/me/avatar` yang menerima `multipart/form-data`. Tapi kalau untuk MVP ini keribetan, infoin aja ya, nanti fitur "Change Photo"-nya aku *disable* dulu atau pakai avatar *dummy/default*.

