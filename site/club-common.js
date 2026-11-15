// Shared helpers for the Matcha Club staff pages (talks to /api/club → Supabase Edge Function).
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function money(n, { symbol = false } = {}) { const v = Math.round(Number(n) || 0).toLocaleString('en-US'); return symbol ? `₭${v}` : `${v} ກີບ`; }
function laoParts(d) { const t = new Date(new Date(d).getTime() + 7 * 3600 * 1000); const p = (x) => String(x).padStart(2, '0'); return { y: t.getUTCFullYear(), m: p(t.getUTCMonth() + 1), d: p(t.getUTCDate()), h: p(t.getUTCHours()), mi: p(t.getUTCMinutes()) }; }
export function laoDateTime(d) { if (!d) return '—'; const x = laoParts(d); return `${x.d}/${x.m}/${x.y} ${x.h}:${x.mi}`; }
export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}
const KEY = 'mm-club-token';
export const getToken = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
export const setToken = (t) => { try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* private mode */ } };
export async function api(path, { method = 'GET', body } = {}) {
  const headers = { accept: 'application/json' }; const t = getToken(); if (t) headers['x-club-token'] = t;
  if (body !== undefined) headers['content-type'] = 'application/json';
  let res;
  try { res = await fetch(`/api/club${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, cache: 'no-store' }); }
  catch { throw new Error('ເຊື່ອມຕໍ່ບໍ່ໄດ້ — ກວດອິນເຕີເນັດແລ້ວລອງໃໝ່'); }
  let data = {}; try { data = await res.json(); } catch { /* empty */ }
  if (res.status === 401 && !path.startsWith('/auth/')) { setToken(''); location.href = `/staff?next=${encodeURIComponent(location.pathname + location.search)}`; throw new Error(data.error || 'ກະລຸນາເຂົ້າສູ່ລະບົບ'); }
  if (!res.ok) throw Object.assign(new Error(data.error || 'ເກີດຂໍ້ຜິດພາດ — ກະລຸນາລອງໃໝ່'), { status: res.status, field: data.field });
  return data;
}
let toastHost;
export function toast(msg, kind = '') {
  if (!toastHost) { toastHost = document.createElement('div'); toastHost.className = 'toast-host'; toastHost.setAttribute('role', 'status'); toastHost.setAttribute('aria-live', 'polite'); document.body.append(toastHost); }
  const t = document.createElement('div'); t.className = `toast ${kind}`; t.textContent = msg; toastHost.append(t);
  while (toastHost.children.length > 2) toastHost.firstElementChild.remove();
  setTimeout(() => t.remove(), kind === 'err' ? 6000 : 3200);
}
export function fieldError(input, msg) {
  if (!input) return; input.classList.add('invalid');
  let e = input.parentElement.querySelector('.field-error');
  if (!e) { e = document.createElement('div'); e.className = 'field-error'; input.parentElement.append(e); }
  e.textContent = msg; input.addEventListener('input', () => { input.classList.remove('invalid'); e.remove(); }, { once: true });
}
export function clearErrors(root = document) { $$('.invalid', root).forEach((x) => x.classList.remove('invalid')); $$('.field-error', root).forEach((x) => x.remove()); }
export function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); }); }
export async function qrInto(el, text) {
  try {
    await loadScript('/qrcode.js'); const q = window.qrcode(0, 'M'); q.addData(text); q.make(); const k = q.getModuleCount(); let d = '';
    for (let r = 0; r < k; r++) for (let c = 0; c < k; c++) if (q.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
    el.innerHTML = `<svg viewBox="0 0 ${k + 4} ${k + 4}" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#243229"/></svg>`;
  } catch { el.textContent = 'QR'; }
}
export async function initStaff() {
  if (!getToken()) { location.href = `/staff?next=${encodeURIComponent(location.pathname)}`; return new Promise(() => {}); }
  const { user } = await api('/auth/me');
  const here = (p) => (location.pathname.replace(/\/$/, '') === p ? ' aria-current="page"' : '');
  const bar = document.createElement('header'); bar.className = 'topbar';
  bar.innerHTML = `<div class="wrap"><a href="/staff/club" aria-label="Matcha Club"><img class="logo" src="/logo.webp" alt="Maison Matcha"></a>
    <nav class="nav" aria-label="ເມນູພະນັກງານ"><a href="/staff/club"${here('/staff/club')}>Matcha Club</a>${user.role === 'admin' ? `<a href="/staff/sales"${here('/staff/sales')}>ຍອດຂາຍ</a>` : ''}<a href="/" target="_blank" rel="noopener">ເວັບໄຊ</a></nav>
    <span class="spacer"></span><span class="who">${esc(user.display_name)}${user.role === 'admin' ? ' · ຜູ້ດູແລ' : ''}</span>
    <button class="btn ghost small" id="pwBtn" type="button">ລະຫັດຜ່ານ</button><button class="btn ghost small" id="logout" type="button">ອອກຈາກລະບົບ</button></div>`;
  document.body.prepend(bar);
  $('#logout').addEventListener('click', () => { setToken(''); location.href = '/staff'; });
  return user;
}
