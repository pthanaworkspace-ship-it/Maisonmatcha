// Maison Matcha Club — staff page (Lao UI): scan member QR → add stamps for a verified purchase / redeem a free drink.
// Every change is done by the server for a logged-in staff member; managers (ຜູ້ຈັດການ = admin role) approve corrections and settings.
import { api, $, $$, esc, laoDateTime, toast, uuid, fieldError, clearErrors, initStaff, qrInto, setToken } from './club-common.js';

const dLo = (d) => { if (!d) return '—'; const x = new Date(new Date(d).getTime() + 7 * 3600e3); const p = (n) => String(n).padStart(2, '0'); return `${p(x.getUTCDate())}/${p(x.getUTCMonth() + 1)}/${x.getUTCFullYear()}`; };
const waLink = (phone, text) => `https://wa.me/${String(phone || '').replace(/\D/g, '').replace(/^0+/, '').replace(/^(?!856)/, '856')}?text=${encodeURIComponent(text)}`;
const KIND = { earn: ['ຊື້', 'pay-paid'], refund: ['ຄືນເງິນ', 'pay-rejected'], adjust: ['ປັບໂດຍຜູ້ຈັດການ', 'pay-pending_verification'] };
const RST = { available: ['ພ້ອມແລກ', 'pay-paid'], redeemed: ['ແລກແລ້ວ', 'st-completed'], void: ['ຖອນຄືນ', 'st-cancelled'] };
const chip = (map, k) => `<span class="chip ${(map[k] || ['', ''])[1]}">${esc((map[k] || [k])[0])}</span>`;

let ME; let TAB = 'ov'; let ITEMS = []; let CFG = { stampsPerReward: 10, requireReceipt: true };
const F = { q: '', sort: '', from: '', to: '', status: '' };
const itemName = (id) => { const x = ITEMS.find((i) => i.id === id); return x ? x.name_lo : id; };
const eligible = () => ITEMS.filter((i) => i.eligible && i.active && i.grp !== 'upgrade');

function dialog(title, body, foot = '') {
  const d = document.createElement('dialog');
  d.innerHTML = `<div class="dlg-head"><h3>${title}</h3><button class="x" type="button" aria-label="ປິດ" data-close>×</button></div><div class="dlg-body">${body}</div>${foot ? `<div class="dlg-foot">${foot}</div>` : ''}`;
  document.body.append(d);
  d.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) d.close(); });
  d.addEventListener('close', () => { if (d._stop) d._stop(); d.remove(); });
  d.showModal(); return d;
}
async function guard(btn, fn) {
  if (btn.dataset.busy) return; btn.dataset.busy = '1'; btn.disabled = true;
  try { await fn(); } catch (e) { toast(e.message, 'err'); if (e.field) { const el = btn.closest('dialog, form')?.querySelector(`[name="${e.field}"]`); fieldError(el, e.message); } } finally { delete btn.dataset.busy; btn.disabled = false; }
}
// Small form dialog: onOk(values) runs the save; an error keeps the dialog open for a retry.
function ask(title, body, onOk, { ok = 'ບັນທຶກ', danger = false } = {}) {
  const d = dialog(title, `<form class="stack" id="askf">${body}</form>`, `<span style="flex:1"></span><button class="btn ghost" type="button" data-close>ຍົກເລີກ</button><button class="btn ${danger ? 'danger' : ''}" type="button" id="askOk">${esc(ok)}</button>`);
  const f = $('#askf', d);
  f.addEventListener('submit', (e) => { e.preventDefault(); $('#askOk', d).click(); });
  $('#askOk', d).addEventListener('click', (e) => guard(e.currentTarget, async () => {
    clearErrors(f); if (!f.reportValidity()) return;
    const v = Object.fromEntries(new FormData(f)); $$('input[type=checkbox]', f).forEach((c) => { v[c.name] = c.checked; });
    await onOk(v); d.close();
  }));
  const first = $('input, select, textarea', f); if (first) first.focus();
  return d;
}
const stampsBar = (n, per) => `<div class="lc-dots" aria-label="${n}/${per}">${Array.from({ length: per }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;

// ───────── find a member: QR camera / photo / typing
function finder(onPick, { title = '📷 ສະແກນ QR ສະມາຊິກ' } = {}) {
  const d = dialog(title, `<div class="row" style="flex-wrap:nowrap"><input type="search" id="rq" placeholder="ເລກສະມາຊິກ MM-…, ເບີໂທ, ຊື່ ຫຼື ສະແກນ QR" autocomplete="off" style="flex:1"><button class="btn" type="button" id="scan">📷 ສະແກນ</button></div>
    <div id="cam" class="cam hidden"><video playsinline muted></video><button class="btn small ghost" type="button" id="camStop">ປິດກ້ອງ</button></div>
    <input type="file" id="qrFile" accept="image/*" capture="environment" hidden><div id="hits"></div>
    <p class="tiny muted" style="margin-top:10px">ການສະແກນບໍ່ເພີ່ມສະແຕັມ ຫຼື ແລກຂອງລາງວັນເອງ — ທຸກຢ່າງຕ້ອງຢືນຢັນໃນຂັ້ນຕໍ່ໄປ.</p>`);
  d.classList.add('wide-dlg');
  const q = $('#rq', d); let tmr;
  q.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => lookup(q.value), 250); });
  async function lookup(v) {
    if (!v.trim()) { $('#hits', d).innerHTML = ''; return; }
    const r = await api(`/loyalty/lookup?q=${encodeURIComponent(v)}`);
    if (r.members.length === 1 && (r.exact || r.members[0].member_no.toUpperCase() === v.trim().toUpperCase())) { d.close(); onPick(r.members[0].id); return; }
    if (r.exact && !r.members.length) { $('#hits', d).innerHTML = '<div class="alert warn">QR ນີ້ໃຊ້ບໍ່ໄດ້ແລ້ວ (ຖືກປ່ຽນ) — ຄົ້ນຫາດ້ວຍເບີໂທ ຫຼື ຊື່</div>'; return; }
    $('#hits', d).innerHTML = r.members.map((m) => `<button type="button" class="hit" data-id="${m.id}"><b>${esc(m.name)}</b> <span class="num muted">${esc(m.member_no)} · ${esc(m.phone)}</span> <span class="small">${m.stamps}/${CFG.stampsPerReward}${m.available ? ` · 🎁 ${m.available}` : ''}</span></button>`).join('') || '<p class="muted small" style="margin-top:10px">ບໍ່ພົບ</p>';
    $$('.hit', d).forEach((b) => b.addEventListener('click', () => { d.close(); onPick(Number(b.dataset.id)); }));
  }
  const stop = () => { const v = $('#cam video', d); if (v && v.srcObject) v.srcObject.getTracks().forEach((t) => t.stop()); $('#cam', d).classList.add('hidden'); d._scan = false; };
  d._stop = stop; $('#camStop', d).addEventListener('click', stop);
  $('#scan', d).addEventListener('click', async () => {
    try {
      await loadJsQR();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nocam');
      const st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const v = $('#cam video', d); v.srcObject = st; await v.play(); $('#cam', d).classList.remove('hidden'); d._scan = true;
      const cv = document.createElement('canvas'); const g = cv.getContext('2d', { willReadFrequently: true });
      const tick = () => {
        if (!d._scan) return;
        if (v.videoWidth) { cv.width = v.videoWidth; cv.height = v.videoHeight; g.drawImage(v, 0, 0); const r = window.jsQR(g.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height); if (r && r.data) { stop(); q.value = r.data; lookup(r.data); return; } }
        requestAnimationFrame(tick);
      };
      tick();
    } catch { $('#qrFile', d).click(); }
  });
  $('#qrFile', d).addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try { await loadJsQR(); const bmp = await createImageBitmap(f); const sc = Math.min(1, 1200 / Math.max(bmp.width, bmp.height)); const cv = document.createElement('canvas'); cv.width = bmp.width * sc; cv.height = bmp.height * sc; const g = cv.getContext('2d'); g.drawImage(bmp, 0, 0, cv.width, cv.height); const r = window.jsQR(g.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height); if (!r) throw new Error(); q.value = r.data; lookup(r.data); } catch { toast('ອ່ານ QR ບໍ່ໄດ້ — ລອງໃໝ່ ຫຼື ພິມເລກສະມາຊິກ', 'err'); }
  });
  q.focus();
}
function loadJsQR() { return window.jsQR ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/jsqr.js'; s.onload = res; s.onerror = rej; document.head.append(s); }); }

// ───────── one member: add stamps, redeem, history, recovery
async function member(id) {
  const d0 = await api(`/loyalty/members/${id}`); const m = d0.member; const per = d0.per; const admin = ME.role === 'admin';
  const d = dialog(`${esc(m.name)} <span class="num muted small">${esc(m.member_no)}</span>`, `
    <div class="lc-head"><div><div class="lc-big num">${m.stamps}<small>/${per}</small></div><div class="small muted">ສະແຕັມ · ອີກ ${per - m.stamps} ຈອກ ຮັບຟຣີ</div>${stampsBar(m.stamps, per)}</div>
      <div class="lc-gift ${m.available ? 'on' : ''}"><b class="num">${m.available}</b><span>ເຄື່ອງດື່ມຟຣີ<br>ທີ່ແລກໄດ້</span></div></div>
    ${m.owed ? `<div class="alert warn">ຕ້ອງສະສົມຄືນ ${m.owed} ສະແຕັມ (ຄືນເງິນຫຼັງແລກຂອງລາງວັນແລ້ວ)</div>` : ''}
    <div class="row lc-actions"><button class="btn green" type="button" id="aStamp">＋ ເພີ່ມສະແຕັມ</button>${m.available ? '<button class="btn" type="button" id="aRedeem">☕ ແລກເຄື່ອງດື່ມຟຣີ</button>' : ''}</div>
    <div id="act"></div>
    <dl class="kv" style="margin-top:14px"><dt>ເບີໂທ</dt><dd class="num">${esc(m.phone)}</dd>${m.email ? `<dt>ອີເມວ</dt><dd>${esc(m.email)}</dd>` : ''}
      <dt>ຊື້ທັງໝົດ</dt><dd class="num">${m.purchased} ຈອກ · ແລກຟຣີແລ້ວ ${m.redeemed}</dd><dt>ມາຄັ້ງລ່າສຸດ</dt><dd class="num">${m.last_visit_at ? laoDateTime(m.last_visit_at) : '—'}</dd>
      <dt>ສະມັກ</dt><dd class="num">${dLo(m.created_at)} · ${m.source === 'self' ? 'ລົງທະບຽນເອງ' : 'ລົງທະບຽນທີ່ຮ້ານ'}</dd></dl>
    <h3 style="margin-top:16px">ປະຫວັດສະແຕັມ</h3>
    <div class="table-wrap"><table class="simple"><thead><tr><th>ເວລາ</th><th>ລາຍການ</th><th class="r">ສະແຕັມ</th><th>ໃບບິນ</th><th></th></tr></thead><tbody>
    ${d0.stamps.map((s) => `<tr><td class="small num">${laoDateTime(s.created_at)}<div class="tiny muted">${esc(s.staff || '')}</div></td><td>${chip(KIND, s.kind)}<div class="tiny muted">${s.items.map((x) => `${esc(itemName(x.id))} ×${x.qty}`).join(', ')}${s.reason ? esc(` ${s.reason}`) : ''}</div></td>
      <td class="r num"><b>${s.qty > 0 ? '+' : ''}${s.qty}</b>${s.refunded ? `<div class="tiny muted">ຄືນ ${s.refunded}</div>` : ''}</td><td class="small num">${esc(s.receipt_ref || '—')}</td>
      <td>${s.kind === 'earn' && s.refunded < s.qty ? `<button class="btn small ghost" data-refund="${s.id}" data-left="${s.qty - s.refunded}">ຄືນເງິນ</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">ຍັງບໍ່ມີ</td></tr>'}</tbody></table></div>
    <h3 style="margin-top:16px">ຂອງລາງວັນ</h3>
    <div class="table-wrap"><table class="simple"><thead><tr><th>#</th><th>ສະຖານະ</th><th>ໄດ້ຮັບ</th><th>ແລກ</th><th></th></tr></thead><tbody>
    ${d0.rewards.map((w) => `<tr><td class="num">${w.seq}</td><td>${chip(RST, w.status)}</td><td class="small num">${laoDateTime(w.earned_at)}</td><td class="small">${w.status === 'redeemed' ? `${laoDateTime(w.redeemed_at)} · ${esc(itemName(w.drink_id))}${w.receipt_ref ? ` · ${esc(w.receipt_ref)}` : ''}<div class="tiny muted">${esc(w.staff || '')}</div>` : w.void_reason ? esc(w.void_reason) : ''}</td>
      <td>${admin && w.status === 'redeemed' ? `<button class="btn small ghost" data-undo="${w.id}">ຍົກເລີກການແລກ</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">ຍັງບໍ່ມີ</td></tr>'}</tbody></table></div>
    <div class="row" style="margin-top:14px;flex-wrap:wrap"><button class="btn small ghost" id="aRecover">🔑 ກູ້ຄືນລິ້ງບັດ</button>
      ${admin ? '<button class="btn small ghost" id="aAdjust">± ແກ້ໄຂສະແຕັມ</button><button class="btn small ghost" id="aEdit">ແກ້ໄຂຂໍ້ມູນ</button><button class="btn small ghost" id="aQr">ປ່ຽນ QR</button>' : ''}</div>
    <details style="margin-top:14px"><summary class="small">ບັນທຶກການກວດສອບ (audit trail)</summary><ul class="timeline">${d0.events.map((e) => `<li><time>${laoDateTime(e.created_at)}</time> ${esc(e.type)} — ${esc(e.user_name || 'ລູກຄ້າ')} <span class="tiny muted">${esc(JSON.stringify(e.details))}</span></li>`).join('')}</ul></details>`);
  d.classList.add('wide-dlg');
  const reopen = () => { d.close(); member(id); render(); };
  $('#aStamp', d).addEventListener('click', () => stampForm(m, $('#act', d), reopen));
  $('#aRedeem', d)?.addEventListener('click', () => redeemForm(m, $('#act', d), reopen));
  $('#aRecover', d).addEventListener('click', () => recover(m));
  $('#aAdjust', d)?.addEventListener('click', () => ask('± ແກ້ໄຂສະແຕັມ (ຜູ້ຈັດການ)', `<label class="field"><span>ຈຳນວນ (+ ເພີ່ມ / − ຫຼຸດ)</span><input name="qty" inputmode="numeric" required></label>
    <label class="field"><span>ເລກໃບບິນ ຫຼື ເອກະສານອ້າງອີງ (ຈຳເປັນ)</span><input name="receipt_ref" required></label><label class="field"><span>ເຫດຜົນ (ຈຳເປັນ)</span><input name="reason" required></label>`,
  async (v) => { await api(`/loyalty/members/${id}/adjust`, { method: 'POST', body: { qty: Number(v.qty), receipt_ref: v.receipt_ref, reason: v.reason, idempotency_key: uuid() } }); toast('ບັນທຶກແລ້ວ', 'ok'); reopen(); }));
  $('#aEdit', d)?.addEventListener('click', () => ask('ແກ້ໄຂຂໍ້ມູນສະມາຊິກ', `<label class="field"><span>ຊື່ ແລະ ນາມສະກຸນ</span><input name="name" value="${esc(m.name)}" required></label>
    <label class="field"><span>ເບີໂທ</span><input name="phone" value="${esc(m.phone)}" required></label><label class="field"><span>ອີເມວ</span><input name="email" value="${esc(m.email || '')}"></label>`,
  async (v) => { await api(`/loyalty/members/${id}`, { method: 'PATCH', body: v }); toast('ບັນທຶກແລ້ວ', 'ok'); reopen(); }));
  $('#aQr', d)?.addEventListener('click', () => ask('ປ່ຽນ QR', '<p class="small">QR ເກົ່າຈະສະແກນບໍ່ໄດ້ທັນທີ. ບັດອອນລາຍຂອງລູກຄ້າຈະສະແດງ QR ໃໝ່ເອງ (ຮູບບັດທີ່ບັນທຶກໄວ້ຕ້ອງບັນທຶກໃໝ່).</p>',
    async () => { await api(`/loyalty/members/${id}/rotate-qr`, { method: 'POST' }); toast('ປ່ຽນ QR ແລ້ວ', 'ok'); reopen(); }, { ok: 'ປ່ຽນ QR', danger: true }));
  d.addEventListener('click', (e) => {
    const r = e.target.closest('[data-refund]'); const u = e.target.closest('[data-undo]');
    if (r) ask('ຄືນເງິນ — ຫັກສະແຕັມ', `<label class="field"><span>ຈຳນວນຈອກທີ່ຄືນເງິນ (ສູງສຸດ ${r.dataset.left})</span><input name="qty" inputmode="numeric" value="${r.dataset.left}" required></label><label class="field"><span>ເຫດຜົນ (ຈຳເປັນ)</span><input name="reason" required></label>
      <p class="tiny muted">ຖ້າສະແຕັມບໍ່ພໍ, ຂອງລາງວັນທີ່ຍັງບໍ່ໄດ້ແລກຈະຖືກຖອນຄືນ.</p>`,
    async (v) => { await api(`/loyalty/stamps/${r.dataset.refund}/refund`, { method: 'POST', body: { qty: Number(v.qty), reason: v.reason, idempotency_key: uuid() } }); toast('ບັນທຶກແລ້ວ', 'ok'); reopen(); }, { ok: 'ຄືນເງິນ', danger: true });
    if (u) ask('ຍົກເລີກການແລກ (ຜູ້ຈັດການ)', '<label class="field"><span>ເຫດຜົນ (ຈຳເປັນ)</span><input name="reason" required></label>',
      async (v) => { await api(`/loyalty/rewards/${u.dataset.undo}/undo`, { method: 'POST', body: v }); toast('ບັນທຶກແລ້ວ', 'ok'); reopen(); }, { danger: true });
  });
}
function stampForm(m, box, done) {
  const S = { items: {}, key: uuid() };
  const draw = () => {
    const n = Object.values(S.items).reduce((s, q) => s + q, 0);
    box.innerHTML = `<div class="redeem"><b>ເລືອກເຄື່ອງດື່ມທີ່ລູກຄ້າຈ່າຍເງິນ</b> <span class="small muted">(ແຕະເພື່ອເພີ່ມ, ແຕະ − ເພື່ອຫຼຸດ)</span>
      <div class="drinks">${eligible().map((i) => `<div class="drink ${S.items[i.id] ? 'on' : ''}"><button type="button" class="lc-add" data-add="${i.id}"><b>${esc(i.name_lo)}</b><small>${esc(i.name_en)}</small></button>${S.items[i.id] ? `<span class="lc-q"><button type="button" data-sub="${i.id}" aria-label="ຫຼຸດ">−</button><b class="num">${S.items[i.id]}</b></span>` : ''}</div>`).join('')}</div>
      <label class="field" style="margin-top:12px"><span>ເລກໃບບິນ Loyverse${CFG.requireReceipt ? ' (ຈຳເປັນ)' : ''}</span><input id="rcpt" name="receipt_ref" value="${esc(S.ref || '')}" placeholder="ເຊັ່ນ 1-1234" autocomplete="off"></label>
      <div class="money" style="margin-top:10px"><div><span>ຈະເພີ່ມ</span><b class="num">${n} ສະແຕັມ</b></div><div><span>ຫຼັງເພີ່ມ</span><b class="num">${(m.stamps + n) % CFG.stampsPerReward}/${CFG.stampsPerReward}${Math.floor((m.stamps + n) / CFG.stampsPerReward) ? ` · 🎁 +${Math.floor((m.stamps + n) / CFG.stampsPerReward)}` : ''}</b></div></div>
      <button class="btn green block" type="button" id="goStamp" style="margin-top:12px" ${n ? '' : 'disabled'}>ຢືນຢັນການຊື້ ແລະ ເພີ່ມ ${n} ສະແຕັມ</button></div>`;
    $$('[data-add]', box).forEach((b) => b.addEventListener('click', () => { S.ref = $('#rcpt', box).value; S.items[b.dataset.add] = (S.items[b.dataset.add] || 0) + 1; draw(); }));
    $$('[data-sub]', box).forEach((b) => b.addEventListener('click', () => { S.ref = $('#rcpt', box).value; S.items[b.dataset.sub] -= 1; if (!S.items[b.dataset.sub]) delete S.items[b.dataset.sub]; draw(); }));
    $('#goStamp', box).addEventListener('click', (e) => guard(e.currentTarget, async () => {
      const r = await api(`/loyalty/members/${m.id}/stamps`, { method: 'POST', body: { items: Object.entries(S.items).map(([id, qty]) => ({ id, qty })), receipt_ref: $('#rcpt', box).value, idempotency_key: S.key } });
      box.innerHTML = `<div class="alert ok done"><div class="tick">✓</div><h3>ເພີ່ມ ${r.qty || n} ສະແຕັມແລ້ວ${r.duplicate ? ' (ບັນທຶກແລ້ວກ່ອນໜ້ານີ້)' : ''}</h3><p class="num">${r.card.stamps}/${r.card.per} · ເຄື່ອງດື່ມຟຣີ ${r.card.available}</p>${r.rewards_created ? `<p><b>🎁 ລູກຄ້າໄດ້ຮັບມັດຊະຟຣີ ${r.rewards_created} ຈອກ!</b></p>` : ''}<button class="btn" type="button" id="okBack">ຕົກລົງ</button></div>`;
      $('#okBack', box).addEventListener('click', done);
    }));
  };
  draw(); box.scrollIntoView({ block: 'nearest' });
}
function redeemForm(m, box, done) {
  const S = { drink: '', key: uuid() };
  const draw = () => {
    box.innerHTML = `<div class="redeem"><b>ເຄື່ອງດື່ມຟຣີ — ເລືອກ 1 ຈອກ</b> <span class="small muted">(ເມນູທີ່ຮ່ວມລາຍການ · ບໍ່ໄດ້ຮັບສະແຕັມ)</span>
      <div class="drinks">${eligible().map((i) => `<button type="button" class="drink ${S.drink === i.id ? 'on' : ''}" data-d="${i.id}"><b>${esc(i.name_lo)}</b><small>${esc(i.name_en)}</small></button>`).join('')}</div>
      <label class="field" style="margin-top:12px"><span>ເລກໃບບິນ Loyverse (0 ₭, ຖ້າມີ)</span><input id="rr" value="${esc(S.ref || '')}" autocomplete="off"></label>
      <button class="btn block" type="button" id="goRedeem" style="margin-top:12px" ${S.drink ? '' : 'disabled'}>ຢືນຢັນ ແລະ ແລກ 1 ຈອກຟຣີ</button></div>`;
    $$('[data-d]', box).forEach((b) => b.addEventListener('click', () => { S.ref = $('#rr', box).value; S.drink = b.dataset.d; draw(); }));
    $('#goRedeem', box).addEventListener('click', (e) => guard(e.currentTarget, async () => {
      const r = await api(`/loyalty/members/${m.id}/redeem`, { method: 'POST', body: { drink_id: S.drink, receipt_ref: $('#rr', box).value, idempotency_key: S.key } });
      box.innerHTML = `<div class="alert ok done"><div class="tick">✓</div><h3>ແລກສຳເລັດ${r.duplicate ? ' (ບັນທຶກແລ້ວກ່ອນໜ້ານີ້)' : ''}</h3><p>${esc(itemName(S.drink))} · ຟຣີ</p><p class="num small">ເຫຼືອເຄື່ອງດື່ມຟຣີ ${r.card.available}</p><button class="btn" type="button" id="okBack">ຕົກລົງ</button></div>`;
      $('#okBack', box).addEventListener('click', done);
    }));
  };
  draw(); box.scrollIntoView({ block: 'nearest' });
}
// lost card link: check identity, then a new link replaces the old one (stamps unchanged)
function recover(m) {
  ask('🔑 ກູ້ຄືນລິ້ງບັດ', `<div class="alert info small"><b>ກວດສອບຕົວຕົນກ່ອນ:</b> ໂທຫາເບີ <b class="num">${esc(m.phone)}</b> ແລ້ວໃຫ້ລູກຄ້າຮັບສາຍຢູ່ຕໍ່ໜ້າ, ຫຼື ກວດບັດປະຈຳຕົວໃຫ້ກົງກັບຊື່ <b>${esc(m.name)}</b>. ຢ່າບອກຂໍ້ມູນສະມາຊິກໃຫ້ຄົນທີ່ບອກແຕ່ເບີໂທ.</div>
    <label class="field"><span>ກວດສອບແນວໃດ? (ຈຳເປັນ)</span><input name="check" placeholder="ເຊັ່ນ: ໂທຫາເບີທີ່ລົງທະບຽນ, ລູກຄ້າຮັບສາຍ" required></label>
    <p class="tiny muted">ລິ້ງເກົ່າຈະໃຊ້ບໍ່ໄດ້ທັນທີ. ສະແຕັມ ແລະ ຂອງລາງວັນບໍ່ປ່ຽນ.</p>`,
  async (v) => {
    const r = await api(`/loyalty/members/${m.id}/recover`, { method: 'POST', body: { check: v.check } });
    const msg = `Maison Matcha Club — ລິ້ງບັດສະມາຊິກໃໝ່ຂອງທ່ານ / your new card link:\n${r.link}`;
    const d = dialog('ລິ້ງບັດໃໝ່', `<p class="small">ໃຫ້ລູກຄ້າສະແກນ QR ນີ້ດ້ວຍກ້ອງໂທລະສັບ ຫຼື ສົ່ງທາງ WhatsApp ໄປເບີທີ່ລົງທະບຽນ.</p><div class="lc-link-qr" id="lq"></div>
      <input readonly value="${esc(r.link)}" style="width:100%;margin-top:8px"><div class="row" style="margin-top:10px"><a class="btn green" target="_blank" rel="noopener" href="${esc(waLink(r.phone, msg))}">ສົ່ງທາງ WhatsApp</a><button class="btn ghost" type="button" data-close>ປິດ</button></div>`);
    qrInto($('#lq', d), r.link);
  }, { ok: 'ກວດສອບແລ້ວ — ສ້າງລິ້ງໃໝ່' });
}
function register() {
  ask('＋ ລົງທະບຽນລູກຄ້າ (ຟຣີ)', `<label class="field"><span>ຊື່ ແລະ ນາມສະກຸນ</span><input name="name" required autocomplete="off"></label>
    <label class="field"><span>ເບີໂທລະສັບ</span><input name="phone" inputmode="tel" placeholder="020 …" required></label><label class="field"><span>ອີເມວ (ບໍ່ບັງຄັບ)</span><input name="email" inputmode="email"></label>`,
  async (v) => {
    const r = await api('/loyalty/members', { method: 'POST', body: v });
    const d = dialog(`ລົງທະບຽນແລ້ວ · ${esc(r.member_no)}`, `<p class="small">ໃຫ້ລູກຄ້າສະແກນ QR ນີ້ເພື່ອເປີດບັດ ແລະ ບັນທຶກໄວ້ໃນໂທລະສັບ.</p><div class="lc-link-qr" id="lq"></div>
      <div class="row" style="margin-top:10px"><a class="btn green" target="_blank" rel="noopener" href="${esc(waLink(v.phone, `Maison Matcha Club — ບັດສະມາຊິກຂອງທ່ານ / your membership card:\n${r.link}`))}">ສົ່ງທາງ WhatsApp</a><button class="btn" type="button" id="toM">ເປີດສະມາຊິກ</button></div>`);
    qrInto($('#lq', d), r.link); $('#toM', d).addEventListener('click', () => { d.close(); member(r.id); });
    render();
  }, { ok: 'ລົງທະບຽນ' });
}

// ───────── tabs
async function overview() {
  const d = await api('/loyalty/overview'); const k = d.kpi;
  const cards = [[k.members, 'ສະມາຊິກທັງໝົດ'], [k.new_month, 'ສະມາຊິກໃໝ່ເດືອນນີ້'], [k.active, `ສະມາຊິກທີ່ມາໃນ ${d.settings.activeDays} ມື້`], [k.stamps, 'ສະແຕັມທີ່ອອກທັງໝົດ'], [k.available, 'ເຄື່ອງດື່ມຟຣີທີ່ລໍຖ້າແລກ', k.available > 0], [k.redeemed, 'ແລກແລ້ວທັງໝົດ']];
  $('#body').innerHTML = `<div class="counts club-kpis">${cards.map(([v, l, hot]) => `<div class="count${hot ? ' hot' : ''}"><b class="num">${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>
    <p class="small muted">ມື້ນີ້: ${k.stamps_today} ສະແຕັມ · ແລກຟຣີ ${k.redeemed_today} ຈອກ</p>
    <div class="panel"><h2>ລາຍການລ່າສຸດ</h2><div class="table-wrap"><table class="simple"><thead><tr><th>ເວລາ</th><th>ສະມາຊິກ</th><th>ລາຍການ</th><th class="r">ສະແຕັມ</th><th>ພະນັກງານ</th></tr></thead><tbody>
    ${d.recent.map((r) => `<tr class="click" data-m="${r.member_id}"><td class="small num">${laoDateTime(r.created_at)}</td><td><b>${esc(r.name)}</b> <span class="tiny muted num">${esc(r.member_no)}</span></td><td>${chip(KIND, r.kind)} <span class="tiny muted">${esc(r.receipt_ref || '')}</span></td><td class="r num">${r.qty > 0 ? '+' : ''}${r.qty}</td><td class="small">${esc(r.staff || '')}</td></tr>`).join('') || '<tr><td colspan="5" class="muted" style="text-align:center;padding:20px">ຍັງບໍ່ມີ — ກົດ “📷 ສະແກນ QR ສະມາຊິກ”</td></tr>'}</tbody></table></div></div>`;
}
async function members() {
  const d = await api(`/loyalty/members?q=${encodeURIComponent(F.q)}&sort=${F.sort}`);
  $('#body').innerHTML = `<div class="panel"><h2>ສະມາຊິກ <span class="small muted">(${d.members.length})</span></h2>
    <form class="filters" id="mf" role="search"><input type="search" name="q" value="${esc(F.q)}" placeholder="ຄົ້ນຫາ: ຊື່, ເບີໂທ ຫຼື ເລກສະມາຊິກ" aria-label="ຄົ້ນຫາ">
      <select name="sort" aria-label="ລຽງ"><option value="">ລຽງ: ສະມັກລ່າສຸດ</option><option value="visit" ${F.sort === 'visit' ? 'selected' : ''}>ມາລ່າສຸດ</option><option value="rewards" ${F.sort === 'rewards' ? 'selected' : ''}>ມີຂອງລາງວັນ</option><option value="name" ${F.sort === 'name' ? 'selected' : ''}>ຊື່</option></select></form>
    <div class="table-wrap"><table class="simple"><thead><tr><th>ສະມາຊິກ</th><th>ເບີໂທ</th><th class="r">ສະແຕັມ</th><th class="r">ຟຣີ</th><th class="r">ຊື້ທັງໝົດ</th><th>ມາລ່າສຸດ</th></tr></thead><tbody>
    ${d.members.map((m) => `<tr class="click" data-m="${m.id}"><td><b>${esc(m.name)}</b><div class="tiny muted num">${esc(m.member_no)}</div></td><td class="num small">${esc(m.phone)}</td><td class="r num"><b>${m.stamps}</b>/${d.per}</td><td class="r num">${m.available ? `<b>🎁 ${m.available}</b>` : '0'}</td><td class="r num">${m.purchased}</td><td class="num small">${m.last_visit_at ? dLo(m.last_visit_at) : '—'}</td></tr>`).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">ບໍ່ພົບ</td></tr>'}</tbody></table></div></div>`;
  let tmr; $('#mf').addEventListener('input', (e) => { F[e.target.name] = e.target.value; clearTimeout(tmr); tmr = setTimeout(() => render().then(() => { const q = $('#mf [name=q]'); if (e.target.name === 'q' && q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }), e.target.name === 'q' ? 350 : 0); });
  $('#mf').addEventListener('submit', (e) => e.preventDefault());
}
async function stamps() {
  const d = await api('/loyalty/overview');
  $('#body').innerHTML = `<div class="panel lc-stamp"><h2>ຈັດການສະແຕັມ</h2>
    <ol class="lc-flow"><li>ສະແກນ QR ຂອງລູກຄ້າ (ບັດໃນໂທລະສັບ ຫຼື ຮູບບັດ)</li><li>ກວດໃບບິນ — ເຄື່ອງດື່ມທີ່ຮ່ວມລາຍການ ແລະ ຈ່າຍເງິນແລ້ວ</li><li>ເພີ່ມສະແຕັມ ຫຼື ແລກເຄື່ອງດື່ມຟຣີ → ຢືນຢັນ</li></ol>
    <div class="row"><button class="btn green" type="button" id="sScan">📷 ສະແກນ QR</button><button class="btn ghost" type="button" id="sFind">🔎 ຄົ້ນຫາສະມາຊິກ</button></div>
    <p class="small muted" style="margin-top:10px">ເຄື່ອງດື່ມທີ່ໄດ້ຮັບສະແຕັມ: ${eligible().map((i) => esc(i.name_lo)).join(' · ')}</p>
    <p class="small muted">${CFG.requireReceipt ? 'ທຸກການເພີ່ມສະແຕັມຕ້ອງມີເລກໃບບິນ — ໃບບິນໜຶ່ງໃບໃຫ້ສະແຕັມໄດ້ຄັ້ງດຽວ.' : ''} ການແກ້ໄຂສະແຕັມ (±) ເຮັດໄດ້ສະເພາະຜູ້ຈັດການ ພ້ອມເຫດຜົນ ແລະ ເລກອ້າງອີງ.</p></div>
    <div class="panel"><h2>ປະຫວັດສະແຕັມລ່າສຸດ</h2><div class="table-wrap"><table class="simple"><thead><tr><th>ເວລາ</th><th>ສະມາຊິກ</th><th>ລາຍການ</th><th class="r">ສະແຕັມ</th><th>ພະນັກງານ</th></tr></thead><tbody>
    ${d.recent.map((r) => `<tr class="click" data-m="${r.member_id}"><td class="small num">${laoDateTime(r.created_at)}</td><td><b>${esc(r.name)}</b></td><td>${chip(KIND, r.kind)} <span class="tiny muted">${esc(r.receipt_ref || '')}</span></td><td class="r num">${r.qty > 0 ? '+' : ''}${r.qty}</td><td class="small">${esc(r.staff || '')}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">ຍັງບໍ່ມີ</td></tr>'}</tbody></table></div></div>`;
  $('#sScan').addEventListener('click', () => finder(member));
  $('#sFind').addEventListener('click', () => finder(member, { title: '🔎 ຄົ້ນຫາສະມາຊິກ' }));
}
async function rewards() {
  const d = await api(`/loyalty/rewards?status=${F.status}&from=${F.from}&to=${F.to}`); F.from = d.from; F.to = d.to;
  $('#body').innerHTML = `<form class="filters" id="rf"><select name="status" aria-label="ສະຖານະ"><option value="">ທັງໝົດ</option>${Object.entries(RST).map(([k, v]) => `<option value="${k}" ${F.status === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
    <input type="date" name="from" value="${esc(d.from)}" aria-label="ຈາກ"><input type="date" name="to" value="${esc(d.to)}" aria-label="ຫາ"></form>
    <div class="counts club-kpis"><div class="count${d.totals.available ? ' hot' : ''}"><b class="num">${d.totals.available}</b><span>ພ້ອມແລກ (ທັງໝົດ)</span></div><div class="count"><b class="num">${d.totals.redeemed}</b><span>ແລກແລ້ວ (ທັງໝົດ)</span></div></div>
    <div class="panel"><div class="table-wrap"><table class="simple"><thead><tr><th>ສະມາຊິກ</th><th>#</th><th>ສະຖານະ</th><th>ໄດ້ຮັບ</th><th>ແລກ / ເຄື່ອງດື່ມ</th><th>ໃບບິນ</th><th>ພະນັກງານ</th></tr></thead><tbody>
    ${d.rewards.map((w) => `<tr class="click" data-m="${w.member_id}"><td><b>${esc(w.name)}</b><div class="tiny muted num">${esc(w.member_no)}</div></td><td class="num">${w.seq}</td><td>${chip(RST, w.status)}</td><td class="small num">${dLo(w.earned_at)}</td><td class="small">${w.redeemed_at ? `${laoDateTime(w.redeemed_at)} · ${esc(itemName(w.drink_id))}` : ''}</td><td class="small num">${esc(w.receipt_ref || '')}</td><td class="small">${esc(w.staff || '')}</td></tr>`).join('') || '<tr><td colspan="7" class="muted" style="text-align:center;padding:20px">ບໍ່ມີ</td></tr>'}</tbody></table></div></div>`;
  $('#rf').addEventListener('change', (e) => { F[e.target.name] = e.target.value; render(); });
}
async function report() {
  const d = await api(`/loyalty/report?from=${F.from}&to=${F.to}`); F.from = d.from; F.to = d.to; const t = d.totals;
  const sum = (k) => d.days.reduce((s, x) => s + x[k], 0);
  $('#body').innerHTML = `<form class="filters" id="pf"><input type="date" name="from" value="${esc(d.from)}" aria-label="ຈາກ"><input type="date" name="to" value="${esc(d.to)}" aria-label="ຫາ"></form>
    <div class="counts club-kpis"><div class="count"><b class="num">${t.earned}</b><span>ສະແຕັມທີ່ໄດ້ (ເຄື່ອງດື່ມທີ່ຂາຍ)</span></div><div class="count"><b class="num">${sum('refunded')}</b><span>ສະແຕັມທີ່ຫັກ (ຄືນເງິນ)</span></div>
      <div class="count"><b class="num">${sum('rewards_earned')}</b><span>ຂອງລາງວັນທີ່ອອກ</span></div><div class="count"><b class="num">${t.redeemed}</b><span>ແລກຟຣີ</span></div>
      <div class="count"><b class="num">${t.reward_value.toLocaleString('en-US')} ₭</b><span>ມູນຄ່າເຄື່ອງດື່ມຟຣີ (× ${Number(d.settings.refPrice).toLocaleString('en-US')})</span></div><div class="count"><b class="num">${sum('new_members')}</b><span>ສະມາຊິກໃໝ່</span></div></div>
    <div class="panel"><h2>ລາຍວັນ</h2><div class="table-wrap"><table class="simple"><thead><tr><th>ວັນທີ</th><th class="r">ສະແຕັມ</th><th class="r">ຄືນ</th><th class="r">ປັບ</th><th class="r">ລາງວັນອອກ</th><th class="r">ແລກ</th><th class="r">ຄົນມາ</th><th class="r">ສະມາຊິກໃໝ່</th></tr></thead><tbody>
    ${d.days.filter((x) => x.earned || x.refunded || x.adjusted || x.rewards_earned || x.rewards_redeemed || x.new_members).reverse().map((x) => `<tr><td class="num small">${dLo(`${x.day}T00:00:00+07:00`)}</td><td class="r num">${x.earned}</td><td class="r num">${x.refunded || ''}</td><td class="r num">${x.adjusted || ''}</td><td class="r num">${x.rewards_earned || ''}</td><td class="r num">${x.rewards_redeemed || ''}</td><td class="r num">${x.visits || ''}</td><td class="r num">${x.new_members || ''}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">ບໍ່ມີກິດຈະກຳ</td></tr>'}</tbody></table></div></div>
    <div class="grid2"><div class="panel"><h2>ເຄື່ອງດື່ມທີ່ໄດ້ສະແຕັມ</h2><table class="simple">${d.drinks.map((x) => `<tr><td>${esc(itemName(x.id))}</td><td class="r num">${x.qty}</td></tr>`).join('') || '<tr><td class="muted">—</td></tr>'}</table></div>
      <div class="panel"><h2>ສະມາຊິກທີ່ມາຫຼາຍທີ່ສຸດ</h2><table class="simple">${d.top.map((x) => `<tr class="click" data-m="${x.id}"><td>${esc(x.name)} <span class="tiny muted num">${esc(x.member_no)}</span></td><td class="r num">${x.stamps}</td></tr>`).join('') || '<tr><td class="muted">—</td></tr>'}</table></div></div>`;
  $('#pf').addEventListener('change', (e) => { F[e.target.name] = e.target.value; render(); });
}
async function settings() {
  const d = await api('/loyalty/items'); ITEMS = d.items; CFG = d.settings; const s = d.settings;
  const grp = { drink: 'ເຄື່ອງດື່ມ', seasonal: 'ຕາມລະດູການ', upgrade: 'ອັບເກຣດ (ບໍ່ນັບສະແຕັມ)' };
  $('#body').innerHTML = `<div class="panel"><h2>ກົດ</h2><p class="small">ຊື້ຄົບ <b>${s.stampsPerReward}</b> ຈອກ ຮັບຟຣີ 1 ຈອກ · ສະມັກຟຣີ · ບໍ່ມີວັນໝົດອາຍຸ · ເຄື່ອງດື່ມຟຣີບໍ່ໄດ້ຮັບສະແຕັມ</p>
    <form id="sf" class="stack"><label class="check"><input type="checkbox" name="requireReceipt" ${s.requireReceipt ? 'checked' : ''}> ຕ້ອງໃສ່ເລກໃບບິນທຸກຄັ້ງທີ່ເພີ່ມສະແຕັມ (ແນະນຳ)</label>
      <div class="row"><label class="field"><span>ລາຄາອ້າງອີງເຄື່ອງດື່ມ (ກີບ)</span><input name="refPrice" inputmode="numeric" value="${Number(s.refPrice).toLocaleString('en-US')}"></label><label class="field"><span>"ສະມາຊິກທີ່ມາ" = ມາພາຍໃນ (ມື້)</span><input name="activeDays" inputmode="numeric" value="${s.activeDays}"></label></div>
      <div><button class="btn" type="submit">ບັນທຶກ</button></div></form></div>
    <div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">ເຄື່ອງດື່ມທີ່ໄດ້ຮັບສະແຕັມ</h2><button class="btn small" id="iAdd">＋ ເພີ່ມລາຍການຕາມລະດູການ</button></div>
    <p class="small muted">ການປ່ຽນມີຜົນກັບການຊື້ຕໍ່ໄປເທົ່ານັ້ນ — ສະແຕັມທີ່ໄດ້ແລ້ວບໍ່ປ່ຽນ.</p>
    <div class="table-wrap"><table class="simple"><thead><tr><th>ລາຍການ</th><th>ກຸ່ມ</th><th>ໄດ້ສະແຕັມ</th><th>ລະຫັດ Loyverse</th></tr></thead><tbody>
    ${d.items.map((i) => `<tr><td><b>${esc(i.name_lo)}</b><div class="tiny muted">${esc(i.name_en)} · <span class="num">${esc(i.id)}</span></div></td><td class="small">${esc(grp[i.grp] || i.grp)}</td><td><label class="check"><input type="checkbox" data-el="${esc(i.id)}" ${i.eligible ? 'checked' : ''} ${i.grp === 'upgrade' ? 'disabled' : ''}> ${i.eligible ? 'ແມ່ນ' : 'ບໍ່'}</label></td><td><input class="lc-lv" data-lv="${esc(i.id)}" value="${esc(i.lv_item_id || '')}" placeholder="—" aria-label="Loyverse item id"></td></tr>`).join('')}</tbody></table></div>
    <p class="tiny muted">ລະຫັດ Loyverse ໃຊ້ສຳລັບການໃຫ້ສະແຕັມອັດຕະໂນມັດໃນອະນາຄົດ (ຍັງບໍ່ເປີດໃຊ້ — ຕ້ອງທົດສອບກັບໃບບິນຈິງກ່ອນ).</p></div>`;
  $('#sf').addEventListener('submit', (e) => { e.preventDefault(); guard(e.submitter || $('#sf button'), async () => { const v = Object.fromEntries(new FormData(e.target)); await api('/loyalty/settings', { method: 'PATCH', body: { requireReceipt: !!e.target.requireReceipt.checked, refPrice: v.refPrice, activeDays: Number(v.activeDays) } }); toast('ບັນທຶກແລ້ວ', 'ok'); render(); }); });
  $$('[data-el]').forEach((c) => c.addEventListener('change', () => guard(c, async () => { await api(`/loyalty/items/${encodeURIComponent(c.dataset.el)}`, { method: 'PUT', body: { eligible: c.checked } }); toast('ບັນທຶກແລ້ວ', 'ok'); render(); })));
  $$('[data-lv]').forEach((c) => c.addEventListener('change', () => guard(c, async () => { await api(`/loyalty/items/${encodeURIComponent(c.dataset.lv)}`, { method: 'PUT', body: { lv_item_id: c.value } }); toast('ບັນທຶກແລ້ວ', 'ok'); })));
  $('#iAdd').addEventListener('click', () => ask('ເພີ່ມລາຍການຕາມລະດູການ', `<label class="field"><span>ຊື່ລາວ</span><input name="name_lo" required></label><label class="field"><span>ຊື່ອັງກິດ</span><input name="name_en" required></label>
    <label class="check"><input type="checkbox" name="eligible" checked> ໄດ້ຮັບສະແຕັມ</label>`, async (v) => { await api('/loyalty/items', { method: 'POST', body: { ...v, grp: 'seasonal' } }); toast('ບັນທຶກແລ້ວ', 'ok'); render(); }));
}
// ───────── staff accounts (managers)
async function staffUsers() {
  const { users } = await api('/users');
  $('#body').innerHTML = `<div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">ບັນຊີພະນັກງານ</h2><button class="btn small" id="uAdd">＋ ເພີ່ມພະນັກງານ</button></div>
  <p class="small muted">ພະນັກງານ: ລົງທະບຽນລູກຄ້າ, ເພີ່ມສະແຕັມ, ແລກເຄື່ອງດື່ມຟຣີ, ຄືນເງິນ, ກູ້ຄືນລິ້ງບັດ. ຜູ້ຈັດການ: ທຸກຢ່າງ ລວມທັງແກ້ໄຂສະແຕັມ, ຍົກເລີກການແລກ, ຕັ້ງຄ່າ ແລະ ບັນຊີພະນັກງານ.</p>
  <div class="table-wrap"><table class="simple"><thead><tr><th>ຊື່</th><th>ຊື່ຜູ້ໃຊ້</th><th>ສິດ</th><th>ສະຖານະ</th></tr></thead><tbody>${users.map((u) => `<tr class="click" data-u="${u.id}"><td><b>${esc(u.display_name)}</b></td><td class="num">${esc(u.username)}</td><td>${u.role === 'admin' ? 'ຜູ້ຈັດການ' : 'ພະນັກງານ'}</td><td>${u.active ? '<span class="chip pay-paid">ໃຊ້ງານ</span>' : '<span class="chip st-cancelled">ປິດ</span>'}</td></tr>`).join('')}</tbody></table></div></div>`;
  $('#uAdd').addEventListener('click', () => ask('ເພີ່ມພະນັກງານ', `<label class="field"><span>ຊື່ທີ່ສະແດງ</span><input name="display_name" required></label><label class="field"><span>ຊື່ຜູ້ໃຊ້ (a–z, 0–9)</span><input name="username" autocapitalize="none" required></label>
    <label class="field"><span>ລະຫັດຜ່ານ (8 ຕົວຂຶ້ນໄປ)</span><input name="password" type="password" autocomplete="new-password" minlength="8" required></label><label class="field"><span>ສິດ</span><select name="role"><option value="staff">ພະນັກງານ</option><option value="admin">ຜູ້ຈັດການ</option></select></label>`,
  async (v) => { await api('/users', { method: 'POST', body: v }); toast('ບັນທຶກແລ້ວ', 'ok'); render(); }));
  $$('[data-u]').forEach((r) => r.addEventListener('click', () => {
    const u = users.find((x) => String(x.id) === r.dataset.u);
    ask(esc(u.display_name), `<label class="field"><span>ຊື່ທີ່ສະແດງ</span><input name="display_name" value="${esc(u.display_name)}"></label><label class="field"><span>ສິດ</span><select name="role"><option value="staff" ${u.role === 'staff' ? 'selected' : ''}>ພະນັກງານ</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>ຜູ້ຈັດການ</option></select></label>
      <label class="field"><span>ຕັ້ງລະຫັດຜ່ານໃໝ່ (ຖ້າຕ້ອງການ)</span><input name="password" type="password" autocomplete="new-password"></label><label class="check"><input type="checkbox" name="active" ${u.active ? 'checked' : ''}> ໃຊ້ງານໄດ້</label>`,
    async (v) => { const body = { display_name: v.display_name, role: v.role, active: !!v.active }; if (v.password) body.password = v.password; await api(`/users/${u.id}`, { method: 'PATCH', body }); toast('ບັນທຶກແລ້ວ', 'ok'); render(); });
  }));
}

// ───────── shell
async function render() {
  $$('#tabs input').forEach((i) => { i.checked = i.value === TAB; });
  try { await ({ ov: overview, mem: members, stamp: stamps, rew: rewards, rep: report, set: settings, users: staffUsers }[TAB] || overview)(); } catch (e) { $('#body').innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
}
(async () => {
  ME = await initStaff();
  if (ME.role === 'admin') $$('[data-admin]').forEach((x) => x.classList.remove('hidden'));
  try { const d = await api('/loyalty/items'); ITEMS = d.items; CFG = d.settings; } catch { /* shown by the tab */ }
  $('#tabs').addEventListener('change', (e) => { TAB = e.target.value; render(); });
  $('#newM').addEventListener('click', register);
  $('#scanB').addEventListener('click', () => finder(member));
  $('#body').addEventListener('click', (e) => { const t = e.target.closest('[data-m]'); if (t) { e.preventDefault(); member(Number(t.dataset.m)); } });
  const qs = new URLSearchParams(location.search); if (qs.get('scan') !== null || qs.get('redeem') !== null) finder(member);
  $('#pwBtn').addEventListener('click', () => ask('ປ່ຽນລະຫັດຜ່ານ', '<label class="field"><span>ລະຫັດຜ່ານປັດຈຸບັນ</span><input type="password" name="current" autocomplete="current-password" required></label><label class="field"><span>ລະຫັດຜ່ານໃໝ່ (8 ຕົວຂຶ້ນໄປ)</span><input type="password" name="password" autocomplete="new-password" minlength="8" required></label>', async (v) => {
    const r = await api('/auth/password', { method: 'POST', body: v }); setToken(r.token); toast('ປ່ຽນແລ້ວ', 'ok');
  }));
  await render();
})();
