// Sales page (admins): Loyverse receipts pulled into Supabase every 15 minutes.
import { api, $, $$, esc, money, toast, fieldError, clearErrors, initStaff, loadScript } from './club-common.js';

const POWDER = {
  no1: 'Maison No.1 · Roasted Velvet',
  no2l: 'Maison No.2 · Emerald Umami (ລາເຕ້)',
  no2c: 'Maison No.2 · Emerald Umami (Clear / ໝາກພ້າວ)',
  no3: 'Maison No.3 · Nutty Reserve',
  none: 'ບໍ່ມີມັດຊະ',
};
const PW = ['no1', 'no2l', 'no2c', 'no3'];
const keyOf = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const k = (n) => money(n, { symbol: true });
const num = (v) => Number(v) || 0;
const laoToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, n) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const dLabel = (d) => `${Number(d.slice(8))}/${Number(d.slice(5, 7))}`;
const LS = { get(key, def) { try { const v = localStorage.getItem(`mm-sales-${key}`); return v == null ? def : JSON.parse(v); } catch { return def; } }, set(key, v) { try { localStorage.setItem(`mm-sales-${key}`, JSON.stringify(v)); } catch { /* private mode */ } } };

let D = null; let TAB = LS.get('tab', 'ov'); let ME = null;

function dialog(title, body, foot = '') {
  const d = document.createElement('dialog');
  d.innerHTML = `<div class="dlg-head"><h3>${title}</h3><button class="x" type="button" aria-label="ປິດ" data-close>×</button></div><div class="dlg-body">${body}</div>${foot ? `<div class="dlg-foot">${foot}</div>` : ''}`;
  document.body.append(d);
  d.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) d.close(); });
  d.addEventListener('close', () => d.remove());
  d.showModal(); return d;
}
async function guard(btn, fn) {
  if (btn.dataset.busy) return; btn.dataset.busy = '1'; btn.disabled = true;
  try { await fn(); } catch (e) { toast(e.message, 'err'); if (e.field) fieldError(btn.closest('dialog, form')?.querySelector(`[name="${e.field}"]`), e.message); } finally { delete btn.dataset.busy; btn.disabled = false; }
}

// ───────── data
function setRange(kind) {
  const td = laoToday(); let from = td; let to = td;
  if (kind === '7') from = addDays(td, -6);
  else if (kind === '30') from = addDays(td, -29);
  else if (kind === 'month') from = `${td.slice(0, 7)}-01`;
  else if (kind === 'last') { const first = `${td.slice(0, 7)}-01`; to = addDays(first, -1); from = `${to.slice(0, 7)}-01`; }
  $('#from').value = from; $('#to').value = to;
}
async function load() {
  $('#body').innerHTML = '<div class="panel muted">ກຳລັງໂຫຼດ…</div>';
  D = await api(`/sales?from=${$('#from').value}&to=${$('#to').value}`);
  derive(); info(); render();
}
function derive() {
  const map = {}; D.map.forEach((m) => { map[m.key] = m; }); D.mapBy = map;
  D.dayRows = D.days.map((d) => {
    const p = d.pay || {}; const net = num(d.gross) - num(d.discounts) - num(d.refunds);
    return { ...d, net, hist: d.source !== 'loyverse', cash: num(p.cash), qr: num(p.qr) + num(p.bcel) + num(p.ldb), card: num(p.card), other: num(p.other) };
  });
  const items = {}; D.items.forEach((it) => { const o = items[it.name] || (items[it.name] = { name: it.name, qty: 0, net: 0, cogs: 0 }); o.qty += num(it.qty); o.net += num(it.net); o.cogs += num(it.cogs); });
  D.itemRows = Object.values(items).filter((r) => r.qty || r.net).map((r) => ({ ...r, qty: Math.round(r.qty * 10) / 10 })).sort((a, b) => b.net - a.net);
  D.estItems = D.items.some((it) => it.est); D.histItems = D.items.some((it) => it.source);
  const use = Object.fromEntries(PW.map((p) => [p, 0])); const missing = []; const guesses = [];
  D.itemRows.forEach((r) => {
    const m = map[keyOf(r.name)];
    if (!m || !m.powder) { if (r.qty > 0) missing.push(r); return; }
    if (!m.checked && m.powder !== 'none' && r.qty > 0) guesses.push({ ...r, m });
    if (PW.includes(m.powder)) use[m.powder] += r.qty * num(m.grams);
  });
  D.use = use; D.missing = missing; D.guesses = guesses;
  D.drinks = D.itemRows.reduce((s, r) => { const m = map[keyOf(r.name)]; return s + (m && PW.includes(m.powder) ? r.qty : 0); }, 0);
  D.clubGrams = D.club.reduce((s, c) => s + num(c.grams), 0); D.clubCups = D.club.reduce((s, c) => s + num(c.cups), 0);
  const cl = {}; D.closings.forEach((c) => { cl[c.day] = c; }); D.closeBy = cl;
}
function info() {
  const s = D.sync || {}; const parts = [];
  parts.push(s.last_ok ? `ອັບເດດຈາກ Loyverse: ${new Date(s.last_ok).toLocaleString('en-GB', { timeZone: 'Asia/Vientiane', dateStyle: 'short', timeStyle: 'short' })} · ອັບເດດເອງທຸກ 15 ນາທີ` : 'ຍັງບໍ່ໄດ້ດຶງຂໍ້ມູນ');
  $('#syncInfo').textContent = parts.join(' ');
  const warn = [];
  if (s.last_error) warn.push(`<div class="alert err">ດຶງຂໍ້ມູນຈາກ Loyverse ບໍ່ສຳເລັດ: ${esc(s.last_error)}</div>`);
  const hist = D.dayRows.filter((r) => r.hist);
  if (hist.length) warn.push(`<div class="alert info">${esc(hist[0].date)} – ${esc(hist[hist.length - 1].date)}: ໃຊ້ຂໍ້ມູນເກົ່າຈາກລາຍງານປິດຮ້ານ (Notion) ແລະ ການປ້ອນເອງໃນລະບົບບໍລິຫານ — ມີແຕ່ຍອດຂາຍລວມ, ບໍ່ມີລາຍລະອຽດບິນ ແລະ ປະເພດການຊຳລະຈາກ Loyverse.${D.histItems ? ' ລາຍການສິນຄ້າ 1–18/10 ມາຈາກ Export Loyverse ເດືອນຕຸລາ' + (D.estItems ? ' (ເລືອກພຽງບາງມື້ໃນຊ່ວງນັ້ນ — ຕົວເລກສິນຄ້າແມ່ນການປະມານ)' : '') + '.' : ''}</div>`);
  D.warn = warn.join('');
}

// ───────── views
function render() {
  $$('#tabs input').forEach((i) => { i.checked = i.value === TAB; });
  ({ ov: overview, items: itemsTab, matcha: matchaTab, cash: cashTab }[TAB] || overview)();
}
function kpis(cards) { return `<div class="counts club-kpis">${cards.map(([v, l, hot]) => `<div class="count${hot ? ' hot' : ''}"><b class="num">${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>`; }
function overview() {
  const R = D.dayRows; const sum = (f) => R.reduce((s, r) => s + f(r), 0);
  const gross = sum((r) => num(r.gross)), disc = sum((r) => num(r.discounts)), ref = sum((r) => num(r.refunds)), net = sum((r) => r.net), tx = sum((r) => num(r.tx));
  const txDays = R.filter((r) => num(r.tx) > 0); const txNet = txDays.reduce((s, r) => s + r.net, 0);
  const cash = sum((r) => r.cash), qr = sum((r) => r.qr), card = sum((r) => r.card), other = sum((r) => r.other);
  const max = Math.max(1, ...R.map((r) => r.net));
  const bars = R.length ? `<div class="bars" role="img" aria-label="ຍອດສຸດທິລາຍວັນ">${R.map((r) => { const wd = new Date(`${r.date}T00:00:00Z`).getUTCDay(); return `<i class="${wd === 0 || wd === 6 ? 'wk' : ''}" style="height:${Math.max(2, r.net / max * 100)}%" title="${dLabel(r.date)} · ${k(r.net)}"></i>`; }).join('')}</div><div class="bars-x"><span>${dLabel(R[0].date)}</span><span>${dLabel(R[R.length - 1].date)}</span></div>` : '';
  const mix = [['ເງິນສົດ', cash], ['QR (BCEL + LDB)', qr], ['ບັດ', card], ['ອື່ນໆ', other]].filter(([, v]) => v);
  $('#body').innerHTML = `${D.warn}
    ${kpis([[k(net), 'ຍອດສຸດທິ'], [k(gross), 'ຍອດຂາຍລວມ'], [k(disc), 'ສ່ວນຫຼຸດ'], [k(ref), 'ຄືນເງິນ', ref > 0], [tx.toLocaleString(), txDays.length < R.length ? 'ບິນ (ມື້ທີ່ມີຂໍ້ມູນ)' : 'ບິນ'], [D.drinks.toLocaleString(), 'ເຄື່ອງດື່ມມັດຊະ'], [k(tx ? txNet / tx : 0), 'ສະເລ່ຍຕໍ່ບິນ'], [D.clubCups.toLocaleString(), 'ຈອກ Matcha Club']])}
    <div class="panel"><h2>ຍອດສຸດທິລາຍວັນ</h2>${bars || '<p class="muted">ບໍ່ມີຂໍ້ມູນໃນຊ່ວງນີ້</p>'}
      ${mix.length ? `<div class="row" style="flex-wrap:wrap;margin-top:14px">${mix.map(([l, v]) => `<div><div class="small muted">${l}</div><b class="num">${k(v)}</b> <span class="tiny muted">${net ? Math.round(v / net * 100) : 0}%</span></div>`).join('')}</div>` : ''}</div>
    <div class="panel"><h2>ລາຍວັນ</h2><div class="table-wrap"><table class="simple"><thead><tr><th>ວັນທີ</th><th class="r">ຍອດລວມ</th><th class="r">ສ່ວນຫຼຸດ</th><th class="r">ຄືນເງິນ</th><th class="r">ສຸດທິ</th><th class="r">ບິນ</th><th class="r">ເງິນສົດ</th><th class="r">QR</th><th class="r">ບັດ</th></tr></thead><tbody>
      ${R.slice().reverse().map((r) => `<tr><td>${esc(r.date)}${r.hist ? ` <span class="tiny muted">${r.source === 'manual' ? 'ປ້ອນເອງ' : 'Notion'}</span>` : ''}</td><td class="r num">${k(r.gross)}</td><td class="r num">${r.discounts ? k(r.discounts) : '—'}</td><td class="r num">${r.refunds ? k(r.refunds) : '—'}</td><td class="r num"><b>${k(r.net)}</b></td><td class="r num">${r.tx == null ? '—' : num(r.tx)}</td><td class="r num">${r.hist ? '—' : k(r.cash)}</td><td class="r num">${r.hist ? '—' : k(r.qr)}</td><td class="r num">${!r.hist && r.card ? k(r.card) : '—'}</td></tr>`).join('') || '<tr><td colspan="9" class="muted">ບໍ່ມີຂໍ້ມູນ</td></tr>'}
      </tbody></table></div></div>`;
}
function itemsTab() {
  const R = D.itemRows; const tot = R.reduce((s, r) => s + r.net, 0) || 1; const q = LS.get('q', '');
  $('#body').innerHTML = `${D.warn}<div class="panel"><h2>ລາຍການສິນຄ້າ · ${esc(D.from)} – ${esc(D.to)}</h2>
    <label class="field"><span>ຄົ້ນຫາ</span><input id="iq" value="${esc(q)}" placeholder="ຊື່ສິນຄ້າ"></label>
    <div class="table-wrap"><table class="simple"><thead><tr><th>#</th><th>ສິນຄ້າ</th><th class="r">ຈຳນວນ</th><th class="r">ຍອດສຸດທິ</th><th class="r">ລາຄາສະເລ່ຍ</th><th>ສັດສ່ວນ</th><th>ຜົງ</th></tr></thead><tbody id="ib"></tbody></table></div></div>`;
  const draw = () => {
    const f = $('#iq').value.trim().toLowerCase(); LS.set('q', f);
    $('#ib').innerHTML = R.filter((r) => !f || r.name.toLowerCase().includes(f)).map((r, i) => { const m = D.mapBy[keyOf(r.name)];
      return `<tr><td class="muted num">${i + 1}</td><td>${esc(r.name)}</td><td class="r num">${r.qty.toLocaleString()}</td><td class="r num">${k(r.net)}</td><td class="r num">${r.qty ? k(r.net / r.qty) : '—'}</td><td><div class="share"><i style="width:${Math.max(0, r.net / tot * 100)}%"></i></div></td><td class="tiny">${m && m.powder ? (m.powder === 'none' ? '<span class="muted">—</span>' : `${esc(POWDER[m.powder].split(' · ')[0])} · ${num(m.grams)} g${m.checked ? '' : ' ⚠'}`) : '<span class="chip pay-unpaid">ຍັງບໍ່ຕັ້ງ</span>'}</td></tr>`; }).join('') || '<tr><td colspan="7" class="muted">ບໍ່ມີຂໍ້ມູນ</td></tr>';
  };
  $('#iq').addEventListener('input', draw); draw();
}
function matchaTab() {
  const days = Math.max(1, D.dayRows.length); const cyc = LS.get('cycle', 15); const buf = LS.get('buffer', 10);
  const st = {}; D.stock.forEach((s) => { st[s.powder] = s; });
  const cards = PW.map((p) => {
    const used = D.use[p]; const avg = used / days; const s = st[p] || { grams: 0 };
    const need = Math.max(0, Math.ceil((avg * (cyc + buf) - num(s.grams)) / 10) * 10); const cover = avg > 0 ? Math.floor(num(s.grams) / avg) : null;
    return `<div class="panel"><h3>${esc(POWDER[p])}</h3>
      <dl><dt>ໃຊ້ໃນຊ່ວງນີ້</dt><dd class="num">${Math.round(used).toLocaleString()} g</dd><dt>ສະເລ່ຍ/ມື້</dt><dd class="num">${avg.toFixed(0)} g</dd>
      <dt>ມີໃນສາງ</dt><dd class="num"><button class="btn small ghost" data-stock="${p}">${num(s.grams).toLocaleString()} g ✎</button></dd>
      <dt>ພໍໃຊ້</dt><dd class="num">${cover == null ? '—' : `${cover} ມື້`}</dd></dl>
      <div class="small muted" style="margin-top:8px">ແນະນຳໃຫ້ສັ່ງ</div><div class="order num">${need.toLocaleString()} g</div>
      ${s.counted_on ? `<div class="tiny muted">ນັບສາງວັນທີ ${esc(s.counted_on)}</div>` : '<div class="tiny muted">ຍັງບໍ່ໄດ້ໃສ່ຈຳນວນໃນສາງ</div>'}</div>`;
  }).join('');
  const total = PW.reduce((s, p) => s + D.use[p], 0);
  const fix = [...D.missing.map((r) => ({ ...r, m: null })), ...D.guesses];
  $('#body').innerHTML = `${D.warn}
    ${kpis([[`${Math.round(total).toLocaleString()} g`, 'ຜົງມັດຊະທີ່ໃຊ້ (ຍອດຂາຍ)'], [`${(total / days).toFixed(0)} g`, 'ສະເລ່ຍຕໍ່ມື້'], [`${Math.round(D.clubGrams).toLocaleString()} g`, 'Matcha Club (ບໍ່ແຍກປະເພດ)'], [String(days), 'ມື້ທີ່ມີຍອດຂາຍ']])}
    <div class="panel"><div class="row" style="flex-wrap:wrap;align-items:flex-end">
      <label class="field"><span>ຮອບສັ່ງ (ມື້)</span><input type="number" min="1" max="60" id="cyc" value="${cyc}"></label>
      <label class="field"><span>ສຳຮອງ (ມື້)</span><input type="number" min="0" max="60" id="buf" value="${buf}"></label>
      <p class="small muted" style="flex:2">ແນະນຳ = ສະເລ່ຍ/ມື້ × (ຮອບສັ່ງ + ສຳຮອງ) − ທີ່ມີໃນສາງ. ສັ່ງວັນທີ 1 ແລະ 15 ຂອງເດືອນ; ມັດຊະຈາກຍີ່ປຸ່ນໃຊ້ເວລາ 5–10 ມື້.</p></div></div>
    <div class="pw" style="margin-top:14px">${cards}</div>
    ${D.clubGrams ? `<div class="alert info">ເຄື່ອງດື່ມ Matcha Club ໃຊ້ຜົງ ${Math.round(D.clubGrams).toLocaleString()} g ໃນຊ່ວງນີ້ — ບໍ່ໄດ້ລວມໃນບັດຂ້າງເທິງ ເພາະບໍ່ຮູ້ປະເພດຜົງ.</div>` : ''}
    <div class="panel" style="margin-top:14px"><h2>ສິນຄ້າທີ່ຕ້ອງກວດ${fix.length ? ` (${fix.length})` : ''}</h2>
      ${fix.length ? `<p class="small muted">ສິນຄ້າໃໝ່ ຫຼື ທີ່ຍັງເປັນການຄາດເດົາ (⚠) — ເລືອກຜົງ ແລະ ກຣາມຕໍ່ຈອກ.</p><div class="table-wrap"><table class="simple"><thead><tr><th>ສິນຄ້າ</th><th class="r">ຂາຍ</th><th>ຜົງ</th><th class="r">g/ຈອກ</th><th></th></tr></thead><tbody>
        ${fix.map((r) => `<tr><td>${esc(r.name)}${r.m ? ' ⚠' : ''}</td><td class="r num">${r.qty}</td><td>${r.m ? esc(POWDER[r.m.powder]) : '<span class="chip pay-unpaid">ຍັງບໍ່ຕັ້ງ</span>'}</td><td class="r num">${r.m ? num(r.m.grams) : '—'}</td><td><button class="btn small ghost" data-map="${esc(r.name)}">ຕັ້ງ</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">ທຸກສິນຄ້າຕັ້ງແລ້ວ ✓</p>'}
      <button class="btn small ghost" id="allMap" type="button" style="margin-top:10px">ເບິ່ງ / ແກ້ການຕັ້ງທັງໝົດ</button></div>`;
  const re = () => { LS.set('cycle', Math.max(1, num($('#cyc').value))); LS.set('buffer', Math.max(0, num($('#buf').value))); matchaTab(); };
  $('#cyc').addEventListener('change', re); $('#buf').addEventListener('change', re);
  $$('[data-stock]').forEach((b) => b.addEventListener('click', () => editStock(b.dataset.stock)));
  $$('[data-map]').forEach((b) => b.addEventListener('click', () => editMap(b.dataset.map)));
  $('#allMap').addEventListener('click', allMap);
}
function editStock(p) {
  const s = D.stock.find((x) => x.powder === p) || {};
  form(`ຜົງໃນສາງ · ${esc(POWDER[p])}`, `<label class="field"><span>ຈຳນວນ (ກຣາມ)</span><input name="grams" inputmode="numeric" required value="${num(s.grams) || ''}"></label><label class="field"><span>ວັນທີນັບ</span><input type="date" name="counted_on" value="${esc(s.counted_on || laoToday())}"></label>`,
    async (v) => { await api('/sales/stock', { method: 'PUT', body: { powder: p, ...v } }); toast('ບັນທຶກແລ້ວ', 'ok'); await load(); });
}
function editMap(name) {
  const m = D.mapBy[keyOf(name)] || {};
  form(`ຕັ້ງຜົງ · ${esc(name)}`, `<label class="field"><span>ຜົງທີ່ໃຊ້</span><select name="powder" required><option value="">— ເລືອກ —</option>${Object.entries(POWDER).map(([v, l]) => `<option value="${v}" ${m.powder === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <label class="field"><span>ກຣາມຕໍ່ຈອກ (Clear 3 · Latte 4 · Cold Whisk 5)</span><input name="grams" inputmode="decimal" value="${m.grams != null ? num(m.grams) : ''}"></label>`,
  async (v) => { await api('/sales/map', { method: 'PUT', body: { name, powder: v.powder, grams: v.grams } }); toast('ບັນທຶກແລ້ວ', 'ok'); await load(); });
}
function allMap() {
  const d = dialog('ການຕັ້ງຜົງຂອງສິນຄ້າ', `<div class="table-wrap"><table class="simple"><thead><tr><th>ສິນຄ້າ</th><th>ຜົງ</th><th class="r">g</th><th></th></tr></thead><tbody>
    ${D.map.map((m) => `<tr><td>${esc(m.name)}${m.checked ? '' : ' ⚠'}</td><td class="tiny">${m.powder ? esc(POWDER[m.powder]) : '—'}</td><td class="r num">${num(m.grams)}</td><td><button class="btn small ghost" data-m="${esc(m.name)}">ແກ້</button></td></tr>`).join('')}</tbody></table></div>`);
  $$('[data-m]', d).forEach((b) => b.addEventListener('click', () => { d.close(); editMap(b.dataset.m); }));
}
function form(title, body, onOk) {
  const d = dialog(title, `<form class="stack" id="ff">${body}</form>`, '<span style="flex:1"></span><button class="btn ghost" type="button" data-close>ຍົກເລີກ</button><button class="btn" type="button" id="ffOk">ບັນທຶກ</button>');
  const f = $('#ff', d);
  f.addEventListener('submit', (e) => { e.preventDefault(); $('#ffOk', d).click(); });
  $('#ffOk', d).addEventListener('click', (e) => guard(e.currentTarget, async () => { clearErrors(f); if (!f.reportValidity()) return; await onOk(Object.fromEntries(new FormData(f))); d.close(); }));
  const first = $('input, select', f); if (first) first.focus();
}
function recon(r) {
  const c = D.closeBy[r.date];
  if (!c) return { c: null, status: ['ຍັງບໍ່ໃສ່ເງິນທີ່ນັບ', 'st-completed'] };
  const cash = num(c.cash) - num(c.float); const qr = num(c.bcel) + num(c.ldb); const got = cash + qr + num(c.card) + num(c.other);
  const exp = r.net - num(c.owner_disc); const diff = got - exp; const dc = cash - r.cash; const dq = qr - r.qr; const dk = num(c.card) - r.card;
  let status;
  if (Math.abs(diff) > 1000) status = [diff < 0 ? `ຂາດ ${k(-diff)}` : `ເກີນ ${k(diff)}`, 'pay-unpaid'];
  else if (!r.hist && (Math.abs(dc) > 1000 || Math.abs(dq) > 1000 || Math.abs(dk) > 1000)) status = ['ຍອດກົງ · ປະເພດຊຳລະບໍ່ກົງ', 'pay-pending_verification'];
  else status = ['ກົງກັນ', 'pay-paid'];
  return { c, cash, qr, got, exp, diff, dc, dq, dk, status };
}
function cashTab() {
  const R = D.dayRows.slice().reverse(); const rows = R.map((r) => ({ r, x: recon(r) }));
  const done = rows.filter((o) => o.x.c); const off = done.filter((o) => o.x.status[1] !== 'pay-paid');
  const sumDiff = done.reduce((s, o) => s + o.x.diff, 0);
  const cell = (v) => `<td class="r num ${Math.abs(v) <= 1000 ? 'ok' : v < 0 ? 'bad' : 'warn'}">${Math.abs(v) <= 1000 ? '✓' : (v > 0 ? '+' : '') + k(v)}</td>`;
  $('#body').innerHTML = `${D.warn}
    ${kpis([[`${done.length}/${R.length}`, 'ມື້ທີ່ໃສ່ເງິນທີ່ນັບແລ້ວ'], [String(off.length), 'ມື້ທີ່ບໍ່ກົງ', off.length > 0], [(sumDiff > 0 ? '+' : '') + k(sumDiff), 'ຜົນຕ່າງລວມ', Math.abs(sumDiff) > 1000]])}
    <div class="panel"><h2>ກວດເງິນ: Loyverse ທຽບກັບເງິນທີ່ນັບ</h2>
      <p class="small muted">Loyverse ບັນທຶກ BCEL ແລະ LDB ລວມກັນເປັນ “QR CODE”, ສະນັ້ນທຽບ QR ກັບ BCEL + LDB. ເງິນສົດທີ່ນັບ = ເງິນໃນລິ້ນຊັກ − ເງິນທອນ. ຄວນໄດ້ຮັບ = ຍອດສຸດທິ − ສ່ວນຫຼຸດເຈົ້າຂອງທີ່ບໍ່ໄດ້ຄິດໃນ POS. ມື້ກ່ອນ 19/10 ທຽບໄດ້ແຕ່ຍອດລວມ. ກົດແຖວເພື່ອໃສ່ ຫຼື ແກ້ເງິນທີ່ນັບ.</p>
      <div class="table-wrap"><table class="simple"><thead><tr><th>ວັນທີ</th><th class="r">ຄວນໄດ້ຮັບ</th><th class="r">ນັບໄດ້</th><th class="r">ເງິນສົດ</th><th class="r">QR</th><th class="r">ບັດ</th><th>ສະຖານະ</th></tr></thead><tbody>
      ${rows.map(({ r, x }) => `<tr class="click" data-day="${r.date}" tabindex="0"><td>${esc(r.date)}</td><td class="r num">${k(x.c ? x.exp : r.net)}${r.hist ? ` <span class="tiny muted">${r.source === 'manual' ? 'ປ້ອນເອງ' : 'Notion'}</span>` : ''}</td>${x.c ? `<td class="r num">${k(x.got)}</td>${r.hist ? '<td class="r muted">·</td><td class="r muted">·</td><td class="r muted">·</td>' : `${cell(x.dc)}${cell(x.dq)}${cell(x.dk)}`}` : '<td class="r muted">—</td><td></td><td></td><td></td>'}<td><span class="chip ${x.status[1]}">${esc(x.status[0])}</span></td></tr>`).join('') || '<tr><td colspan="7" class="muted">ບໍ່ມີຂໍ້ມູນ</td></tr>'}
      </tbody></table></div></div>`;
  $$('[data-day]').forEach((tr) => { const go = () => closeForm(tr.dataset.day); tr.addEventListener('click', go); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); }); });
}
function closeForm(day) {
  const r = D.dayRows.find((x) => x.date === day); const c = D.closeBy[day] || {};
  const f = (name, label) => `<label class="field"><span>${label}</span><input name="${name}" inputmode="numeric" value="${c[name] ? num(c[name]) : ''}"></label>`;
  form(`ເງິນທີ່ນັບ · ${esc(day)}`, `<div class="alert info small">${r.hist ? `ຍອດຂາຍ (Notion / ປ້ອນເອງ): ${k(r.net)}` : `Loyverse: ສຸດທິ ${k(r.net)} · ເງິນສົດ ${k(r.cash)} · QR ${k(r.qr)} · ບັດ ${k(r.card)}`}</div>
    <div class="row">${f('cash', 'ເງິນສົດໃນລິ້ນຊັກ')}${f('float', 'ເງິນທອນ (ຫັກອອກ)')}</div>
    <div class="row">${f('bcel', 'BCEL')}${f('ldb', 'LDB')}</div>
    <div class="row">${f('card', 'ບັດ')}${f('other', 'ອື່ນໆ')}</div>
    ${f('owner_disc', 'ສ່ວນຫຼຸດເຈົ້າຂອງ / ພະນັກງານ ທີ່ບໍ່ໄດ້ຄິດໃນ POS')}
    <label class="field"><span>ໝາຍເຫດ</span><textarea name="note" rows="2">${esc(c.note || '')}</textarea></label>
    ${c.by_name ? `<p class="tiny muted">ບັນທຶກໂດຍ ${esc(c.by_name)}${c.source && c.source !== 'website' ? ' · ນຳເຂົ້າຈາກລະບົບບໍລິຫານ' : ''}</p>` : ''}`,
  async (v) => { await api(`/sales/closing/${day}`, { method: 'PUT', body: v }); toast('ບັນທຶກແລ້ວ', 'ok'); await load(); });
}

// ───────── Excel
async function excel() {
  await loadScript('/xlsx.full.min.js'); const X = window.XLSX; const wb = X.utils.book_new();
  const add = (name, rows) => X.utils.book_append_sheet(wb, X.utils.json_to_sheet(rows.length ? rows : [{ note: 'No data' }]), name);
  add('Daily', D.dayRows.map((r) => ({ date: r.date, source: r.source, gross: num(r.gross), discounts: num(r.discounts), refunds: num(r.refunds), net: r.net, receipts: r.tx == null ? '' : num(r.tx), cash: r.hist ? '' : r.cash, qr: r.hist ? '' : r.qr, card: r.hist ? '' : r.card, other: r.hist ? '' : r.other })));
  add('Items', D.itemRows.map((r) => { const m = D.mapBy[keyOf(r.name)]; return { item: r.name, qty: r.qty, net: r.net, cost: r.cogs, powder: m && m.powder ? POWDER[m.powder] : '', grams_per_drink: m ? num(m.grams) : '' }; }));
  add('Matcha', PW.map((p) => ({ powder: POWDER[p], used_g: Math.round(D.use[p]), avg_per_day_g: Math.round(D.use[p] / Math.max(1, D.dayRows.length)) })));
  add('Reconciliation', D.dayRows.map((r) => { const x = recon(r); return { date: r.date, source: r.source, net_sales: r.net, owner_discount: x.c ? num(x.c.owner_disc) : '', expected: x.c ? x.exp : '', loyverse_cash: r.hist ? '' : r.cash, loyverse_qr: r.hist ? '' : r.qr, loyverse_card: r.hist ? '' : r.card, counted: x.c ? x.got : '', counted_cash: x.c ? x.cash : '', counted_bcel_ldb: x.c ? x.qr : '', counted_card: x.c ? num(x.c.card) : '', difference: x.c ? x.diff : '', status: x.status[0], note: x.c ? x.c.note || '' : '' }; }));
  X.writeFile(wb, `maison-matcha-sales-${D.from}-to-${D.to}.xlsx`);
}

// ───────── start
(async () => {
  ME = await initStaff();
  if (ME.role !== 'admin') { $('#body').innerHTML = '<div class="alert err">ໜ້ານີ້ສະເພາະຜູ້ດູແລ.</div>'; $('#range').hidden = true; $('#tabs').hidden = true; $('#syncInfo').textContent = ''; return; }
  const rg = LS.get('range', 'month'); $$('#range input[name=rg]').forEach((i) => { i.checked = i.value === rg; }); setRange(rg);
  $$('#range input[name=rg]').forEach((i) => i.addEventListener('change', () => { LS.set('range', i.value); setRange(i.value); load().catch((e) => toast(e.message, 'err')); }));
  ['#from', '#to'].forEach((s) => $(s).addEventListener('change', () => { $$('#range input[name=rg]').forEach((i) => { i.checked = false; }); if ($('#from').value && $('#to').value) load().catch((e) => toast(e.message, 'err')); }));
  $$('#tabs input').forEach((i) => i.addEventListener('change', () => { TAB = i.value; LS.set('tab', TAB); render(); }));
  $('#syncB').addEventListener('click', (e) => guard(e.currentTarget, async () => { $('#syncInfo').textContent = 'ກຳລັງດຶງຈາກ Loyverse…'; const r = await api('/sales/sync', { method: 'POST' }); if (r.busy) toast('ກຳລັງດຶງຢູ່ແລ້ວ — ລອງໃໝ່ໃນອີກບໍ່ເທົ່າໃດວິນາທີ'); else if (r.ok) toast(`ດຶງແລ້ວ: ${r.receipts} ບິນ`, 'ok'); else toast(r.error || 'ບໍ່ສຳເລັດ', 'err'); await load(); }));
  $('#xlsB').addEventListener('click', (e) => guard(e.currentTarget, excel));
  try { await load(); } catch (e) { $('#body').innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
})();
