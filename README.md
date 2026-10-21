# Fajarfk Transportasi, Inovasi & Digital — Frontend (GitHub Pages)

Frontend statis (HTML/CSS/JS) situs profil & portofolio. Data dan panel admin dilayani
oleh Google Apps Script sebagai REST API (JSON). Tidak ada iframe, tidak ada `google.script.run`.

```
index.html          <- halaman utama (harus di root repo)
css/style.css       <- seluruh gaya
js/config.js        <- ISI GAS_URL DI SINI (satu-satunya file yang diedit)
js/api.js           <- penghubung fetch() ke Apps Script
js/app.js           <- router SPA, semua halaman, panel admin
```

Cara pasang lengkap: lihat `PANDUAN-INSTALASI.md`.
Folder ini (yang berisi `index.html`) adalah folder yang di-`git init`.
