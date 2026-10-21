/* ============================================================================
   js/api.js — Penghubung ke backend Google Apps Script (REST API JSON)
   Pola dari skill GAS-PRO-API:
     - POST wajib Content-Type: text/plain;charset=utf-8  (menghindari CORS preflight)
     - Tidak ada google.script.run / iframe / HtmlService
   Antarmuka dibuat identik dengan gaya lama agar kode halaman tidak perlu ditulis ulang:
       Api.run.withSuccessHandler(fn).withFailureHandler(fn).namaFungsi(arg1, arg2, ...)
   ============================================================================ */
const Api = (function () {
  const TIMEOUT_MS = 120000; // unggah berkas bisa lama

  function gasUrlSiap_() {
    return typeof GAS_URL === 'string' && /^https:\/\/script\.google\.com\/.+\/exec$/.test(GAS_URL);
  }

  function withTimeout_(promiseFactory) {
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    return promiseFactory(ctrl.signal).finally(function () { clearTimeout(timer); });
  }

  function parseResponse_(res) {
    return res.text().then(function (txt) {
      try { return JSON.parse(txt); }
      catch (e) {
        throw new Error('Server mengembalikan respons yang tidak valid. Pastikan Web App di-deploy dengan akses "Anyone" dan URL /exec sudah benar.');
      }
    });
  }

  function networkError_(err) {
    if (err && err.name === 'AbortError') return new Error('Permintaan terlalu lama. Coba lagi.');
    if (err && /Failed to fetch|NetworkError|Load failed/i.test(err.message || '')) {
      return new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
    }
    return err;
  }

  function get_(action) {
    if (!gasUrlSiap_()) return Promise.reject(new Error('GAS_URL belum diisi di js/config.js.'));
    return withTimeout_(function (signal) {
      return fetch(GAS_URL + '?action=' + encodeURIComponent(action), { signal: signal });
    }).then(parseResponse_).catch(function (e) { throw networkError_(e); });
  }

  function post_(action, args) {
    if (!gasUrlSiap_()) return Promise.reject(new Error('GAS_URL belum diisi di js/config.js.'));
    return withTimeout_(function (signal) {
      return fetch(GAS_URL, {
        method: 'POST',
        // WAJIB text/plain — application/json memicu preflight CORS yang ditolak Apps Script
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, args: args }),
        signal: signal
      });
    }).then(parseResponse_).catch(function (e) { throw networkError_(e); });
  }

  // Aksi baca publik lewat GET (lebih ringan, ber-cache di sisi server)
  const AKSI_GET = { getInitialData: true };

  function makeRunner_(onOk, onFail) {
    return new Proxy({}, {
      get: function (_, name) {
        if (name === 'then' || typeof name === 'symbol') return undefined; // jangan dianggap Promise
        if (name === 'withSuccessHandler') return function (fn) { return makeRunner_(fn, onFail); };
        if (name === 'withFailureHandler') return function (fn) { return makeRunner_(onOk, fn); };
        return function () {
          const args = Array.prototype.slice.call(arguments);
          const req = AKSI_GET[name] && args.length === 0 ? get_(name) : post_(String(name), args);
          req.then(function (res) {
            if (res && res.__error) {
              if (onFail) onFail({ message: res.message });
              else console.error('[API]', name, res.message);
              return;
            }
            if (onOk) onOk(res);
          }, function (err) {
            if (onFail) onFail(err);
            else console.error('[API]', name, err);
          });
        };
      }
    });
  }

  return { run: makeRunner_(null, null) };
})();
