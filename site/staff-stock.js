// Storage → bar log: staff record what they take from the main storage to the bar each day.
// Saved lines flow into the management dashboard's inventory as storage → bar transfers.
import { api, $, $$, esc, toast, laoDateTime, uuid, initStaff } from './club-common.js';

const laoToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, x) => { const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + x); return t.toISOString().slice(0, 10); };
const dLabel = (d) => { const [y, m, x] = d.split('-'); return `${x}/${m}/${y}`; };
const DOW = ['ອາທິດ', 'ຈັນ', 'ອັງຄານ', 'ພຸດ', 'ພະຫັດ', 'ສຸກ', 'ເສົາ'];
const dow = (d) => DOW[new Date(`${d}T00:00:00Z`).getUTCDay()];
const num = (v) => { const x = Number(String(v ?? '').replace(/[,\s]/g, '')); return Number.isFinite(x) ? x : NaN; };
const qfmt = (v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
// item groups, in the order staff walk the storage room
const GROUPS = [
  ['ມັດສະ ແລະ ໂຮຈິຊະ', ['matcha']],
  ['ນົມ ແລະ ນ້ຳໝາກພ້າວ', ['dairy', 'oat', 'coconut']],
  ['ໄຊຣັບ ແລະ ທັອບປິ້ງ', ['syrup', 'other']],
  ['ຈອກ, ຫຼອດ ແລະ ບັນຈຸພັນ', ['cups', 'straws', 'packaging']],
];

let ME = null; let ITEMS = []; let DAY = new URLSearchParams(location.search).get('day') || laoToday(); let KEY = uuid();

async function guard(btn, fn) {
  if (btn.dataset.busy) return; btn.dataset.busy = '1'; btn.disabled = true;
  try { await fn(); } catch (e) { toast(e.message, 'err'); } finally { delete btn.dataset.busy; btn.disabled = false; }
}
function groupsHtml() {
  const seen = new Set(); const out = [];
  for (const [title, cats] of GROUPS) {
    const list = ITEMS.filter((i) => cats.includes(i.cat) && !seen.has(i.id)); list.forEach((i) => seen.add(i.id));
    if (list.length) out.push([title, list]);
  }
  const rest = ITEMS.filter((i) => !seen.has(i.id)); if (rest.length) out.push(['ອື່ນໆ', rest]);
  return out.map(([title, list]) => `<div class="st-group"><h3>${esc(title)}</h3>${list.map((i) => `<label class="st-row" data-id="${esc(i.id)}">
      <span class="nm">${esc(i.name)}</span><span class="q"><input inputmode="decimal" autocomplete="off" placeholder="0" aria-label="${esc(i.name)} (${esc(i.unit)})"><span class="u">${esc(i.unit)}</span></span></label>`).join('')}</div>`).join('');
}
function logHtml(d) {
  if (!d.moves.length) return '<p class="small muted" style="margin:0">ຍັງບໍ່ມີການບັນທຶກມື້ນີ້</p>';
  return `<ul class="st-log">${d.moves.map((m) => {
    const mine = d.admin || m.staff_id === d.me; const can = d.can_edit && mine && !m.voided_at;
    return `<li class="${m.voided_at ? 'void' : ''}"><div class="t"><b>${esc(m.name)}</b><div class="who">${esc(m.by_name || '—')} · ${esc(laoDateTime(m.created_at).slice(11))}${m.note ? ` · ${esc(m.note)}` : ''}${m.voided_at ? ` · ຍົກເລີກໂດຍ ${esc(m.voided_by || '')}` : ''}</div></div>
      <span class="amt">${qfmt(m.qty)} ${esc(m.unit)}</span>${can ? `<button class="x" type="button" data-void="${m.id}">ຍົກເລີກ</button>` : ''}</li>`;
  }).join('')}</ul>`;
}
async function render() {
  $('#body').innerHTML = '<div class="panel muted">ກຳລັງໂຫຼດ…</div>';
  const [d, w] = await Promise.all([api(`/stock/day/${DAY}`), api('/stock/recent')]);
  const ro = !d.can_edit; const min = d.admin ? '' : addDays(d.today, -1);
  $('#body').innerHTML = `
    <div class="panel">
      <div class="st-day"><label class="field"><span>ວັນທີ</span><input type="date" id="day" value="${esc(DAY)}" max="${esc(d.today)}" ${min ? `min="${esc(min)}"` : ''}></label>
        ${DAY !== d.today ? '<button class="btn ghost small" type="button" id="goToday">ມື້ນີ້</button>' : ''}</div>
      ${ro ? '<div class="alert warn">ພະນັກງານບັນທຶກໄດ້ສະເພາະມື້ນີ້ ແລະ ມື້ວານ — ຕິດຕໍ່ຜູ້ດູແລເພື່ອແກ້ມື້ອື່ນ.</div>' : ''}
    </div>
    ${ro ? '' : `<form class="panel" id="sf" novalidate>
      <h2>ເອົາຫຍັງອອກຈາກສາງ? <span class="en small muted">· What did you take?</span></h2>
      <p class="small muted" style="margin-top:4px">ໃສ່ຈຳນວນສະເພາະສິນຄ້າທີ່ເອົາອອກ — ຊ່ອງທີ່ວ່າງຈະບໍ່ຖືກບັນທຶກ</p>
      ${groupsHtml()}
      <label class="field" style="margin-top:14px"><span>ໝາຍເຫດ <span class="tiny">(ຖ້າມີ)</span></span><input name="note" maxlength="300" autocomplete="off"></label>
      <div class="sticky-save"><button class="btn green block" type="submit" id="save">ບັນທຶກ</button><div class="st-count" id="count"></div></div>
    </form>`}
    <div class="panel"><h2>ບັນທຶກແລ້ວ · ${dow(DAY)} ${dLabel(DAY)}</h2>${logHtml(d)}</div>
    <div class="panel"><h2>7 ມື້ຜ່ານມາ</h2><ul class="st-week">${w.days.map((x) => `<li><button type="button" data-day="${esc(x.day)}"><b>${dow(x.day)} ${dLabel(x.day)}</b>${x.by_names ? `<div class="who">${esc(x.by_names)}</div>` : ''}</button><span class="chip ${x.lines ? 'pay-paid' : 'st-completed'}">${x.lines ? `${x.lines} ລາຍການ` : 'ຍັງບໍ່ມີ'}</span></li>`).join('')}</ul></div>`;
  wire();
}
function picked() {
  return $$('.st-row').map((r) => ({ item_id: r.dataset.id, raw: $('input', r).value.trim(), row: r })).filter((x) => x.raw !== '');
}
function count() {
  const p = picked(); $$('.st-row').forEach((r) => r.classList.toggle('on', $('input', r).value.trim() !== ''));
  const c = $('#count'); if (c) c.textContent = p.length ? `ຈະບັນທຶກ ${p.length} ລາຍການ` : '';
}
function wire() {
  $('#day').addEventListener('change', (e) => { if (e.target.value) go(e.target.value); });
  $('#goToday')?.addEventListener('click', () => go(laoToday()));
  $$('[data-day]').forEach((b) => b.addEventListener('click', () => go(b.dataset.day)));
  const f = $('#sf');
  if (f) {
    f.addEventListener('input', count);
    f.addEventListener('submit', (e) => { e.preventDefault(); guard($('#save'), save); });
  }
  $$('[data-void]').forEach((b) => b.addEventListener('click', () => guard(b, async () => {
    if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'ກົດອີກຄັ້ງ'; setTimeout(() => { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'ຍົກເລີກ'; } }, 3000); return; }
    await api(`/stock/moves/${b.dataset.void}/void`, { method: 'POST' }); toast('ຍົກເລີກແລ້ວ', 'ok'); await render();
  })));
}
function go(day) { DAY = day; KEY = uuid(); history.replaceState(null, '', `?day=${day}`); render().catch((e) => toast(e.message, 'err')); }
async function save() {
  const p = picked();
  if (!p.length) { toast('ກະລຸນາໃສ່ຈຳນວນຢ່າງໜ້ອຍ 1 ລາຍການ', 'err'); return; }
  const badRow = p.find((x) => !(num(x.raw) > 0));
  if (badRow) { $('input', badRow.row).focus(); toast(`ຈຳນວນບໍ່ຖືກຕ້ອງ: ${$('.nm', badRow.row).textContent}`, 'err'); return; }
  const r = await api(`/stock/day/${DAY}`, { method: 'POST', body: { idempotency_key: KEY, note: $('#sf').elements.note.value, lines: p.map((x) => ({ item_id: x.item_id, qty: num(x.raw) })) } });
  KEY = uuid(); toast(r.saved ? `ບັນທຶກແລ້ວ ${r.saved} ລາຍການ` : 'ບັນທຶກແລ້ວ', 'ok'); await render();
}

(async () => {
  ME = await initStaff();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(DAY) || DAY > laoToday()) DAY = laoToday();
  try { ITEMS = (await api('/stock/items')).items; await render(); } catch (e) { $('#body').innerHTML = `<div class="alert err">${esc(e.message)}</div>`; }
  void ME;
})();
