// Matcha Club — staff page: members, redemption, payments, powder, reports (Lao UI).
import { api, $, $$, esc, money, laoDateTime, toast, uuid, fieldError, clearErrors, initStaff, qrInto, loadScript, setToken } from './club-common.js';

const DR = {
  latte: { lo: 'ມັດຊະລາເຕ້', en: 'Matcha Latte', sub: 'ນົມສົດ', oat: true },
  coconut: { lo: 'ມັດຊະນ້ຳໝາກພ້າວ', en: 'Coconut Matcha' },
  clear: { lo: 'ມັດຊະໃສ', en: 'Clear Matcha' },
  velvet: { lo: 'ໂຄໂຄນັດ ເວວເວັດ', en: 'Coconut Velvet', sub: 'ນ້ຳໝາກພ້າວ + ນົມໂອ໊ດ' },
};
const ST = { active: ['ໃຊ້ງານ', 'pay-paid'], pending: ['ລໍຖ້າຊຳລະ', 'pay-pending_verification'], scheduled: ['ລໍຖ້າເລີ່ມ', 'pay-deposit'], expired: ['ໝົດອາຍຸ', 'pay-rejected'], used: ['ໃຊ້ຄົບແລ້ວ', 'st-completed'], refunded: ['ຄືນເງິນແລ້ວ', 'st-cancelled'], cancelled: ['ຍົກເລີກ', 'st-cancelled'] };
const PAY = { cash: 'ເງິນສົດ', transfer: 'ໂອນທະນາຄານ', qr: 'QR' };
const ING = { powder: ['ຜົງ Matcha Club', 'g'], milk: ['ນົມສົດ', 'ml'], oat: ['ນົມໂອ໊ດ', 'ml'], coco: ['ນ້ຳໝາກພ້າວ', 'ml'], syrup: ['ນ້ຳເຊື່ອມ', 'ml'] };
const stChip = (s) => `<span class="chip ${(ST[s] || ['', ''])[1]}">${esc((ST[s] || [s])[0])}</span>`;
const drinkName = (k, milk) => `${DR[k] ? DR[k].lo : k}${milk === 'oat' ? ' · ນົມໂອ໊ດ' : ''}`;
const dLo = (d) => { if (!d) return '—'; const [y, m, x] = String(d).slice(0, 10).split('-'); return `${x}/${m}/${y}`; };
const today = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, k) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + k); return x.toISOString().slice(0, 10); };
const N = (v) => Number(String(v ?? '').replace(/[,\s]/g, ''));
const payOpts = (sel) => Object.entries(PAY).map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${v}</option>`).join('');
const waLink = (phone, text) => `https://wa.me/${String(phone || '').replace(/\D/g, '').replace(/^0+/, '')}?text=${encodeURIComponent(text)}`;

let ME; let TAB = 'ov'; let PKGS = []; const F = { from: '', to: '', package: '', status: '', q: '' };

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

// ───────── overview
async function overview() {
  const p = new URLSearchParams(Object.entries(F).filter(([, v]) => v));
  const d = await api(`/summary?${p}`); PKGS = d.packages; F.from = d.from; F.to = d.to;
  const k = d.kpi; const rng = `${dLo(d.from)} – ${dLo(d.to)}`;
  const cards = [
    [k.active_members, 'ສະມາຊິກທີ່ໃຊ້ງານ'], [k.new_this_month, 'ສະມາຊິກໃໝ່ເດືອນນີ້'], [money(k.revenue_collected), `ເງິນສະມາຊິກທີ່ໄດ້ຮັບ · ${rng}`],
    [k.cups_redeemed, `ຈອກທີ່ແລກແລ້ວ · ${rng}`], [`${k.cups_owed} ຈອກ`, `ຈອກຄ້າງໃຫ້ລູກຄ້າ · ${money(k.deferred)} ລາຍຮັບລ່ວງໜ້າ`],
    [k.expiring_7d, 'ໝົດອາຍຸພາຍໃນ 7 ມື້', k.expiring_7d > 0], [k.renewals_this_month, 'ຕໍ່ອາຍຸເດືອນນີ້'],
  ];
  const R = d.reminders; const rem = [...R.pending.map((m) => ['warn', 'ລໍຖ້າຢືນຢັນການຊຳລະ', m]), ...R.soon.map((m) => ['err', `ໝົດອາຍຸ ${dLo(m.expires_on)} · ເຫຼືອ ${m.rem} ຈອກ`, m]), ...R.low.map((m) => ['warn', `ເຫຼືອ ${m.rem} ຈອກ`, m])];
  $('#body').innerHTML = `<div class="counts club-kpis">${cards.map(([v, l, hot]) => `<div class="count${hot ? ' hot' : ''}"><b class="num">${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>
  ${rem.length ? `<div class="panel"><h2>ແຈ້ງເຕືອນການຕໍ່ອາຍຸ</h2><p class="small muted">ລະບົບບໍ່ຕັດເງິນ ຫຼື ຕໍ່ອາຍຸອັດຕະໂນມັດ — ພະນັກງານແຈ້ງລູກຄ້າເອງ.</p>
    ${rem.map(([cls, t, m]) => `<div class="alert ${cls} rem-row"><div><b>${esc(m.name)}</b> <span class="num">${esc(m.member_no)}</span> — ${esc(t)}</div><div class="row">${m.st === 'pending' ? `<button class="btn small" data-pay="${m.id}">ຢືນຢັນການຊຳລະ</button>` : `<a class="btn small ghost" target="_blank" rel="noopener" href="${esc(waLink(m.phone, remindText(m)))}">WhatsApp</a><button class="btn small" data-renew="${m.id}">ຕໍ່ອາຍຸ</button>`}<button class="btn small ghost" data-view="${m.id}">ເບິ່ງ</button></div></div>`).join('')}</div>` : ''}
  <div class="panel"><h2>ສະມາຊິກ <span class="small muted">(${d.list.length})</span></h2>
    <form class="filters" id="cf" role="search">
      <input type="search" name="q" value="${esc(F.q)}" placeholder="ຄົ້ນຫາ: ຊື່, ເບີໂທ ຫຼື ເລກສະມາຊິກ" aria-label="ຄົ້ນຫາ">
      <select name="package" aria-label="ແພັກເກດ"><option value="">ແພັກເກດ: ທັງໝົດ</option>${PKGS.map((x) => `<option value="${x.id}" ${String(F.package) === String(x.id) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
      <select name="status" aria-label="ສະຖານະ"><option value="">ສະຖານະ: ທັງໝົດ</option>${Object.entries(ST).map(([k2, v]) => `<option value="${k2}" ${F.status === k2 ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
      <div class="more"><input type="date" name="from" value="${esc(F.from)}" aria-label="ຈາກວັນທີ"><input type="date" name="to" value="${esc(F.to)}" aria-label="ຫາວັນທີ"></div>
    </form>
    <div class="table-wrap"><table class="simple"><thead><tr><th>ສະມາຊິກ</th><th>ແພັກເກດ</th><th>ສະຖານະ</th><th class="r">ເຫຼືອ</th><th>ໝົດອາຍຸ</th><th class="r">ຈ່າຍ</th></tr></thead><tbody>
    ${d.list.map((m) => `<tr class="click" data-view="${m.id}"><td><b>${esc(m.name)}</b><div class="tiny muted num">${esc(m.member_no)}${m.renew_of ? ' · ຕໍ່ອາຍຸ' : ''}</div></td><td>${esc(m.pkg_name)}</td><td>${stChip(m.st)}</td><td class="r num"><b>${m.rem}</b>/${m.total}</td><td class="num small">${dLo(m.expires_on)}</td><td class="r num">${money(m.amount, { symbol: true })}</td></tr>`).join('') || '<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">ຍັງບໍ່ມີສະມາຊິກ — ກົດ “＋ ສະມາຊິກໃໝ່”</td></tr>'}
    </tbody></table></div></div>`;
  let tmr; $('#cf').addEventListener('input', (e) => { F[e.target.name] = e.target.value; clearTimeout(tmr); tmr = setTimeout(() => render().then(() => { const q = $('#cf [name=q]'); if (e.target.name === 'q' && q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }), e.target.name === 'q' ? 350 : 0); });
  $('#cf').addEventListener('submit', (e) => e.preventDefault());
}
const remindText = (m) => `ສະບາຍດີ ${String(m.name).split(/\s+/)[0]} — Maison Matcha ຂໍແຈ້ງວ່າ Matcha Club ${m.pkg_name} (${m.member_no}) ຂອງທ່ານ ເຫຼືອ ${m.rem} ຈອກ ແລະ ໃຊ້ໄດ້ເຖິງ ${dLo(m.expires_on)}. ຈອກທີ່ບໍ່ໄດ້ໃຊ້ບໍ່ຍົກໄປ. ຍິນດີຕ້ອນຮັບທ່ານສະເໝີ 🍵\n\nHello! Your Matcha Club ${m.pkg_name} membership has ${m.rem} drink(s) left, valid until ${dLo(m.expires_on)}. Unused drinks do not carry over.`;

// ───────── new member / renewal
async function newMember(renewFrom) {
  if (!PKGS.length) PKGS = (await api('/summary')).packages;
  const pk = PKGS.filter((x) => x.active);
  let prev = null; if (renewFrom) prev = (await api(`/memberships/${renewFrom}`)).m;
  const p0 = (prev && pk.find((x) => x.id === prev.package_id)) || pk[0]; const td = today(); const key = uuid();
  const d = dialog(prev ? 'ຕໍ່ອາຍຸສະມາຊິກ' : 'ສະມາຊິກໃໝ່', `<form id="nm" class="stack">
    <label class="field"><span>ຊື່ລູກຄ້າ</span><input name="name" value="${esc(prev ? prev.name : '')}" ${prev ? 'readonly' : ''} required autocomplete="off"></label>
    <label class="field"><span>ເບີໂທ / WhatsApp</span><input name="phone" inputmode="tel" value="${esc(prev ? prev.phone : '')}" ${prev ? 'readonly' : ''} placeholder="+856 20 …" required></label>
    <label class="field"><span>ແພັກເກດ</span><select name="package_id">${pk.map((x) => `<option value="${x.id}" ${x.id === p0.id ? 'selected' : ''}>${esc(x.name)} — ${x.cups} ຈອກ · ${money(x.price)} · ${x.days} ມື້</option>`).join('')}</select></label>
    <div class="row"><label class="field"><span>ວິທີຊຳລະ</span><select name="method">${payOpts('cash')}</select></label><label class="field"><span>ເລກອ້າງອີງການຊຳລະ</span><input name="reference" placeholder="ເລກໂອນ / ໃບບິນ"></label></div>
    <div class="row"><label class="field"><span>ສະຖານະການຊຳລະ</span><select name="pay_status"><option value="pending">ລໍຖ້າຢືນຢັນ</option><option value="confirmed">ໄດ້ຮັບເງິນແລ້ວ</option></select></label><label class="field"><span>ຈຳນວນເງິນ (ກີບ)</span><input name="amount" inputmode="numeric" value="${p0.price.toLocaleString('en-US')}"></label></div>
    <div class="row"><label class="field"><span>ວັນເລີ່ມ</span><input type="date" name="activated_on" value="${td}"></label><label class="field"><span>ວັນໝົດອາຍຸ</span><input type="date" name="expires_on" value="${addDays(td, p0.days - 1)}"></label></div>
    <label class="field"><span>ໝາຍເຫດ</span><textarea name="notes" rows="2"></textarea></label>
    <div class="alert info" id="nmNote"></div></form>`,
  '<span style="flex:1"></span><button class="btn ghost" type="button" data-close>ຍົກເລີກ</button><button class="btn" type="button" id="nmSave">ບັນທຶກ</button>');
  const f = $('#nm', d); const g = (n) => f.elements[n];
  const upd = (e) => {
    const k = pk.find((x) => String(x.id) === g('package_id').value) || p0;
    if (e && e.target.name === 'package_id') { g('amount').value = k.price.toLocaleString('en-US'); g('expires_on').value = addDays(g('activated_on').value || td, k.days - 1); }
    if (e && e.target.name === 'activated_on' && g('activated_on').value) g('expires_on').value = addDays(g('activated_on').value, k.days - 1);
    const ok = g('pay_status').value === 'confirmed';
    $('#nmNote', d).textContent = ok ? `ເປີດໃຊ້ທັນທີ: ${k.cups} ຈອກ ເຖິງ ${dLo(g('expires_on').value)}` : 'ຈະເປີດໃຊ້ເມື່ອຢືນຢັນການຊຳລະແລ້ວເທົ່ານັ້ນ';
  };
  f.addEventListener('input', upd); f.addEventListener('change', upd); upd();
  $('#nmSave', d).addEventListener('click', (e) => guard(e.currentTarget, async () => {
    clearErrors(f); const v = Object.fromEntries(new FormData(f));
    const body = { ...v, amount: N(v.amount), package_id: Number(v.package_id), idempotency_key: key };
    if (prev) body.member_id = prev.member_id;
    const r = await api('/members', { method: 'POST', body });
    d.close(); toast('ບັນທຶກແລ້ວ', 'ok'); await render(); view(r.id);
  }));
}

// ───────── member detail + card
async function view(id) {
  const d0 = await api(`/memberships/${id}`); const m = d0.m; const admin = ME.role === 'admin';
  const dots = Array.from({ length: Math.min(m.total, 24) }, (_, i) => `<i class="${i < m.used ? 'u' : ''}"></i>`).join('');
  const share = `Maison Matcha · Matcha Club\n${m.name.split(/\s+/)[0]}, ບັດສະມາຊິກ ${m.pkg_name} (${m.member_no}) ຂອງທ່ານ — ເບິ່ງຍອດເຫຼືອໄດ້ຕະຫຼອດ:\nYour member card (live balance):\n${d0.card_url}`;
  const reds = d0.redemptions.map((r) => `<tr class="${r.reversed_at ? 'strike-row' : ''}"><td class="small num">${laoDateTime(r.created_at)}</td><td>${esc(drinkName(r.drink, r.milk))}${r.reversed_at ? ' <span class="chip st-cancelled">ຍົກເລີກ</span>' : ''}<div class="tiny muted">${esc(r.order_no || '')}${r.oat_fee ? ` · ນົມໂອ໊ດ +${money(r.oat_fee, { symbol: true })} (${r.order_payment === 'paid' ? 'ຈ່າຍແລ້ວ' : `ຄ້າງ <button class="btn small ghost" data-oat="${r.id}">ເກັບເງິນ</button>`})` : ''}${r.reversed_at ? ` · ${esc(r.reverse_reason)} — ${esc(r.reversed_by_name || '')}` : ''}</div></td><td class="r num">${r.qty}</td><td class="small">${esc(r.staff_name || '')}</td>${admin ? `<td>${r.reversed_at ? '' : `<button class="btn small ghost" data-rev="${r.id}">ຍົກເລີກ</button>`}</td>` : ''}</tr>`).join('');
  const closed = ['refunded', 'cancelled'].includes(m.st);
  const d = dialog(`${esc(m.name)} ${stChip(m.st)}`, `<div class="mc-card" id="mcCard">
      <div class="mc-top"><img src="/logo.webp" alt="Maison Matcha"><div class="mc-club">MATCHA CLUB<small>ສະມາຊິກມັດສະ</small></div></div>
      <div class="mc-name">${esc(m.name)}</div><div class="mc-no num">${esc(m.member_no)}</div>
      <div class="mc-body"><div><div class="mc-pkg">${esc(m.pkg_name)}</div><div class="mc-dots">${dots}</div>
        <div class="mc-stats num"><div><b>${m.total}</b><span>ທັງໝົດ</span></div><div><b>${m.used}</b><span>ແລກແລ້ວ</span></div><div><b>${m.rem}</b><span>ເຫຼືອ</span></div></div>
        <div class="mc-exp">ໃຊ້ໄດ້ເຖິງ <b class="num">${m.expires_on ? dLo(m.expires_on) : 'ລໍຖ້າຊຳລະ'}</b></div></div>
        <div class="mc-qr" id="mcQr"></div></div>
      <div class="mc-foot">FROM KYOTO TO LUANG PRABANG</div></div>
    <div class="row" style="justify-content:center;margin-top:12px">
      ${m.st === 'active' ? `<button class="btn green" data-redeem="${m.id}">🍵 ແລກເຄື່ອງດື່ມ</button>` : ''}
      ${m.st === 'pending' ? `<button class="btn green" data-pay="${m.id}">ຢືນຢັນການຊຳລະ</button>` : ''}
      <a class="btn ghost" target="_blank" rel="noopener" href="${esc(waLink(m.phone, share))}">ສົ່ງບັດທາງ WhatsApp</a>
      <button class="btn ghost" id="cpy">ສຳເນົາລິ້ງບັດ</button>
      ${['active', 'used', 'expired'].includes(m.st) ? `<button class="btn ghost" data-renew="${m.id}">ຕໍ່ອາຍຸ</button>` : ''}
    </div>
    <dl class="kv" style="margin-top:14px"><dt>ເບີໂທ</dt><dd class="num">${esc(m.phone)}</dd><dt>ການຊຳລະ</dt><dd>${money(m.amount)} · ${PAY[m.method]}${m.reference ? ` · ${esc(m.reference)}` : ''} · ${m.pay_status === 'confirmed' ? `ຢືນຢັນແລ້ວ ${dLo(m.paid_on)}` : 'ລໍຖ້າ'}</dd>
      <dt>ໄລຍະ</dt><dd class="num">${dLo(m.activated_on)} → ${dLo(m.expires_on)}</dd>${m.notes ? `<dt>ໝາຍເຫດ</dt><dd>${esc(m.notes)}</dd>` : ''}
      ${d0.history.length > 1 ? `<dt>ປະຫວັດ</dt><dd>${d0.history.map((h) => `<a href="#" data-view="${h.id}">${esc(h.pkg_name)} ${dLo(h.activated_on)}</a> ${stChip(h.st)}`).join('<br>')}</dd>` : ''}</dl>
    <h3 style="margin-top:16px">ປະຫວັດການແລກ</h3>
    <div class="table-wrap"><table class="simple"><thead><tr><th>ເວລາ</th><th>ເຄື່ອງດື່ມ</th><th class="r">ຈອກ</th><th>ພະນັກງານ</th>${admin ? '<th></th>' : ''}</tr></thead><tbody>${reds || '<tr><td colspan="5" class="muted">ຍັງບໍ່ມີ</td></tr>'}</tbody></table></div>
    ${d0.adjustments.length ? `<h3 style="margin-top:16px">ການປັບ / ຄືນເງິນ</h3>${d0.adjustments.map((a) => `<div class="alert ${a.type === 'cups' ? 'info' : 'err'}">${a.type === 'refund' ? `ຄືນເງິນ ${money(a.amount)} · ${PAY[a.method]}` : a.type === 'cancel' ? 'ຍົກເລີກສະມາຊິກ' : `ປັບຈອກ ${a.cups > 0 ? '+' : ''}${a.cups}`} — ${esc(a.reason)} <span class="tiny">(${esc(a.user_name || '')} · ${laoDateTime(a.created_at)})</span></div>`).join('')}` : ''}
    <details style="margin-top:14px"><summary class="small">ບັນທຶກການກວດສອບ (audit trail)</summary><ul class="timeline">${d0.events.map((e) => `<li><time>${laoDateTime(e.created_at)}</time> ${esc(e.type)} — ${esc(e.user_name || '')} <span class="tiny muted">${esc(JSON.stringify(e.details))}</span></li>`).join('')}</ul></details>
    ${admin && !closed ? `<div class="row" style="margin-top:14px"><button class="btn small ghost" data-adj="cups">ປັບຈຳນວນຈອກ</button><button class="btn small ghost" data-edit>ແກ້ໄຂ</button>${m.pay_status === 'confirmed' ? '<button class="btn small danger" data-adj="refund">ຄືນເງິນ</button>' : '<button class="btn small danger" data-adj="cancel">ຍົກເລີກ</button>'}</div>` : ''}`);
  d.classList.add('wide-dlg'); qrInto($('#mcQr', d), d0.card_url);
  $('#cpy', d).addEventListener('click', async () => { try { await navigator.clipboard.writeText(d0.card_url); toast('ສຳເນົາແລ້ວ', 'ok'); } catch { toast(d0.card_url); } });
  d.addEventListener('click', (e) => {
    const t = e.target.closest('[data-rev],[data-adj],[data-edit],[data-view],[data-redeem],[data-pay],[data-renew],[data-oat]'); if (!t || !d.contains(t)) return; e.preventDefault();
    if (t.dataset.oat) collectOat(t.dataset.oat, () => { d.close(); view(m.id); });
    else if (t.dataset.rev) reverse(t.dataset.rev, m.id, d);
    else if (t.dataset.adj) adjust(m, t.dataset.adj, d);
    else if (t.dataset.edit !== undefined) edit(m, d);
    else { d.close(); actions(t); }
  });
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
async function reverse(rid, mid, parent) {
  ask('ຍົກເລີກການແລກ', '<p class="small">ຈອກຈະຄືນເຂົ້າບັດ, ອໍເດີທີ່ເຊື່ອມໂຍງຈະຖືກຍົກເລີກ ແລະ ທຸກຢ່າງຖືກບັນທຶກໄວ້ໃນປະຫວັດ. ຖ້າເກັບຄ່ານົມໂອ໊ດແລ້ວ ໃຫ້ຄືນເງິນລູກຄ້າ.</p><label class="field"><span>ເຫດຜົນ</span><input name="reason" required></label>', async (v) => {
    await api(`/redemptions/${rid}/reverse`, { method: 'POST', body: v }); parent.close(); toast('ຍົກເລີກແລ້ວ', 'ok'); await render(); view(mid);
  }, { ok: 'ຍົກເລີກການແລກ', danger: true });
}
async function adjust(m, type, parent) {
  const t = { cups: 'ປັບຈຳນວນຈອກ', refund: 'ຄືນເງິນ', cancel: 'ຍົກເລີກສະມາຊິກ' }[type];
  const sug = Math.round(m.amount / m.cups * Math.max(0, Math.min(m.rem, m.cups)));
  const body = `${type === 'cups' ? '<label class="field"><span>ຈຳນວນຈອກ (+ ເພີ່ມ / − ຫຼຸດ)</span><input name="cups" inputmode="numeric" required></label>' : ''}
    ${type === 'refund' ? `<label class="field"><span>ຈຳນວນເງິນຄືນ (ກີບ) — ແນະນຳ = ມູນຄ່າຈອກທີ່ຍັງບໍ່ໄດ້ໃຊ້</span><input name="amount" inputmode="numeric" value="${sug.toLocaleString('en-US')}"></label><label class="field"><span>ວິທີ</span><select name="method">${payOpts('cash')}</select></label>` : ''}
    <label class="field"><span>ເຫດຜົນ (ຈຳເປັນ)</span><input name="reason" required></label>${type !== 'cups' ? '<p class="small muted">ສະມາຊິກຈະຖືກປິດ ແລະ ແລກບໍ່ໄດ້ອີກ.</p>' : ''}`;
  ask(t, body, async (v) => {
    await api(`/memberships/${m.id}/adjust`, { method: 'POST', body: { type, cups: v.cups !== undefined ? Number(v.cups) : undefined, amount: v.amount !== undefined ? N(v.amount) : undefined, method: v.method, reason: v.reason } });
    parent.close(); toast('ບັນທຶກແລ້ວ', 'ok'); await render(); view(m.id);
  }, { danger: type !== 'cups' });
}
async function edit(m, parent) {
  ask('ແກ້ໄຂສະມາຊິກ', `<label class="field"><span>ຊື່</span><input name="name" value="${esc(m.name)}"></label><label class="field"><span>ເບີໂທ</span><input name="phone" value="${esc(m.phone)}"></label>
    <div class="row"><label class="field"><span>ວັນເລີ່ມ</span><input type="date" name="activated_on" value="${esc(m.activated_on || '')}"></label><label class="field"><span>ວັນໝົດອາຍຸ</span><input type="date" name="expires_on" value="${esc(m.expires_on || '')}"></label></div>
    <label class="field"><span>ໝາຍເຫດ</span><textarea name="notes" rows="2">${esc(m.notes || '')}</textarea></label>`, async (v) => {
    await api(`/memberships/${m.id}`, { method: 'PATCH', body: v }); parent.close(); toast('ບັນທຶກແລ້ວ', 'ok'); await render(); view(m.id);
  });
}
async function confirmPay(id) {
  const m = (await api(`/memberships/${id}`)).m; const td = today();
  ask('ຢືນຢັນການຊຳລະ', `<p><b>${esc(m.name)}</b> · ${esc(m.member_no)} · ${esc(m.pkg_name)} · <b>${money(m.amount)}</b></p>
    <div class="row"><label class="field"><span>ວິທີຊຳລະ</span><select name="method">${payOpts(m.method)}</select></label><label class="field"><span>ເລກອ້າງອີງ</span><input name="reference" value="${esc(m.reference || '')}"></label></div>
    <div class="row"><label class="field"><span>ວັນເລີ່ມ</span><input type="date" name="activated_on" value="${td}"></label><label class="field"><span>ວັນໝົດອາຍຸ</span><input type="date" name="expires_on" value="${addDays(td, m.days - 1)}"></label></div>`, async (v) => {
    await api(`/memberships/${id}/confirm-payment`, { method: 'POST', body: v }); toast('ເປີດໃຊ້ແລ້ວ', 'ok'); await render(); setTimeout(() => view(id), 50);
  }, { ok: 'ໄດ້ຮັບເງິນແລ້ວ — ເປີດໃຊ້' });
}

// ───────── redeem
function redeem(preId) {
  const d = dialog('🍵 ແລກເຄື່ອງດື່ມ', `<div class="row" style="flex-wrap:nowrap"><input type="search" id="rq" placeholder="ເລກສະມາຊິກ, ເບີໂທ ຫຼື ສະແກນ QR" autocomplete="off" style="flex:1"><button class="btn" type="button" id="scan">📷 ສະແກນ</button></div>
    <div id="cam" class="cam hidden"><video playsinline muted></video><button class="btn small ghost" type="button" id="camStop">ປິດກ້ອງ</button></div>
    <input type="file" id="qrFile" accept="image/*" capture="environment" hidden>
    <div id="hits"></div><div id="rf"></div>`);
  d.classList.add('wide-dlg');
  const q = $('#rq', d); let tmr;
  q.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => lookup(q.value), 250); });
  async function lookup(v) {
    if (!v.trim()) { $('#hits', d).innerHTML = ''; return; }
    const r = await api(`/lookup?q=${encodeURIComponent(v)}`);
    $('#rf', d).innerHTML = '';
    if (r.members.length === 1 && (/\/m\//.test(v) || r.members[0].member_no.toUpperCase() === v.trim().toUpperCase())) { $('#hits', d).innerHTML = ''; pick(r.members[0]); return; }
    $('#hits', d).innerHTML = r.members.map((m, i) => `<button type="button" class="hit" data-i="${i}"><b>${esc(m.name)}</b> <span class="num muted">${esc(m.member_no)} · ${esc(m.phone)}</span> ${m.current ? stChip(m.current.st) : ''}</button>`).join('') || '<p class="muted small">ບໍ່ພົບສະມາຊິກ</p>';
    $$('.hit', d).forEach((b) => b.addEventListener('click', () => { $('#hits', d).innerHTML = ''; pick(r.members[Number(b.dataset.i)]); }));
  }
  function pick(mem) {
    const c = mem.current; const box = $('#rf', d);
    if (!c || c.st !== 'active') {
      const why = !c ? 'ບໍ່ມີສະມາຊິກໃນບັດນີ້' : { pending: 'ຍັງບໍ່ໄດ້ຢືນຢັນການຊຳລະ — ຢືນຢັນກ່ອນຈຶ່ງແລກໄດ້', expired: 'ໝົດອາຍຸແລ້ວ — ຈອກທີ່ເຫຼືອບໍ່ຍົກໄປ', used: 'ໃຊ້ຄົບທຸກຈອກແລ້ວ', scheduled: `ເລີ່ມໃຊ້ໄດ້ວັນທີ ${dLo(c.activated_on)}`, refunded: 'ຄືນເງິນແລ້ວ', cancelled: 'ຍົກເລີກແລ້ວ' }[c.st];
      box.innerHTML = `<div class="alert warn"><b>${esc(mem.name)}</b> · ${esc(mem.member_no)} ${c ? stChip(c.st) : ''}<div>${esc(why)}</div><div class="row" style="margin-top:8px">${c && c.st === 'pending' ? `<button class="btn small" data-pay="${c.id}">ຢືນຢັນການຊຳລະ</button>` : ''}${c && ['expired', 'used'].includes(c.st) ? `<button class="btn small" data-renew="${c.id}">ຕໍ່ອາຍຸ</button>` : ''}</div></div>`;
      $$('[data-pay],[data-renew]', box).forEach((b) => b.addEventListener('click', () => { d.close(); actions(b); }));
      return;
    }
    const S = { drink: 'latte', milk: 'regular', qty: 1, fulfilment: 'dine_in', key: uuid() };
    const draw = () => {
      const max = Math.min(20, c.rem); if (S.qty > max) S.qty = max; if (!DR[S.drink].oat) S.milk = 'regular';
      const fee = S.milk === 'oat' ? OAT * S.qty : 0;
      box.innerHTML = `<div class="redeem">
        <div class="row" style="justify-content:space-between;align-items:center"><div><b>${esc(mem.name)}</b> <span class="num muted small">${esc(mem.member_no)}</span><div class="small muted">${esc(c.pkg_name)} · ເຖິງ ${dLo(c.expires_on)}</div></div><div class="left"><b class="num">${c.rem}</b><span>ຈອກເຫຼືອ</span></div></div>
        <div class="drinks">${Object.entries(DR).map(([k, x]) => `<button type="button" class="drink ${S.drink === k ? 'on' : ''}" data-drink="${k}"><b>${x.lo}</b><small>${x.en}${x.sub ? ` · ${x.sub}` : ''}</small></button>`).join('')}</div>
        ${DR[S.drink].oat ? `<div class="seg" style="margin-top:10px"><label><input type="radio" name="milk" value="regular" ${S.milk === 'regular' ? 'checked' : ''}><span>ນົມສົດ</span></label><label><input type="radio" name="milk" value="oat" ${S.milk === 'oat' ? 'checked' : ''}><span>ປ່ຽນເປັນນົມໂອ໊ດ +${money(OAT, { symbol: true })}/ຈອກ</span></label></div>` : ''}
        <div class="row" style="align-items:center;margin-top:12px;flex-wrap:nowrap"><span>ຈຳນວນ</span><div class="qty"><button type="button" data-q="-1" ${S.qty <= 1 ? 'disabled' : ''} aria-label="ຫຼຸດ">−</button><span class="num">${S.qty}</span><button type="button" data-q="1" ${S.qty >= max ? 'disabled' : ''} aria-label="ເພີ່ມ">＋</button></div></div>
          <div class="seg" style="margin-top:10px"><label><input type="radio" name="ful" value="dine_in" ${S.fulfilment === 'dine_in' ? 'checked' : ''}><span>ນັ່ງກິນ</span></label><label><input type="radio" name="ful" value="pickup" ${S.fulfilment === 'pickup' ? 'checked' : ''}><span>ຮັບກັບບ້ານ</span></label></div>
        ${fee ? `<div class="row" style="margin-top:10px"><label class="field"><span>ຄ່ານົມໂອ໊ດ <b>${money(fee)}</b></span><select id="oatPaid"><option value="1">ຈ່າຍແລ້ວ</option><option value="0">ຍັງບໍ່ຈ່າຍ (ເກັບພາຍຫຼັງ)</option></select></label><label class="field"><span>ວິທີ</span><select id="oatM">${payOpts('cash')}</select></label></div>` : ''}
        <label class="field" style="margin-top:8px"><span>ເລກໃບບິນ Loyverse (ຖ້າມີ)</span><input id="pos" value="${esc(S.pos || '')}"></label>
        <div class="money" style="margin-top:12px"><div><span>ຈະຕັດ</span><b>${S.qty} ຈອກ · ${esc(drinkName(S.drink, S.milk))}</b></div><div><span>ເຫຼືອຫຼັງແລກ</span><b class="num">${c.rem - S.qty} / ${c.total}</b></div>${fee ? `<div class="due"><span>ເກັບເງິນເພີ່ມ</span><b>${money(fee)}</b></div>` : ''}</div>
        <button class="btn green block" type="button" id="go" style="margin-top:12px">ຢືນຢັນ ແລະ ຕັດຈອກ</button></div>`;
      $$('[data-drink]', box).forEach((b) => b.addEventListener('click', () => { S.pos = $('#pos', box).value; S.drink = b.dataset.drink; draw(); }));
      $$('[data-q]', box).forEach((b) => b.addEventListener('click', () => { S.pos = $('#pos', box).value; S.qty = Math.max(1, S.qty + Number(b.dataset.q)); draw(); }));
      $$('input[name=milk]', box).forEach((b) => b.addEventListener('change', () => { S.pos = $('#pos', box).value; S.milk = b.value; draw(); }));
      $$('input[name=ful]', box).forEach((b) => b.addEventListener('change', () => { S.fulfilment = b.value; }));
      $('#go', box).addEventListener('click', (e) => guard(e.currentTarget, async () => {
        const body = { idempotency_key: S.key, drink: S.drink, milk: S.milk, qty: S.qty, fulfilment: S.fulfilment, pos_ref: $('#pos', box).value,
          oat_paid: fee ? $('#oatPaid', box).value === '1' : false, oat_method: fee ? $('#oatM', box).value : undefined };
        const r = await api(`/memberships/${c.id}/redeem`, { method: 'POST', body });
        box.innerHTML = `<div class="alert ok done"><div class="tick">✓</div><h3>ແລກສຳເລັດ${r.duplicate ? ' (ບັນທຶກແລ້ວ)' : ''}</h3><p>${S.qty} × ${esc(drinkName(S.drink, S.milk))} · ອໍເດີ <b class="num">${esc(r.order_no)}</b></p><p class="num" style="font-size:1.3rem"><b>${r.rem}</b> ຈອກເຫຼືອ</p>${r.oat_fee && !body.oat_paid ? `<p>ຄ້າງຄ່ານົມໂອ໊ດ ${money(r.oat_fee)} — ເກັບໄດ້ໃນປະຫວັດການແລກ</p>` : ''}<button class="btn" type="button" data-close>ແລ້ວ</button></div>`;
        render();
      }));
    };
    draw();
  }
  // camera scan (live), with photo fallback
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
  if (preId) api(`/memberships/${preId}`).then((x) => { q.value = x.m.member_no; lookup(x.m.member_no); });
  else q.focus();
}
let OAT = 10000;
function loadJsQR() { return window.jsQR ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = '/jsqr.js'; s.onload = res; s.onerror = rej; document.head.append(s); }); }

function collectOat(id, done) {
  ask('ເກັບຄ່ານົມໂອ໊ດ', `<label class="field"><span>ວິທີຊຳລະ</span><select name="method">${payOpts('cash')}</select></label>`, async (v) => {
    await api(`/redemptions/${id}/collect-oat`, { method: 'POST', body: v }); toast('ບັນທຶກແລ້ວ', 'ok'); done();
  }, { ok: 'ໄດ້ຮັບເງິນແລ້ວ' });
}

// ───────── redemptions log
async function redemptions() {
  const d = await api(`/redemptions?from=${F.from || ''}&to=${F.to || ''}`); const L = d.list; const live = L.filter((r) => !r.reversed_at);
  const oatPaid = live.filter((r) => r.oat_fee && r.order_payment === 'paid').reduce((s, r) => s + r.oat_fee, 0); const oatDue = live.filter((r) => r.oat_fee && r.order_payment !== 'paid').reduce((s, r) => s + r.oat_fee, 0);
  $('#body').innerHTML = `<form class="filters" id="rfF"><input type="date" name="from" value="${esc(d.from)}" aria-label="ຈາກ"><input type="date" name="to" value="${esc(d.to)}" aria-label="ຫາ"></form>
  <div class="counts club-kpis"><div class="count"><b class="num">${live.length}</b><span>ອໍເດີສະມາຊິກ</span></div><div class="count"><b class="num">${live.reduce((s, r) => s + r.qty, 0)}</b><span>ຈອກ</span></div><div class="count"><b class="num">${money(oatPaid)}</b><span>ຄ່ານົມໂອ໊ດທີ່ເກັບແລ້ວ</span></div><div class="count${oatDue ? ' hot' : ''}"><b class="num">${money(oatDue)}</b><span>ຄ່ານົມໂອ໊ດຄ້າງ</span></div><div class="count"><b class="num">${L.length - live.length}</b><span>ຍົກເລີກ</span></div></div>
  <div class="panel"><div class="table-wrap"><table class="simple"><thead><tr><th>ເວລາ</th><th>ອໍເດີ</th><th>ສະມາຊິກ</th><th>ເຄື່ອງດື່ມ</th><th class="r">ຈອກ</th><th class="r">ນົມໂອ໊ດ</th><th>Loyverse</th><th>ພະນັກງານ</th></tr></thead><tbody>
  ${L.map((r) => `<tr class="${r.reversed_at ? 'strike-row' : ''}"><td class="small num">${laoDateTime(r.created_at)}</td><td class="num small">${esc(r.order_no || '')}</td><td><a href="#" data-view="${r.membership_id}">${esc(r.name)}</a><div class="tiny muted num">${esc(r.member_no)}</div></td><td>${esc(drinkName(r.drink, r.milk))}${r.reversed_at ? `<div class="tiny">ຍົກເລີກ: ${esc(r.reverse_reason)} — ${esc(r.reversed_by_name || '')}</div>` : ''}</td><td class="r num">${r.qty}</td><td class="r num small">${r.oat_fee ? `${money(r.oat_fee, { symbol: true })} ${r.order_payment === 'paid' ? '✓' : `⚠ <button class="btn small ghost" data-oat="${r.id}">ເກັບເງິນ</button>`}` : ''}</td><td class="small">${esc(r.pos_ref || '')}</td><td class="small">${esc(r.staff_name || '')}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">ບໍ່ມີຂໍ້ມູນ</td></tr>'}
  </tbody></table></div><p class="small muted">Loyverse: ບັນທຶກເຄື່ອງດື່ມສະມາຊິກເປັນສິນຄ້າ “Matcha Club Redemption” ລາຄາ 0 ກີບ (ບໍ່ມີສູດ) ແລະ ເກັບສະເພາະຄ່ານົມໂອ໊ດ — ຍອດຂາຍ ແລະ ສາງບໍ່ຖືກນັບຊ້ຳ.</p></div>`;
  $('#rfF').addEventListener('change', (e) => { F[e.target.name] = e.target.value; render(); });
  $$('[data-oat]').forEach((b) => b.addEventListener('click', () => collectOat(b.dataset.oat, render)));
}

// ───────── powder & costs
async function stock() {
  const d = await api('/stock');
  const unconf = Object.entries(d.cfg.price).filter(([, p]) => !p.ok).map(([k]) => ING[k][0]);
  if (!d.cfg.recOk) unconf.push('ປະລິມານສູດ'); const lastFx = d.cfg.fx[d.cfg.fx.length - 1]; if (/confirm/i.test(lastFx.note || '')) unconf.push('ອັດຕາແລກປ່ຽນ');
  $('#body').innerHTML = `<div class="counts club-kpis"><div class="count${d.coverDays !== null && d.coverDays < 7 ? ' hot' : ''}"><b class="num">${Math.round(d.remaining).toLocaleString('en-US')} g</b><span>ຜົງ Matcha Club ຄົງເຫຼືອ${d.coverDays !== null ? ` · ~${d.coverDays} ມື້` : ''}</span></div><div class="count"><b class="num">${Math.round(d.month_g).toLocaleString('en-US')} g</b><span>ໃຊ້ເດືອນນີ້</span></div><div class="count"><b class="num">${d.perDay.toFixed(1)} g</b><span>ສະເລ່ຍ/ມື້ (14 ມື້)</span></div><div class="count"><b class="num">${d.fx.toLocaleString('en-US')}</b><span>1 THB = ? ກີບ (ແຕ່ ${dLo(lastFx.from)})</span></div></div>
  <div class="panel"><h2>ຕົ້ນທຶນຕໍ່ຈອກ</h2>${unconf.length ? `<div class="alert warn">ຕົວເລກທີ່ຍັງບໍ່ໄດ້ຢືນຢັນ: ${esc(unconf.join(', '))}${ME.role === 'admin' ? ' — ແກ້ໄຂໄດ້ໃນ “ແພັກເກດ ແລະ ຕັ້ງຄ່າ”' : ''}</div>` : ''}
  <div class="table-wrap"><table class="simple"><thead><tr><th>ເຄື່ອງດື່ມ</th><th class="r">ວັດຖຸດິບ</th><th class="r">ບັນຈຸພັນ</th><th class="r">ລວມ (ກີບ)</th></tr></thead><tbody>${d.costs.map((c) => `<tr><td><b>${esc(drinkName(c.drink, c.milk))}</b><div class="tiny muted">${c.lines.map((l) => `${ING[l.k][0]} ${l.q}${ING[l.k][1]}`).join(' · ')}</div></td><td class="r num">${c.ing.toLocaleString('en-US')}</td><td class="r num">${c.pack.toLocaleString('en-US')}</td><td class="r num"><b>${c.total.toLocaleString('en-US')}</b></td></tr>`).join('')}</tbody></table></div></div>
  <div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">ຄວາມເຄື່ອນໄຫວຜົງ Matcha Club</h2><button class="btn small" id="stAdd">＋ ບັນທຶກ</button></div><p class="small muted">ສາງແຍກສະເພາະສະມາຊິກ: ຕັດ 4g ຕໍ່ຈອກອັດຕະໂນມັດເມື່ອແລກ. ການນັບສາງຈິງຈະຕັ້ງຍອດໃໝ່.</p>
  <div class="table-wrap"><table class="simple"><thead><tr><th>ເວລາ</th><th>ປະເພດ</th><th class="r">g</th><th>ໝາຍເຫດ</th><th>ໂດຍ</th></tr></thead><tbody>${d.moves.map((x) => `<tr><td class="small num">${laoDateTime(x.created_at)}</td><td>${{ recv: 'ຮັບເຂົ້າ', count: 'ນັບສາງ', waste: 'ເສຍ / ທົດລອງ' }[x.type]}</td><td class="r num">${Number(x.grams).toLocaleString('en-US')}</td><td class="small">${esc(x.note || '')}${x.thb ? ` · ${Number(x.thb).toLocaleString('en-US')} THB` : ''}</td><td class="small">${esc(x.user_name || '')}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">ຍັງບໍ່ມີ</td></tr>'}</tbody></table></div></div>`;
  $('#stAdd').addEventListener('click', async () => {
    ask('ຜົງ Matcha Club', `<label class="field"><span>ປະເພດ</span><select name="type"><option value="recv">ຮັບເຂົ້າ</option><option value="count">ນັບສາງ (ຍອດຈິງ)</option><option value="waste">ເສຍ / ທົດລອງ</option></select></label><div class="row"><label class="field"><span>ກຣາມ</span><input name="grams" inputmode="decimal" required></label><label class="field"><span>ລາຄາ (THB, ຖ້າຮັບເຂົ້າ)</span><input name="thb" inputmode="decimal"></label></div><label class="field"><span>ໝາຍເຫດ</span><input name="note"></label>`, async (v) => {
      await api('/stock', { method: 'POST', body: v }); toast('ບັນທຶກແລ້ວ', 'ok'); render();
    });
  });
}

// ───────── monthly report (admin)
let MONTH = today().slice(0, 7);
async function report() {
  const R = await api(`/report?month=${MONTH}`);
  const pop = Object.entries(R.popularity).sort((a, b) => b[1] - a[1]); const maxPop = Math.max(1, ...pop.map((x) => x[1]));
  const pct = (v) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`);
  $('#body').innerHTML = `<div class="row" style="justify-content:space-between;align-items:center"><div class="row" style="align-items:center"><button class="btn small ghost" data-m="-1" aria-label="ເດືອນກ່ອນ">‹</button><b class="num">${R.month}</b><button class="btn small ghost" data-m="1" aria-label="ເດືອນຕໍ່ໄປ">›</button></div>
    <div class="row"><button class="btn small" id="xlsx">⬇ Excel</button><button class="btn small ghost" id="pdf">⬇ PDF</button></div></div>
  <div id="repArea" class="rep">
   <div class="brand-mini"><img src="/logo.webp" alt=""><span>Matcha Club · ລາຍງານປະຈຳເດືອນ ${R.month}</span></div>
   <div class="counts club-kpis"><div class="count"><b class="num">${R.sold}</b><span>ຂາຍສະມາຊິກ (ໃໝ່ ${R.new_members} · ຕໍ່ອາຍຸ ${R.renewals})</span></div><div class="count"><b class="num">${money(R.collected)}</b><span>ເງິນທີ່ໄດ້ຮັບ</span></div><div class="count"><b class="num">${money(R.recognized)}</b><span>ລາຍຮັບທີ່ຮັບຮູ້ (${{ redeem: 'ຕາມຈອກທີ່ແລກ', straight: 'ສະເລ່ຍຕາມມື້', cash: 'ເມື່ອຮັບເງິນ' }[R.policy]})</span></div><div class="count"><b class="num">${money(R.deferred_end)}</b><span>ລາຍຮັບລ່ວງໜ້າ ທ້າຍເດືອນ · ${R.cups_owed_end} ຈອກຄ້າງ</span></div><div class="count"><b class="num">${R.cups}</b><span>ຈອກທີ່ແລກ · ${Math.round(R.powder_g)} g ຜົງ</span></div><div class="count"><b class="num">${money(R.contribution)}</b><span>ກຳໄລປະມານ</span></div></div>
   <div class="grid2"><div class="panel"><h2>ຍອດຂາຍຕາມແພັກເກດ</h2><table class="simple"><thead><tr><th>ແພັກເກດ</th><th class="r">ຂາຍ</th><th class="r">ຕໍ່ອາຍຸ</th><th class="r">ກີບ</th></tr></thead><tbody>${Object.entries(R.by_package).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r num">${v.sold}</td><td class="r num">${v.renewals}</td><td class="r num">${v.amount.toLocaleString('en-US')}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">—</td></tr>'}</tbody></table>
     <h3 style="margin-top:12px">ການຊຳລະ</h3><div class="money">${Object.entries(R.by_method).map(([k, v]) => `<div><span>${PAY[k]}</span><b>${money(v)}</b></div>`).join('')}<div><span>ຄ່ານົມໂອ໊ດ (ເກັບແລ້ວ / ຄ້າງ)</span><b>${money(R.oat_paid)} / ${money(R.oat_unpaid)}</b></div><div><span>ຄືນເງິນ (${R.refunds})</span><b>${money(R.refund_amount)}</b></div></div></div>
    <div class="panel"><h2>ຄວາມນິຍົມເຄື່ອງດື່ມ</h2>${pop.map(([k, v]) => `<div class="bar-row"><span>${esc(k)}</span><i style="width:${Math.round(v / maxPop * 100)}%"></i><b class="num">${v}</b></div>`).join('') || '<p class="muted">—</p>'}</div></div>
   <div class="panel"><h2>ສະຫຼຸບ</h2><div class="money"><div><span>ລາຍຮັບທີ່ຮັບຮູ້</span><b>${money(R.recognized)}</b></div><div><span>+ ຄ່ານົມໂອ໊ດທີ່ເກັບ</span><b>${money(R.oat_paid)}</b></div><div><span>− ວັດຖຸດິບ</span><b>${money(R.ing_cost)}</b></div><div><span>− ບັນຈຸພັນ</span><b>${money(R.pack_cost)}</b></div><div class="due"><span>ກຳໄລປະມານ</span><b>${money(R.contribution)}</b></div>
     <div><span>ໝົດອາຍຸເດືອນນີ້ (ຈອກບໍ່ໄດ້ໃຊ້)</span><b>${R.expired} (${R.unused_at_expiry})</b></div><div><span>ຍົກເລີກການແລກ</span><b>${R.reversed}</b></div><div><span>ອັດຕາການແລກ (ສະມາຊິກທີ່ປິດແລ້ວ)</span><b>${pct(R.redemption_rate)}</b></div></div>
     <p class="tiny muted">ຕົ້ນທຶນເປັນການປະມານຈາກສູດ ແລະ ລາຄາໃນວັນທີ່ແລກ.</p></div></div>`;
  $$('[data-m]').forEach((b) => b.addEventListener('click', () => { const [y, m] = MONTH.split('-').map(Number); MONTH = new Date(Date.UTC(y, m - 1 + Number(b.dataset.m), 1)).toISOString().slice(0, 7); render(); }));
  $('#xlsx').addEventListener('click', (e) => guard(e.currentTarget, async () => {
    await loadScript('/xlsx.full.min.js'); const X = window.XLSX; const wb = X.utils.book_new();
    const add = (name, rows) => X.utils.book_append_sheet(wb, X.utils.json_to_sheet(rows.length ? rows : [{ note: 'No data' }]), name);
    add('Summary', [['Month', R.month], ['Memberships sold', R.sold], ['New members', R.new_members], ['Renewals', R.renewals], ['Cash collected (LAK)', R.collected], ['Revenue recognized (LAK)', R.recognized], ['Deferred revenue at month end (LAK)', R.deferred_end], ['Cups owed at month end', R.cups_owed_end], ['Cups redeemed', R.cups], ['Powder used (g)', R.powder_g], ['Oat upgrades paid (LAK)', R.oat_paid], ['Oat upgrades unpaid (LAK)', R.oat_unpaid], ['Ingredient cost (LAK)', R.ing_cost], ['Packaging cost (LAK)', R.pack_cost], ['Estimated contribution (LAK)', R.contribution], ['Refunds (LAK)', R.refund_amount], ['Expired memberships', R.expired], ['Unused cups at expiry', R.unused_at_expiry], ['Reversed redemptions', R.reversed], ['Redemption rate', R.redemption_rate == null ? '' : R.redemption_rate], ['Revenue policy', R.policy]].map(([metric, value]) => ({ metric, value })));
    add('Sales', R.rows.sales); add('Redemptions', R.rows.redemptions); add('Popularity', Object.entries(R.popularity).map(([drink, cups]) => ({ drink, cups })));
    add('All memberships', R.rows.memberships); add('Expired-refunds-reversals', R.rows.closures);
    X.writeFile(wb, `maison-matcha-club-${R.month}.xlsx`);
  }));
  $('#pdf').addEventListener('click', (e) => guard(e.currentTarget, async () => {
    const ld = (s) => new Promise((res, rej) => { if (document.querySelector(`script[src="${s}"]`)) return res(); const x = document.createElement('script'); x.src = s; x.onload = res; x.onerror = rej; document.head.append(x); });
    await Promise.all([ld('/html2canvas.min.js'), ld('/jspdf.umd.min.js')]); await document.fonts.ready;
    const el = $('#repArea'); el.classList.add('pdf'); const cv = await window.html2canvas(el, { scale: 2, backgroundColor: '#ffffff', windowWidth: 900 }); el.classList.remove('pdf');
    const { jsPDF } = window.jspdf; const pdf = new jsPDF({ unit: 'mm', format: 'a4' }); const w = 190; const pageH = Math.floor(cv.width * 277 / w);
    for (let y = 0, pg = 0; y < cv.height; y += pageH, pg++) { const h = Math.min(pageH, cv.height - y); const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = h; c2.getContext('2d').drawImage(cv, 0, y, cv.width, h, 0, 0, cv.width, h); if (pg) pdf.addPage(); pdf.addImage(c2.toDataURL('image/jpeg', 0.92), 'JPEG', 10, 10, w, h * w / cv.width); }
    pdf.save(`maison-matcha-club-${R.month}.pdf`);
  }));
}

// ───────── settings (admin)
async function settings() {
  const d = await api('/packages'); const c = d.cfg;
  const rk = [['latte', 'ມັດຊະລາເຕ້ (ນົມສົດ)'], ['latte_oat', 'ມັດຊະລາເຕ້ (ນົມໂອ໊ດ)'], ['coconut', 'ມັດຊະນ້ຳໝາກພ້າວ'], ['clear', 'ມັດຊະໃສ'], ['velvet', 'ໂຄໂຄນັດ ເວວເວັດ']];
  $('#body').innerHTML = `<div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">ແພັກເກດ</h2><button class="btn small" id="pkAdd">＋ ເພີ່ມແພັກເກດ</button></div>
   <p class="small muted">ການແກ້ລາຄາ, ຈອກ ຫຼື ມື້ ໃຊ້ກັບການຂາຍໃໝ່ເທົ່ານັ້ນ — ສະມາຊິກທີ່ຂາຍແລ້ວຮັກສາເງື່ອນໄຂເດີມ.</p>
   <div class="table-wrap"><table class="simple"><thead><tr><th>ແພັກເກດ</th><th class="r">ຈອກ</th><th class="r">ລາຄາ</th><th class="r">ມື້</th><th class="r">ກີບ/ຈອກ</th><th class="r">ກຳໄລ (ໃຊ້ຄົບ)</th><th class="r">ກຳໄລ (ອັດຕາຈິງ)</th><th></th></tr></thead><tbody>
   ${d.packages.map((p) => `<tr class="click" data-pk="${p.id}"><td><b>${esc(p.name)}</b></td><td class="r num">${p.cups}</td><td class="r num">${p.price.toLocaleString('en-US')}</td><td class="r num">${p.days}</td><td class="r num">${p.per_cup.toLocaleString('en-US')}</td><td class="r num">${p.contrib_full.toLocaleString('en-US')}</td><td class="r num">${p.contrib_rate == null ? '—' : p.contrib_rate.toLocaleString('en-US')}</td><td>${p.active ? '<span class="chip pay-paid">ຂາຍຢູ່</span>' : '<span class="chip st-cancelled">ປິດ</span>'}</td></tr>`).join('')}
   </tbody></table></div><p class="tiny muted">ຕົ້ນທຶນສະເລ່ຍ/ຈອກ ${money(d.avg_cost)} · ອັດຕາການແລກ ${d.rate == null ? '—' : `${(d.rate * 100).toFixed(1)}%`}</p></div>
  <form class="panel" id="cfgF"><h2>ຕົ້ນທຶນ, ສູດ ແລະ ນະໂຍບາຍ</h2>
   <h3>ລາຄາວັດຖຸດິບ</h3><div class="table-wrap"><table class="simple"><thead><tr><th>ວັດຖຸດິບ</th><th>ລາຄາ</th><th>ສະກຸນ</th><th>ຕໍ່ (g/ml)</th><th>ຢືນຢັນແລ້ວ</th></tr></thead><tbody>
   ${Object.keys(ING).map((k) => { const p = c.price[k] || {}; return `<tr><td>${ING[k][0]}</td><td><input name="p.${k}.amt" value="${p.amt ?? ''}" inputmode="decimal" class="w-num"></td><td><select name="p.${k}.cur"><option ${p.cur !== 'THB' ? 'selected' : ''}>LAK</option><option ${p.cur === 'THB' ? 'selected' : ''}>THB</option></select></td><td><input name="p.${k}.per" value="${p.per ?? ''}" inputmode="decimal" class="w-num"></td><td><input type="checkbox" name="p.${k}.ok" ${p.ok ? 'checked' : ''}></td></tr>`; }).join('')}
   <tr><td>ບັນຈຸພັນ / ຈອກ</td><td><input name="pack" value="${c.pack}" inputmode="numeric" class="w-num"></td><td>LAK</td><td>1</td><td><input type="checkbox" name="packOk" ${c.packOk ? 'checked' : ''}></td></tr></tbody></table></div>
   <h3 style="margin-top:14px">ສູດຕໍ່ຈອກ</h3><div class="table-wrap"><table class="simple"><thead><tr><th></th>${Object.keys(ING).map((k) => `<th>${ING[k][0]} (${ING[k][1]})</th>`).join('')}</tr></thead><tbody>
   ${rk.map(([key, lbl]) => `<tr><td>${lbl}</td>${Object.keys(ING).map((k) => `<td><input name="r.${key}.${k}" value="${(c.rec[key] || {})[k] ?? ''}" inputmode="decimal" class="w-num"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
   <label class="check"><input type="checkbox" name="recOk" ${c.recOk ? 'checked' : ''}> ຢືນຢັນປະລິມານສູດແລ້ວ</label>
   <h3 style="margin-top:14px">ອັດຕາແລກປ່ຽນ THB → LAK</h3><div class="small">${c.fx.map((f) => `<div>${dLo(f.from)}: <b class="num">1 THB = ${Number(f.rate).toLocaleString('en-US')} ກີບ</b> <span class="muted">${esc(f.note || '')}${f.by ? ` · ${esc(f.by)}` : ''}</span></div>`).join('')}</div>
   <div class="row"><label class="field"><span>ອັດຕາໃໝ່</span><input name="fx.rate" inputmode="decimal"></label><label class="field"><span>ນຳໃຊ້ແຕ່ວັນທີ</span><input type="date" name="fx.from" value="${today()}"></label><label class="field"><span>ໝາຍເຫດ</span><input name="fx.note" placeholder="ເຊັ່ນ: ອັດຕາ BCEL"></label></div>
   <h3 style="margin-top:14px">ນະໂຍບາຍ</h3>
   <div class="row"><label class="field"><span>ຄ່ານົມໂອ໊ດເພີ່ມ / ຈອກ</span><input name="oatFee" value="${c.oatFee}" inputmode="numeric"></label><label class="field"><span>ການຮັບຮູ້ລາຍຮັບ</span><select name="policy"><option value="redeem" ${c.policy === 'redeem' ? 'selected' : ''}>ຕາມຈອກທີ່ແລກ (ແນະນຳ)</option><option value="straight" ${c.policy === 'straight' ? 'selected' : ''}>ສະເລ່ຍຕາມມື້</option><option value="cash" ${c.policy === 'cash' ? 'selected' : ''}>ທັງໝົດເມື່ອຮັບເງິນ</option></select></label></div>
   <label class="check"><input type="checkbox" name="breakage" ${c.breakage ? 'checked' : ''}> ຮັບຮູ້ມູນຄ່າຈອກທີ່ບໍ່ໄດ້ໃຊ້ເມື່ອໝົດອາຍຸ</label>
   <div class="row"><label class="field"><span>ແຈ້ງເຕືອນກ່ອນໝົດອາຍຸ (ມື້)</span><input name="remind" value="${c.remind}" inputmode="numeric"></label><label class="field"><span>ແຈ້ງເຕືອນເມື່ອເຫຼືອ (ຈອກ)</span><input name="lowCups" value="${c.lowCups}" inputmode="numeric"></label></div>
   <label class="field"><span>ຊື່ສິນຄ້າໃນ Loyverse</span><input name="posName" value="${esc(c.posName)}"></label>
   <p class="tiny muted">ນະໂຍບາຍໃໝ່ໃຊ້ກັບສະມາຊິກທີ່ຂາຍຫຼັງຈາກນີ້. ກວດສອບກັບນັກບັນຊີ.</p>
   <button class="btn" type="submit">ບັນທຶກ</button></form>`;
  $$('[data-pk]').forEach((r) => r.addEventListener('click', () => pkg(d.packages.find((p) => String(p.id) === r.dataset.pk))));
  $('#pkAdd').addEventListener('click', () => pkg(null));
  $('#cfgF').addEventListener('submit', (e) => { e.preventDefault(); guard(e.submitter || $('#cfgF button'), async () => {
    const fd = new FormData(e.target); const body = { price: {}, rec: {}, fx: {} };
    for (const [k, v] of fd) { const p = k.split('.'); if (p[0] === 'p') { body.price[p[1]] = body.price[p[1]] || {}; body.price[p[1]][p[2]] = v; } else if (p[0] === 'r') { body.rec[p[1]] = body.rec[p[1]] || {}; body.rec[p[1]][p[2]] = v; } else if (p[0] === 'fx') body.fx[p[1]] = v; else body[k] = v; }
    Object.keys(ING).forEach((k) => { body.price[k].ok = fd.has(`p.${k}.ok`); }); ['packOk', 'recOk', 'breakage'].forEach((k) => { body[k] = fd.has(k); });
    ['pack', 'oatFee', 'remind', 'lowCups'].forEach((k) => { body[k] = N(body[k]); });
    await api('/config', { method: 'PATCH', body }); toast('ບັນທຶກແລ້ວ', 'ok'); render();
  }); });
}
async function pkg(p) {
  ask(p ? esc(p.name) : 'ແພັກເກດໃໝ່', `<label class="field"><span>ຊື່</span><input name="name" value="${esc(p ? p.name : '')}" required></label>
    <div class="row"><label class="field"><span>ຈອກ</span><input name="cups" inputmode="numeric" value="${p ? p.cups : ''}"></label><label class="field"><span>ລາຄາ (ກີບ)</span><input name="price" inputmode="numeric" value="${p ? p.price.toLocaleString('en-US') : ''}"></label><label class="field"><span>ມື້</span><input name="days" inputmode="numeric" value="${p ? p.days : 30}"></label></div>
    <div class="row"><label class="field"><span>ລຳດັບ</span><input name="sort" inputmode="numeric" value="${p ? p.sort : 9}"></label><label class="check"><input type="checkbox" name="active" ${!p || p.active ? 'checked' : ''}> ເປີດຂາຍ</label></div>
    <p class="tiny muted">ສະມາຊິກທີ່ຂາຍແລ້ວບໍ່ປ່ຽນ.</p>`, async (v) => {
    const body = { name: v.name, cups: N(v.cups), price: N(v.price), days: N(v.days), sort: N(v.sort), active: !!v.active };
    await api(p ? `/packages/${p.id}` : '/packages', { method: p ? 'PATCH' : 'POST', body }); toast('ບັນທຶກແລ້ວ', 'ok'); render();
  });
}

// ───────── staff accounts (admin)
async function staffUsers() {
  const { users } = await api('/users');
  $('#body').innerHTML = `<div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">ບັນຊີພະນັກງານ</h2><button class="btn small" id="uAdd">＋ ເພີ່ມພະນັກງານ</button></div>
  <p class="small muted">ພະນັກງານ: ລົງທະບຽນສະມາຊິກ, ຢືນຢັນການຊຳລະ, ແລກເຄື່ອງດື່ມ. ຜູ້ດູແລ: ທຸກຢ່າງ ລວມທັງລາຄາ, ຄືນເງິນ, ຍົກເລີກການແລກ ແລະ ລາຍງານ.</p>
  <div class="table-wrap"><table class="simple"><thead><tr><th>ຊື່</th><th>ຊື່ຜູ້ໃຊ້</th><th>ສິດ</th><th>ສະຖານະ</th></tr></thead><tbody>${users.map((u) => `<tr class="click" data-u="${u.id}"><td><b>${esc(u.display_name)}</b></td><td class="num">${esc(u.username)}</td><td>${u.role === 'admin' ? 'ຜູ້ດູແລ' : 'ພະນັກງານ'}</td><td>${u.active ? '<span class="chip pay-paid">ໃຊ້ງານ</span>' : '<span class="chip st-cancelled">ປິດ</span>'}</td></tr>`).join('')}</tbody></table></div></div>`;
  $('#uAdd').addEventListener('click', () => ask('ເພີ່ມພະນັກງານ', `<label class="field"><span>ຊື່ທີ່ສະແດງ</span><input name="display_name" required></label><label class="field"><span>ຊື່ຜູ້ໃຊ້ (a–z, 0–9)</span><input name="username" autocapitalize="none" required></label>
    <label class="field"><span>ລະຫັດຜ່ານ (8 ຕົວຂຶ້ນໄປ)</span><input name="password" type="password" autocomplete="new-password" minlength="8" required></label><label class="field"><span>ສິດ</span><select name="role"><option value="staff">ພະນັກງານ</option><option value="admin">ຜູ້ດູແລ</option></select></label>`,
  async (v) => { await api('/users', { method: 'POST', body: v }); toast('ບັນທຶກແລ້ວ', 'ok'); render(); }));
  $$('[data-u]').forEach((r) => r.addEventListener('click', () => {
    const u = users.find((x) => String(x.id) === r.dataset.u);
    ask(esc(u.display_name), `<label class="field"><span>ຊື່ທີ່ສະແດງ</span><input name="display_name" value="${esc(u.display_name)}"></label><label class="field"><span>ສິດ</span><select name="role"><option value="staff" ${u.role === 'staff' ? 'selected' : ''}>ພະນັກງານ</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>ຜູ້ດູແລ</option></select></label>
      <label class="field"><span>ຕັ້ງລະຫັດຜ່ານໃໝ່ (ຖ້າຕ້ອງການ)</span><input name="password" type="password" autocomplete="new-password"></label><label class="check"><input type="checkbox" name="active" ${u.active ? 'checked' : ''}> ໃຊ້ງານໄດ້</label>`,
    async (v) => { const body = { display_name: v.display_name, role: v.role, active: !!v.active }; if (v.password) body.password = v.password; await api(`/users/${u.id}`, { method: 'PATCH', body }); toast('ບັນທຶກແລ້ວ', 'ok'); render(); });
  }));
}

// ───────── shell
function actions(t) {
  if (t.dataset.view) view(Number(t.dataset.view));
  else if (t.dataset.pay) confirmPay(Number(t.dataset.pay));
  else if (t.dataset.renew) newMember(Number(t.dataset.renew));
  else if (t.dataset.redeem) redeem(Number(t.dataset.redeem));
}
async function render() {
  $$('#tabs input').forEach((i) => { i.checked = i.value === TAB; });
  try { await ({ ov: overview, red: redemptions, stock, rep: report, set: settings, users: staffUsers }[TAB] || overview)(); } catch (e) { $('#body').innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
}
(async () => {
  ME = await initStaff();
  if (ME.role === 'admin') $$('[data-admin]').forEach((x) => x.classList.remove('hidden'));
  const s = await api('/stock').catch(() => null); if (s) OAT = s.cfg.oatFee;
  $('#tabs').addEventListener('change', (e) => { TAB = e.target.value; render(); });
  $('#newM').addEventListener('click', () => newMember());
  $('#redeemB').addEventListener('click', () => redeem());
  $('#body').addEventListener('click', (e) => { const t = e.target.closest('[data-view],[data-pay],[data-renew],[data-redeem]'); if (t) { e.preventDefault(); actions(t); } });
  const qs = new URLSearchParams(location.search); if (qs.get('redeem') !== null) redeem();
  $('#pwBtn').addEventListener('click', () => ask('ປ່ຽນລະຫັດຜ່ານ', '<label class="field"><span>ລະຫັດຜ່ານປັດຈຸບັນ</span><input type="password" name="current" autocomplete="current-password" required></label><label class="field"><span>ລະຫັດຜ່ານໃໝ່ (8 ຕົວຂຶ້ນໄປ)</span><input type="password" name="password" autocomplete="new-password" minlength="8" required></label>', async (v) => {
    const r = await api('/auth/password', { method: 'POST', body: v }); setToken(r.token); toast('ປ່ຽນແລ້ວ', 'ok');
  }));
  await render();
})();
