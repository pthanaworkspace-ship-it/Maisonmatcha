// Maison Matcha Club page: free registration (name + phone, no code). The card opens through its private link (/m/…);
// this phone remembers the link so /club/card opens it again. A phone number alone never opens a card.
(function () {
  const KEY = 'mm-card-token';
  const L = () => (window.MM_LANG ? window.MM_LANG() : 'lo');
  const T = (lo, en) => (L() === 'en' ? en : lo);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const get = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
  const set = (t) => { try { localStorage.setItem(KEY, t); } catch (e) { /* private mode: the link still works */ } };
  // server messages are "Lao · English"; show the half that matches the chosen language
  const msg = (m) => { const p = String(m || '').split(' · '); return p.length === 2 ? (L() === 'en' ? p[1] : p[0]) : String(m || ''); };
  const reg = document.getElementById('register');
  if (reg) reg.addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = reg.querySelector('button[type=submit]'); const err = reg.querySelector('.club-err');
    if (btn.disabled) return; err.textContent = ''; reg.querySelectorAll('[aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
    const v = Object.fromEntries(new FormData(reg));
    if (!String(v.name || '').trim()) { err.textContent = T('ກະລຸນາໃສ່ຊື່ ແລະ ນາມສະກຸນ', 'Please enter your full name'); reg.name.focus(); return; }
    if (String(v.phone || '').replace(/\D/g, '').length < 8) { err.textContent = T('ກະລຸນາໃສ່ເບີໂທລະສັບ', 'Please enter your phone number'); reg.phone.focus(); return; }
    btn.disabled = true;
    try {
      let r; try { r = await fetch('/api/club/member/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: v.name, phone: v.phone, email: v.email, website: v.website }) }); }
      catch (x) { throw new Error(T('ເຊື່ອມຕໍ່ບໍ່ໄດ້ — ກວດອິນເຕີເນັດແລ້ວລອງໃໝ່', 'No connection — check your internet and try again')); }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(msg(d.error) || T('ເກີດຂໍ້ຜິດພາດ', 'Something went wrong')), { field: d.field, exists: r.status === 409 });
      set(d.token); location.href = `/m/${encodeURIComponent(d.token)}?welcome=1`;
    } catch (x) {
      err.innerHTML = esc(x.message) + (x.exists ? ` <a href="#login">${T('ວິທີເປີດບັດເກົ່າ', 'How to open your card')}</a>` : '');
      const f = x.field && reg.elements[x.field]; if (f) { f.setAttribute('aria-invalid', 'true'); f.focus(); } btn.disabled = false;
    }
  });

  // eligible drinks (from the server, so managers' changes show here)
  let items = null;
  function drawItems() {
    const ul = document.getElementById('clubElig'); if (!ul || !items) return;
    ul.innerHTML = items.map((x) => `<li>${esc(L() === 'en' ? x.name_en : x.name_lo)}${L() === 'en' ? '' : ` <span class="en">${esc(x.name_en)}</span>`}</li>`).join('') || '<li class="muted">—</li>';
  }
  fetch('/api/club/member/eligible').then((r) => r.json()).then((d) => { items = d.items || []; drawItems(); }).catch(() => { const ul = document.getElementById('clubElig'); if (ul) ul.innerHTML = ''; });
  // a card saved on this phone → "Open my card" leads
  if (get()) {
    const s = document.getElementById('clubSaved'); if (s) s.hidden = false;
    const c = document.getElementById('clubCta'); const a = c && c.querySelector('a[href="/club/card"]'); const r = c && c.querySelector('a[href="#register"]');
    if (a && r) { a.classList.add('green'); c.prepend(a); r.classList.remove('green'); r.classList.add('ghost'); }
  }
  document.addEventListener('mm:lang', drawItems);
})();
