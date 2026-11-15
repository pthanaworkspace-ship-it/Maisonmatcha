// Member's own card (the private link is the key). Opening the card is purely visual: it never redeems or changes anything.
import { esc, qrInto } from './club-common.js';

const DR = { latte: ['ມັດຊະລາເຕ້', 'Matcha Latte'], coconut: ['ມັດຊະນ້ຳໝາກພ້າວ', 'Coconut Matcha'], clear: ['ມັດຊະໃສ', 'Clear Matcha'], velvet: ['ໂຄໂຄນັດ ເວວເວັດ', 'Coconut Velvet'] };
const ST = {
  active: ['ໃຊ້ງານ', 'Active', 'ok'], scheduled: ['ລໍຖ້າເລີ່ມ', 'Starts soon', 'warn'], pending: ['ລໍຖ້າຢືນຢັນການຊຳລະ', 'Awaiting payment', 'warn'],
  used: ['ໃຊ້ຄົບແລ້ວ', 'All drinks used', 'off'], expired: ['ໝົດອາຍຸ', 'Expired', 'off'], refunded: ['ປິດແລ້ວ', 'Closed', 'off'], cancelled: ['ປິດແລ້ວ', 'Closed', 'off'],
};
const dLo = (d) => { if (!d) return '—'; const [y, m, x] = String(d).split('-'); return `${x}/${m}/${y}`; };
const token = location.pathname.split('/').filter(Boolean).pop() || '';
const $ = (s, r = document) => r.querySelector(s);
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const kc = $('#kc'); const pocket = $('.kc-pocket', kc); const holder = $('.kc-holder', kc); const space = $('#kcSpace'); const btn = $('#kcBtn'); const main = $('.mp');
let card = null; let details = null; let open = false; let lift = 0; let busy = 0;
const BTN_OPEN = 'ເບິ່ງບັດສະມາຊິກ <span class="en">View member card</span>';
const BTN_CLOSE = 'ເກັບບັດ <span class="en">Put card away</span>';

// ───────── content
function detailsHtml(d) {
  const m = d.membership;
  const head = `<div class="kc-rule"></div><div class="kc-name${String(d.first_name || '').length > 14 ? ' long' : ''}">${esc(d.first_name || '—')}</div><div class="kc-id">${esc(d.member_no || '')}</div>`;
  if (!m) return `${head}<div class="kc-note">ຍັງບໍ່ມີແພັກເກດທີ່ໃຊ້ງານ — ສອບຖາມໄດ້ທີ່ເຄົາເຕີ.<br><span class="en">No membership yet — ask at the counter.</span></div>${qrHtml()}`;
  const st = ST[m.status] || ['—', '—', 'off'];
  const total = Math.max(0, Number(m.total) || 0); const used = Math.min(total, Math.max(0, Number(m.used) || 0));
  const shown = Math.min(total, 40); const cols = shown <= 10 ? Math.max(shown, 1) : Math.ceil(shown / Math.ceil(shown / 10));
  const dots = Array.from({ length: shown }, (_, i) => `<li class="kc-dot${i < used ? ' used' : ''}"></li>`).join('');
  const note = {
    expired: 'ບັດນີ້ໝົດອາຍຸແລ້ວ — ຕໍ່ອາຍຸໄດ້ທີ່ເຄົາເຕີ.<br><span class="en">This membership has expired — renew at the counter.</span>',
    pending: 'ລໍຖ້າຮ້ານຢືນຢັນການຊຳລະ — ແລກໄດ້ເມື່ອຢືນຢັນແລ້ວ.<br><span class="en">Waiting for the café to confirm payment.</span>',
    scheduled: `ເລີ່ມໃຊ້ໄດ້ວັນທີ ${dLo(m.activated_on)}.<br><span class="en">Starts on ${dLo(m.activated_on)}.</span>`,
    used: 'ແລກຄົບທຸກຈອກແລ້ວ — ຕໍ່ອາຍຸໄດ້ທີ່ເຄົາເຕີ.<br><span class="en">All drinks used — renew at the counter.</span>',
    refunded: 'ບັດນີ້ປິດແລ້ວ.<br><span class="en">This membership is closed.</span>', cancelled: 'ບັດນີ້ປິດແລ້ວ.<br><span class="en">This membership is closed.</span>',
  }[m.status];
  return `${head}
    <div class="kc-plan"><span class="kc-plan-name">${esc(m.pkg_name || '')}</span><span class="kc-pill ${st[2]}">${esc(st[0])} · <span class="en">${esc(st[1])}</span></span></div>
    <ul class="kc-dots" style="--cols:${cols}" role="img" aria-label="${used} of ${total} drinks redeemed, ${total - used} remaining">${dots}</ul>
    <div class="kc-legend" aria-hidden="true"><span><i class="f"></i>ແລກແລ້ວ · Redeemed</span><span><i></i>ເຫຼືອ · Remaining</span></div>
    <div class="kc-stats">
      <div><b>${total}</b><span>ທັງໝົດ</span><small>Total</small></div>
      <div><b>${used}</b><span>ແລກແລ້ວ</span><small>Redeemed</small></div>
      <div><b>${Math.max(0, Number(m.rem) || 0)}</b><span>ເຫຼືອ</span><small>Remaining</small></div>
    </div>
    <div class="kc-dates"><div>ເລີ່ມ <small>· Activated</small><b>${dLo(m.activated_on)}</b></div><div>ໃຊ້ໄດ້ເຖິງ <small>· Valid until</small><b>${dLo(m.expires_on)}</b></div></div>
    ${note ? `<div class="kc-note">${note}</div>` : ''}
    ${qrHtml()}`;
}
const qrHtml = () => '<div class="kc-qr" id="kcQr" role="img" aria-label="Member QR code"></div><div class="kc-qr-cap">ສະແດງ QR ນີ້ທີ່ເຄົາເຕີເພື່ອແລກເຄື່ອງດື່ມ<br><span class="en">Show this QR at the counter to redeem.</span></div>';

function extraHtml(d) {
  const h = d.history || [];
  return `${h.length ? `<section class="mp-panel"><h2>ປະຫວັດການແລກ <span class="en" style="font-weight:400;color:var(--muted);font-size:.85rem">· History</span></h2><table class="mp-hist">${h.map((x) => `<tr><td>${dLo(x.date)}</td><td>${esc((DR[x.drink] || [x.drink])[0])}${x.milk === 'oat' ? ' · ນົມໂອ໊ດ' : ''}<div class="s en">${esc((DR[x.drink] || ['', x.drink])[1])}${x.milk === 'oat' ? ' · oat milk' : ''}</div></td><td class="r">× ${Number(x.qty) || 0}</td></tr>`).join('')}</table></section>` : ''}
    <p class="mp-fine">ຈອກທີ່ບໍ່ໄດ້ໃຊ້ບໍ່ຍົກໄປ · ບໍ່ມີການຕັດເງິນ ຫຼື ຕໍ່ອາຍຸອັດຕະໂນມັດ<br><span class="en">Unused drinks do not carry over. Nothing renews or charges automatically.</span></p>`;
}

function build(d) {
  if (!card) {
    card = document.createElement('article');
    card.className = 'kc-card'; card.id = 'kcCard'; card.tabIndex = -1;
    card.innerHTML = `<div class="kc-peek"><img class="kc-logo" src="/logo.webp" alt="Maison Matcha"><div class="kc-peek-r"><b>MEMBER CARD</b><span>ບັດສະມາຊິກ</span></div></div>
      <button class="kc-close" type="button" aria-label="ເກັບບັດ · Put card away">×</button><div class="kc-body" id="kcDetails"></div>`;
    pocket.insertBefore(card, holder);
    details = $('#kcDetails', card);
    card.addEventListener('click', (e) => { if (!open && !e.target.closest('button')) toggle(true); });
    $('.kc-close', card).addEventListener('click', () => toggle(false));
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(card);
  }
  details.innerHTML = detailsHtml(d);
  details.inert = !open; details.setAttribute('aria-hidden', String(!open));
  card.setAttribute('aria-label', `Matcha Club · ${d.first_name || ''} · ${d.member_no || ''}`);
  kc.classList.toggle('is-expired', !!(d.membership && ['expired', 'refunded', 'cancelled'].includes(d.membership.status)));
  qrInto($('#kcQr', card), d.card_url);
  $('#extra').innerHTML = extraHtml(d);
  measure();
}

// ───────── geometry: the card is clipped at the holder's bottom edge, so the holder can be shorter than the card
function measure() {
  if (!card) return;
  const peek = parseFloat(getComputedStyle(kc).getPropertyValue('--peek')) || 108;
  const tuck = parseFloat(getComputedStyle(kc).getPropertyValue('--tuck')) || 22;
  const ch = card.offsetHeight; const hh = holder.offsetHeight;
  card.style.setProperty('--clipb', `${Math.max(0, ch - peek - hh + 26)}px`); // hide the card behind the holder's rounded bottom corners too
  lift = Math.max(0, Math.round(ch - peek - tuck));
  kc.style.setProperty('--lift', `${lift}px`);
  if (open && !busy) { space.style.height = `${lift}px`; main.style.minHeight = `calc(100vh + ${lift}px)`; }
}

// ───────── open / close (the holder never moves on screen)
function after(fn) {
  const t = ++busy;
  if (reduce()) { fn(); busy = 0; return; }
  let done = false;
  const finish = () => { if (done || t !== busy) return; done = true; card.removeEventListener('transitionend', onEnd); fn(); busy = 0; };
  const onEnd = (e) => { if (e.target === card && e.propertyName === 'transform') finish(); };
  card.addEventListener('transitionend', onEnd);
  setTimeout(finish, 1000);
}
function toggle(want) {
  if (!card || want === open) return;
  measure(); open = want;
  btn.innerHTML = open ? BTN_CLOSE : BTN_OPEN; btn.setAttribute('aria-expanded', String(open));
  details.inert = !open; details.setAttribute('aria-hidden', String(!open));
  if (open) {
    // make room above, scrolled so the holder stays exactly where it is, then slide the card up
    const before = holder.getBoundingClientRect().top;
    main.style.minHeight = `calc(100vh + ${lift}px)`;
    space.style.height = `${lift}px`;
    window.scrollTo(0, window.scrollY + holder.getBoundingClientRect().top - before);
    void card.offsetHeight;
    kc.classList.add('is-open');
    after(() => {
      const top = card.getBoundingClientRect().top;
      if (top < 12) window.scrollBy({ top: top - 12, behavior: reduce() ? 'auto' : 'smooth' });
      card.focus({ preventScroll: true });
    });
  } else {
    kc.classList.remove('is-open');
    after(() => {
      const before = holder.getBoundingClientRect().top;
      space.style.height = '0px'; main.style.minHeight = '';
      window.scrollTo(0, window.scrollY + holder.getBoundingClientRect().top - before);
    });
    btn.focus({ preventScroll: true });
  }
}
btn.addEventListener('click', () => toggle(!open));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) toggle(false); });
window.addEventListener('resize', measure);

// ───────── data (refreshes when the member comes back to the page; open state is kept)
async function load() {
  let d;
  try {
    if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) throw new Error('bad');
    const r = await fetch(`/api/club/public/card/${encodeURIComponent(token)}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status)); d = await r.json();
  } catch (e) {
    if (card) return; // keep showing the last good card if a refresh fails
    kc.classList.remove('is-loading'); $('.kc-skel', kc)?.remove();
    btn.hidden = true;
    $('#extra').innerHTML = `<div class="kc-msg">${e.message === 'bad' || e.message === '404' ? 'ບໍ່ພົບບັດນີ້ — ກະລຸນາກວດລິ້ງ ຫຼື ຕິດຕໍ່ຮ້ານ<br><span class="en">Card not found — check the link or contact the café.</span>' : 'ໂຫຼດບັດບໍ່ໄດ້ — ກວດອິນເຕີເນັດແລ້ວລອງໃໝ່<br><span class="en">Couldn’t load your card — check your connection and try again.</span><br><button class="kc-btn" type="button" id="retry" style="margin-top:12px">ລອງໃໝ່ <span class="en">Retry</span></button>'}</div>`;
    $('#retry')?.addEventListener('click', () => location.reload());
    return;
  }
  kc.classList.remove('is-loading'); $('.kc-skel', kc)?.remove();
  build(d);
  btn.disabled = false; btn.hidden = false; if (!open) btn.innerHTML = BTN_OPEN;
}
load();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
