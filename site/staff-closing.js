// Daily closing form: staff count the drawer and transfers; the server checks the result against Loyverse.
import { api, $, $$, esc, money, toast, fieldError, clearErrors, initStaff, getToken } from './club-common.js';

const k = (n) => money(n, { symbol: true });
const num = (v) => Number(String(v ?? '').replace(/[^\d]/g, '')) || 0;
const fmt = (v) => { const n = num(v); return n ? n.toLocaleString('en-US') : ''; };
const laoToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, x) => { const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + x); return t.toISOString().slice(0, 10); };
const dLabel = (d) => { const [y, m, x] = d.split('-'); return `${x}/${m}/${y}`; };
const DOW = ['ອາທິດ', 'ຈັນ', 'ອັງຄານ', 'ພຸດ', 'ພະຫັດ', 'ສຸກ', 'ເສົາ'];
const dow = (d) => DOW[new Date(`${d}T00:00:00Z`).getUTCDay()];
const VERDICT = {
  ok: ['ກົງກັນ ✓', 'ເງິນທີ່ນັບກົງກັບ Loyverse'],
  types: ['ຍອດລວມກົງ · ປະເພດການຊຳລະບໍ່ກົງ', 'ຍອດລວມຖືກຕ້ອງ ແຕ່ເງິນສົດ / QR / ບັດ ບໍ່ກົງກັບທີ່ກົດໃນ POS — ກວດວ່າກົດປະເພດການຊຳລະຖືກບໍ'],
  short: ['ເງິນຂາດ', 'ນັບເງິນອີກຄັ້ງ ແລະ ກວດເງິນໂອນ, ສ່ວນຫຼຸດ ແລະ ການຄືນເງິນ — ຂຽນໝາຍເຫດຖ້າຮູ້ສາເຫດ'],
  over: ['ເງິນເກີນ', 'ກວດວ່າມີເງິນທອນທີ່ຍັງບໍ່ໄດ້ຫັກອອກ ຫຼື ບິນທີ່ບໍ່ໄດ້ກົດໃນ POS ບໍ'],
  no_pos: ['ບັນທຶກແລ້ວ', 'ຍັງບໍ່ມີຂໍ້ມູນ Loyverse ຂອງມື້ນີ້ — ຈະທຽບໃຫ້ອັດຕະໂນມັດເມື່ອຂໍ້ມູນມາ'],
  missing: ['ຍັງບໍ່ໄດ້ບັນທຶກ', ''],
};
const CHIP = { ok: 'pay-paid', types: 'pay-pending_verification', short: 'pay-unpaid', over: 'pay-pending_verification', no_pos: 'st-new', missing: 'st-completed' };
const KIND = { bill: 'ບິນ', pos: 'ສະຫຼຸບ POS', other: 'ອື່ນໆ' };

let ME = null; let DAY = new URLSearchParams(location.search).get('day') || laoToday(); let D = null; const urls = [];

async function guard(btn, fn) {
  if (btn.dataset.busy) return; btn.dataset.busy = '1'; btn.disabled = true;
  try { await fn(); } catch (e) { toast(e.message, 'err'); if (e.field) fieldError($(`[name="${e.field}"]`), e.message); } finally { delete btn.dataset.busy; btn.disabled = false; }
}
async function photoBlob(id) {
  const r = await fetch(`/api/club/closing/photos/${id}`, { headers: { 'x-club-token': getToken() }, cache: 'no-store' });
  if (!r.ok) throw new Error('photo'); return URL.createObjectURL(await r.blob());
}
function resultHtml(r) {
  if (!r) return '';
  const v = VERDICT[r.status] || VERDICT.no_pos; const amt = r.diff != null && r.status !== 'ok' && r.status !== 'types' ? ` ${r.diff > 0 ? '+' : ''}${k(r.diff)}` : '';
  const detail = ME.role === 'admin' && r.expected != null ? `<table>
      <tr><td>ຍອດຂາຍສຸດທິ Loyverse</td><td class="r">${k(r.net)}</td></tr>
      <tr><td>ຄວນໄດ້ຮັບ (ຫັກສ່ວນຫຼຸດເຈົ້າຂອງ)</td><td class="r">${k(r.expected)}</td></tr>
      <tr><td>ນັບໄດ້</td><td class="r">${k(r.received)}</td></tr>
      ${r.loyverse ? `<tr><td>ເງິນສົດ · Loyverse / ນັບ</td><td class="r">${k(r.loyverse.cash)} / ${k(r.got.cash)}</td></tr>
      <tr><td>QR · Loyverse / BCEL+LDB</td><td class="r">${k(r.loyverse.qr)} / ${k(r.got.qr)}</td></tr>
      <tr><td>ບັດ · Loyverse / ນັບ</td><td class="r">${k(r.loyverse.card)} / ${k(r.got.card)}</td></tr>` : ''}</table>` : '';
  return `<div class="cl-result ${esc(r.status)}" role="status"><h3>${esc(v[0])}${esc(amt)}</h3>${v[1] ? `<div class="small">${esc(v[1])}</div>` : ''}${detail}</div>`;
}
const field = (name, label, val, hint = '') => `<label class="field"><span>${label}${hint ? ` <span class="tiny">${hint}</span>` : ''}</span><input class="money-in" name="${name}" inputmode="numeric" autocomplete="off" placeholder="0" value="${fmt(val)}"></label>`;

async function render() {
  $('#body').innerHTML = '<div class="panel muted">ກຳລັງໂຫຼດ…</div>';
  const [d, w] = await Promise.all([api(`/closing/${DAY}`), api('/closing/recent')]); D = d;
  const c = d.closing || {}; const ro = !d.can_edit;
  const min = ME.role === 'admin' ? '' : addDays(d.today, -1);
  $('#body').innerHTML = `
    <div class="panel">
      <div class="cl-day"><label class="field"><span>ວັນທີ</span><input type="date" id="day" value="${esc(DAY)}" max="${esc(d.today)}" ${min ? `min="${esc(min)}"` : ''}></label>
        ${DAY !== d.today ? `<button class="btn ghost small" type="button" id="goToday">ມື້ນີ້</button>` : ''}</div>
      <div class="cl-state small muted">${d.closing ? `ບັນທຶກແລ້ວໂດຍ <b>${esc(c.by_name || '—')}</b>${c.updated_at ? ` · ${new Date(c.updated_at).toLocaleString('en-GB', { timeZone: 'Asia/Vientiane', dateStyle: 'short', timeStyle: 'short' })}` : ''}${c.source && c.source !== 'website' ? ' · ນຳເຂົ້າຈາກລະບົບເກົ່າ' : ''}` : `${dow(DAY)} ${dLabel(DAY)} · ຍັງບໍ່ໄດ້ບັນທຶກ`}</div>
      ${ro ? '<div class="alert warn">ພະນັກງານແກ້ໄດ້ສະເພາະມື້ນີ້ ແລະ ມື້ວານ — ຕິດຕໍ່ຜູ້ດູແລເພື່ອແກ້ມື້ອື່ນ.</div>' : ''}
      ${resultHtml(d.result)}
    </div>
    <form class="panel" id="cf" novalidate ${ro ? 'inert' : ''}>
      <h2>ເງິນທີ່ນັບໄດ້ <span class="en small muted">· Counted</span></h2>
      <div class="cl-grid">
        ${field('cash', 'ເງິນສົດໃນລິ້ນຊັກ (ທັງໝົດ)', c.cash)}
        ${field('float', 'ເງິນທອນທີ່ເກັບໄວ້ (ຫັກອອກ)', c.float)}
        ${field('bcel', 'ໂອນ BCEL', c.bcel)}
        ${field('ldb', 'ໂອນ LDB', c.ldb)}
        ${field('card', 'ບັດເຄຣດິດ', c.card)}
        ${field('other', 'ອື່ນໆ', c.other)}
        <div class="full">${field('owner_disc', 'ສ່ວນຫຼຸດເຈົ້າຂອງ / ພະນັກງານ', c.owner_disc, '(ທີ່ບໍ່ໄດ້ກົດໃນ POS)')}</div>
      </div>
      <div class="cl-sum" id="sum"></div>
      <label class="field"><span>ໝາຍເຫດ <span class="tiny">(ຄືນເງິນ, ບິນຜິດ, ເງິນບາດ…)</span></span><textarea name="note" rows="3" maxlength="600">${esc(c.note || '')}</textarea></label>
      <h2 style="margin-top:6px">ຮູບບິນ / ສະຫຼຸບ POS <span class="en small muted">· Photos</span></h2>
      <div class="cl-photos" id="photos"></div>
      <div class="cl-add">
        <label class="btn ghost small" for="phBill">📷 ຮູບບິນ</label><input type="file" id="phBill" accept="image/*" capture="environment" hidden data-kind="bill">
        <label class="btn ghost small" for="phPos">📷 ສະຫຼຸບ POS</label><input type="file" id="phPos" accept="image/*" capture="environment" hidden data-kind="pos">
      </div>
      <div class="sticky-save"><button class="btn green block" type="submit" id="save">${d.closing ? 'ບັນທຶກການແກ້ໄຂ' : 'ບັນທຶກການປິດຮ້ານ'}</button></div>
    </form>
    <div class="panel"><h2>7 ມື້ຜ່ານມາ</h2><ul class="cl-week">${w.days.map((x) => `<li><button type="button" data-day="${esc(x.day)}"><b>${dow(x.day)} ${dLabel(x.day)}</b>${x.by_name ? `<div class="who">${esc(x.by_name)}</div>` : ''}</button><span class="chip ${CHIP[x.status] || 'st-new'}">${esc((VERDICT[x.status] || VERDICT.no_pos)[0])}${x.diff != null && ['short', 'over'].includes(x.status) ? ` ${x.diff > 0 ? '+' : ''}${k(x.diff)}` : ''}</span></li>`).join('')}</ul></div>`;
  wire(); drawPhotos(d.photos);
}
function sum() {
  const f = $('#cf'); const v = (n) => num(f.elements[n].value);
  const cash = v('cash') - v('float'); const qr = v('bcel') + v('ldb'); const tot = cash + qr + v('card') + v('other');
  $('#sum').innerHTML = `<div><span>ເງິນສົດສຸດທິ (ຫັກເງິນທອນ)</span><b>${k(cash)}</b></div><div><span>ເງິນໂອນ BCEL + LDB</span><b>${k(qr)}</b></div><div class="tot"><span>ລວມທີ່ໄດ້ຮັບ</span><b>${k(tot)}</b></div>`;
}
function wire() {
  const f = $('#cf');
  $$('.money-in', f).forEach((i) => {
    i.addEventListener('input', sum);
    i.addEventListener('blur', () => { i.value = fmt(i.value); });
    i.addEventListener('focus', () => { try { i.select(); } catch { /* */ } });
  });
  sum();
  $('#day').addEventListener('change', (e) => { if (e.target.value) go(e.target.value); });
  $('#goToday')?.addEventListener('click', () => go(laoToday()));
  $$('[data-day]').forEach((b) => b.addEventListener('click', () => go(b.dataset.day)));
  f.addEventListener('submit', (e) => { e.preventDefault(); guard($('#save'), save); });
  $$('input[type=file]', f).forEach((i) => i.addEventListener('change', () => { const file = i.files && i.files[0]; i.value = ''; if (file) guard($(`label[for="${i.id}"]`), () => upload(file, i.dataset.kind)); }));
}
function go(day) { DAY = day; history.replaceState(null, '', `?day=${day}`); render().catch((e) => toast(e.message, 'err')); }
async function save() {
  const f = $('#cf'); clearErrors(f);
  const body = Object.fromEntries(['cash', 'float', 'bcel', 'ldb', 'card', 'other', 'owner_disc'].map((n) => [n, num(f.elements[n].value)]));
  body.note = f.elements.note.value;
  const r = await api(`/closing/${DAY}`, { method: 'PUT', body });
  toast('ບັນທຶກແລ້ວ', 'ok'); await render();
  void r; $('.cl-result')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
// photos: shrink on the phone before sending (max 1600 px, JPEG)
function shrink(file) {
  return new Promise((ok, no) => {
    const img = new Image(); const u = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 1600 / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(u); no(new Error('ອ່ານຮູບບໍ່ໄດ້')); };
    img.src = u;
  });
}
async function upload(file, kind) {
  const data = await shrink(file);
  const r = await api(`/closing/${DAY}/photos`, { method: 'POST', body: { kind, data } });
  toast('ເພີ່ມຮູບແລ້ວ', 'ok'); drawPhotos(r.photos);
}
async function drawPhotos(list) {
  urls.splice(0).forEach((u) => URL.revokeObjectURL(u));
  const box = $('#photos'); if (!box) return;
  box.innerHTML = list.length ? list.map((p) => `<div class="cl-ph" data-id="${p.id}"><img alt="${esc(KIND[p.kind] || '')}"><span class="k">${esc(KIND[p.kind] || '')}</span>${D.can_edit ? `<button class="del" type="button" aria-label="ລຶບຮູບ" data-del="${p.id}">×</button>` : ''}</div>`).join('') : '<p class="small muted" style="margin:0">ຍັງບໍ່ມີຮູບ</p>';
  for (const p of list) {
    try { const u = await photoBlob(p.id); urls.push(u); const img = $(`.cl-ph[data-id="${p.id}"] img`); if (img) { img.src = u; img.addEventListener('click', () => window.open(u, '_blank', 'noopener')); } } catch { /* leave blank */ }
  }
  $$('[data-del]', box).forEach((b) => b.addEventListener('click', () => guard(b, async () => {
    if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = '?'; b.setAttribute('aria-label', 'ກົດອີກຄັ້ງເພື່ອລຶບ'); setTimeout(() => { if (b.isConnected) { b.dataset.armed = ''; b.textContent = '×'; } }, 3000); return; }
    const r = await api(`/closing/photos/${b.dataset.del}`, { method: 'DELETE' }); toast('ລຶບແລ້ວ', 'ok'); drawPhotos(r.photos);
  })));
}

(async () => {
  ME = await initStaff();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(DAY) || DAY > laoToday()) DAY = laoToday();
  try { await render(); } catch (e) { $('#body').innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
})();
