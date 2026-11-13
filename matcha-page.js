// The three ceremonial matchas, from menu-data.js.
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n = (v) => Math.round(v).toLocaleString('en-US');
  function render() {
    const L = window.MM_LANG();
    const nm = (o) => (L === 'en' ? o.en : o.lo);
    document.getElementById('teas').innerHTML = PRODUCTS.filter((p) => p.cat === 'collection').map((p) => `
      <article class="tea">
        <div class="tea-art"><img src="${p.img}" alt="${esc(p.en)} matcha" loading="lazy" decoding="async"></div>
        <div>
          <div class="code">${p.code}</div>
          <h2>${esc(nm(p))} <span class="muted small en">${esc(L === 'en' ? p.lo : p.en)}</span></h2>
          <div class="notes">${esc(nm(p.taste))}</div>
          <p>${esc(nm(p.long || p.d))}</p>
          <table class="price-table num">${p.ways.map((w) => `<tr><td>${esc(nm(w))}</td><td>${n(w.price)} ${L === 'en' ? 'LAK' : 'ກີບ'}</td></tr>`).join('')}</table>
        </div>
      </article>`).join('');
    document.getElementById('options').innerHTML = L === 'en'
      ? `<span>Oat milk <b class="num">+${n(OAT_PRICE)} LAK</b></span><span>Sweetness <b class="num">${SWEETNESS.join(' · ')}</b></span>`
      : `<span>ນົມໂອ໊ດ <b class="num">+${n(OAT_PRICE)} ກີບ</b></span><span>ລະດັບຄວາມຫວານ <b class="num">${SWEETNESS.join(' · ')}</b></span>`;
  }
  document.addEventListener('mm:lang', render);
  render();
})();
