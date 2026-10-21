/* ============================================================================
   FAJARFK TRANSPORTASI, INOVASI & DIGITAL — js/app.js
   SPA router + semua render halaman + panel admin
   Arsitektur: GAS-PRO-API — frontend statis (GitHub Pages) + Apps Script sebagai REST API.
   Token sesi admin hanya di memori JS (tidak disimpan di URL / localStorage).
   ============================================================================ */

/* ============================================================================
   FAJARFK TRANSPORTASI, INOVASI & DIGITAL — JavaScript.html
   SPA router + semua render halaman + panel admin
   Arsitektur: gas-spa-iframe — TIDAK ADA ?page= URL, token sesi hanya di memori JS
   ============================================================================ */

// --------------------------------------------------------------------------
// STATE GLOBAL (hanya di memori — tidak pernah disimpan di URL)
// --------------------------------------------------------------------------
const AppState = {
  data: null,          // hasil getInitialData()
  sessionToken: null,  // token admin — HANYA di memori JS
  currentPage: 'beranda',
  currentParams: {},
  theme: 'light',
  visitorToken: null,
  adminTab: 'dashboard',
  isAdmin: false
};

const STATUS_URUTAN = ['Diterima', 'Dibahas', 'Diproses', 'Selesai'];

// --------------------------------------------------------------------------
// INISIALISASI
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
  initTheme();
  initVisitorToken();

  Api.run
    .withSuccessHandler(onInitialDataLoaded)
    .withFailureHandler(onInitialDataFailed)
    .getInitialData();
});

function onInitialDataLoaded(res) {
  if (!res || !res.success) { onInitialDataFailed({ message: (res && res.message) || 'Gagal memuat data.' }); return; }
  AppState.data = res.data;
  renderFooterInfo();
  updateSeoMeta();
  document.getElementById('loading-overlay').classList.add('hidden');
  navigateTo('beranda');

  Api.run.recordVisit(AppState.visitorToken);
}

/** Perbarui meta description / Open Graph dari data Profil (dijalankan di browser; mesin pencari modern ikut membaca hasilnya). */
function updateSeoMeta() {
  try {
    const profil = (AppState.data && AppState.data.profil) || {};
    let desk = String(profil.tagline || profil.ringkasan || '').trim();
    if (!desk) return;
    if (desk.length > 160) desk = desk.slice(0, 157) + '...';
    [['meta[name="description"]', desk], ['meta[property="og:description"]', desk], ['meta[name="twitter:description"]', desk]].forEach(function (p) {
      const el = document.querySelector(p[0]); if (el) el.setAttribute('content', desk);
    });
    if (profil.id_foto_drive) {
      const img = 'https://drive.google.com/thumbnail?id=' + profil.id_foto_drive + '&sz=w1000';
      const og = document.querySelector('meta[property="og:image"]'); if (og) og.setAttribute('content', img);
    }
  } catch (e) { /* abaikan: SEO dinamis bersifat tambahan */ }
}

function onInitialDataFailed(err) {
  document.getElementById('loading-overlay').classList.add('hidden');
  document.getElementById('page-outlet').innerHTML =
    '<div class="wrap section text-center"><span class="material-symbols-outlined" style="font-size:48px;color:var(--color-error)">error</span>' +
    '<h2>Gagal Memuat Situs</h2><p class="text-muted">' + escapeHtml((err && err.message) || 'Terjadi kesalahan.') + '</p>' +
    '<button class="btn btn-primary" onclick="location.reload()">Muat Ulang</button></div>';
}

function initVisitorToken() {
  try {
    let t = localStorage.getItem('fajarfk_visitor_token');
    if (!t) { t = 'v' + Date.now() + Math.random().toString(36).slice(2); localStorage.setItem('fajarfk_visitor_token', t); }
    AppState.visitorToken = t;
  } catch (e) { AppState.visitorToken = 'v' + Date.now(); }
}

function initTheme() {
  let theme = 'light';
  try { theme = localStorage.getItem('fajarfk_theme') || 'light'; } catch (e) {}
  AppState.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
}

function toggleTheme() {
  AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', AppState.theme);
  try { localStorage.setItem('fajarfk_theme', AppState.theme); } catch (e) {}
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) icon.textContent = AppState.theme === 'dark' ? 'light_mode' : 'dark_mode';
}

// --------------------------------------------------------------------------
// ROUTER SPA (client-side, tanpa ?page= di URL)
// --------------------------------------------------------------------------
function navigateTo(page, params) {
  AppState.currentPage = page;
  AppState.currentParams = params || {};
  closeMobileDrawer();

  setActiveNav_(page);

  const renderers = {
    beranda: renderBeranda,
    profil: renderProfil,
    karya: renderKarya,
    sertifikat: renderSertifikat,
    wawasan: renderWawasan,
    kinerja: renderKinerja,
    agenda: renderAgenda,
    kas: renderKas,
    produk: renderProduk,
    lacak: renderLacak,
    kontak: renderKontak,
    admin: renderAdmin
  };

  const fn = renderers[page] || renderBeranda;
  injectPage(fn(AppState.currentParams));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function injectPage(html) {
  document.getElementById('page-outlet').innerHTML = html;
}

// Menu bertingkat: halaman -> kelompok menu
const NAV_GROUPS = {
  profil: 'tentang', kinerja: 'tentang', sertifikat: 'tentang', agenda: 'tentang', kas: 'tentang',
  karya: 'karya', produk: 'karya'
};

function setActiveNav_(page) {
  const grp = NAV_GROUPS[page] || '';
  document.querySelectorAll('.topnav-link, .topnav-sub, .mobile-drawer-sublink').forEach(function (el) {
    const dp = el.getAttribute('data-page');
    const dg = el.getAttribute('data-group');
    el.classList.toggle('active', dp ? dp === page : (!!dg && dg === grp));
  });
  closeNavGroups_();
}

function closeNavGroups_() {
  document.querySelectorAll('.topnav-group.open').forEach(function (g) { g.classList.remove('open'); });
}

function toggleNavGroup(ev, name) {
  if (ev) ev.stopPropagation();
  const g = document.querySelector('.topnav-group[data-group="' + name + '"]');
  if (!g) return;
  const willOpen = !g.classList.contains('open');
  closeNavGroups_();
  if (willOpen) g.classList.add('open');
}

function toggleDrawerGroup(name) {
  const g = document.getElementById('drawer-group-' + name);
  if (g) g.classList.toggle('open');
}

document.addEventListener('click', function () { closeNavGroups_(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNavGroups_(); });

function openMobileDrawer() {
  const grp = NAV_GROUPS[AppState.currentPage] || '';
  ['tentang', 'karya'].forEach(function (n) {
    const g = document.getElementById('drawer-group-' + n);
    if (g) g.classList.toggle('open', n === grp);
  });
  document.getElementById('mobile-drawer').classList.add('open');
}
function closeMobileDrawer() { document.getElementById('mobile-drawer').classList.remove('open'); }

function openModal(html) {
  document.getElementById('modal-panel').innerHTML = html;
  document.getElementById('modal-backdrop').classList.add('open');
}
function closeModal() { document.getElementById('modal-backdrop').classList.remove('open'); }

// --------------------------------------------------------------------------
// TOAST
// --------------------------------------------------------------------------
function toast(message, type) {
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.innerHTML = '<span class="material-symbols-outlined">' +
    (type === 'error' ? 'error' : type === 'success' ? 'check_circle' : 'info') + '</span><span>' + escapeHtml(message) + '</span>';
  document.getElementById('toast-container').appendChild(el);
  setTimeout(function () { el.remove(); }, 4500);
}

// --------------------------------------------------------------------------
// UTIL
// --------------------------------------------------------------------------
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function nl2br(s) { return escapeHtml(s).replace(/\n/g, '<br>'); }
function fmtDate(v) {
  if (!v) return '-';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch (e) { return String(v); }
}
function fmtDateTime(v) {
  if (!v) return '-';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return String(v); }
}
function iconFor(name) { return '<span class="material-symbols-outlined">' + name + '</span>'; }

/**
 * Mengubah teks periode/tahun (mis. "Oktober 2017", "2018-09-01", "2014 - 2018", "2020")
 * menjadi angka yang bisa dibandingkan (tahun*12 + bulan), supaya riwayat pekerjaan &
 * pendidikan bisa diurutkan dari yang paling baru ke paling lama. Jika ada beberapa
 * tahun dalam satu teks (mis. rentang), dipakai tahun yang paling besar/terbaru.
 */
function extractSortKey_(str) {
  if (!str) return -Infinity;
  str = String(str).trim();
  if (!str) return -Infinity;
  const isoMatch = str.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) return parseInt(isoMatch[1], 10) * 12 + parseInt(isoMatch[2], 10);
  const years = (str.match(/\d{4}/g) || []).map(Number);
  if (!years.length) return -Infinity;
  const year = Math.max.apply(null, years);
  const bulanMap = { januari: 1, februari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, november: 11, desember: 12 };
  const lower = str.toLowerCase();
  let month = 1;
  for (const k in bulanMap) { if (lower.indexOf(k) !== -1) { month = bulanMap[k]; break; } }
  return year * 12 + month;
}
/** Urutkan Riwayat Pekerjaan: yang masih berjalan (periode selesai kosong) paling atas, lalu dari tahun selesai/mulai paling baru. */
function sortPengalamanTerbaru_(list) {
  return (list || []).slice().sort(function (a, b) {
    const aOngoing = !a.periode_selesai;
    const bOngoing = !b.periode_selesai;
    if (aOngoing !== bOngoing) return aOngoing ? -1 : 1;
    const aKey = aOngoing ? extractSortKey_(a.periode_mulai) : extractSortKey_(a.periode_selesai);
    const bKey = bOngoing ? extractSortKey_(b.periode_mulai) : extractSortKey_(b.periode_selesai);
    if (bKey !== aKey) return bKey - aKey;
    return extractSortKey_(b.periode_mulai) - extractSortKey_(a.periode_mulai);
  });
}
/** Urutkan Riwayat Pendidikan dari tahun paling baru. */
function sortPendidikanTerbaru_(list) {
  return (list || []).slice().sort(function (a, b) { return extractSortKey_(b.tahun) - extractSortKey_(a.tahun); });
}
/**
 * Urutkan Sertifikat & Penghargaan dari tahun paling baru. Untuk sertifikat dengan
 * tahun yang sama, yang ditambahkan/disimpan paling akhir tampil lebih dulu (bukan
 * ikut urutan lama di data), supaya data baru langsung terlihat di posisi teratas.
 */
function sortSertifikatTerbaru_(list) {
  const indexed = (list || []).map(function (item, idx) { return { item: item, idx: idx }; });
  indexed.sort(function (a, b) {
    const diff = extractSortKey_(b.item.tahun) - extractSortKey_(a.item.tahun);
    if (diff !== 0) return diff;
    return b.idx - a.idx;
  });
  return indexed.map(function (x) { return x.item; });
}
/**
 * Urutkan Wawasan & Insight dari tanggal paling baru. Untuk tanggal yang sama,
 * yang ditambahkan/disimpan paling akhir tampil lebih dulu.
 */
function sortWawasanTerbaru_(list) {
  const indexed = (list || []).map(function (item, idx) { return { item: item, idx: idx }; });
  indexed.sort(function (a, b) {
    const diff = extractSortKey_(b.item.tanggal) - extractSortKey_(a.item.tanggal);
    if (diff !== 0) return diff;
    return b.idx - a.idx;
  });
  return indexed.map(function (x) { return x.item; });
}
/** Tanggal terbit sebuah Wawasan: Jadwal Terbit bila diisi, jika tidak memakai kolom Tanggal. */
function tanggalTerbitWawasan_(w) { return w.jadwal_terbit || w.tanggal; }
/** Urutkan Wawasan dari tanggal terbit terbaru; tanggal sama → yang disimpan paling akhir lebih dulu. */
function sortWawasanTerbit_(list) {
  const indexed = (list || []).map(function (item, idx) { return { item: item, idx: idx }; });
  indexed.sort(function (a, b) {
    const diff = wawasanDayKey_(b.item) - wawasanDayKey_(a.item);
    if (diff !== 0) return diff;
    return b.idx - a.idx;
  });
  return indexed.map(function (x) { return x.item; });
}
/** Kunci urut per hari (yyyymmdd); tanggal berformat teks bebas dihitung per bulan. */
function wawasanDayKey_(w) {
  const v = tanggalTerbitWawasan_(w);
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return parseInt(m[1] + m[2] + m[3], 10);
  const k = extractSortKey_(v);
  if (k === -Infinity) return -Infinity;
  const y = Math.floor((k - 1) / 12);
  return y * 10000 + (k - y * 12) * 100;
}
/** Ubah nilai tanggal apa pun (teks "2026-10-16", atau Date) menjadi string "yyyy-MM-dd"; kosong jika tidak valid. */
function toIsoDate_(v) {
  if (!v) return '';
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}
/** Urutkan Kinerja Harian dari tanggal terbaru; tanggal sama → yang disimpan paling akhir tampil lebih dulu. */
function sortKinerjaTerbaru_(list) {
  const indexed = (list || []).map(function (item, idx) { return { item: item, idx: idx, key: toIsoDate_(item.tanggal) }; });
  indexed.sort(function (a, b) {
    if (a.key !== b.key) return a.key < b.key ? 1 : -1;
    return b.idx - a.idx;
  });
  return indexed.map(function (x) { return x.item; });
}
function setBtnLoading(btn, loading, labelLoading, labelDefault) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading ? labelLoading : labelDefault;
}

// ============================================================================
// HALAMAN: BERANDA
// ============================================================================
function renderBeranda() {
  const d = AppState.data;
  const p = d.profil || {};
  const karyaUnggulan = (d.karya || []).slice(0, 3);
  const pengalamanTerbaru = sortPengalamanTerbaru_(d.pengalaman || []).slice(0, 2);
  const todayIso = toIsoDate_(new Date());
  const agendaDekat = sortAgendaAsc_(expandAgenda_(d.agenda || [], todayIso).filter(function (a) { return a.tanggal >= todayIso; })).slice(0, 3);

  return '' +
  '<section class="hero">' +
    '<div class="wrap">' +
      '<div class="hero-grid">' +
        '<div class="hero-text">' +
          '<div class="hero-eyebrow">' + iconFor('verified') + ' Portal Profesional Resmi</div>' +
          '<h1 class="t-display-lg">' + escapeHtml(p.nama || 'Fajar Ferdian') + '</h1>' +
          '<p class="t-body-lg" style="max-width:640px;">' + escapeHtml(p.tagline || 'Transportasi, Inovasi &amp; Digital') + '</p>' +
          '<p class="t-body-md" style="max-width:640px;">' + nl2br(p.ringkasan || '') + '</p>' +
          '<div class="stat-row">' +
            '<div class="stat-box"><div class="num">' + (d.pengalaman || []).length + '</div><div class="lbl">Pengalaman</div></div>' +
            '<div class="stat-box"><div class="num">' + (d.karya || []).length + '</div><div class="lbl">Karya</div></div>' +
            '<div class="stat-box"><div class="num">' + (d.sertifikat || []).length + '</div><div class="lbl">Sertifikat</div></div>' +
            '<div class="stat-box"><div class="num">' + (d.produk || []).length + '</div><div class="lbl">Produk &amp; Layanan</div></div>' +
          '</div>' +
        '</div>' +
        (p.url_foto ?
          '<div class="hero-photo-wrap"><img class="hero-photo" src="' + escapeHtml(p.url_foto) + '" alt="Foto ' + escapeHtml(p.nama || 'profil') + '"></div>'
          : '') +
      '</div>' +
    '</div>' +
  '</section>' +

  '<section class="section">' +
    '<div class="wrap">' +
      '<div class="flex justify-between items-center mb-lg" style="flex-wrap:wrap;gap:12px;">' +
        '<h2 class="t-headline-lg">Karya Unggulan</h2>' +
        '<button class="btn btn-secondary btn-sm" onclick="navigateTo(\'karya\')">Lihat Semua ' + iconFor('arrow_forward') + '</button>' +
      '</div>' +
      (karyaUnggulan.length ?
        '<div class="grid">' + karyaUnggulan.map(function (k) { return karyaCardHtml(k, 4); }).join('') + '</div>'
        : emptyStateHtml('inventory_2', 'Belum ada karya yang ditampilkan.')) +
    '</div>' +
  '</section>' +

  (agendaDekat.length ? (
  '<section class="section-tight">' +
    '<div class="wrap">' +
      '<div class="flex justify-between items-center mb-lg" style="flex-wrap:wrap;gap:12px;">' +
        '<h2 class="t-headline-lg">Agenda Terdekat</h2>' +
        '<button class="btn btn-secondary btn-sm" onclick="navigateTo(\'agenda\')">Lihat Semua ' + iconFor('arrow_forward') + '</button>' +
      '</div>' +
      agendaDekat.map(function (a) { return agendaItemHtml_(a, todayIso); }).join('') +
    '</div>' +
  '</section>') : '') +

  (pengalamanTerbaru.length ? (
  '<section class="section-tight" style="background:var(--surface-crisp);border-top:1px solid var(--border-trim);border-bottom:1px solid var(--border-trim);">' +
    '<div class="wrap">' +
      '<h2 class="t-headline-lg">Pengalaman Terbaru</h2>' +
      '<div class="flex flex-col gap-md mt-lg">' +
        pengalamanTerbaru.map(function (p2) {
          return '<div class="card card-accent-navy"><div class="t-title-md text-navy">' + escapeHtml(p2.jabatan) + '</div>' +
            '<div class="t-body-sm text-muted">' + escapeHtml(p2.instansi) + ' &middot; ' + escapeHtml(p2.periode_mulai) + ' - ' + escapeHtml(p2.periode_selesai || 'Sekarang') + '</div></div>';
        }).join('') +
      '</div>' +
    '</div>' +
  '</section>') : '') +

  surveiSectionHtml_() +

  '<section class="section">' +
    '<div class="wrap">' +
      '<h2 class="t-headline-lg">Produk &amp; Layanan</h2>' +
      '<div class="grid mt-lg">' +
        (d.produk || []).slice(0, 3).map(function (pr) { return produkCardHtml(pr, 4); }).join('') +
      '</div>' +
      '<div class="text-center mt-lg"><button class="btn btn-primary" onclick="navigateTo(\'produk\')">Lihat Semua Produk &amp; Layanan</button></div>' +
    '</div>' +
  '</section>';
}

// ============================================================================
// SURVEI LAYANAN & WEBSITE (bintang 1-5) — di Beranda
// ============================================================================
const SURVEI_MIN_TAMPIL = 5; // rata-rata baru ditampilkan ke publik setelah minimal sekian penilaian
const SURVEI_LABEL = ['', 'Sangat kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat baik'];

function angkaRata_(n) { return String(n).replace('.', ','); }

function bintangText_(n) {
  n = Number(n) || 0;
  return n ? ('★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n)) : '-';
}

function surveiRowHtml_(obj, judul, ringkas) {
  let info = '';
  if (ringkas && ringkas.jumlah >= SURVEI_MIN_TAMPIL) {
    info = '<span class="survei-avg">★ ' + angkaRata_(ringkas.rata) + ' dari 5 &middot; ' + ringkas.jumlah + ' penilaian</span>';
  }
  let stars = '';
  for (let i = 1; i <= 5; i++) {
    stars += '<button type="button" class="star-btn" data-n="' + i + '" aria-label="' + i + ' bintang" onclick="setBintang(\'' + obj + '\',' + i + ')">★</button>';
  }
  return '<div class="survei-row" id="survei-row-' + obj + '">' +
    '<div class="survei-head"><span class="t-title-sm text-navy">' + judul + '</span>' + info + '</div>' +
    '<div class="star-input" role="group" aria-label="Penilaian ' + judul.toLowerCase() + '">' + stars +
      '<span class="star-label" id="star-label-' + obj + '">Belum dinilai</span></div>' +
  '</div>';
}

function surveiSectionHtml_() {
  window._survei = { layanan: 0, website: 0 };
  const s = (AppState.data && AppState.data.survei) || {};
  return '<section class="section" id="survei-section"><div class="wrap">' +
    '<h2 class="t-headline-lg">Survei Kepuasan</h2>' +
    '<p class="t-body-md text-muted">Bantu saya menjadi lebih baik: beri penilaian bintang 1&ndash;5 untuk layanan dan website ini.</p>' +
    '<div class="card survei-card mt-lg" id="survei-card">' +
      '<form id="survei-form" onsubmit="return submitSurveiForm(event)">' +
        surveiRowHtml_('layanan', 'Layanan', s.layanan) +
        surveiRowHtml_('website', 'Website', s.website) +
        '<div class="field mt-lg"><label>Komentar atau saran (opsional)</label><textarea name="komentar" maxlength="500" placeholder="Tulis masukan Anda…"></textarea></div>' +
        '<div class="field"><label>Nama (opsional)</label><input type="text" name="nama" maxlength="80"></div>' +
        '<div class="honeypot-field"><label>Jangan diisi</label><input type="text" name="website_url" tabindex="-1" autocomplete="off"></div>' +
        '<button type="submit" class="btn btn-primary" id="survei-submit-btn">' + iconFor('send') + ' Kirim Penilaian</button>' +
      '</form>' +
    '</div>' +
  '</div></section>';
}

function setBintang(obj, n) {
  if (!window._survei) window._survei = { layanan: 0, website: 0 };
  window._survei[obj] = (window._survei[obj] === n) ? 0 : n; // ketuk bintang yang sama = batal
  const v = window._survei[obj];
  document.querySelectorAll('#survei-row-' + obj + ' .star-btn').forEach(function (b) {
    b.classList.toggle('on', Number(b.getAttribute('data-n')) <= v);
  });
  const lbl = document.getElementById('star-label-' + obj);
  if (lbl) lbl.textContent = v ? (v + ' – ' + SURVEI_LABEL[v]) : 'Belum dinilai';
}

function submitSurveiForm(ev) {
  ev.preventDefault();
  const form = ev.target;
  const sv = window._survei || {};
  if (!sv.layanan && !sv.website) { toast('Pilih minimal satu penilaian bintang.', 'error'); return false; }
  const btn = document.getElementById('survei-submit-btn');
  const payload = { layanan: sv.layanan || 0, website: sv.website || 0, komentar: form.komentar.value, nama: form.nama.value };
  const honeypot = form.website_url.value;
  setBtnLoading(btn, true, 'Mengirim…', '');
  Api.run
    .withSuccessHandler(function (res) {
      if (res.success) {
        document.getElementById('survei-card').innerHTML =
          '<div class="text-center" style="padding:12px 0;"><span class="material-symbols-outlined text-gold" style="font-size:40px;">check_circle</span>' +
          '<p class="t-title-md text-navy" style="margin-top:8px;">' + escapeHtml(res.message) + '</p></div>';
      } else {
        setBtnLoading(btn, false, '', iconFor('send') + ' Kirim Penilaian');
        toast(res.message || 'Gagal mengirim penilaian.', 'error');
      }
    })
    .withFailureHandler(function (err) {
      setBtnLoading(btn, false, '', iconFor('send') + ' Kirim Penilaian');
      toast((err && err.message) || 'Terjadi kesalahan.', 'error');
    })
    .submitSurvey(payload, honeypot, AppState.visitorToken);
  return false;
}

function emptyStateHtml(icon, msg) {
  return '<div class="empty-state">' + iconFor(icon) + '<p class="mt-lg">' + escapeHtml(msg) + '</p></div>';
}

// ============================================================================
// HALAMAN: PROFIL & RIWAYAT
// ============================================================================
function renderProfil() {
  const d = AppState.data;
  const p = d.profil || {};
  const pengalaman = sortPengalamanTerbaru_(d.pengalaman || []);
  const pendidikan = sortPendidikanTerbaru_(d.pendidikan || []);

  return '' +
  '<section class="section-tight" style="background:var(--surface-crisp);border-bottom:1px solid var(--border-trim);">' +
    '<div class="wrap flex items-center gap-md" style="flex-wrap:wrap;">' +
      (p.url_foto ?
        '<img src="' + escapeHtml(p.url_foto) + '" alt="Foto profil" style="width:96px;height:96px;border-radius:var(--radius-lg);object-fit:cover;border:1px solid var(--border-trim);">'
        : '<div style="width:96px;height:96px;border-radius:var(--radius-lg);background:var(--navy);display:flex;align-items:center;justify-content:center;">' + iconFor('person') + '</div>') +
      '<div>' +
        '<h1 class="t-headline-lg" style="margin-bottom:4px;">' + escapeHtml(p.nama || '-') + '</h1>' +
        '<p class="t-body-md text-muted" style="margin:0;">' + escapeHtml(p.tagline || '') + '</p>' +
      '</div>' +
      (p.url_cv_preview ?
        '<div style="margin-left:auto;"><a href="' + escapeHtml(p.url_cv_preview) + '" target="_blank" class="btn btn-secondary btn-sm">' + iconFor('description') + ' Lihat CV</a></div>'
        : '') +
    '</div>' +
  '</section>' +

  '<section class="section"><div class="wrap">' +
    '<div class="card mb-lg"><h3 class="t-title-lg text-navy" style="margin-bottom:8px;">Ringkasan Profesional</h3><p class="t-body-md">' + nl2br(p.ringkasan || '-') + '</p></div>' +

    '<h2 class="t-headline-md">Riwayat Pekerjaan &amp; Jabatan</h2>' +
    '<div class="flex flex-col gap-md mt-lg mb-lg">' +
      (pengalaman.length ? pengalaman.map(function (item) {
        return '<div class="card card-accent-gold">' +
          '<div class="flex justify-between items-center" style="flex-wrap:wrap;gap:6px;">' +
            '<div class="t-title-md text-navy">' + escapeHtml(item.jabatan) + '</div>' +
            '<span class="t-body-sm text-muted">' + escapeHtml(item.periode_mulai) + ' &ndash; ' + escapeHtml(item.periode_selesai || 'Sekarang') + '</span>' +
          '</div>' +
          '<div class="t-body-sm text-gold" style="font-weight:600;margin:2px 0 8px;">' + escapeHtml(item.instansi) + '</div>' +
          '<p class="t-body-sm" style="margin:0;">' + nl2br(item.deskripsi || '') + '</p>' +
        '</div>';
      }).join('') : emptyStateHtml('work_history', 'Belum ada riwayat pekerjaan.')) +
    '</div>' +

    '<h2 class="t-headline-md">Pendidikan</h2>' +
    '<div class="flex flex-col gap-md mt-lg">' +
      (pendidikan.length ? pendidikan.map(function (item) {
        return '<div class="card card-accent-navy">' +
          '<div class="flex justify-between items-center" style="flex-wrap:wrap;gap:6px;">' +
            '<div class="t-title-md text-navy">' + escapeHtml(item.institusi) + '</div>' +
            '<span class="t-body-sm text-muted">' + escapeHtml(item.tahun) + '</span>' +
          '</div>' +
          '<div class="t-body-sm text-gold" style="font-weight:600;margin:2px 0 8px;">' + escapeHtml(item.jenjang) + '</div>' +
          (item.keterangan ? '<p class="t-body-sm" style="margin:0;">' + nl2br(item.keterangan) + '</p>' : '') +
        '</div>';
      }).join('') : emptyStateHtml('school', 'Belum ada riwayat pendidikan.')) +
    '</div>' +
  '</div></section>';
}

// ============================================================================
// HALAMAN: KARYA & PROYEK
// ============================================================================
function karyaCardHtml(k, span) {
  return '<div class="card card-hover" style="grid-column:span ' + span + ';cursor:pointer;" onclick="openKaryaDossier(\'' + k.id + '\')">' +
    (k.url_gambar ? '<img src="' + escapeHtml(k.url_gambar) + '" style="border-radius:var(--radius);margin:-24px -24px 16px;width:calc(100% + 48px);height:160px;object-fit:cover;">' : '') +
    '<span class="badge" style="background:var(--badge-diproses-bg);color:var(--badge-diproses-text);border-color:var(--badge-diproses-border);">' + escapeHtml(k.kategori || 'Proyek') + '</span>' +
    '<h3 class="t-title-lg text-navy" style="margin-top:10px;">' + escapeHtml(k.judul) + '</h3>' +
    '<p class="t-body-sm text-muted" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escapeHtml(k.deskripsi || '') + '</p>' +
    '<div class="t-body-sm text-gold" style="font-weight:600;margin-top:8px;">' + escapeHtml(k.tahun || '') + ' &middot; Lihat Detail ' + iconFor('arrow_forward') + '</div>' +
  '</div>';
}

function renderKarya() {
  const d = AppState.data;
  const karya = d.karya || [];
  const kategoriSet = Array.from(new Set(karya.map(function (k) { return k.kategori; }).filter(Boolean)));

  return '' +
  '<section class="section"><div class="wrap">' +
    '<h1 class="t-headline-lg">Karya</h1>' +
    '<p class="t-body-md text-muted">Kumpulan inisiatif, proyek transportasi, dan inovasi digital yang telah dikerjakan.</p>' +
    '<div class="flex gap-sm mt-lg mb-lg" style="flex-wrap:wrap;">' +
      '<div class="field" style="flex:1;min-width:220px;margin-bottom:0;">' +
        '<input type="text" id="karya-search" placeholder="Cari judul atau deskripsi…" oninput="filterKarya()">' +
      '</div>' +
      '<select id="karya-filter-kategori" onchange="filterKarya()" style="border:1px solid #CBD5E1;border-radius:var(--radius);padding:12px 16px;background:var(--surface-crisp);color:var(--slate);">' +
        '<option value="">Semua Kategori</option>' +
        kategoriSet.map(function (k) { return '<option value="' + escapeHtml(k) + '">' + escapeHtml(k) + '</option>'; }).join('') +
      '</select>' +
    '</div>' +
    '<div class="grid" id="karya-grid">' +
      (karya.length ? karya.map(function (k) { return karyaCardHtml(k, 4); }).join('') : emptyStateHtml('inventory_2', 'Belum ada karya.')) +
    '</div>' +
    '<div id="karya-empty" class="hidden">' + emptyStateHtml('search_off', 'Tidak ada karya yang cocok dengan pencarian.') + '</div>' +
  '</div></section>';
}

function filterKarya() {
  const q = (document.getElementById('karya-search').value || '').toLowerCase();
  const kategori = document.getElementById('karya-filter-kategori').value;
  const karya = (AppState.data.karya || []).filter(function (k) {
    const matchQ = !q || (k.judul || '').toLowerCase().indexOf(q) !== -1 || (k.deskripsi || '').toLowerCase().indexOf(q) !== -1;
    const matchK = !kategori || k.kategori === kategori;
    return matchQ && matchK;
  });
  const grid = document.getElementById('karya-grid');
  const empty = document.getElementById('karya-empty');
  if (!karya.length) {
    grid.classList.add('hidden'); empty.classList.remove('hidden');
  } else {
    grid.classList.remove('hidden'); empty.classList.add('hidden');
    grid.innerHTML = karya.map(function (k) { return karyaCardHtml(k, 4); }).join('');
  }
}

function openKaryaDossier(id) {
  const k = (AppState.data.karya || []).find(function (x) { return String(x.id) === String(id); });
  if (!k) return;
  openModal(
    '<div class="modal-header">' +
      '<span class="t-title-lg text-navy">' + escapeHtml(k.judul) + '</span>' +
      '<button class="modal-close" onclick="closeModal()">' + iconFor('close') + '</button>' +
    '</div>' +
    '<div class="modal-body">' +
      (k.url_gambar ? '<img src="' + escapeHtml(k.url_gambar) + '" style="border-radius:var(--radius);width:100%;max-height:320px;object-fit:cover;margin-bottom:16px;">' : '') +
      '<span class="badge" style="background:var(--badge-diproses-bg);color:var(--badge-diproses-text);border-color:var(--badge-diproses-border);">' + escapeHtml(k.kategori || 'Proyek') + '</span>' +
      '<span class="t-body-sm text-muted" style="margin-left:8px;">' + escapeHtml(k.tahun || '') + '</span>' +
      '<p class="t-body-md mt-lg">' + nl2br(k.deskripsi || '') + '</p>' +
      (k.tautan ? '<a href="' + escapeHtml(k.tautan) + '" target="_blank" class="btn btn-primary mt-lg">' + iconFor('open_in_new') + ' Kunjungi Tautan Proyek</a>' : '') +
    '</div>'
  );
}

// ============================================================================
// HALAMAN: SERTIFIKAT
// ============================================================================
function sertifikatCardHtml_(s) {
  return '<div class="card cert-card" style="grid-column:span 4;">' +
    '<div class="cert-card-img-wrap">' +
      (s.url_gambar
        ? '<img src="' + escapeHtml(s.url_gambar) + '" alt="' + escapeHtml(s.nama) + '" loading="lazy">'
        : '<span class="material-symbols-outlined text-gold" style="font-size:48px;">workspace_premium</span>') +
    '</div>' +
    '<div class="cert-card-body">' +
      '<div class="t-title-md text-navy">' + escapeHtml(s.nama) + '</div>' +
      '<div class="t-body-sm text-muted">' + escapeHtml(s.penerbit || '') + ' &middot; ' + escapeHtml(s.tahun || '') + '</div>' +
    '</div>' +
  '</div>';
}

/**
 * Halaman Sertifikat & Penghargaan ditampilkan sebagai beberapa seksi terpisah
 * berdasarkan field "Jenis" (Sertifikat, Penghargaan, Surat Keterangan), bukan
 * satu grid gabungan — supaya masing-masing jenis mudah dibedakan pengunjung.
 * Item lama yang belum punya jenis (kosong / nilai lain) dikumpulkan ke seksi "Lainnya".
 */
function renderSertifikat() {
  const semua = sortSertifikatTerbaru_(AppState.data.sertifikat || []);
  const JENIS_URUTAN = ['Sertifikat', 'Penghargaan', 'Surat Keterangan'];
  const seksi = JENIS_URUTAN.map(function (jenis) {
    return { label: jenis, items: semua.filter(function (s) { return s.jenis === jenis; }) };
  });
  const lainnya = semua.filter(function (s) { return JENIS_URUTAN.indexOf(s.jenis) === -1; });
  if (lainnya.length) seksi.push({ label: 'Lainnya', items: lainnya });

  const seksiHtml = seksi.filter(function (sk) { return sk.items.length; }).map(function (sk) {
    return '<div class="mb-lg">' +
      '<h2 class="t-headline-md mb-lg">' + escapeHtml(sk.label) + '</h2>' +
      '<div class="grid mb-lg">' + sk.items.map(sertifikatCardHtml_).join('') + '</div>' +
    '</div>';
  }).join('');

  return '' +
  '<section class="section"><div class="wrap">' +
    '<h1 class="t-headline-lg">Sertifikat &amp; Penghargaan</h1>' +
    '<p class="t-body-md text-muted">Sertifikasi resmi dan penghargaan yang telah diperoleh.</p>' +
    '<div class="mt-lg">' +
      (semua.length ? seksiHtml : emptyStateHtml('workspace_premium', 'Belum ada sertifikat.')) +
    '</div>' +
  '</div></section>';
}

// ============================================================================
// HALAMAN: WAWASAN & INSIGHT
// ============================================================================
function renderWawasan() {
  AppState.wawasanIdx = 0;
  const wawasan = sortWawasanTerbit_(AppState.data.wawasan || []);
  return '' +
  '<section class="section"><div class="wrap">' +
    '<h1 class="t-headline-lg">Wawasan &amp; Insight</h1>' +
    '<p class="t-body-md text-muted">Tulisan dan pemikiran seputar transportasi, inovasi, dan transformasi digital.</p>' +
    '<div id="wawasan-view" class="mt-lg">' +
      (wawasan.length ? wawasanViewHtml_(wawasan, 0) : emptyStateHtml('article', 'Belum ada tulisan.')) +
    '</div>' +
  '</div></section>';
}
/** Tampilkan satu tulisan Wawasan (urut tanggal terbit, terbaru dulu) lengkap dengan tombol navigasi. */
function wawasanViewHtml_(wawasan, idx) {
  const w = wawasan[idx];
  const total = wawasan.length;
  const tv = tanggalTerbitWawasan_(w);
  const tgl = escapeHtml(/^\d{4}-\d{2}-\d{2}/.test(String(tv || '')) ? fmtDate(String(tv).slice(0, 10)) : String(tv || ''));
  return '<article class="card">' +
    (w.url_gambar ? '<img src="' + escapeHtml(w.url_gambar) + '" alt="' + escapeHtml(w.judul) + '" style="display:block;width:100%;max-height:360px;object-fit:cover;border-radius:var(--radius);margin-bottom:16px;">' : '') +
    '<div class="t-body-sm text-gold" style="font-weight:600;">Terbit ' + tgl + '</div>' +
    '<h2 class="t-headline-md text-navy" style="margin:6px 0 12px;">' + escapeHtml(w.judul) + '</h2>' +
    (w.ringkasan ? '<p class="t-body-md text-muted" style="font-style:italic;margin-bottom:12px;">' + escapeHtml(w.ringkasan) + '</p>' : '') +
    '<div class="t-body-md" style="white-space:pre-wrap;">' + nl2br(w.konten || '') + '</div>' +
  '</article>' +
  '<div class="flex justify-between items-center mt-lg" style="gap:12px;flex-wrap:wrap;">' +
    '<button class="btn btn-secondary" onclick="gantiWawasan(-1)"' + (idx <= 0 ? ' disabled' : '') + '>&larr; Lebih baru</button>' +
    '<span class="t-body-sm text-muted">Tulisan ' + (idx + 1) + ' dari ' + total + '</span>' +
    '<button class="btn btn-secondary" onclick="gantiWawasan(1)"' + (idx >= total - 1 ? ' disabled' : '') + '>Lebih lama &rarr;</button>' +
  '</div>';
}
function gantiWawasan(arah) {
  const wawasan = sortWawasanTerbit_(AppState.data.wawasan || []);
  const idx = Math.max(0, Math.min(wawasan.length - 1, (AppState.wawasanIdx || 0) + arah));
  AppState.wawasanIdx = idx;
  const el = document.getElementById('wawasan-view');
  if (el) el.innerHTML = wawasanViewHtml_(wawasan, idx);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function openWawasanDetail(id) {
  const list = AppState.data.wawasan || [];
  const w = list.find(function (x) { return String(x.id) === String(id); });
  if (!w) return;
  openModal(
    '<div class="modal-header"><span class="t-title-lg text-navy">' + escapeHtml(w.judul) + '</span>' +
      '<button class="modal-close" onclick="closeModal()">' + iconFor('close') + '</button>' +
    '</div>' +
    '<div class="modal-body">' +
      (w.url_gambar ? '<img src="' + escapeHtml(w.url_gambar) + '" alt="' + escapeHtml(w.judul) + '" style="width:100%;border-radius:var(--radius);max-height:320px;object-fit:cover;margin-bottom:16px;">' : '') +
      '<div class="t-body-sm text-muted mb-lg">' + escapeHtml(fmtDate(w.tanggal)) + '</div>' +
      '<p class="t-body-md" style="white-space:pre-wrap;">' + nl2br(w.konten || w.ringkasan || '') + '</p>' +
    '</div>'
  );
}

// ============================================================================
// HALAMAN: AGENDA KEGIATAN
// ============================================================================
const AGENDA_HARI_ = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const AGENDA_BULAN_ = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const AGENDA_KATEGORI_ = ['Kuliah', 'Seminar', 'Rapat', 'Pelatihan', 'Workshop', 'Lainnya'];

/** Ambil "yyyy-MM-dd" dari teks tanggal; kosong bila formatnya bukan ISO. */
function isoOnly_(v) {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
}
function isoAddDays_(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function isoWeekday_(iso) { return AGENDA_HARI_[new Date(iso + 'T00:00:00Z').getUTCDay()]; }
function fmtHariTanggal_(iso) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
/** Teks agenda dari Sheet bisa memuat entitas (&amp; dsb.) hasil sanitasi server; kembalikan lalu escape ulang saat ditampilkan. */
function agendaText_(s) {
  return String(s === null || s === undefined ? '' : s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
function fmtJam_(a) {
  const m = String(a.jam_mulai || '').trim().replace(':', '.');
  const e = String(a.jam_selesai || '').trim().replace(':', '.');
  if (m && e) return m + ' – ' + e + ' WITA';
  if (m) return 'Pukul ' + m + ' WITA';
  return '';
}

/**
 * Jabarkan agenda menjadi daftar kejadian per tanggal. Entri berulang (mis. Kuliah tiap
 * Senin/Rabu/Jumat sampai akhir semester) dijabarkan hanya untuk 30 hari sebelum s.d. 30 hari
 * sesudah hari ini agar daftar tidak menumpuk; tanggal "kecuali" dilewati.
 */
function expandAgenda_(list, todayIso) {
  const winStart = isoAddDays_(todayIso, -30);
  const winEnd = isoAddDays_(todayIso, 30);
  const out = [];
  (list || []).forEach(function (a) {
    const start = isoOnly_(a.tanggal);
    if (!start) return;
    const hari = String(a.ulang_hari || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    const sampai = isoOnly_(a.ulang_sampai);
    const kecuali = String(a.kecuali || '').split(/[,;\s]+/).map(isoOnly_).filter(Boolean);
    if (hari.length && sampai && sampai >= start) {
      let d = start > winStart ? start : winStart;
      const akhir = sampai < winEnd ? sampai : winEnd;
      let guard = 0;
      while (d <= akhir && guard++ < 100) {
        if (hari.indexOf(isoWeekday_(d)) !== -1 && kecuali.indexOf(d) === -1) {
          out.push(Object.assign({}, a, { tanggal: d }));
        }
        d = isoAddDays_(d, 1);
      }
    } else if (kecuali.indexOf(start) === -1) {
      out.push(Object.assign({}, a, { tanggal: start }));
    }
  });
  return out;
}
function sortAgendaAsc_(list) {
  return (list || []).map(function (a, i) { return { a: a, i: i }; }).sort(function (x, y) {
    if (x.a.tanggal !== y.a.tanggal) return x.a.tanggal < y.a.tanggal ? -1 : 1;
    const jx = String(x.a.jam_mulai || ''), jy = String(y.a.jam_mulai || '');
    if (jx !== jy) return jx < jy ? -1 : 1;
    return x.i - y.i;
  }).map(function (x) { return x.a; });
}
/** Urutan di panel admin: tanggal terbaru dulu; sama → yang disimpan paling akhir. */
function sortAgendaTerbaru_(list) {
  return (list || []).map(function (a, i) { return { a: a, i: i, k: isoOnly_(a.tanggal) }; }).sort(function (x, y) {
    if (x.k !== y.k) return x.k < y.k ? 1 : -1;
    return y.i - x.i;
  }).map(function (x) { return x.a; });
}

function agendaItemHtml_(a, todayIso) {
  const kat = String(a.kategori || 'Lainnya');
  const day = parseInt(a.tanggal.slice(8, 10), 10);
  const bulan = AGENDA_BULAN_[parseInt(a.tanggal.slice(5, 7), 10) - 1];
  const jam = fmtJam_(a);
  return '<div class="agenda-item">' +
    '<div class="agenda-date"><div class="agenda-date-d">' + day + '</div><div class="agenda-date-m">' + bulan + '</div></div>' +
    '<div class="agenda-body">' +
      '<div class="agenda-meta">' +
        '<span class="agenda-badge' + (kat === 'Kuliah' ? ' kuliah' : '') + '">' + escapeHtml(kat) + '</span>' +
        (a.tanggal === todayIso ? '<span class="agenda-badge hari-ini">Hari ini</span>' : '') +
        '<span class="t-body-sm text-muted">' + escapeHtml(fmtHariTanggal_(a.tanggal)) + '</span>' +
      '</div>' +
      '<div class="t-title-md text-navy">' + escapeHtml(agendaText_(a.judul)) + '</div>' +
      (jam ? '<div class="t-body-sm text-muted">' + iconFor('schedule') + ' ' + escapeHtml(jam) + '</div>' : '') +
      (a.tempat ? '<div class="t-body-sm text-muted">' + iconFor('location_on') + ' ' + escapeHtml(agendaText_(a.tempat)) + '</div>' : '') +
      (a.keterangan ? '<div class="t-body-sm text-muted" style="margin-top:4px;">' + nl2br(agendaText_(a.keterangan)) + '</div>' : '') +
    '</div>' +
  '</div>';
}

function agendaViewHtml_(kategori) {
  const today = toIsoDate_(new Date());
  const semua = expandAgenda_(AppState.data.agenda || [], today).filter(function (a) { return !kategori || a.kategori === kategori; });
  const akan = sortAgendaAsc_(semua.filter(function (a) { return a.tanggal >= today; }));
  const lalu = sortAgendaAsc_(semua.filter(function (a) { return a.tanggal < today; })).reverse().slice(0, 20);
  return '<h2 class="t-headline-sm" style="margin:24px 0 12px;">Akan Datang</h2>' +
    (akan.length ? akan.map(function (a) { return agendaItemHtml_(a, today); }).join('') : emptyStateHtml('event_available', 'Belum ada agenda yang akan datang.')) +
    (lalu.length ? '<details class="agenda-past"><summary>Sudah berlalu (' + lalu.length + ')</summary>' +
      lalu.map(function (a) { return agendaItemHtml_(a, today); }).join('') + '</details>' : '');
}

function renderAgenda() {
  const ada = {};
  (AppState.data.agenda || []).forEach(function (a) { if (a.kategori) ada[a.kategori] = true; });
  const opsi = '<option value="">Semua kategori</option>' + AGENDA_KATEGORI_.filter(function (k) { return ada[k]; }).map(function (k) {
    return '<option value="' + escapeHtml(k) + '">' + escapeHtml(k) + '</option>';
  }).join('');
  return '<section class="section"><div class="wrap">' +
    '<h1 class="t-headline-lg">Agenda Kegiatan</h1>' +
    '<p class="t-body-md text-muted">Kuliah, seminar, rapat, pelatihan, dan workshop yang saya ikuti.</p>' +
    '<div class="field" style="max-width:260px;margin-top:16px;"><select id="agenda-filter-kat" onchange="filterAgenda()">' + opsi + '</select></div>' +
    '<div id="agenda-view">' + agendaViewHtml_('') + '</div>' +
  '</div></section>';
}
function filterAgenda() {
  const el = document.getElementById('agenda-view');
  if (el) el.innerHTML = agendaViewHtml_(document.getElementById('agenda-filter-kat').value);
}

// ============================================================================
// HALAMAN: KINERJA HARIAN
// ============================================================================
function kinerjaItemHtml_(k) {
  return '<div class="card card-accent-gold">' +
    '<div class="t-body-sm text-gold" style="font-weight:600;">' + escapeHtml(fmtDate(toIsoDate_(k.tanggal))) + '</div>' +
    '<div class="t-title-md text-navy" style="margin:4px 0 8px;">' + escapeHtml(k.kegiatan) + '</div>' +
    (k.output ? '<div class="t-body-sm text-muted"><b>Output/Hasil:</b> ' + nl2br(k.output) + '</div>' : '') +
    (k.url_foto ? '<img src="' + escapeHtml(k.url_foto) + '" alt="Foto kegiatan" loading="lazy" style="display:block;width:100%;max-width:420px;max-height:280px;object-fit:cover;border-radius:var(--radius);margin-top:12px;">' : '') +
  '</div>';
}

function renderKinerja() {
  const semua = sortKinerjaTerbaru_(AppState.data.kinerja || []);
  const bulanNama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const bulanSet = [];
  semua.forEach(function (k) {
    const key = toIsoDate_(k.tanggal).slice(0, 7);
    if (key && bulanSet.indexOf(key) === -1) bulanSet.push(key);
  });
  const opsiBulan = bulanSet.map(function (key) {
    const parts = key.split('-');
    return '<option value="' + key + '">' + bulanNama[parseInt(parts[1], 10) - 1] + ' ' + parts[0] + '</option>';
  }).join('');

  return '' +
  '<section class="section"><div class="wrap">' +
    '<h1 class="t-headline-lg">Kinerja Harian</h1>' +
    '<p class="t-body-md text-muted">Catatan aktivitas dan capaian kerja sehari-hari.</p>' +
    (semua.length ?
      '<div class="field mt-lg" style="max-width:280px;"><select id="kinerja-filter-bulan" onchange="filterKinerja()">' +
        '<option value="">Semua Bulan</option>' + opsiBulan +
      '</select></div>' : '') +
    '<div class="flex flex-col gap-md mt-lg" id="kinerja-list">' +
      (semua.length ? semua.map(kinerjaItemHtml_).join('') : emptyStateHtml('event_note', 'Belum ada catatan kinerja.')) +
    '</div>' +
  '</div></section>';
}

function filterKinerja() {
  const bulan = document.getElementById('kinerja-filter-bulan').value;
  const semua = sortKinerjaTerbaru_(AppState.data.kinerja || []).filter(function (k) {
    return !bulan || toIsoDate_(k.tanggal).slice(0, 7) === bulan;
  });
  document.getElementById('kinerja-list').innerHTML =
    semua.length ? semua.map(kinerjaItemHtml_).join('') : emptyStateHtml('event_note', 'Tidak ada catatan pada bulan ini.');
}

// ============================================================================
// HALAMAN: KAS (showcase aplikasi eksternal "Kas Bandhits" — pola sama
// seperti menu SIDIKAPET: kartu fitur + tombol buka aplikasi di tab baru,
// URL-nya diatur admin lewat Pengaturan, bukan di-hardcode di sini)
// ============================================================================
const KAS_FITUR = [
  { icon: 'payments', judul: 'Pemasukan & Pengeluaran', deskripsi: 'Catat transaksi harian dengan kategori yang rapi dan mudah ditelusuri.' },
  { icon: 'account_balance_wallet', judul: 'Pinjaman & Cicilan', deskripsi: 'Kelola hutang/pinjaman beserta jadwal pembayaran cicilannya.' },
  { icon: 'notifications_active', judul: 'Pengingat Jatuh Tempo', deskripsi: 'Rekap mingguan agar tidak ada tagihan yang terlewat.' },
  { icon: 'calendar_month', judul: 'Kalender Terintegrasi', deskripsi: 'Sinkron otomatis dengan Google Calendar untuk jadwal keuangan.' }
];

function renderKas() {
  const p = AppState.data.pengaturan || {};
  const url = (p.url_aplikasi_kas || '').trim();

  return '' +
  '<section class="section"><div class="wrap">' +
    '<div class="hero-eyebrow">' + iconFor('verified') + ' Aplikasi</div>' +
    '<h1 class="t-display-lg" style="margin-top:6px;">Bandhits</h1>' +
    '<p class="t-body-md text-muted" style="max-width:640px;">Aplikasi pencatatan keuangan pribadi — pemasukan, pengeluaran, pinjaman, dan pengingat jatuh tempo dalam satu tempat.</p>' +

    '<div class="grid mt-lg mb-lg">' +
      KAS_FITUR.map(function (f) {
        return '<div class="card" style="grid-column:span 6;">' +
          '<span class="material-symbols-outlined text-gold" style="font-size:32px;">' + escapeHtml(f.icon) + '</span>' +
          '<h3 class="t-title-md text-navy" style="margin-top:10px;">' + escapeHtml(f.judul) + '</h3>' +
          '<p class="t-body-sm text-muted" style="margin:0;">' + escapeHtml(f.deskripsi) + '</p>' +
        '</div>';
      }).join('') +
    '</div>' +

    '<div class="card text-center" style="background:var(--canvas);">' +
      (url
        ? ('<p class="t-body-sm text-muted">Aplikasi dibuka pada tab baru.</p>' +
           '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener" class="btn btn-primary">' + iconFor('open_in_new') + ' Buka Aplikasi Bandhits</a>')
        : '<p class="t-body-sm text-muted" style="margin:0;">Tautan aplikasi belum diatur. Admin dapat menambahkannya di Panel Admin &rarr; Pengaturan.</p>') +
    '</div>' +
  '</div></section>';
}

// ============================================================================
// HALAMAN: PRODUK & LAYANAN
// ============================================================================
function produkCardHtml(p, span) {
  return '<div class="card card-hover" style="grid-column:span ' + span + ';">' +
    '<span class="material-symbols-outlined text-gold" style="font-size:32px;">' + escapeHtml(p.ikon || 'design_services') + '</span>' +
    '<h3 class="t-title-lg text-navy" style="margin-top:10px;">' + escapeHtml(p.nama) + '</h3>' +
    '<p class="t-body-sm text-muted">' + escapeHtml(p.deskripsi || '') + '</p>' +
    '<button class="btn btn-primary btn-sm mt-lg" onclick="openRequestForm(\'' + escapeHtml(p.nama).replace(/'/g, "\\'") + '\')">' + iconFor('send') + ' Hubungi Saya untuk Penawaran</button>' +
  '</div>';
}

function renderProduk() {
  const produk = AppState.data.produk || [];
  return '' +
  '<section class="section"><div class="wrap">' +
    '<h1 class="t-headline-lg">Produk &amp; Layanan</h1>' +
    '<p class="t-body-md text-muted">Layanan konsultasi dan solusi transportasi &amp; digital yang dapat Bapak/Ibu ajukan.</p>' +
    '<div class="grid mt-lg mb-lg">' +
      (produk.length ? produk.map(function (p) { return produkCardHtml(p, 4); }).join('') : emptyStateHtml('design_services', 'Belum ada produk/layanan.')) +
    '</div>' +
    '<div class="card text-center" style="background:var(--canvas);">' +
      '<h3 class="t-title-lg text-navy">Sudah Mengajukan Permintaan?</h3>' +
      '<p class="t-body-sm text-muted">Lacak status pesanan Anda menggunakan kode pesanan yang diberikan.</p>' +
      '<button class="btn btn-secondary" onclick="navigateTo(\'lacak\')">' + iconFor('search') + ' Lacak Pesanan Saya</button>' +
    '</div>' +
  '</div></section>' +

  '<div id="request-form-section"></div>';
}

function openRequestForm(namaProduk) {
  const produkOptions = (AppState.data.produk || []).map(function (p) {
    return '<option value="' + escapeHtml(p.nama) + '"' + (p.nama === namaProduk ? ' selected' : '') + '>' + escapeHtml(p.nama) + '</option>';
  }).join('');

  openModal(
    '<div class="modal-header"><span class="t-title-lg text-navy">Formulir Permintaan Produk/Layanan</span>' +
      '<button class="modal-close" onclick="closeModal()">' + iconFor('close') + '</button></div>' +
    '<div class="modal-body">' +
      '<form id="request-form" onsubmit="return submitRequestForm(event)">' +
        '<div class="field"><label>Nama Lengkap *</label><input type="text" name="nama" required></div>' +
        '<div class="field"><label>Kontak (No. HP/WhatsApp) *</label><input type="text" name="kontak" required></div>' +
        '<div class="field"><label>Email (opsional, untuk update status)</label><input type="email" name="email"></div>' +
        '<div class="field"><label>Produk/Layanan *</label><select name="produk" required>' + produkOptions + '</select></div>' +
        '<div class="field"><label>Kebutuhan / Detail Permintaan *</label><textarea name="kebutuhan" required></textarea></div>' +
        '<div class="honeypot-field"><label>Jangan diisi</label><input type="text" name="website" tabindex="-1" autocomplete="off"></div>' +
        '<button type="submit" class="btn btn-primary btn-block" id="request-submit-btn">' + iconFor('send') + ' Kirim Permintaan</button>' +
      '</form>' +
    '</div>'
  );
}

function submitRequestForm(ev) {
  ev.preventDefault();
  const form = ev.target;
  const btn = document.getElementById('request-submit-btn');
  const payload = {
    nama: form.nama.value, kontak: form.kontak.value, email: form.email.value,
    produk: form.produk.value, kebutuhan: form.kebutuhan.value
  };
  const honeypot = form.website.value;
  setBtnLoading(btn, true, 'Mengirim…', '');
  Api.run
    .withSuccessHandler(function (res) {
      setBtnLoading(btn, false, '', iconFor('send') + ' Kirim Permintaan');
      if (res.success) {
        closeModal();
        toast('Permintaan terkirim. Kode pesanan: ' + res.data.kode, 'success');
        navigateTo('lacak', { kode: res.data.kode });
      } else { toast(res.message || 'Gagal mengirim permintaan.', 'error'); }
    })
    .withFailureHandler(function (err) {
      setBtnLoading(btn, false, '', iconFor('send') + ' Kirim Permintaan');
      toast(err.message || 'Terjadi kesalahan.', 'error');
    })
    .submitServiceRequest(payload, honeypot);
  return false;
}

// ============================================================================
// HALAMAN: LACAK PESANAN
// ============================================================================
function renderLacak(params) {
  params = params || {};
  return '' +
  '<section class="section"><div class="wrap" style="max-width:640px;">' +
    '<h1 class="t-headline-lg">Lacak Pesanan</h1>' +
    '<p class="t-body-md text-muted">Masukkan kode pesanan Anda (format: FJR-YYMMDD-NNNN) untuk memeriksa status permintaan.</p>' +
    '<form onsubmit="return doTrackOrder(event)" class="flex gap-sm mb-lg" style="align-items:flex-start;flex-wrap:wrap;">' +
      '<div class="field" style="flex:1;min-width:200px;margin-bottom:0;"><input type="text" id="lacak-kode" placeholder="FJR-260101-1234" value="' + escapeHtml(params.kode || '') + '" style="text-transform:uppercase;"></div>' +
      '<button type="submit" class="btn btn-primary" id="lacak-btn">' + iconFor('search') + ' Lacak</button>' +
    '</form>' +
    '<div id="lacak-result"></div>' +
  '</div></section>';
}

function doTrackOrder(ev) {
  ev.preventDefault();
  const kode = document.getElementById('lacak-kode').value.trim();
  const btn = document.getElementById('lacak-btn');
  const resultEl = document.getElementById('lacak-result');
  if (!kode) return false;
  setBtnLoading(btn, true, 'Mencari…', '');
  Api.run
    .withSuccessHandler(function (res) {
      setBtnLoading(btn, false, '', iconFor('search') + ' Lacak');
      if (!res.success) { resultEl.innerHTML = '<div class="card" style="border-color:var(--color-error);">' + escapeHtml(res.message) + '</div>'; return; }
      resultEl.innerHTML = trackResultHtml(res.data);
    })
    .withFailureHandler(function (err) {
      setBtnLoading(btn, false, '', iconFor('search') + ' Lacak');
      resultEl.innerHTML = '<div class="card">' + escapeHtml(err.message || 'Terjadi kesalahan.') + '</div>';
    })
    .trackOrder(kode);
  return false;
}

function trackResultHtml(o) {
  const idx = STATUS_URUTAN.indexOf(o.status);
  const steps = STATUS_URUTAN.map(function (s, i) {
    let cls = '';
    if (o.status === 'Dibatalkan') cls = '';
    else if (i < idx) cls = 'done'; else if (i === idx) cls = 'current';
    return '<div class="timeline-step ' + cls + '"><div class="timeline-dot">' + iconFor(i === 0 ? 'inbox' : i === 1 ? 'forum' : i === 2 ? 'engineering' : 'task_alt') + '</div><div class="lbl">' + s + '</div></div>';
  }).join('');

  return '<div class="card">' +
    '<div class="flex justify-between items-center" style="flex-wrap:wrap;gap:8px;">' +
      '<div><div class="t-label-md text-muted">Kode Pesanan</div><div class="t-title-lg text-navy">' + escapeHtml(o.kode_pesanan) + '</div></div>' +
      '<span class="badge badge-' + escapeHtml(o.status) + '">' + escapeHtml(o.status) + '</span>' +
    '</div>' +
    (o.status !== 'Dibatalkan' ? '<div class="timeline">' + steps + '</div>' : '<p class="mt-lg text-muted">Pesanan ini telah dibatalkan.</p>') +
    '<div class="mt-lg t-body-sm text-muted">' +
      '<div>Atas nama: <b class="text-navy">' + escapeHtml(o.nama) + '</b></div>' +
      '<div>Produk/Layanan: <b class="text-navy">' + escapeHtml(o.produk) + '</b></div>' +
      '<div>Diajukan: ' + fmtDateTime(o.waktu) + '</div>' +
      '<div>Terakhir diperbarui: ' + fmtDateTime(o.waktu_ubah) + '</div>' +
    '</div>' +
  '</div>';
}

// ============================================================================
// HALAMAN: HUBUNGI KAMI
// ============================================================================
function renderKontak() {
  const p = AppState.data.pengaturan || {};
  return '' +
  '<section class="section"><div class="wrap grid">' +
    '<div style="grid-column:span 12;">' +
      '<h1 class="t-headline-lg">Hubungi Kami</h1>' +
      '<p class="t-body-md text-muted">Silakan sampaikan pertanyaan, kolaborasi, atau masukan melalui formulir di bawah ini.</p>' +
    '</div>' +
    '<div style="grid-column:span 12;" class="mt-lg"></div>' +
  '</div></section>' +
  '<section class="section-tight"><div class="wrap grid">' +
    '<div style="grid-column: span 12 / span 12;" class="mb-lg"></div>' +
    '<div class="card" style="grid-column: span 12;">' +
      '<div class="grid">' +
        '<div style="grid-column: span 12 / span 12;">' +
          '<h3 class="t-title-lg text-navy mb-lg">Kirim Pesan</h3>' +
          '<form id="kontak-form" onsubmit="return submitKontakForm(event)">' +
            '<div class="field"><label>Nama *</label><input type="text" name="nama" required></div>' +
            '<div class="field"><label>Email *</label><input type="email" name="email" required></div>' +
            '<div class="field"><label>Subjek</label><input type="text" name="subjek"></div>' +
            '<div class="field"><label>Pesan *</label><textarea name="isi" required></textarea></div>' +
            '<div class="honeypot-field"><label>Jangan diisi</label><input type="text" name="website" tabindex="-1" autocomplete="off"></div>' +
            '<button type="submit" class="btn btn-primary" id="kontak-submit-btn">' + iconFor('send') + ' Kirim Pesan</button>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="card mt-lg" style="grid-column: span 12;">' +
      '<h3 class="t-title-lg text-navy mb-lg">Media Sosial</h3>' +
      '<div class="flex flex-col gap-sm">' + socialLinksHtml(p) + '</div>' +
    '</div>' +
  '</div></section>';
}

function socialLinksHtml(p) {
  const links = [];
  if (p.sosial_linkedin) links.push({ icon: 'work', label: 'LinkedIn', url: p.sosial_linkedin });
  if (p.sosial_github) links.push({ icon: 'code', label: 'GitHub', url: p.sosial_github });
  if (p.sosial_lainnya) links.push({ icon: 'link', label: 'Lainnya', url: p.sosial_lainnya });
  if (!links.length) return '<span class="text-muted t-body-sm">Belum ada tautan media sosial.</span>';
  return links.map(function (l) {
    return '<a href="' + escapeHtml(l.url) + '" target="_blank" class="flex items-center gap-sm t-body-sm">' + iconFor(l.icon) + ' ' + l.label + '</a>';
  }).join('');
}

function submitKontakForm(ev) {
  ev.preventDefault();
  const form = ev.target;
  const btn = document.getElementById('kontak-submit-btn');
  const payload = { nama: form.nama.value, email: form.email.value, subjek: form.subjek.value, isi: form.isi.value };
  const honeypot = form.website.value;
  setBtnLoading(btn, true, 'Mengirim…', '');
  Api.run
    .withSuccessHandler(function (res) {
      setBtnLoading(btn, false, '', iconFor('send') + ' Kirim Pesan');
      if (res.success) { form.reset(); toast(res.message, 'success'); }
      else { toast(res.message || 'Gagal mengirim pesan.', 'error'); }
    })
    .withFailureHandler(function (err) {
      setBtnLoading(btn, false, '', iconFor('send') + ' Kirim Pesan');
      toast(err.message || 'Terjadi kesalahan.', 'error');
    })
    .submitContactMessage(payload, honeypot);
  return false;
}

// ============================================================================
// FOOTER INFO
// ============================================================================
function renderFooterInfo() {
  const p = AppState.data.pengaturan || {};
  document.getElementById('footer-sambutan').textContent = p.sambutan || '';
  document.getElementById('footer-social').innerHTML = socialLinksHtml(p);
  document.getElementById('footer-year').textContent = new Date().getFullYear();
  updateWaFloatButton();
}

/** Tampilkan/sembunyikan & atur tautan tombol WhatsApp mengambang berdasarkan Pengaturan. */
function updateWaFloatButton() {
  const btn = document.getElementById('wa-float-btn');
  if (!btn || !AppState.data) return;
  const raw = (AppState.data.pengaturan && AppState.data.pengaturan.nomor_whatsapp) || '';
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) { btn.classList.add('hidden'); return; }
  const normalized = digits.charAt(0) === '0' ? '62' + digits.slice(1) : digits;
  const namaSitus = (AppState.data.pengaturan && AppState.data.pengaturan.nama_situs) || 'Fajarfk Transportasi, Inovasi & Digital';
  const pesan = encodeURIComponent('Halo, saya tertarik untuk berdiskusi lebih lanjut melalui situs ' + namaSitus + '.');
  btn.href = 'https://wa.me/' + normalized + '?text=' + pesan;
  btn.classList.remove('hidden');
}

// ============================================================================
// PANEL ADMIN
// ============================================================================
function renderAdmin() {
  if (!AppState.sessionToken) return renderAdminLogin();
  return renderAdminShell();
}

function renderAdminLogin() {
  return '' +
  '<section class="section" style="min-height:60vh;display:flex;align-items:center;"><div class="wrap" style="max-width:420px;margin:0 auto;">' +
    '<div class="card">' +
      '<div class="text-center mb-lg">' + iconFor('admin_panel_settings') + '<h2 class="t-headline-sm">Masuk Panel Admin</h2>' +
      '<p class="t-body-sm text-muted">Khusus untuk pengelola situs Fajarfk Transportasi, Inovasi &amp; Digital.</p></div>' +
      '<form onsubmit="return doAdminLogin(event)">' +
        '<div class="field"><label>Kata Sandi</label><input type="password" id="admin-password" required autocomplete="current-password"></div>' +
        '<div id="admin-login-error" class="field-error hidden"></div>' +
        '<button type="submit" class="btn btn-primary btn-block" id="admin-login-btn">' + iconFor('login') + ' Masuk</button>' +
      '</form>' +
    '</div>' +
  '</div></section>';
}

function doAdminLogin(ev) {
  ev.preventDefault();
  const password = document.getElementById('admin-password').value;
  const btn = document.getElementById('admin-login-btn');
  const errEl = document.getElementById('admin-login-error');
  errEl.classList.add('hidden');
  setBtnLoading(btn, true, 'Memeriksa…', '');
  Api.run
    .withSuccessHandler(function (res) {
      setBtnLoading(btn, false, '', iconFor('login') + ' Masuk');
      if (res.success) {
        AppState.sessionToken = res.data.token; // hanya di memori JS — TIDAK di URL
        AppState.isAdmin = true;
        AppState.adminTab = 'dashboard';
        toast('Berhasil masuk.', 'success');
        navigateTo('admin');
      } else {
        errEl.textContent = res.message; errEl.classList.remove('hidden');
      }
    })
    .withFailureHandler(function (err) {
      setBtnLoading(btn, false, '', iconFor('login') + ' Masuk');
      errEl.textContent = err.message || 'Terjadi kesalahan.'; errEl.classList.remove('hidden');
    })
    .doLogin(password);
  return false;
}

function doAdminLogout() {
  Api.run.doLogout(AppState.sessionToken);
  AppState.sessionToken = null;
  AppState.isAdmin = false;
  toast('Anda telah keluar.', '');
  navigateTo('admin');
}

const ADMIN_TABS = [
  { key: 'dashboard', label: 'Dasbor', icon: 'dashboard' },
  { key: 'pesanan', label: 'Pesanan', icon: 'local_shipping' },
  { key: 'pesan', label: 'Pesan Masuk', icon: 'mail' },
  { key: 'profil', label: 'Profil', icon: 'badge' },
  { key: 'pengalaman', label: 'Pengalaman', icon: 'work_history' },
  { key: 'pendidikan', label: 'Pendidikan', icon: 'school' },
  { key: 'karya', label: 'Karya', icon: 'inventory_2' },
  { key: 'sertifikat', label: 'Sertifikat', icon: 'workspace_premium' },
  { key: 'survei', label: 'Survei', icon: 'star' },
  { key: 'wawasan', label: 'Wawasan', icon: 'article' },
  { key: 'kinerja', label: 'Kinerja', icon: 'event_note' },
  { key: 'agenda', label: 'Agenda', icon: 'calendar_month' },
  { key: 'produk', label: 'Produk', icon: 'design_services' },
  { key: 'pengaturan', label: 'Pengaturan', icon: 'settings' }
];

function renderAdminShell() {
  const tabsHtml = ADMIN_TABS.map(function (t) {
    return '<div class="tab' + (AppState.adminTab === t.key ? ' active' : '') + '" onclick="switchAdminTab(\'' + t.key + '\')">' + iconFor(t.icon) + ' ' + t.label + '</div>';
  }).join('');
  const tabsMobile = ADMIN_TABS.map(function (t) {
    return '<button class="' + (AppState.adminTab === t.key ? 'active' : '') + '" onclick="switchAdminTab(\'' + t.key + '\')">' + t.label + '</button>';
  }).join('');

  return '' +
  '<div class="admin-shell">' +
    '<aside class="admin-sidebar">' +
      '<div style="padding:0 20px 16px;">' +
        '<div class="t-label-md" style="color:var(--gold);">Panel Admin</div>' +
      '</div>' +
      tabsHtml +
      '<div class="tab" onclick="doAdminLogout()" style="margin-top:20px;color:#f3a3a3;">' + iconFor('logout') + ' Keluar</div>' +
    '</aside>' +
    '<div class="admin-main">' +
      '<div class="admin-tabs-mobile">' + tabsMobile + '<button onclick="doAdminLogout()">Keluar</button></div>' +
      '<div id="admin-tab-content">' + iconFor('hourglass_empty') + ' Memuat…</div>' +
    '</div>' +
  '</div>';
}

function switchAdminTab(tab) {
  AppState.adminTab = tab;
  document.querySelectorAll('.admin-sidebar .tab').forEach(function (el, i) { el.classList.toggle('active', ADMIN_TABS[i] && ADMIN_TABS[i].key === tab); });
  document.querySelectorAll('.admin-tabs-mobile button').forEach(function (el, i) { el.classList.toggle('active', ADMIN_TABS[i] && ADMIN_TABS[i].key === tab); });
  loadAdminTab(tab);
}

function loadAdminTab(tab) {
  const el = document.getElementById('admin-tab-content');
  el.innerHTML = '<div class="text-center" style="padding:40px;">' + iconFor('hourglass_empty') + '</div>';
  const loaders = {
    dashboard: loadAdminDashboard,
    pesanan: loadAdminPesanan,
    pesan: loadAdminPesan,
    profil: loadAdminProfil,
    pengalaman: function () { loadAdminCrud('pengalaman'); },
    pendidikan: function () { loadAdminCrud('pendidikan'); },
    karya: function () { loadAdminCrud('karya'); },
    sertifikat: function () { loadAdminCrud('sertifikat'); },
    survei: loadAdminSurvei,
    wawasan: function () { loadAdminCrud('wawasan'); },
    kinerja: function () { loadAdminCrud('kinerja'); },
    agenda: function () { loadAdminCrud('agenda'); },
    produk: function () { loadAdminCrud('produk'); },
    pengaturan: loadAdminPengaturan
  };
  (loaders[tab] || loadAdminDashboard)();
}

// Dipanggil begitu shell admin sudah dirender (setelah login)
(function hookAdminInitialLoad() {
  const originalNavigateTo = navigateTo;
  window.navigateTo = function (page, params) {
    originalNavigateTo(page, params);
    if (page === 'admin' && AppState.sessionToken) {
      setTimeout(function () { loadAdminTab(AppState.adminTab); }, 0);
    }
  };
})();

function adminFail(err) {
  toast((err && err.message) || 'Sesi admin berakhir. Silakan masuk kembali.', 'error');
  AppState.sessionToken = null; AppState.isAdmin = false;
  navigateTo('admin');
}

// --------- Dashboard ---------
function loadAdminDashboard() {
  Api.run.withSuccessHandler(renderAdminDashboard).withFailureHandler(adminFail).getDashboardStats(AppState.sessionToken);
}
function renderAdminDashboard(res) {
  if (!res.success) return adminFail({ message: res.message });
  const s = res.data;
  const maxKunjungan = Math.max.apply(null, s.trenPengunjung.map(function (t) { return t.kunjungan; }).concat([1]));
  const barsHtml = s.trenPengunjung.map(function (t) {
    const h = Math.round((t.kunjungan / maxKunjungan) * 100);
    return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">' +
      '<div style="width:100%;background:var(--navy);border-radius:2px 2px 0 0;height:' + Math.max(h, 3) + 'px;min-height:3px;" title="' + t.kunjungan + ' kunjungan"></div>' +
      '<div class="t-body-sm text-muted" style="font-size:10px;">' + t.tanggal + '</div>' +
    '</div>';
  }).join('');

  document.getElementById('admin-tab-content').innerHTML =
    '<h2 class="t-headline-sm">Dasbor</h2>' +
    '<div id="admin-agenda-reminder"></div>' +
    '<div class="kpi-grid">' +
      kpiCard(s.totalPesanan, 'Total Pesanan') +
      kpiCard(s.pesananBaru, 'Pesanan Baru') +
      kpiCard(s.pesananSelesai, 'Pesanan Selesai') +
      kpiCard(s.totalPesan, 'Total Pesan Masuk') +
    '</div>' +
    '<div class="card">' +
      '<div class="flex justify-between items-center mb-lg"><h3 class="t-title-md text-navy">Tren Kunjungan (14 Hari Terakhir)</h3>' +
      '<span class="t-body-sm text-muted">Hari ini: ' + s.kunjunganHariIni + ' kunjungan / ' + s.pengunjungUnikHariIni + ' unik</span></div>' +
      '<div style="display:flex;align-items:flex-end;gap:6px;height:120px;">' + (barsHtml || emptyStateHtml('bar_chart', 'Belum ada data kunjungan.')) + '</div>' +
    '</div>' +
    '<div class="flex gap-sm mt-lg"><button class="btn btn-secondary btn-sm" onclick="clearAdminCache()">' + iconFor('refresh') + ' Bersihkan Cache Publik</button></div>';
  loadAdminAgendaReminder();
}
/** Kotak pengingat di dasbor admin: agenda hari ini & besok (termasuk yang pribadi / tidak tampil di publik). */
function loadAdminAgendaReminder() {
  Api.run
    .withSuccessHandler(function (res) {
      const el = document.getElementById('admin-agenda-reminder');
      if (!el || !res || !res.success) return;
      const today = toIsoDate_(new Date());
      const besok = isoAddDays_(today, 1);
      const items = sortAgendaAsc_(expandAgenda_(res.data || [], today).filter(function (a) { return a.tanggal === today || a.tanggal === besok; }));
      el.innerHTML = '<div class="card card-accent-gold mb-lg">' +
        '<h3 class="t-title-md text-navy" style="margin-bottom:10px;">' + iconFor('notifications_active') + ' Hari ini dan besok</h3>' +
        (items.length ? items.map(function (a) {
          const jam = fmtJam_(a);
          return '<div class="t-body-md" style="padding:6px 0;border-top:1px solid var(--border-trim);">' +
            '<b>' + (a.tanggal === today ? 'Hari ini' : 'Besok') + '</b> &middot; ' + (jam ? escapeHtml(jam) + ' &middot; ' : '') +
            escapeHtml(agendaText_(a.judul)) + ' <span class="text-muted">(' + escapeHtml(a.kategori || '-') + (isTidak_(a.tampil) ? ', pribadi' : '') + ')</span></div>';
        }).join('') : '<p class="t-body-sm text-muted">Tidak ada agenda hari ini dan besok.</p>') +
      '</div>';
    })
    .withFailureHandler(function () { /* kotak pengingat bersifat tambahan; abaikan galat */ })
    .listAgenda(AppState.sessionToken);
}
/** Nilai "Tidak"/"N" dianggap penolakan (cermin isTidak_ di server). */
function isTidak_(v) {
  const t = String(v === null || v === undefined ? '' : v).trim().toUpperCase();
  return t === 'N' || t === 'TIDAK' || t === 'NO';
}
function kpiCard(num, lbl) { return '<div class="kpi-card"><div class="num">' + num + '</div><div class="lbl">' + lbl + '</div></div>'; }
function clearAdminCache() {
  Api.run.withSuccessHandler(function (res) { toast(res.message, 'success'); }).withFailureHandler(adminFail).clearCacheAdmin(AppState.sessionToken);
}

// --------- Pesanan ---------
function loadAdminPesanan() {
  Api.run.withSuccessHandler(renderAdminPesanan).withFailureHandler(adminFail).listPesanan(AppState.sessionToken);
}
function renderAdminPesanan(res) {
  if (!res.success) return adminFail({ message: res.message });
  const rows = res.data.sort(function (a, b) { return new Date(b.waktu) - new Date(a.waktu); });
  document.getElementById('admin-tab-content').innerHTML =
    '<h2 class="t-headline-sm">Pesanan Masuk</h2>' +
    '<div class="field" style="max-width:320px;"><input type="text" id="pesanan-filter" placeholder="Cari kode / nama / status…" oninput="filterAdminTable(\'pesanan-table\', this.value)"></div>' +
    '<div class="table-wrap"><table class="data-table" id="pesanan-table"><thead><tr>' +
      '<th>Kode</th><th>Waktu</th><th>Nama</th><th>Produk</th><th>Status</th><th>Catatan</th><th>Aksi</th>' +
    '</tr></thead><tbody>' +
      (rows.length ? rows.map(function (o) {
        return '<tr><td><b>' + escapeHtml(o.kode_pesanan) + '</b></td><td>' + fmtDateTime(o.waktu) + '</td><td>' + escapeHtml(o.nama) +
          '<div class="t-body-sm text-muted">' + escapeHtml(o.kontak || '') + '</div></td><td>' + escapeHtml(o.produk) + '</td>' +
          '<td><span class="badge badge-' + escapeHtml(o.status) + '">' + escapeHtml(o.status) + '</span></td>' +
          '<td style="max-width:160px;">' + escapeHtml(o.catatan_admin || '-') + '</td>' +
          '<td><button class="btn btn-secondary btn-sm" onclick="openUpdatePesanan(\'' + escapeHtml(o.kode_pesanan) + '\',\'' + escapeHtml(o.status) + '\')">' + iconFor('edit') + '</button></td></tr>';
      }).join('') : '<tr><td colspan="7">' + emptyStateHtml('local_shipping', 'Belum ada pesanan.') + '</td></tr>') +
    '</tbody></table></div>';
}
function openUpdatePesanan(kode, statusSekarang) {
  const options = ['Diterima', 'Dibahas', 'Diproses', 'Selesai', 'Dibatalkan'].map(function (s) {
    return '<option value="' + s + '"' + (s === statusSekarang ? ' selected' : '') + '>' + s + '</option>';
  }).join('');
  openModal(
    '<div class="modal-header"><span class="t-title-lg text-navy">Perbarui Pesanan ' + escapeHtml(kode) + '</span><button class="modal-close" onclick="closeModal()">' + iconFor('close') + '</button></div>' +
    '<div class="modal-body">' +
      '<form onsubmit="return submitUpdatePesanan(event, \'' + escapeHtml(kode) + '\')">' +
        '<div class="field"><label>Status</label><select name="status">' + options + '</select></div>' +
        '<div class="field"><label>Catatan Admin (opsional, terlihat oleh pelanggan)</label><textarea name="catatan"></textarea></div>' +
        '<button type="submit" class="btn btn-primary btn-block">' + iconFor('save') + ' Simpan &amp; Kirim Notifikasi</button>' +
      '</form>' +
    '</div>'
  );
}
function submitUpdatePesanan(ev, kode) {
  ev.preventDefault();
  const form = ev.target;
  Api.run
    .withSuccessHandler(function (res) { closeModal(); if (res.success) { toast(res.message, 'success'); loadAdminPesanan(); } else toast(res.message, 'error'); })
    .withFailureHandler(adminFail)
    .updateStatusPesanan(AppState.sessionToken, kode, form.status.value, form.catatan.value);
  return false;
}

// --------- Pesan Masuk ---------
function loadAdminPesan() {
  Api.run.withSuccessHandler(renderAdminPesan).withFailureHandler(adminFail).listPesan(AppState.sessionToken);
}
function renderAdminPesan(res) {
  if (!res.success) return adminFail({ message: res.message });
  const rows = res.data.sort(function (a, b) { return new Date(b.waktu) - new Date(a.waktu); });
  document.getElementById('admin-tab-content').innerHTML =
    '<h2 class="t-headline-sm">Pesan Masuk (Hubungi Saya)</h2>' +
    '<div class="table-wrap"><table class="data-table"><thead><tr><th>Waktu</th><th>Nama</th><th>Subjek</th><th>Status</th><th>Aksi</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (m) {
        return '<tr><td>' + fmtDateTime(m.waktu) + '</td><td>' + escapeHtml(m.nama) + '<div class="t-body-sm text-muted">' + escapeHtml(m.email) + '</div></td>' +
          '<td>' + escapeHtml(m.subjek) + '</td><td><span class="badge badge-' + escapeHtml(m.status) + '">' + escapeHtml(m.status) + '</span></td>' +
          '<td class="flex gap-sm">' +
            '<button class="btn btn-secondary btn-sm" onclick="viewPesan(\'' + m.id + '\')">' + iconFor('visibility') + '</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="deleteAdminPesan(\'' + m.id + '\')">' + iconFor('delete') + '</button>' +
          '</td></tr>';
      }).join('') : '<tr><td colspan="5">' + emptyStateHtml('mail', 'Belum ada pesan masuk.') + '</td></tr>') +
    '</tbody></table></div>';
  window._pesanCache = res.data;
}
function viewPesan(id) {
  const m = (window._pesanCache || []).find(function (x) { return String(x.id) === String(id); });
  if (!m) return;
  openModal(
    '<div class="modal-header"><span class="t-title-lg text-navy">' + escapeHtml(m.subjek) + '</span><button class="modal-close" onclick="closeModal()">' + iconFor('close') + '</button></div>' +
    '<div class="modal-body">' +
      '<p class="t-body-sm text-muted">Dari: <b>' + escapeHtml(m.nama) + '</b> (' + escapeHtml(m.email) + ') &middot; ' + fmtDateTime(m.waktu) + '</p>' +
      '<p class="t-body-md">' + nl2br(m.isi) + '</p>' +
      '<div class="field"><label>Ubah Status</label><select onchange="updatePesanStatus(\'' + m.id + '\', this.value)">' +
        ['Baru', 'Ditindaklanjuti', 'Selesai'].map(function (s) { return '<option value="' + s + '"' + (s === m.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') +
      '</select></div>' +
    '</div>'
  );
}
function updatePesanStatus(id, status) {
  Api.run.withSuccessHandler(function (res) { toast(res.message, 'success'); closeModal(); loadAdminPesan(); }).withFailureHandler(adminFail).updateStatusPesan(AppState.sessionToken, id, status);
}
function deleteAdminPesan(id) {
  if (!confirm('Hapus pesan ini?')) return;
  Api.run.withSuccessHandler(function (res) { toast(res.message, 'success'); loadAdminPesan(); }).withFailureHandler(adminFail).deletePesan(AppState.sessionToken, id);
}
// --------- Survei (hasil penilaian bintang) ---------
function loadAdminSurvei() {
  Api.run.withSuccessHandler(renderAdminSurvei).withFailureHandler(adminFail).listSurvei(AppState.sessionToken);
}
function surveiStatHtml_(judul, r) {
  const maks = Math.max.apply(null, r.sebaran.concat([1]));
  const bars = [5, 4, 3, 2, 1].map(function (n) {
    const c = r.sebaran[n - 1];
    return '<div class="survei-bar"><span class="survei-bar-lbl">' + n + ' ★</span>' +
      '<div class="survei-bar-track"><div class="survei-bar-fill" style="width:' + Math.round((c / maks) * 100) + '%;"></div></div>' +
      '<span class="survei-bar-num">' + c + '</span></div>';
  }).join('');
  return '<div class="card" style="flex:1;min-width:240px;">' +
    '<div class="t-label-md text-muted">' + judul + '</div>' +
    '<div class="survei-big">' + (r.jumlah ? angkaRata_(r.rata) : '-') + '<span class="t-body-sm text-muted"> / 5</span></div>' +
    '<div class="t-body-sm text-muted" style="margin-bottom:10px;">' + r.jumlah + ' penilaian</div>' + bars +
  '</div>';
}
function renderAdminSurvei(res) {
  if (!res.success) return adminFail({ message: res.message });
  const rows = (res.data || []).slice().sort(function (a, b) { return new Date(b.waktu) - new Date(a.waktu); });
  const sum = { layanan: { sebaran: [0, 0, 0, 0, 0], jumlah: 0, rata: 0 }, website: { sebaran: [0, 0, 0, 0, 0], jumlah: 0, rata: 0 } };
  const tot = { layanan: 0, website: 0 };
  rows.forEach(function (r) {
    [['layanan', r.bintang_layanan], ['website', r.bintang_website]].forEach(function (p) {
      const n = Math.round(Number(p[1]));
      if (n >= 1 && n <= 5) { sum[p[0]].sebaran[n - 1]++; sum[p[0]].jumlah++; tot[p[0]] += n; }
    });
  });
  ['layanan', 'website'].forEach(function (k) {
    sum[k].rata = sum[k].jumlah ? Math.round((tot[k] / sum[k].jumlah) * 10) / 10 : 0;
  });
  document.getElementById('admin-tab-content').innerHTML =
    '<h2 class="t-headline-sm">Survei Layanan &amp; Website</h2>' +
    '<p class="t-body-sm text-muted mb-lg">Rata-rata baru tampil di Beranda setelah ' + SURVEI_MIN_TAMPIL + ' penilaian. Komentar hanya terlihat di sini.</p>' +
    '<div class="flex gap-md" style="flex-wrap:wrap;margin-bottom:var(--space-lg);">' +
      surveiStatHtml_('Layanan', sum.layanan) + surveiStatHtml_('Website', sum.website) +
    '</div>' +
    '<div class="table-wrap"><table class="data-table"><thead><tr><th>Waktu</th><th>Layanan</th><th>Website</th><th>Nama</th><th>Komentar</th><th>Aksi</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (r) {
        return '<tr><td>' + fmtDateTime(r.waktu) + '</td>' +
          '<td class="survei-stars">' + bintangText_(r.bintang_layanan) + '</td>' +
          '<td class="survei-stars">' + bintangText_(r.bintang_website) + '</td>' +
          '<td>' + escapeHtml(agendaText_(r.nama) || '-') + '</td>' +
          '<td style="max-width:280px;">' + (r.komentar ? nl2br(agendaText_(r.komentar)) : '<span class="text-muted">-</span>') + '</td>' +
          '<td><button class="btn btn-secondary btn-sm" title="Hapus" onclick="deleteAdminSurvei(\'' + escapeHtml(r.id) + '\')">' + iconFor('delete') + '</button></td></tr>';
      }).join('') : '<tr><td colspan="6">' + emptyStateHtml('star', 'Belum ada penilaian masuk.') + '</td></tr>') +
    '</tbody></table></div>';
}
function deleteAdminSurvei(id) {
  if (!confirm('Hapus penilaian ini?')) return;
  Api.run.withSuccessHandler(function (res) { toast(res.message, 'success'); loadAdminSurvei(); }).withFailureHandler(adminFail).deleteSurvei(AppState.sessionToken, id);
}
function filterAdminTable(tableId, q) {
  q = q.toLowerCase();
  document.querySelectorAll('#' + tableId + ' tbody tr').forEach(function (tr) {
    tr.style.display = tr.textContent.toLowerCase().indexOf(q) !== -1 ? '' : 'none';
  });
}

// --------- Profil (single-row) ---------
function loadAdminProfil() {
  const p = AppState.data.profil || {};
  document.getElementById('admin-tab-content').innerHTML =
    '<h2 class="t-headline-sm">Profil</h2>' +
    '<form id="profil-form" onsubmit="return submitAdminProfil(event)" class="card">' +
      '<div class="field"><label>Nama</label><input type="text" name="nama" value="' + escapeHtml(p.nama || '') + '"></div>' +
      '<div class="field"><label>Tagline</label><input type="text" name="tagline" value="' + escapeHtml(p.tagline || '') + '"></div>' +
      '<div class="field"><label>Ringkasan Profesional</label><textarea name="ringkasan">' + escapeHtml(p.ringkasan || '') + '</textarea></div>' +
      '<div class="field"><label>Foto Profil</label><input type="file" name="foto" accept="image/*">' +
        (p.url_foto ? '<div class="t-body-sm text-muted mt-lg">Saat ini: <a href="' + escapeHtml(p.url_foto) + '" target="_blank">lihat foto</a></div>' : '') + '</div>' +
      '<div class="field"><label>Berkas CV (PDF)</label><input type="file" name="cv" accept="application/pdf">' +
        (p.url_cv_preview ? '<div class="t-body-sm text-muted mt-lg">Saat ini: <a href="' + escapeHtml(p.url_cv_preview) + '" target="_blank">lihat CV</a></div>' : '') + '</div>' +
      '<input type="hidden" name="id_foto_drive" value="' + escapeHtml(p.id_foto_drive || '') + '">' +
      '<input type="hidden" name="id_cv_drive" value="' + escapeHtml(p.id_cv_drive || '') + '">' +
      '<button type="submit" class="btn btn-primary" id="profil-save-btn">' + iconFor('save') + ' Simpan Profil</button>' +
    '</form>';
}
function fileToBase64(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () { resolve(reader.result.split(',')[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function submitAdminProfil(ev) {
  ev.preventDefault();
  const form = ev.target;
  const btn = document.getElementById('profil-save-btn');
  setBtnLoading(btn, true, 'Menyimpan…', '');
  const data = {
    nama: form.nama.value, tagline: form.tagline.value, ringkasan: form.ringkasan.value,
    id_foto_drive: form.id_foto_drive.value, id_cv_drive: form.id_cv_drive.value
  };
  const fotoFile = form.foto.files[0];
  const cvFile = form.cv.files[0];

  const uploads = [];
  if (fotoFile) uploads.push(fileToBase64(fotoFile).then(function (b64) {
    return new Promise(function (resolve, reject) {
      Api.run.withSuccessHandler(function (r) { if (r.success) data.id_foto_drive = r.data.fileId; resolve(); }).withFailureHandler(reject).uploadFile(AppState.sessionToken, b64, fotoFile.type, fotoFile.name, 'Foto');
    });
  }));
  if (cvFile) uploads.push(fileToBase64(cvFile).then(function (b64) {
    return new Promise(function (resolve, reject) {
      Api.run.withSuccessHandler(function (r) { if (r.success) data.id_cv_drive = r.data.fileId; resolve(); }).withFailureHandler(reject).uploadFile(AppState.sessionToken, b64, cvFile.type, cvFile.name, 'CV');
    });
  }));

  Promise.all(uploads).then(function () {
    Api.run
      .withSuccessHandler(function (res) {
        setBtnLoading(btn, false, '', iconFor('save') + ' Simpan Profil');
        if (res.success) { toast('Profil tersimpan.', 'success'); refreshInitialDataSilently(); } else toast(res.message, 'error');
      })
      .withFailureHandler(function (err) { setBtnLoading(btn, false, '', iconFor('save') + ' Simpan Profil'); adminFail(err); })
      .saveProfil(AppState.sessionToken, data);
  }).catch(function (err) { setBtnLoading(btn, false, '', iconFor('save') + ' Simpan Profil'); toast('Gagal mengunggah berkas.', 'error'); });
  return false;
}
function refreshInitialDataSilently() {
  Api.run.withSuccessHandler(function (res) { if (res.success) { AppState.data = res.data; updateWaFloatButton(); } }).getInitialData();
}

// --------- CRUD generik: Pengalaman / Pendidikan / Karya / Sertifikat / Produk ---------
const CRUD_CONFIG = {
  pengalaman: {
    title: 'Pengalaman', list: 'listPengalaman', save: 'savePengalaman', del: 'deletePengalaman', idField: 'id',
    columns: [
      { key: 'instansi', label: 'Instansi', type: 'text' },
      { key: 'jabatan', label: 'Jabatan', type: 'text' },
      { key: 'periode_mulai', label: 'Periode Mulai', type: 'text' },
      { key: 'periode_selesai', label: 'Periode Selesai (kosongkan jika masih)', type: 'text' },
      { key: 'deskripsi', label: 'Deskripsi', type: 'textarea' },
      { key: 'urutan', label: 'Urutan', type: 'number' }
    ],
    columnsTable: ['instansi', 'jabatan', 'periode_mulai', 'periode_selesai', 'urutan'],
    sortFn: sortPengalamanTerbaru_
  },
  pendidikan: {
    title: 'Pendidikan', list: 'listPendidikan', save: 'savePendidikan', del: 'deletePendidikan', idField: 'id',
    columns: [
      { key: 'institusi', label: 'Institusi', type: 'text' },
      { key: 'jenjang', label: 'Jenjang', type: 'text' },
      { key: 'tahun', label: 'Tahun', type: 'year' },
      { key: 'keterangan', label: 'Keterangan', type: 'textarea' },
      { key: 'urutan', label: 'Urutan', type: 'number' }
    ],
    columnsTable: ['institusi', 'jenjang', 'tahun', 'urutan'],
    sortFn: sortPendidikanTerbaru_
  },
  karya: {
    title: 'Karya', list: 'listKarya', save: 'saveKarya', del: 'deleteKarya', idField: 'id',
    columns: [
      { key: 'judul', label: 'Judul', type: 'text' },
      { key: 'kategori', label: 'Kategori', type: 'text' },
      { key: 'deskripsi', label: 'Deskripsi', type: 'textarea' },
      { key: 'tautan', label: 'Tautan (URL)', type: 'text' },
      { key: 'tahun', label: 'Tahun', type: 'year' },
      { key: 'tampil', label: 'Tampilkan di situs? (Y/N)', type: 'text' },
      { key: 'id_gambar_drive', label: 'Gambar', type: 'file-image' }
    ],
    columnsTable: ['judul', 'kategori', 'tahun', 'tampil']
  },
  sertifikat: {
    title: 'Sertifikat & Penghargaan', list: 'listSertifikat', save: 'saveSertifikat', del: 'deleteSertifikat', idField: 'id',
    columns: [
      { key: 'nama', label: 'Nama Sertifikat/Penghargaan', type: 'text' },
      { key: 'penerbit', label: 'Penerbit', type: 'text' },
      { key: 'tahun', label: 'Tahun', type: 'year' },
      { key: 'jenis', label: 'Jenis', type: 'select', options: ['Surat Keterangan', 'Sertifikat', 'Penghargaan'] },
      { key: 'id_berkas_drive', label: 'Berkas (PDF/Gambar)', type: 'file-any' }
    ],
    columnsTable: ['nama', 'penerbit', 'tahun', 'jenis'],
    sortFn: sortSertifikatTerbaru_
  },
  wawasan: {
    title: 'Wawasan & Insight', list: 'listWawasan', save: 'saveWawasan', del: 'deleteWawasan', idField: 'id',
    columns: [
      { key: 'judul', label: 'Judul', type: 'text' },
      { key: 'ringkasan', label: 'Ringkasan Singkat', type: 'textarea' },
      { key: 'konten', label: 'Konten Lengkap', type: 'textarea' },
      { key: 'tanggal', label: 'Tanggal (mis. 2026-09-29)', type: 'text' },
      { key: 'tampil', label: 'Tampilkan di situs? (Y/N)', type: 'text' },
      { key: 'id_gambar_drive', label: 'Gambar Sampul (opsional)', type: 'file-image' },
      { key: 'jadwal_terbit', label: 'Jadwal Terbit - tayang pukul 08.00 WITA (kosongkan = langsung tayang)', type: 'date-opt' }
    ],
    columnsTable: ['judul', 'tanggal', 'tampil', 'jadwal_terbit'],
    sortFn: sortWawasanTerbit_
  },
  kinerja: {
    title: 'Kinerja Harian', list: 'listKinerja', save: 'saveKinerja', del: 'deleteKinerja', idField: 'id',
    columns: [
      { key: 'tanggal', label: 'Tanggal', type: 'date' },
      { key: 'kegiatan', label: 'Kegiatan', type: 'textarea' },
      { key: 'output', label: 'Output/Hasil', type: 'textarea' },
      { key: 'tampil', label: 'Tampilkan di situs? (Y/N)', type: 'text' },
      { key: 'id_foto_drive', label: 'Foto Kegiatan (opsional)', type: 'file-image' }
    ],
    columnsTable: ['tanggal', 'kegiatan', 'tampil'],
    sortFn: sortKinerjaTerbaru_
  },
  agenda: {
    title: 'Agenda Kegiatan', list: 'listAgenda', save: 'saveAgenda', del: 'deleteAgenda', idField: 'id',
    columns: [
      { key: 'kategori', label: 'Kategori', type: 'select', options: AGENDA_KATEGORI_ },
      { key: 'judul', label: 'Judul Kegiatan', type: 'text' },
      { key: 'tanggal', label: 'Tanggal (jika berulang: tanggal mulai)', type: 'date' },
      { key: 'jam_mulai', label: 'Jam Mulai (WITA)', type: 'time' },
      { key: 'jam_selesai', label: 'Jam Selesai (WITA)', type: 'time' },
      { key: 'tempat', label: 'Tempat / Tautan Daring', type: 'text' },
      { key: 'keterangan', label: 'Keterangan', type: 'textarea' },
      { key: 'ulang_hari', label: 'Ulangi tiap hari (kosongkan jika hanya sekali)', type: 'hari' },
      { key: 'ulang_sampai', label: 'Berulang sampai tanggal (wajib diisi jika memilih hari)', type: 'date-opt' },
      { key: 'kecuali', label: 'Kecuali tanggal (yyyy-mm-dd, pisahkan dengan koma — mis. libur)', type: 'text' },
      { key: 'tampil', label: 'Tampilkan di situs?', type: 'select', options: ['Ya', 'Tidak'] },
      { key: 'tampil_tempat', label: 'Tampilkan tempat ke publik? (kosong = bawaan: Kuliah & Rapat disembunyikan)', type: 'select', options: ['Ya', 'Tidak'] }
    ],
    columnsTable: ['tanggal', 'kategori', 'judul', 'jam_mulai', 'ulang_hari', 'tampil'],
    sortFn: sortAgendaTerbaru_
  },
  produk: {
    title: 'Produk & Layanan', list: 'listProduk', save: 'saveProduk', del: 'deleteProduk', idField: 'id',
    columns: [
      { key: 'nama', label: 'Nama Produk/Layanan', type: 'text' },
      { key: 'deskripsi', label: 'Deskripsi', type: 'textarea' },
      { key: 'ikon', label: 'Ikon (nama Material Symbol, mis. design_services)', type: 'text' },
      { key: 'aktif', label: 'Aktif? (Y/N)', type: 'text' },
      { key: 'urutan', label: 'Urutan', type: 'number' }
    ],
    columnsTable: ['nama', 'aktif', 'urutan']
  }
};

function renderAdminCrudError(key, message) {
  const el = document.getElementById('admin-tab-content');
  if (!el) return;
  el.innerHTML =
    '<div class="text-center" style="padding:40px;">' +
      '<div class="t-body-md" style="color:#c0392b;margin-bottom:12px;">' + iconFor('error') + ' Gagal memuat data: ' + escapeHtml(message || 'Terjadi kesalahan tak terduga.') + '</div>' +
      '<button class="btn btn-secondary btn-sm" onclick="loadAdminCrud(\'' + key + '\')">' + iconFor('refresh') + ' Coba Lagi</button>' +
    '</div>';
}
function loadAdminCrud(key) {
  const cfg = CRUD_CONFIG[key];
  Api.run
    .withSuccessHandler(function (res) {
      try {
        renderAdminCrudList(key, res);
      } catch (e) {
        console.error('renderAdminCrudList error (' + key + '):', e);
        renderAdminCrudError(key, e.message);
      }
    })
    .withFailureHandler(function (err) {
      console.error('loadAdminCrud RPC error (' + key + '):', err);
      renderAdminCrudError(key, (err && err.message) || 'Sesi admin mungkin berakhir.');
    })
    [cfg.list](AppState.sessionToken);
}
function renderAdminCrudList(key, res) {
  if (!res || !res.success) return renderAdminCrudError(key, (res && res.message) || 'Respons tidak valid dari server.');
  const cfg = CRUD_CONFIG[key];
  let rows = Array.isArray(res.data) ? res.data : [];
  if (cfg.sortFn) rows = cfg.sortFn(rows);
  window['_crudCache_' + key] = rows;
  document.getElementById('admin-tab-content').innerHTML =
    '<div class="flex justify-between items-center mb-lg" style="flex-wrap:wrap;gap:10px;">' +
      '<h2 class="t-headline-sm" style="margin:0;">' + cfg.title + '</h2>' +
      '<button class="btn btn-primary btn-sm" onclick="openCrudForm(\'' + key + '\', null)">' + iconFor('add') + ' Tambah</button>' +
    '</div>' +
    '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      cfg.columnsTable.map(function (c) { return '<th>' + escapeHtml((cfg.columns.find(function (x) { return x.key === c; }) || { label: c }).label) + '</th>'; }).join('') +
      '<th>Aksi</th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (r) {
        return '<tr>' + cfg.columnsTable.map(function (c) { return '<td>' + escapeHtml(String(r[c] === undefined || r[c] === null || r[c] === '' ? '-' : r[c])) + '</td>'; }).join('') +
          '<td class="flex gap-sm">' +
            '<button class="btn btn-secondary btn-sm" onclick="openCrudForm(\'' + key + '\', \'' + escapeHtml(String(r[cfg.idField])) + '\')">' + iconFor('edit') + '</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="deleteCrudItem(\'' + key + '\', \'' + escapeHtml(String(r[cfg.idField])) + '\')">' + iconFor('delete') + '</button>' +
          '</td></tr>';
      }).join('') : '<tr><td colspan="' + (cfg.columnsTable.length + 1) + '">' + emptyStateHtml('inbox', 'Belum ada data.') + '</td></tr>') +
    '</tbody></table></div>';
}
function openCrudForm(key, id) {
  try {
  const cfg = CRUD_CONFIG[key];
  const rows = window['_crudCache_' + key] || [];
  const item = id ? rows.find(function (r) { return String(r[cfg.idField]) === String(id); }) : {};

  const fieldsHtml = cfg.columns.map(function (c) {
    const rawVal = item && item[c.key];
    const val = escapeHtml(rawVal === undefined || rawVal === null ? '' : rawVal);
    if (c.type === 'textarea') return '<div class="field"><label>' + c.label + '</label><textarea name="' + c.key + '">' + val + '</textarea></div>';
    if (c.type === 'select') {
      const opts = (c.options || []).map(function (o) {
        return '<option value="' + escapeHtml(o) + '"' + (rawVal === o ? ' selected' : '') + '>' + escapeHtml(o) + '</option>';
      }).join('');
      return '<div class="field"><label>' + c.label + '</label><select name="' + c.key + '"><option value="">- Pilih -</option>' + opts + '</select></div>';
    }
    if (c.type === 'date') {
      // Input tanggal (kalender): otomatis terisi hari ini untuk data baru, jadi tidak perlu diketik.
      const todayIso = toIsoDate_(new Date());
      const dateVal = rawVal ? toIsoDate_(rawVal) : todayIso;
      return '<div class="field"><label>' + c.label + '</label><input type="date" name="' + c.key + '" value="' + escapeHtml(dateVal) + '"></div>';
    }
    if (c.type === 'time') {
      return '<div class="field"><label>' + c.label + '</label><input type="time" name="' + c.key + '" value="' + escapeHtml(rawVal || '') + '"></div>';
    }
    if (c.type === 'hari') {
      // Kotak centang hari (Senin..Minggu); tersimpan sebagai teks "Senin,Rabu,Jumat".
      const dipilih = String(rawVal || '').split(',').map(function (x) { return x.trim(); });
      const urut = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      return '<div class="field"><label>' + c.label + '</label><div class="flex gap-sm" style="flex-wrap:wrap;">' +
        urut.map(function (h) {
          return '<label style="display:flex;align-items:center;gap:4px;font-weight:400;"><input type="checkbox" name="' + c.key + '" value="' + h + '"' +
            (dipilih.indexOf(h) !== -1 ? ' checked' : '') + '> ' + h + '</label>';
        }).join('') + '</div></div>';
    }
    if (c.type === 'date-opt') {
      // Tanggal opsional: boleh dikosongkan (tidak otomatis terisi hari ini).
      return '<div class="field"><label>' + c.label + '</label><input type="date" name="' + c.key + '" value="' + escapeHtml(rawVal ? toIsoDate_(rawVal) : '') + '"></div>';
    }
    if (c.type === 'year') {
      // Dropdown tahun: otomatis terisi tahun berjalan untuk data baru (item belum ada),
      // sehingga admin tidak perlu mengetik tahun sendiri — tinggal pilih kalau perlu diubah.
      const nowYear = new Date().getFullYear();
      const selectedYear = rawVal ? parseInt(rawVal, 10) : nowYear;
      let yearOpts = '';
      for (let y = nowYear + 1; y >= nowYear - 30; y--) {
        yearOpts += '<option value="' + y + '"' + (y === selectedYear ? ' selected' : '') + '>' + y + '</option>';
      }
      return '<div class="field"><label>' + c.label + '</label><select name="' + c.key + '">' + yearOpts + '</select></div>';
    }
    if (c.type === 'file-image' || c.type === 'file-any') {
      const current = (item && item[c.key]) ? '<div class="t-body-sm text-muted">Berkas saat ini tersimpan. Unggah baru untuk mengganti.</div>' : '';
      return '<div class="field"><label>' + c.label + '</label><input type="file" name="__file_' + c.key + '" accept="' + (c.type === 'file-image' ? 'image/*' : '*/*') + '">' + current +
        '<input type="hidden" name="' + c.key + '" value="' + val + '"></div>';
    }
    return '<div class="field"><label>' + c.label + '</label><input type="' + (c.type === 'number' ? 'number' : 'text') + '" name="' + c.key + '" value="' + val + '"></div>';
  }).join('');

  openModal(
    '<div class="modal-header"><span class="t-title-lg text-navy">' + (id ? 'Ubah' : 'Tambah') + ' ' + cfg.title + '</span><button class="modal-close" onclick="closeModal()">' + iconFor('close') + '</button></div>' +
    '<div class="modal-body">' +
      '<form id="crud-form" onsubmit="return submitCrudForm(event, \'' + key + '\', ' + (id ? "'" + id + "'" : 'null') + ')">' +
        fieldsHtml +
        '<button type="submit" class="btn btn-primary btn-block" id="crud-save-btn">' + iconFor('save') + ' Simpan</button>' +
      '</form>' +
    '</div>'
  );
  } catch (e) {
    console.error('openCrudForm error (' + key + '):', e);
    toast('Gagal membuka formulir: ' + e.message, 'error');
  }
}
function submitCrudForm(ev, key, id) {
  ev.preventDefault();
  const form = ev.target;
  const cfg = CRUD_CONFIG[key];
  const btn = document.getElementById('crud-save-btn');
  setBtnLoading(btn, true, 'Menyimpan…', '');
  const data = {};
  if (id) data[cfg.idField] = id;
  cfg.columns.forEach(function (c) {
    if (c.type === 'hari') {
      data[c.key] = Array.prototype.slice.call(form.querySelectorAll('input[name="' + c.key + '"]:checked')).map(function (i) { return i.value; }).join(',');
    } else {
      data[c.key] = form[c.key] ? form[c.key].value : '';
    }
  });
  if (key === 'agenda' && data.ulang_hari && !data.ulang_sampai) {
    setBtnLoading(btn, false, '', iconFor('save') + ' Simpan');
    toast('Isi "Berulang sampai tanggal" jika memilih hari berulang.', 'error');
    return false;
  }

  const fileUploads = cfg.columns.filter(function (c) { return c.type === 'file-image' || c.type === 'file-any'; }).map(function (c) {
    const fileInput = form['__file_' + c.key];
    const file = fileInput && fileInput.files[0];
    if (!file) return Promise.resolve();
    // Simpan ID berkas lama (jika sedang mengubah data yang sudah ada) supaya
    // berkas lama ini dihapus dari Drive setelah berkas baru berhasil diunggah —
    // dengan begitu Drive tidak menumpuk berkas lama yang sudah tidak dipakai.
    const oldFileId = form[c.key] ? form[c.key].value : '';
    return fileToBase64(file).then(function (b64) {
      const subfolder = key === 'karya' ? 'Karya' : key === 'sertifikat' ? 'Sertifikat' : key === 'wawasan' ? 'Wawasan' : key === 'kinerja' ? 'Kinerja' : 'Foto';
      return new Promise(function (resolve, reject) {
        Api.run.withSuccessHandler(function (r) { if (r.success) data[c.key] = r.data.fileId; resolve(); }).withFailureHandler(reject).uploadFile(AppState.sessionToken, b64, file.type, file.name, subfolder, oldFileId);
      });
    });
  });

  Promise.all(fileUploads).then(function () {
    Api.run
      .withSuccessHandler(function (res) {
        setBtnLoading(btn, false, '', iconFor('save') + ' Simpan');
        if (res.success) { closeModal(); toast('Data tersimpan.', 'success'); loadAdminCrud(key); refreshInitialDataSilently(); } else toast(res.message, 'error');
      })
      .withFailureHandler(function (err) { setBtnLoading(btn, false, '', iconFor('save') + ' Simpan'); adminFail(err); })
      [cfg.save](AppState.sessionToken, data);
  }).catch(function () { setBtnLoading(btn, false, '', iconFor('save') + ' Simpan'); toast('Gagal mengunggah berkas.', 'error'); });
  return false;
}
function deleteCrudItem(key, id) {
  if (!confirm('Hapus data ini? Tindakan ini tidak dapat dibatalkan.')) return;
  const cfg = CRUD_CONFIG[key];
  Api.run
    .withSuccessHandler(function (res) { if (res.success) { toast('Data dihapus.', 'success'); loadAdminCrud(key); refreshInitialDataSilently(); } else toast(res.message, 'error'); })
    .withFailureHandler(adminFail)
    [cfg.del](AppState.sessionToken, id);
}

// --------- Pengaturan ---------
function loadAdminPengaturan() {
  const p = AppState.data.pengaturan || {};
  document.getElementById('admin-tab-content').innerHTML =
    '<h2 class="t-headline-sm">Pengaturan Situs</h2>' +
    '<form id="pengaturan-form" onsubmit="return submitAdminPengaturan(event)" class="card mb-lg">' +
      '<div class="field"><label>Nama Situs</label><input type="text" name="nama_situs" value="' + escapeHtml(p.nama_situs || '') + '"></div>' +
      '<div class="field"><label>Kalimat Sambutan</label><textarea name="sambutan">' + escapeHtml(p.sambutan || '') + '</textarea></div>' +
      '<div class="field"><label>Email Notifikasi Admin</label><input type="email" name="email_notifikasi" value="' + escapeHtml(p.email_notifikasi || '') + '"></div>' +
      '<div class="field"><label>LinkedIn</label><input type="text" name="sosial_linkedin" value="' + escapeHtml(p.sosial_linkedin || '') + '"></div>' +
      '<div class="field"><label>GitHub</label><input type="text" name="sosial_github" value="' + escapeHtml(p.sosial_github || '') + '"></div>' +
      '<div class="field"><label>Media Sosial Lainnya</label><input type="text" name="sosial_lainnya" value="' + escapeHtml(p.sosial_lainnya || '') + '"></div>' +
      '<div class="field"><label>Nomor WhatsApp (mis. 081234567890)</label><input type="text" name="nomor_whatsapp" value="' + escapeHtml(p.nomor_whatsapp || '') + '">' +
        '<div class="t-body-sm text-muted">Diisi untuk memunculkan tombol "Chat via WhatsApp" mengambang di semua halaman. Kosongkan untuk menyembunyikan tombol.</div></div>' +
      '<div class="field"><label>URL Aplikasi Bandhits (https://...)</label><input type="text" name="url_aplikasi_kas" value="' + escapeHtml(p.url_aplikasi_kas || '') + '">' +
        '<div class="t-body-sm text-muted">Tautan aplikasi Bandhits (mis. https://kasbandhits.blogspot.com/) yang dibuka saat pengunjung menekan tombol di halaman "Bandhits". Kosongkan untuk menyembunyikan tombolnya.</div></div>' +
      '<div class="field"><label>Kirim Notifikasi Email saat Status Pesanan Berubah?</label>' +
        '<select name="notifikasi_status_pesanan">' +
          '<option value="true"' + (p.notifikasi_status_pesanan !== 'false' ? ' selected' : '') + '>Ya</option>' +
          '<option value="false"' + (p.notifikasi_status_pesanan === 'false' ? ' selected' : '') + '>Tidak</option>' +
        '</select></div>' +
      '<button type="submit" class="btn btn-primary" id="pengaturan-save-btn">' + iconFor('save') + ' Simpan Pengaturan</button>' +
    '</form>' +
    '<div class="card">' +
      '<h3 class="t-title-md text-navy mb-lg">Ganti Kata Sandi Admin</h3>' +
      '<form onsubmit="return submitChangePassword(event)">' +
        '<div class="field"><label>Sandi Lama</label><input type="password" name="lama" required autocomplete="current-password"></div>' +
        '<div class="field"><label>Sandi Baru (minimal 8 karakter)</label><input type="password" name="baru" required minlength="8" autocomplete="new-password"></div>' +
        '<button type="submit" class="btn btn-secondary">' + iconFor('lock_reset') + ' Ganti Sandi</button>' +
      '</form>' +
    '</div>';
}
function submitAdminPengaturan(ev) {
  ev.preventDefault();
  const form = ev.target;
  const btn = document.getElementById('pengaturan-save-btn');
  setBtnLoading(btn, true, 'Menyimpan…', '');
  const data = {
    nama_situs: form.nama_situs.value, sambutan: form.sambutan.value, email_notifikasi: form.email_notifikasi.value,
    sosial_linkedin: form.sosial_linkedin.value, sosial_github: form.sosial_github.value, sosial_lainnya: form.sosial_lainnya.value,
    nomor_whatsapp: form.nomor_whatsapp.value,
    url_aplikasi_kas: form.url_aplikasi_kas.value,
    notifikasi_status_pesanan: form.notifikasi_status_pesanan.value
  };
  Api.run
    .withSuccessHandler(function (res) {
      setBtnLoading(btn, false, '', iconFor('save') + ' Simpan Pengaturan');
      if (res.success) { toast('Pengaturan tersimpan.', 'success'); refreshInitialDataSilently(); } else toast(res.message, 'error');
    })
    .withFailureHandler(function (err) { setBtnLoading(btn, false, '', iconFor('save') + ' Simpan Pengaturan'); adminFail(err); })
    .savePengaturan(AppState.sessionToken, data);
  return false;
}
function submitChangePassword(ev) {
  ev.preventDefault();
  const form = ev.target;
  Api.run
    .withSuccessHandler(function (res) { if (res.success) { toast(res.message, 'success'); form.reset(); } else toast(res.message, 'error'); })
    .withFailureHandler(adminFail)
    .changeAdminPassword(AppState.sessionToken, form.lama.value, form.baru.value);
  return false;
}
