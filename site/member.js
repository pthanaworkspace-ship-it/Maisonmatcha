// Maison Matcha Club — the member's own card. Opened through its private link (/m/<token>); this phone remembers the link
// so /club/card opens it again. Live data from the server every time. Opening the card never adds stamps or redeems anything:
// staff do that after scanning the QR (the QR identifies the member to staff only; it is not the card link).
import { esc, qrInto, loadScript } from './club-common.js';

const KEY = 'mm-card-token';
const saved = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
const save = (t) => { try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* private mode: the link still works */ } };
const fromPath = (location.pathname.match(/^\/m\/([A-Za-z0-9_-]{20,80})\/?$/) || [])[1] || '';
const TOKEN = fromPath || saved();
const LINK = TOKEN ? `${location.origin}/m/${TOKEN}` : '';
const WELCOME = new URLSearchParams(location.search).has('welcome');
const dLo = (d) => { if (!d) return '—'; const x = new Date(new Date(d).getTime() + 7 * 3600e3); const p = (n) => String(n).padStart(2, '0'); return `${p(x.getUTCDate())}/${p(x.getUTCMonth() + 1)}/${x.getUTCFullYear()}`; };
const $ = (s, r = document) => r.querySelector(s);
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// server messages are "Lao · English"
const both = (m) => { const p = String(m || '').split(' · '); return p.length === 2 ? `${esc(p[0])}<br><span class="en">${esc(p[1])}</span>` : esc(m); };

const kc = $('#kc'); const holder = $('.kc-holder', kc); const pocket = $('.kc-pocket', kc); const space = $('#kcSpace'); const btn = $('#kcBtn'); const main = $('.mp');
let card = null; let details = null; let open = false; let lift = 0; let busy = 0; let last = null;
const BTN_OPEN = 'ເບິ່ງບັດສະມາຊິກ <span class="en">View member card</span>';
const BTN_CLOSE = 'ເກັບບັດ <span class="en">Put card away</span>';

async function fetchCard() {
  let r; try { r = await fetch(`/api/club/member/card/${encodeURIComponent(TOKEN)}`, { cache: 'no-store' }); }
  catch { throw Object.assign(new Error('ເຊື່ອມຕໍ່ບໍ່ໄດ້ — ກວດອິນເຕີເນັດແລ້ວລອງໃໝ່ · No connection — check your internet and try again'), { net: true }); }
  const d = await r.json().catch(() => ({}));
  if (r.status === 404) { if (saved() === TOKEN) save(''); throw Object.assign(new Error(d.error || 'ບໍ່ພົບບັດ · Card not found'), { gone: true }); }
  if (!r.ok) throw new Error(d.error || 'ເກີດຂໍ້ຜິດພາດ · Something went wrong');
  return d.card;
}

// ───────── content
function detailsHtml(c) {
  const per = c.per || 10; const n = Math.min(per, Math.max(0, c.stamps));
  const dots = Array.from({ length: per }, (_, i) => `<li class="kc-dot${i < n ? ' on' : ''}"></li>`).join('');
  const reward = c.available > 0 ? `<div class="kc-reward" role="status">
      <div class="kc-reward-t">YOU’VE EARNED A FREE MATCHA!</div><div class="kc-reward-lo">ທ່ານໄດ້ຮັບມັດຊະຟຣີ!${c.available > 1 ? ` × ${c.available}` : ''}</div>
      <button class="kc-reward-b" type="button" id="kcRedeem">ແລກທີ່ Maison Matcha · <span class="en">Redeem at Maison Matcha</span></button>
      <div class="kc-reward-n" id="kcRedeemNote" hidden>ສະແດງ QR ນີ້ໃຫ້ພະນັກງານ — ພະນັກງານຈະແລກໃຫ້ທ່ານ.<br><span class="en">Show this QR to our staff — they will redeem it for you.</span></div></div>` : '';
  const left = c.available > 0 && n === 0 ? '' : `<div class="kc-next">${c.to_next} MORE ${c.to_next === 1 ? 'CUP' : 'CUPS'} TO YOUR FREE MATCHA<span>ອີກ ${c.to_next} ຈອກ ຮັບມັດຊະຟຣີ 1 ຈອກ</span></div>`;
  const st = `<div class="kc-st">Member since</div><div class="kc-st-d">${dLo(c.joined)}</div><div class="kc-st-lo">ເປັນສະມາຊິກຕັ້ງແຕ່</div>`;
  return `<div class="kc-rule"></div>
    <div class="kc-lbl">MEMBER NAME · ຊື່ສະມາຊິກ</div><div class="kc-name${String(c.name || '').length > 22 ? ' long' : ''}">${esc(c.name)}</div>
    <div class="kc-lbl">MEMBER ID · ລະຫັດສະມາຊິກ</div><div class="kc-id">${esc(c.member_no)}</div>
    <div class="kc-rule"></div>
    <div class="kc-plan">YOUR MATCHA STAMPS <span>ສະແຕັມມັດຊະຂອງທ່ານ</span></div>
    <ul class="kc-dots" role="img" aria-label="${n} of ${per} stamps">${dots}</ul>
    <div class="kc-count"><b>${n} / ${per}</b> STAMPS <span>ສະແຕັມ</span></div>
    ${left}${reward}
    ${c.owed ? `<div class="kc-note">${c.owed} stamp(s) to make up after a refund · ຕ້ອງສະສົມຄືນ ${c.owed} ສະແຕັມ ຫຼັງການຄືນເງິນ</div>` : ''}
    <div class="kc-rule"></div>
    <div class="kc-stats">
      <div><b>${c.available}</b><small>Available free drinks</small><span>ເຄື່ອງດື່ມຟຣີທີ່ແລກໄດ້</span></div>
      <div><b>${c.purchased}</b><small>Total drinks purchased</small><span>ເຄື່ອງດື່ມທີ່ຊື້ທັງໝົດ</span></div>
      <div><b>${c.redeemed}</b><small>Total rewards redeemed</small><span>ແລກຂອງລາງວັນແລ້ວ</span></div>
    </div>
    <div class="kc-rule"></div>
    <div class="kc-foot"><div>${st}</div><span class="kc-dia" aria-hidden="true"></span>
      <div class="kc-qrw"><div class="kc-qr" id="kcQr" role="img" aria-label="Member QR code"></div></div></div>
    <div class="kc-qr-cap">ສະແດງ QR ນີ້ທີ່ເຄົາເຕີ ເພື່ອສະສົມສະແຕັມ ຫຼື ແລກມັດຊະຟຣີ<br><span class="en">Show this QR at the counter to collect stamps or redeem a free matcha.</span></div>
    <button class="kc-close" type="button">ເກັບບັດ · <span class="en">Put card away</span></button>`;
}
const KIND = { earn: ['+', 'ສະແຕັມ', 'stamps'], refund: ['−', 'ຄືນເງິນ', 'refund'], adjust: ['±', 'ປັບໂດຍຮ້ານ', 'adjusted by the café'], reward: ['★', 'ໄດ້ຮັບມັດຊະຟຣີ', 'free matcha earned'], redeemed: ['☕', 'ແລກມັດຊະຟຣີ', 'free matcha redeemed'] };
function extraHtml(c) {
  const h = c.history || [];
  return `${h.length ? `<section class="mp-panel"><h2>ປະຫວັດ <span class="en" style="font-weight:400;color:var(--muted);font-size:.85rem">· History</span></h2><table class="mp-hist">${h.map((x) => {
    const k = KIND[x.kind] || ['', x.kind, x.kind]; const q = x.kind === 'reward' || x.kind === 'redeemed' ? '' : `${x.qty > 0 ? '+' : ''}${x.qty}`;
    return `<tr><td>${dLo(x.at)}</td><td>${esc(k[1])}${x.drink ? ` · ${esc(x.drink.lo)}` : ''}<div class="s en">${esc(k[2])}${x.drink ? ` · ${esc(x.drink.en)}` : ''}</div></td><td class="r">${esc(q || k[0])}</td></tr>`;
  }).join('')}</table></section>` : ''}
    <div class="mp-links"><button type="button" class="kc-link" id="forgetBtn">ລຶບບັດອອກຈາກໂທລະສັບນີ້ · <span class="en">Remove card from this phone</span></button></div>
    <p class="mp-fine">ສະມັກຟຣີ · ເຄື່ອງດື່ມຟຣີບໍ່ໄດ້ຮັບສະແຕັມ · ສະແຕັມ ແລະ ຂອງລາງວັນບໍ່ມີວັນໝົດອາຍຸ<br><span class="en">Free membership · Free drinks don’t earn stamps · Stamps and rewards don’t expire</span></p>`;
}

function build(c) {
  if (!card) {
    card = document.createElement('article');
    card.className = 'kc-card'; card.id = 'kcCard'; card.tabIndex = -1;
    card.innerHTML = `<div class="kc-peek" aria-hidden="true"><img src="/logo.webp" alt=""><div class="kc-peek-t">MEMBER CARD</div></div>
      <div class="kc-face"><header class="kc-fh"><img src="/logo.webp" alt="Maison Matcha"><span class="kc-dia" aria-hidden="true"></span><div class="kc-fh-r"><b>MAISON MATCHA CLUB</b><span>ສະມາຊິກ Maison Matcha</span></div></header>
      <div id="kcDetails"></div></div>`;
    pocket.insertBefore(card, holder);
    details = $('#kcDetails', card);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.kc-close')) { toggle(false); return; }
      if (e.target.closest('#kcRedeem')) { const n = $('#kcRedeemNote', card); n.hidden = false; $('#kcQr', card).classList.add('pulse'); $('#kcQr', card).scrollIntoView({ block: 'center', behavior: reduce() ? 'auto' : 'smooth' }); return; }
      if (!open && !e.target.closest('button')) toggle(true);
    });
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(card);
  }
  details.innerHTML = detailsHtml(c);
  details.inert = !open; details.setAttribute('aria-hidden', String(!open));
  card.setAttribute('aria-label', `Maison Matcha Club · ${c.name} · ${c.member_no}`);
  kc.classList.toggle('is-reward', c.available > 0);
  qrInto($('#kcQr', card), c.qr);
  $('#extra').innerHTML = extraHtml(c); wireExtra();
  measure();
}
function wireExtra() {
  $('#forgetBtn').addEventListener('click', () => {
    if (!confirm('ລຶບບັດອອກຈາກໂທລະສັບນີ້? ທ່ານຍັງເປີດໄດ້ດ້ວຍລິ້ງບັດ.\nRemove the card from this phone? You can still open it with your card link.')) return;
    save(''); location.href = '/club';
  });
}

// ───────── save the card: image (QR for the counter), link, Home Screen
function saveHtml() {
  return `<section class="mp-panel mp-save" id="saveCard"><h2>ບັນທຶກບັດສະມາຊິກ <span class="en">· Save Membership Card</span></h2>
    <div class="mp-save-b">
      <button type="button" class="kc-btn" id="saveImg">ບັນທຶກເປັນຮູບ <span class="en">Save as image</span></button>
      <button type="button" class="kc-btn ghost" id="copyLink">ສຳເນົາລິ້ງບັດ <span class="en">Copy card link</span></button>
      ${navigator.share ? '<button type="button" class="kc-btn ghost" id="shareLink">ແບ່ງປັນລິ້ງ <span class="en">Share link</span></button>' : ''}
    </div>
    <input class="mp-linkbox" id="linkBox" readonly value="${esc(LINK)}" aria-label="Card link">
    <p class="mp-note" id="saveMsg" role="status"></p>
    <details class="mp-home"><summary>ເພີ່ມໃສ່ໜ້າຈໍຫຼັກ <span class="en">· Add to Home Screen</span></summary>
      <p><b>iPhone (Safari):</b> ແຕະ Share → <b>Add to Home Screen</b> → Add.<br><span class="en">Tap Share → Add to Home Screen → Add.</span></p>
      <p><b>Android (Chrome):</b> ແຕະ ⋮ → <b>Add to Home screen</b> → Add.<br><span class="en">Tap ⋮ → Add to Home screen → Add.</span></p>
      <p class="tiny">ເຮັດໃນໜ້ານີ້ ເພື່ອໃຫ້ໄອຄອນເປີດບັດຂອງທ່ານໂດຍກົງ. <span class="en">Do this on this page so the icon opens your card.</span></p></details>
    <p class="tiny">ຮູບບັດໃຊ້ສະແດງ QR ທີ່ເຄົາເຕີ — ຈຳນວນສະແຕັມທີ່ຖືກຕ້ອງເບິ່ງໄດ້ໃນລິ້ງບັດສະເໝີ. ຢ່າແບ່ງປັນລິ້ງໃຫ້ຄົນອື່ນ.<br><span class="en">The image is for showing your QR at the counter — your live stamp count is always on your card link. Keep the link to yourself.</span></p></section>`;
}
function say(t) { const m = $('#saveMsg'); if (m) m.innerHTML = t; }
function wireSave() {
  $('#copyLink').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(LINK); say('ສຳເນົາແລ້ວ · <span class="en">Link copied</span>'); }
    catch { const b = $('#linkBox'); b.focus(); b.select(); say('ກົດຄ້າງເພື່ອສຳເນົາ · <span class="en">Press and hold to copy</span>'); }
  });
  $('#shareLink')?.addEventListener('click', async () => { try { await navigator.share({ title: 'Maison Matcha Club', url: LINK }); } catch { /* cancelled */ } });
  $('#saveImg').addEventListener('click', async (e) => {
    const b = e.currentTarget; if (b.disabled || !last) return; b.disabled = true;
    try {
      const blob = await cardImage(last); const file = new File([blob], `MaisonMatchaClub-${last.member_no}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Maison Matcha Club' }); } catch { /* cancelled */ } }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }
      say('ຮູບບັດພ້ອມແລ້ວ · <span class="en">Card image ready — keep it in your photos</span>');
    } catch { say('ບັນທຶກຮູບບໍ່ໄດ້ — ລອງຖ່າຍໜ້າຈໍແທນ · <span class="en">Couldn’t create the image — take a screenshot instead</span>'); } finally { b.disabled = false; }
  });
}
// The saved image shows who the member is and the QR. No stamp count: that is only ever read live from the café's system.
async function cardImage(c) {
  await loadScript('/qrcode.js');
  const W = 1080; const H = 1500; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const font = (w, s, f = 'Cormorant Garamond, Georgia, serif') => `${w} ${s}px ${f}`;
  g.fillStyle = '#1F5A36'; g.fillRect(0, 0, W, H);
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.fillStyle = '#F7F2E6'; rr(60, 60, W - 120, H - 120, 48); g.fill();
  const logo = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = '/logo.webp'; });
  if (logo) { const h = 150; g.drawImage(logo, 120, 120, h * logo.width / logo.height, h); }
  g.fillStyle = '#1E4F31'; g.textAlign = 'right'; g.font = font('600', 40); g.fillText('MAISON MATCHA CLUB', W - 120, 190);
  g.font = font('500', 32, 'Noto Sans Lao, sans-serif'); g.fillText('ສະມາຊິກ Maison Matcha', W - 120, 240);
  g.fillRect(120, 320, W - 240, 2);
  g.textAlign = 'left'; g.font = font('600', 30); g.globalAlpha = 0.75; g.fillText('MEMBER NAME', 120, 385); g.globalAlpha = 1;
  g.font = font('600', c.name.length > 22 ? 56 : 72); g.fillText(c.name.toUpperCase().slice(0, 34), 120, 465);
  g.font = font('600', 30); g.globalAlpha = 0.75; g.fillText('MEMBER ID', 120, 535); g.globalAlpha = 1;
  g.font = font('500', 54); g.fillText(c.member_no.split('').join(' '), 120, 600);
  g.fillRect(120, 650, W - 240, 2);
  const q = window.qrcode(0, 'M'); q.addData(c.qr); q.make(); const k = q.getModuleCount(); const cell = Math.floor(560 / (k + 4)); const qs = cell * (k + 4); const qx = Math.round((W - qs) / 2); const qy = 700;
  g.fillStyle = '#FFFFFF'; g.fillRect(qx, qy, qs, qs); g.fillStyle = '#123A22';
  for (let r = 0; r < k; r++) for (let col = 0; col < k; col++) if (q.isDark(r, col)) g.fillRect(qx + (col + 2) * cell, qy + (r + 2) * cell, cell, cell);
  g.textAlign = 'center'; g.fillStyle = '#1E4F31'; g.font = font('500', 34, 'Noto Sans Lao, sans-serif'); g.fillText('ສະແດງ QR ນີ້ທີ່ເຄົາເຕີ', W / 2, qy + qs + 70);
  g.font = font('500', 30, 'Solway, Georgia, serif'); g.fillText('Show this QR at the counter', W / 2, qy + qs + 115);
  g.font = font('600', 28); g.globalAlpha = 0.8; g.fillText('BUY 10 DRINKS, GET 1 FREE · LIVE STAMPS ON YOUR CARD LINK', W / 2, H - 120); g.globalAlpha = 1;
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png'));
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
function welcome(c) {
  const w = document.createElement('section'); w.className = 'mp-welcome'; w.setAttribute('role', 'status');
  w.innerHTML = `<div class="mp-welcome-t">Welcome to Maison Matcha Club!</div><div class="mp-welcome-lo">ຍິນດີຕ້ອນຮັບສູ່ Maison Matcha Club</div>
    <div class="mp-welcome-s">Your Matcha Journey Starts Here.</div><div class="mp-welcome-c"><b>${c.stamps} / ${c.per}</b> STAMPS</div>
    <div class="mp-welcome-r">Buy 10 Drinks, Get 1 Free <span>ຊື້ຄົບ 10 ຈອກ ຮັບຟຣີ 1 ຈອກ</span></div>
    <a class="kc-btn" href="#saveCard">ບັນທຶກບັດສະມາຊິກ <span class="en">Save Membership Card</span></a>`;
  $('.mp-head').after(w);
  history.replaceState(null, '', location.pathname);
}
function missing(text) {
  kc.classList.remove('is-loading'); $('.kc-skel', kc)?.remove(); btn.hidden = true;
  $('#extra').innerHTML = `<div class="kc-msg">${text}<div class="mp-links"><a class="kc-btn" href="/club#register">ລົງທະບຽນ <span class="en">Register</span></a><a class="kc-btn ghost" href="/club#login">ເປີດບັດເກົ່າ <span class="en">Returning member</span></a></div></div>`;
}
async function load() {
  if (!TOKEN) { missing('ຍັງບໍ່ມີບັດບັນທຶກໃນໂທລະສັບນີ້. ເປີດລິ້ງບັດຂອງທ່ານ ຫຼື ລົງທະບຽນຟຣີ.<br><span class="en">No card is saved on this phone. Open your card link, or register for free.</span>'); return; }
  let c;
  try { c = await fetchCard(); } catch (e) {
    if (card) return; // keep showing the last good card if a refresh fails
    if (e.gone) { missing(`${both(e.message)}<br><br>ຖ້າລິ້ງຖືກປ່ຽນ, ໃຊ້ລິ້ງໃໝ່ທີ່ຮ້ານສົ່ງໃຫ້ ຫຼື ຂໍໃຫ້ພະນັກງານຊ່ວຍ.<br><span class="en">If your link was replaced, use the new link from the café or ask our staff.</span>`); return; }
    kc.classList.remove('is-loading'); $('.kc-skel', kc)?.remove(); btn.hidden = true;
    $('#extra').innerHTML = `<div class="kc-msg">${both(e.message)}<br><button class="kc-btn" type="button" id="retry" style="margin-top:12px">ລອງໃໝ່ <span class="en">Retry</span></button></div>`;
    $('#retry')?.addEventListener('click', () => location.reload());
    return;
  }
  if (fromPath) save(fromPath); // remember this card on this phone
  last = c;
  kc.classList.remove('is-loading'); $('.kc-skel', kc)?.remove();
  const first = !card; const keep = $('#saveCard');
  build(c);
  if (keep) $('#extra').prepend(keep); else { $('#extra').insertAdjacentHTML('afterbegin', saveHtml()); wireSave(); }
  btn.disabled = false; btn.hidden = false; if (!open) btn.innerHTML = BTN_OPEN;
  if (first && WELCOME) { welcome(c); setTimeout(() => toggle(true), reduce() ? 0 : 450); }
}
load();
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && card) load(); });
