// Member's own card: live balance and history for this card only (the private link is the key).
import { esc, qrInto } from './club-common.js';
const DR = { latte: ['ມັດຊະລາເຕ້', 'Matcha Latte'], coconut: ['ມັດຊະນ້ຳໝາກພ້າວ', 'Coconut Matcha'], clear: ['ມັດຊະໃສ', 'Clear Matcha'], velvet: ['ໂຄໂຄນັດ ເວວເວັດ', 'Coconut Velvet'] };
const ST = { active: ['ໃຊ້ງານ', 'Active'], pending: ['ລໍຖ້າຢືນຢັນການຊຳລະ', 'Awaiting payment'], scheduled: ['ລໍຖ້າເລີ່ມ', 'Starts soon'], expired: ['ໝົດອາຍຸ', 'Expired'], used: ['ໃຊ້ຄົບແລ້ວ', 'All drinks used'], refunded: ['ປິດແລ້ວ', 'Closed'], cancelled: ['ປິດແລ້ວ', 'Closed'] };
const dLo = (d) => { if (!d) return '—'; const [y, m, x] = d.split('-'); return `${x}/${m}/${y}`; };
const token = location.pathname.split('/').filter(Boolean).pop() || '';
async function load() {
  const box = document.getElementById('card'); let d;
  try { const r = await fetch(`/api/club/public/card/${encodeURIComponent(token)}`, { cache: 'no-store' }); if (!r.ok) throw new Error(); d = await r.json(); }
  catch { box.innerHTML = '<div class="alert warn" style="text-align:center">ບໍ່ພົບບັດນີ້ — ກະລຸນາຕິດຕໍ່ຮ້ານ<br><span class="en">Card not found — please contact the café.</span></div>'; return; }
  const m = d.membership; const dots = m ? Array.from({ length: Math.min(m.total, 24) }, (_, i) => `<i class="${i < m.used ? 'u' : ''}"></i>`).join('') : '';
  box.innerHTML = `<div class="mc-card"><div class="mc-top"><img src="/logo.webp" alt="Maison Matcha"><div class="mc-club">MATCHA CLUB<small>ສະມາຊິກມັດສະ</small></div></div>
    <div class="mc-name">${esc(d.first_name)}</div><div class="mc-no num">${esc(d.member_no)}</div>
    <div class="mc-body"><div>${m ? `<div class="mc-pkg">${esc(m.pkg_name)} <span class="mc-st">${ST[m.status][0]} · <span class="en">${ST[m.status][1]}</span></span></div><div class="mc-dots">${dots}</div>
      <div class="mc-stats num"><div><b>${m.total}</b><span>ທັງໝົດ<br>Included</span></div><div><b>${m.used}</b><span>ແລກແລ້ວ<br>Redeemed</span></div><div><b>${m.rem}</b><span>ເຫຼືອ<br>Remaining</span></div></div>
      <div class="mc-exp">ໃຊ້ໄດ້ເຖິງ · Valid until <b class="num">${dLo(m.expires_on)}</b></div>` : '<div class="mc-pkg">—</div>'}</div><div class="mc-qr" id="qr"></div></div>
    <div class="mc-foot">FROM KYOTO TO LUANG PRABANG</div></div>
    <p class="small muted" style="text-align:center;margin-top:14px">ສະແດງ QR ນີ້ທີ່ເຄົາເຕີເພື່ອແລກເຄື່ອງດື່ມ<br><span class="en">Show this QR at the counter to redeem a drink.</span></p>
    ${d.history.length ? `<div class="panel" style="margin-top:16px"><h2>ປະຫວັດການແລກ <span class="en small muted">· History</span></h2><table class="simple">${d.history.map((h) => `<tr><td class="num small">${dLo(h.date)}</td><td>${esc(DR[h.drink][0])}${h.milk === 'oat' ? ' · ນົມໂອ໊ດ' : ''}<div class="tiny muted en">${esc(DR[h.drink][1])}${h.milk === 'oat' ? ' · oat milk' : ''}</div></td><td class="r num">× ${h.qty}</td></tr>`).join('')}</table></div>` : ''}
    <p class="tiny muted" style="text-align:center;margin-top:16px">ຈອກທີ່ບໍ່ໄດ້ໃຊ້ບໍ່ຍົກໄປ · ບໍ່ມີການຕັດເງິນ ຫຼື ຕໍ່ອາຍຸອັດຕະໂນມັດ<br><span class="en">Unused drinks do not carry over. Nothing renews or charges automatically.</span></p>`;
  qrInto(document.getElementById('qr'), d.card_url);
}
load();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
