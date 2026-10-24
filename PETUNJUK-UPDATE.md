# Update 2026.10.25 — Keamanan, Notifikasi WA/Email, CRM, Impor, Turbo

Untuk situs yang SUDAH berjalan (frontend GitHub Pages + Apps Script). Data Sheets Anda tidak diubah.

## Langkah 1 — Backend (±5 menit)
1. Buka proyek Apps Script → ganti SELURUH isi `Kode.gs` dengan `backend/Kode.gs` dari paket ini → Simpan.
2. Pilih fungsi **setupAppEnvironment** → Jalankan (izinkan akses bila diminta). Aman diulang; tidak menghapus data.
   - Membuat 4 sheet baru: AntrianNotif, BlastWA, CRM_Kontak, CRM_Interaksi.
   - Membuat rahasia internal di Script Properties (SESSION_SECRET dsb.) dan memasang pengatur waktu (trigger) 1 menit.
   - **Sandi admin lama TETAP berlaku.** Saat Anda login pertama kali setelah update, hash sandi dipindahkan otomatis dari sheet Pengaturan ke Script Properties (bergaram) dan barisnya dihapus dari sheet.
   - Hanya pada instalasi BARU (belum ada sandi): sandi awal acak muncul SEKALI di **Eksekusi → Log**. Catat lalu ganti.
3. **Terapkan → Kelola deployment → ikon pensil → Versi: Versi baru → Terapkan.** URL `/exec` tetap sama, jangan buat deployment baru.

## Langkah 2 — Frontend
Salin `index.html`, `css/style.css`, `js/app.js` ke folder repo Anda (timpa). `js/config.js` dan `js/api.js` TIDAK berubah. Lalu `git add . && git commit -m "update admin" && git push`. Tunggu ±10 menit (cache GitHub Pages), lalu Ctrl+Shift+R.

## Menu admin baru
- **Notifikasi** → Konfigurasi: isi token Fonnte, nyalakan saklar WhatsApp, atur nomor WA admin, matriks kejadian & templat pesan, uji kirim. Tab **Blast WhatsApp** (batch 10/20/50 + jeda) dan **Antrean & Riwayat**.
- **Kontak CRM**: kontak otomatis dari Pesanan & Pesan Hubungi Kami; tambah/impor CSV, tag, opt-out, gabungkan duplikat, ekspor CSV, riwayat interaksi.
- **Impor Data**: salin data dari spreadsheet lama (URL/ID). Mulai dari **Pindai** (tidak menulis apa pun), lalu **Impor**. Aman diulang.

## WhatsApp (Fonnte) — belum aktif sampai Anda isi token
1. Daftar di fonnte.com, sambungkan nomor WA (scan QR), salin token.
2. Admin → Notifikasi → Konfigurasi → tempel token → Simpan Token → Cek Perangkat.
3. Ubah saklar WhatsApp ke **Hidup** → Simpan → uji dengan Tes WhatsApp.
Peristiwa bawaan: Pesan Hubungi Kami → admin; Pesanan baru → admin & pelanggan; Status berubah → pelanggan. Email tetap jalan walau WA mati.

## Hal yang perlu diketahui
- Notifikasi masuk **antrean** dan dikirim di latar belakang (±1 menit, atau segera lewat panggilan setelah form dikirim); pengunjung tidak menunggu.
- Mengedit sheet langsung lewat Google Sheets bisa tampak terlambat hingga ±5 menit di panel admin (cache). Edit lewat panel admin langsung segar.
- Logout atau ganti sandi mengakhiri SEMUA sesi admin (satu pengelola).
- Lupa sandi: jalankan fungsi **resetSandiAdmin** dari editor Apps Script; sandi baru muncul sekali di Log.
- Pengatur waktu 1 menit memakai kuota trigger harian. Bila ingin menghemat, jalankan **matikanKeepWarm** (pemanasan server berhenti, antrean notifikasi tetap jalan); **nyalakanKeepWarm** untuk menghidupkan lagi. **cekPerforma** menampilkan ringkasan di Log.
- Jangan kembali ke `Kode.gs` versi lama setelah login pertama: hash sandi lama sudah dihapus dari sheet. Jika terpaksa, jalankan resetSandiAdmin di versi baru dulu.
- Rahasia (token Fonnte, hash sandi, secret sesi) hanya di Script Properties; tidak pernah di sheet, kode, atau halaman web.

## Batas pengujian (jujur)
Semua fitur diuji di simulator Apps Script (197 pemeriksaan backend + 24 pemeriksaan antarmuka di browser) — bukan di Apps Script asli maupun server Fonnte asli. Lakukan uji singkat setelah update: login, kirim formulir Hubungi Kami, lihat antrean, Tes Email. Jika Fonnte menolak format tertentu, pesan error-nya muncul di Antrean & Riwayat.
