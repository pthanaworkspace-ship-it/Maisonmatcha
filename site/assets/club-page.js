// Matcha Club member card. All data comes from the link the café sent (after #), which never leaves this phone:
// no server lookup, no phone number, first name only. The café's system is always the record.
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DR = { latte: ['ມັດຊະລາເຕ້', 'Matcha Latte'], coconut: ['ມັດຊະນ້ຳໝາກພ້າວ', 'Coconut Matcha'], clear: ['ມັດຊະໃສ', 'Clear Matcha'], velvet: ['ໂຄໂຄນັດ ເວວເວັດ', 'Coconut Velvet'] };
  let d = null;
  try { const m = location.hash.match(/d=([A-Za-z0-9_-]+)/); if (m) { const b = m[1].replace(/-/g, '+').replace(/_/g, '/'); d = JSON.parse(decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4))))); } } catch (e) { d = null; }
  function qr(text) {
    if (!window.qrcode || !text) return '';
    const q = qrcode(0, 'M'); q.addData(text); q.make(); const k = q.getModuleCount(); let p = '';
    for (let r = 0; r < k; r++) for (let c = 0; c < k; c++) if (q.isDark(r, c)) p += `M${c + 2} ${r + 2}h1v1h-1z`;
    return `<svg viewBox="0 0 ${k + 4} ${k + 4}" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="100%" height="100%" fill="#fff"/><path d="${p}" fill="#1E3614"/></svg>`;
  }
  function render() {
    const L = window.MM_LANG ? window.MM_LANG() : 'en'; const T = (lo, en) => (L === 'en' ? en : lo);
    const box = document.getElementById('club-card');
    if (!d || d.v !== 1) { box.innerHTML = `<div class="info-card" style="max-width:32rem;margin:0 auto;text-align:center"><p>${T('ເປີດລິ້ງບັດທີ່ຮ້ານສົ່ງໃຫ້ທ່ານທາງ WhatsApp.', 'Open the card link the café sent you on WhatsApp.')}</p><p><a class="btn" href="/visit">${T('ຕິດຕໍ່ຮ້ານ', 'Contact the café')}</a></p></div>`; return; }
    const fmtD = (s) => { if (!s) return '—'; try { return new Intl.DateTimeFormat(L === 'en' ? 'en-GB' : 'lo-LA', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(s + 'T00:00:00Z')); } catch (e) { return s; } };
    const today = new Date().toISOString().slice(0, 10);
    const rem = Math.max(0, (d.tot || 0) - (d.used || 0));
    const expired = d.exp && today > d.exp;
    const st = expired ? T('ໝົດອາຍຸ', 'Expired') : d.st === 'pending' ? T('ລໍຖ້າຢືນຢັນການຊຳລະ', 'Awaiting payment') : d.st === 'refunded' || d.st === 'cancelled' ? T('ປິດແລ້ວ', 'Closed') : rem <= 0 ? T('ໃຊ້ຄົບແລ້ວ', 'All drinks used') : T('ໃຊ້ງານ', 'Active');
    const dots = Array.from({ length: Math.min(d.tot || 0, 24) }, (_, i) => `<i class="${i < d.used ? 'u' : ''}"></i>`).join('');
    const asOf = (() => { try { return new Intl.DateTimeFormat(L === 'en' ? 'en-GB' : 'lo-LA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Vientiane' }).format(new Date(d.at)); } catch (e) { return ''; } })();
    box.innerHTML = `<div class="mc-card"><div class="mc-top"><img src="/assets/img/logo.webp" alt="Maison Matcha" class="mc-logo"><div class="mc-club">MATCHA CLUB<small>ສະມາຊິກມັດສະ</small></div></div>
      ${d.fn ? `<div class="mc-name">${esc(d.fn)}</div>` : ''}<div class="mc-no num">${esc(d.no)}</div>
      <div class="mc-body"><div><div class="mc-pkg">${esc(d.pkg)} <span class="mc-st">${st}</span></div><div class="mc-dots">${dots}</div>
      <div class="mc-stats num"><div><b>${d.tot}</b><span>${T('ທັງໝົດ', 'Included')}</span></div><div><b>${d.used}</b><span>${T('ແລກແລ້ວ', 'Redeemed')}</span></div><div><b>${rem}</b><span>${T('ເຫຼືອ', 'Remaining')}</span></div></div>
      <div class="mc-exp">${T('ໃຊ້ໄດ້ເຖິງ', 'Valid until')} <b>${fmtD(d.exp)}</b></div></div><div class="mc-qr">${qr(d.q)}</div></div>
      <div class="mc-foot">FROM KYOTO TO LUANG PRABANG</div></div>
      <p class="muted small" style="text-align:center;margin-top:14px">${T('ສະແດງ QR ນີ້ທີ່ເຄົາເຕີເພື່ອແລກເຄື່ອງດື່ມ.', 'Show this QR at the counter to redeem a drink.')}<br>${T('ຍອດ ຮອດ', 'Balance as of')} ${esc(asOf)} — ${T('ຮ້ານຈະສົ່ງລິ້ງໃໝ່ໃຫ້ຫຼັງແລກແຕ່ລະຄັ້ງ.', 'the café sends a fresh link after each visit.')}</p>
      ${d.h && d.h.length ? `<div class="info-card" style="max-width:420px;margin:18px auto 0"><h2>${T('ປະຫວັດການແລກ', 'Redemption history')}</h2><table class="hours">${d.h.map((x) => `<tr><td>${fmtD(x[0])}</td><td>${esc(T(...(DR[x[1]] || [x[1], x[1]])))}${x[3] ? T(' · ນົມໂອ໊ດ', ' · oat milk') : ''}</td><td class="num">× ${x[2]}</td></tr>`).join('')}</table></div>` : ''}
      <p class="muted small" style="text-align:center;margin-top:16px">${T('ເຄື່ອງດື່ມທີ່ບໍ່ໄດ້ໃຊ້ບໍ່ຍົກໄປເດືອນໜ້າ. ການຕໍ່ອາຍຸບໍ່ຕັດເງິນອັດຕະໂນມັດ.', 'Unused drinks do not carry over. Nothing renews or charges automatically.')}</p>`;
  }
  document.addEventListener('mm:lang', render); render();
})();
