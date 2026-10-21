# Panduan Migrasi ke GitHub Pages — Fajarfk Transportasi, Inovasi & Digital

Data Anda (Google Sheets dan Google Drive) **tidak dipindah dan tidak disentuh**.
Yang berubah hanya cara situs ditayangkan:

| | Sebelum | Sesudah |
|---|---|---|
| Tampilan situs | Apps Script (HtmlService) | **GitHub Pages** (HTML/CSS/JS statis) |
| Data & Panel Admin | Apps Script + Sheets + Drive | Apps Script + Sheets + Drive (sama) |
| Alamat situs | `script.google.com/.../exec` | `https://USERNAME.github.io/NAMA-REPO/` |

Apps Script yang dipakai adalah **proyek yang sama** dengan sekarang. Jangan membuat proyek baru,
karena proyek baru akan membuat spreadsheet kosong baru.

> **Sebelum mulai:** buka spreadsheet database Anda → File → Buat salinan. Itu cadangan lengkap.

---

## BAGIAN 1 — Backend (Google Apps Script), sekitar 5 menit

1. Buka proyek Apps Script yang **sekarang dipakai** situs Fajarfk.
2. Buka file **Kode.gs** → pilih semua isinya → hapus → tempel isi `Kode.gs` yang baru (file terpisah).
3. Pilih fungsi **`setupAppEnvironment`** di dropdown atas → klik **Run**.
   - Ini aman diulang: tidak menghapus data. Fungsi ini menambah sheet **Agenda** dan **Survei**
     serta kolom `jadwal_terbit` di Wawasan.
   - Kalau muncul izin akses, klik Review permissions → izinkan.
4. **Deploy → Manage deployments** → ikon pensil (Edit) pada deployment yang ada →
   **Version: New version** → **Deploy**.
   - Pastikan **Execute as: Me** dan **Who has access: Anyone**.
   - **Jangan** pilih "New deployment". Memakai "Manage deployments → Edit" menjaga alamat `/exec` tetap sama.
5. Salin URL Web App yang berakhiran **`/exec`**.
6. Uji di browser: buka `URL_EXEC_ANDA?action=getInitialData`.
   Hasil yang benar: teks JSON panjang berawalan `{"success":true,...`.
   Kalau yang muncul halaman error Google atau minta login, cek lagi "Who has access: Anyone".

Setelah ini, alamat `/exec` lama **tidak lagi menampilkan situs** (isinya JSON). Itu normal, karena
tampilan situs pindah ke GitHub Pages. File `Index.html`, `JavaScript.html`, `Stylesheet.html`
di proyek Apps Script sudah tidak dipakai; boleh dibiarkan atau dihapus setelah situs baru berjalan.

**Jalan mundur (kalau perlu):** Deploy → Manage deployments → Edit → pilih **Version** sebelumnya → Deploy.
Situs Apps Script lama tayang lagi seperti semula.

---

## BAGIAN 2 — Frontend (GitHub Pages)

### Folder kerja Anda

Setelah ZIP diekstrak, **folder yang di-`git init` adalah folder `fajarfk-website`** —
folder yang langsung berisi `index.html`, `css`, dan `js`.

```
fajarfk-website\        ← di sini git init
├── index.html
├── README.md
├── PANDUAN-INSTALASI.md
├── css\style.css
└── js\ (config.js, api.js, app.js)
```

Windows kadang menaruh folder ini di dalam folder lain (misalnya `paket-frontend-fajarfk\fajarfk-website`).
Yang dipakai selalu folder yang **langsung** berisi `index.html`.

### Langkah 1 — Isi alamat API

Buka `js\config.js` dengan Notepad dan ganti `PASTE_URL_EXEC_DI_SINI` dengan URL `/exec` dari Bagian 1:

```js
const GAS_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

Simpan. Ini satu-satunya file yang Anda edit.

### Langkah 2 — Buat repository baru

Di github.com: tombol **+** → **New repository** → nama, misalnya `website-fajarfk` →
**Public** → **jangan** centang README / .gitignore / license → **Create repository**.

### Langkah 3 — Masuk ke folder yang benar dan periksa

Buka folder `fajarfk-website` di File Explorer, klik address bar, ketik `powershell`, tekan Enter. Lalu:

```powershell
dir
```

Yang harus terlihat: **`index.html`**, `css`, `js`. Kalau yang terlihat justru `fajarfk-website` atau
`backend`, berarti Anda satu level terlalu tinggi: `cd fajarfk-website` dulu. Jangan lanjut sebelum
`index.html` terlihat.

### Langkah 4 — Push pertama

Jalankan satu per satu:

```powershell
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/fajarops88/website-fajarfk.git
git push -u origin main
```

(Ganti `website-fajarfk` kalau nama repo Anda berbeda.)
Saat diminta password, tempel **Personal Access Token** (bukan password akun). Layar tampak kosong saat
paste, itu normal. Berhasil kalau muncul `* [new branch] main -> main`.

### Langkah 5 — Aktifkan Pages

Repo → **Settings** → **Pages** → Source: **Deploy from a branch** → Branch: **main** · **/ (root)** → **Save**.
Tunggu 1–2 menit. Alamat situs muncul: `https://fajarops88.github.io/website-fajarfk/`.

### Langkah 6 — Uji

Buka alamat itu, tekan **Ctrl+Shift+R**, lalu cek:
- Beranda tampil lengkap dengan data Anda.
- Menu **Tentang Saya** dan **Karya & Layanan** terbuka dan halamannya tampil.
- Panel Admin bisa login (ikon di kanan atas).
- Survei bintang bisa dikirim, dan hasilnya muncul di Panel Admin → Survei.

---

## Update berikutnya

**Mengubah isi** (profil, karya, agenda, dan sebagainya): lewat Panel Admin seperti biasa. Tidak perlu apa pun di GitHub.

**Mengubah tampilan** (file di folder `fajarfk-website`): dari folder yang sama jalankan

```powershell
git add .
git commit -m "Deskripsi perubahan"
git push
```

Tunggu 1–2 menit, lalu Ctrl+Shift+R.

**Mengubah kode backend** (`Kode.gs`): tempel di Apps Script, lalu Deploy → Manage deployments → Edit →
New version → Deploy.

---

## Pratinjau tautan di WhatsApp (opsional)

Tag pratinjau sudah ada di `index.html`. Supaya gambarnya muncul saat tautan dibagikan, taruh satu foto
(misalnya `og.jpg`, ukuran sekitar 1200×630) di folder `fajarfk-website`, lalu di `index.html` isi baris
`og:image` dengan alamat lengkapnya, misalnya
`https://fajarops88.github.io/website-fajarfk/og.jpg`. Setelah itu push seperti biasa.
WhatsApp menyimpan pratinjau lama, jadi hasilnya mungkin baru terlihat pada tautan yang belum pernah dibagikan.

---

## Kalau ada masalah

| Yang terlihat | Penyebab | Solusi |
|---|---|---|
| Halaman 404 di GitHub Pages | `index.html` tidak di root repo | Buka repo di browser: `index.html` harus terlihat di daftar paling atas. Kalau yang terlihat folder, ulangi dari folder yang benar |
| Halaman tanpa warna/gaya | Folder `css` atau `js` tidak ikut | Pastikan strukturnya utuh seperti diagram di atas; jangan upload lewat tombol "Upload files" di web GitHub |
| Layar "Gagal Memuat" / "GAS_URL belum diisi" | `js\config.js` belum diisi atau salah | Isi URL `/exec`, push ulang |
| "Server mengembalikan respons yang tidak valid" | Akses Web App bukan "Anyone", atau URL salah | Cek Deploy → Manage deployments → Who has access: Anyone |
| Data lama tidak muncul | Backend belum di-deploy sebagai versi baru | Bagian 1 langkah 4 |
| Survei / Agenda gagal | `setupAppEnvironment()` belum dijalankan | Bagian 1 langkah 3 |
| Tampilan lama setelah push | Cache browser | Ctrl+Shift+R atau jendela Incognito |
| `Password authentication is not supported` | GitHub menolak password biasa | Pakai Personal Access Token (github.com/settings/tokens → classic → centang `repo`) |
