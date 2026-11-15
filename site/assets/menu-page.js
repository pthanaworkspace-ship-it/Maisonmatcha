// Renders the view-only menu from menu-data.js (same data and prices as the order page).
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n = (v) => Math.round(v).toLocaleString('en-US');
  function render() {
    const L = window.MM_LANG();
    const nm = (o) => (L === 'en' ? o.en : o.lo);
    const other = (o) => (L === 'en' ? o.lo : o.en);
    const kip = (v) => `${n(v)} ${L === 'en' ? 'LAK' : 'ກີບ'}`;
    document.getElementById('cat-tabs').innerHTML = CATEGORIES.map((c) => `<a href="#${c.id}">${esc(nm(c))}</a>`).join('');
    document.getElementById('menu-list').innerHTML = CATEGORIES.map((c) => `
      <section class="menu-cat" id="${c.id}">
        <div class="cat-head"><h2>${esc(nm(c))}</h2><span class="muted small en">${esc(other(c))}</span></div>
        ${c.intro ? `<p class="muted small" style="margin:-4px 0 12px">${esc(nm(c.intro))}</p>` : ''}
        <div class="menu-grid">${PRODUCTS.filter((p) => p.cat === c.id).map((p) => `
          <article class="mitem">
            <div class="ph"><img src="${p.img}" alt="${esc(p.en)}" loading="lazy" decoding="async"></div>
            <div style="min-width:0">
              ${p.code ? `<div class="eyebrow">${p.code}</div>` : ''}
              <h3>${esc(nm(p))}</h3><div class="sub">${esc(other(p))}</div>
              ${p.taste ? `<div class="taste">${esc(nm(p.taste))}</div>` : ''}
              ${p.d ? `<p>${esc(nm(p.d))}</p>` : ''}
              ${p.ways
                ? `<div class="ways num">${p.ways.map((w) => `<span>${esc(nm(w))}</span><span>${n(w.price)}</span>`).join('')}</div>`
                : `<div class="pr num">${kip(p.price)}</div>`}
            </div>
          </article>`).join('')}</div>
      </section>`).join('');
    document.getElementById('options').innerHTML = L === 'en'
      ? `<span>Oat milk <b class="num">+${n(OAT_PRICE)} LAK</b></span><span>Sweetness <b class="num">${SWEETNESS.join(' · ')}</b></span><span>Choose Maison No.1, No.2 or No.3 for any matcha drink</span>`
      : `<span>ນົມໂອ໊ດ <b class="num">+${n(OAT_PRICE)} ກີບ</b></span><span>ລະດັບຄວາມຫວານ <b class="num">${SWEETNESS.join(' · ')}</b></span><span>ເລືອກມັດຊະ Maison No.1, No.2 ຫຼື No.3 ໄດ້ທຸກເຄື່ອງດື່ມມັດຊະ</span>`;
  }
  document.addEventListener('mm:lang', render);
  render();
})();
