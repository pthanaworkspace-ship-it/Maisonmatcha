// Language switch shared by the content pages (the order page has its own, using the same saved choice).
(function () {
  const KEY = 'mm-lang';
  let lang = 'lo';
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v === 'en' || v === 'lo') lang = v; } catch (e) { /* storage blocked */ }
  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    const tt = document.querySelector('meta[name="title-' + lang + '"]');
    if (tt) document.title = tt.content;
    document.dispatchEvent(new CustomEvent('mm:lang', { detail: lang }));
  }
  window.MM_LANG = () => lang;
  document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
    lang = b.dataset.lang;
    try { localStorage.setItem(KEY, JSON.stringify(lang)); } catch (e) { /* ignore */ }
    apply();
  }));
  apply();

  // "Open now" badge and today's row in the hours table (Laos time, UTC+7, open daily 09:00–17:00).
  const now = new Date(Date.now() + 7 * 3600e3);
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const open = mins >= 9 * 60 && mins < 17 * 60;
  document.querySelectorAll('[data-open-now]').forEach((el) => el.classList.toggle('on', open));
  document.querySelectorAll('[data-open-text]').forEach((el) => { el.hidden = (el.dataset.openText === 'open') !== open; });
  const today = document.querySelector(`.hours tr[data-day="${now.getUTCDay()}"]`);
  if (today) today.classList.add('today');
  const yr = document.getElementById('yr'); if (yr) yr.textContent = now.getUTCFullYear();
})();
