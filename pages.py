from partials import head, header, footer, t

def page(active, title_lo, title_en, desc, body, scripts='', show_phone=True):
    extra = f'<meta name="title-lo" content="{title_lo}">\n<meta name="title-en" content="{title_en}">\n'
    return head(title_lo, desc, extra) + header(active) + '<main>\n' + body + '\n</main>\n' + footer(show_phone) + \
        '<script src="/assets/site.js"></script>\n' + scripts + '</body>\n</html>\n'

OPEN_BADGE = (f'<div class="open-now" data-open-now><i></i>'
              f'<span data-open-text="open" hidden>{t("ເປີດຢູ່ດຽວນີ້ · ຮອດ 17:00", "Open now · until 17:00")}</span>'
              f'<span data-open-text="closed">{t("ປິດແລ້ວ · ເປີດທຸກວັນ 09:00", "Closed now · opens daily 09:00")}</span></div>')

IG_POSTS = [
  ('ig-ceremonial-picker', 'Matcha latte in a tea field beside a tea picker: We serve only ceremonial grade matcha'),
  ('ig-cafe-latte', 'Iced Maison Matcha latte on a dark wooden counter with a matcha whisk'),
  ('ig-tea-time', 'Iced matcha latte with a tray of sweet dumplings: The ultimate tea-time companion'),
  ('ig-afternoon', 'Iced matcha on a small café table in afternoon light'),
]
IG = ''.join(
  f'<a class="ig-item" href="https://www.instagram.com/maisonmatchaluangprabang/" target="_blank" rel="noopener">'
  f'<img src="/assets/img/ig/{n}.webp" srcset="/assets/img/ig/{n}.webp 720w, /assets/img/ig/{n}-lg.webp 1080w" '
  f'sizes="(min-width: 900px) 24vw, 50vw" width="1080" height="1350" loading="lazy" decoding="async" alt="{alt}"></a>'
  for n, alt in IG_POSTS)

HOME = page('home', 'Maison Matcha · ຫຼວງພະບາງ', 'Maison Matcha · Luang Prabang',
  'Maison Matcha — ceremonial matcha house in Luang Prabang. From Kyoto to Luang Prabang.', f'''
<section class="wrap home-hero">
  <div>
    <div class="eyebrow">From Kyoto to Luang Prabang</div>
    <h1>{t('ພິທີກຳມັດຊະ ທີ່ສະຫງົບງຽບ<br>ໃນຫຼວງພະບາງ', 'A peaceful matcha ritual<br>in Luang Prabang')}</h1>
    <p class="lead">{t('ເຮືອນມັດຊະ ທີ່ນຳວັດທະນະທຳຊາຍີ່ປຸ່ນແທ້ ມາສູ່ບັນຍາກາດອັນສະຫງົບຂອງຫຼວງພະບາງ. ມັດຊະເກຣດພິທີການ ຊົງດ້ວຍຄວາມໃສ່ໃຈທຸກຈອກ.',
      'A matcha house bringing authentic Japanese tea culture into a calm Luang Prabang setting. Ceremonial matcha, prepared with care in every cup.')}</p>
    <div class="hero-actions">
      <a class="btn" href="/order">{t('ສັ່ງລ່ວງໜ້າ', 'Order ahead')}</a>
      <a class="btn ghost" href="/menu">{t('ເບິ່ງເມນູ', 'View the menu')}</a>
    </div>
    {OPEN_BADGE}
  </div>
  <figure class="hero-photo">
    <img src="/assets/img/ig/ig-ceremonial-field.webp" srcset="/assets/img/ig/ig-ceremonial-field.webp 720w, /assets/img/ig/ig-ceremonial-field-lg.webp 1080w"
      sizes="(min-width: 900px) 46vw, 100vw" width="1080" height="1350" fetchpriority="high"
      alt="Maison Matcha iced matcha latte above a green tea field: We serve only ceremonial grade matcha">
  </figure>
</section>

<section class="wrap section">
  <div class="tiles">
    <a class="tile" href="/menu"><span class="eyebrow">Menu</span><h3>{t('ເມນູ', 'The menu')}</h3>
      <p>{t('ເມນູຄລາສສິກ, ຊິກເນເຈີ ແລະ ຄໍເລັກຊັນມັດຊະ ພ້ອມລາຄາ.', 'Classics, Maison signatures and the matcha collection, with prices.')}</p><span class="go">{t('ເບິ່ງເມນູ →', 'See the menu →')}</span></a>
    <a class="tile" href="/matcha"><span class="eyebrow">Maison No.1 · No.2 · No.3</span><h3>{t('ມັດຊະຂອງເຮົາ', 'Our matcha')}</h3>
      <p>{t('ມັດຊະເກຣດພິທີການສາມຊະນິດ ແລະ ລົດຊາດຂອງແຕ່ລະອັນ.', 'Three ceremonial matchas and how each one tastes.')}</p><span class="go">{t('ຮູ້ຈັກມັດຊະ →', 'Meet the matcha →')}</span></a>
    <a class="tile" href="/order"><span class="eyebrow">Order</span><h3>{t('ສັ່ງລ່ວງໜ້າ', 'Order ahead')}</h3>
      <p>{t('ເລືອກເຄື່ອງດື່ມ ແລ້ວສົ່ງອໍເດີໃຫ້ຮ້ານທາງ WhatsApp.', 'Choose your drinks and send the order to us on WhatsApp.')}</p><span class="go">{t('ເລີ່ມສັ່ງ →', 'Start an order →')}</span></a>
    <a class="tile" href="/visit"><span class="eyebrow">Visit</span><h3>{t('ຕິດຕໍ່ & ທີ່ຕັ້ງ', 'Visit us')}</h3>
      <p>{t('ບ້ານວັດແສນ, ຖະໜົນສັກກະລິນ · ເປີດທຸກວັນ 09:00–17:00', 'Ban Wat Sene, Sakkaline Road · Open daily 09:00–17:00')}</p><span class="go">{t('ເສັ້ນທາງ ແລະ ເວລາເປີດ →', 'Directions and hours →')}</span></a>
  </div>
</section>

<section class="wrap section">
  <div class="gal-head">
    <h2>{t('ຈາກ Instagram ຂອງເຮົາ', 'From our Instagram')}</h2>
    <a href="https://www.instagram.com/maisonmatchaluangprabang/" target="_blank" rel="noopener">@maisonmatchaluangprabang →</a>
  </div>
  <div class="ig-grid">
    {IG}
  </div>
</section>

<section class="wrap section">
  <h2>{t('ສິ່ງທີ່ເຮົາໃສ່ໃຈ', 'What we care about')}</h2>
  <div class="values">
    <div><h3>{t('ຂອງແທ້', 'Authenticity')}</h3><p>{t('ມັດຊະເກຣດພິທີການຈາກຍີ່ປຸ່ນ ແລະ ວິທີຊົງແບບດັ້ງເດີມ.', 'Ceremonial-grade Japanese matcha and traditional preparation.')}</p></div>
    <div><h3>{t('ຄວາມປານີດ', 'Craftsmanship')}</h3><p>{t('ທຸກຈອກຊົງດ້ວຍມື ຢ່າງລະມັດລະວັງ ແລະ ສະໝ່ຳສະເໝີ.', 'Every cup whisked by hand, carefully and consistently.')}</p></div>
    <div><h3>{t('ການຕ້ອນຮັບ', 'Hospitality')}</h3><p>{t('ຄວາມແມ່ນຍຳແບບຍີ່ປຸ່ນ ກັບຄວາມອົບອຸ່ນແບບລາວ.', 'Japanese precision with Lao warmth.')}</p></div>
  </div>
</section>
''', show_phone=False)

MENU = page('menu', 'ເມນູ · Maison Matcha', 'Menu · Maison Matcha',
  'Maison Matcha menu — classics, signatures and the ceremonial matcha collection, with prices in LAK.', f'''
<section class="wrap page-hero">
  <div class="eyebrow">Menu</div>
  <h1>{t('ເມນູ', 'The menu')}</h1>
  <p>{t('ລາຄາທັງໝົດເປັນເງິນກີບ (LAK).', 'All prices are in Lao kip (LAK).')}</p>
</section>
<div class="wrap">
  <nav class="cat-tabs" id="cat-tabs" aria-label="Menu"></nav>
  <div id="menu-list"></div>
  <div class="options-strip" id="options"></div>
  <p style="margin-top:22px"><a class="btn" href="/order">{t('ສັ່ງລ່ວງໜ້າທາງອອນລາຍ', 'Order ahead online')}</a></p>
</div>
''', '<script src="/assets/menu-data.js"></script>\n<script src="/assets/menu-page.js"></script>\n')

MATCHA = page('matcha', 'ມັດຊະຂອງເຮົາ · Maison Matcha', 'Our matcha · Maison Matcha',
  'Maison No.1 Roasted Velvet, No.2 Emerald Umami and No.3 Nutty Reserve — the Maison Matcha ceremonial collection.', f'''
<section class="wrap page-hero">
  <div class="eyebrow">Matcha collection</div>
  <h1>{t('ເລືອກມັດຊະທີ່ມັກ ແລ້ວຊົງໃນແບບຂອງທ່ານ', 'Choose your matcha. Make it your way.')}</h1>
  <p>{t('ມັດຊະເກຣດພິທີການສາມຊະນິດ ແຕ່ລະອັນມີລົດຊາດເປັນເອກະລັກ. ດື່ມແບບໃສ, ລາເຕ້, ຕີເຢັນ ຫຼື ກັບນ້ຳໝາກພ້າວ.',
    'Three ceremonial matchas, each with its own character. Enjoy it pure, as a latte, cold-whisked or with coconut water.')}</p>
</section>
<div class="wrap" id="teas"></div>
<div class="wrap"><div class="options-strip" id="options"></div>
  <p style="margin-top:22px"><a class="btn" href="/order">{t('ສັ່ງລ່ວງໜ້າ', 'Order ahead')}</a></p></div>
''', '<script src="/assets/menu-data.js"></script>\n<script src="/assets/matcha-page.js"></script>\n')

DAYS = [(1, 'ວັນຈັນ', 'Monday'), (2, 'ວັນອັງຄານ', 'Tuesday'), (3, 'ວັນພຸດ', 'Wednesday'), (4, 'ວັນພະຫັດ', 'Thursday'),
        (5, 'ວັນສຸກ', 'Friday'), (6, 'ວັນເສົາ', 'Saturday'), (0, 'ວັນອາທິດ', 'Sunday')]
HOURS_ROWS = ''.join(f'<tr data-day="{d}"><td>{t(lo, en)}</td><td class="num">09:00 – 17:00</td></tr>' for d, lo, en in DAYS)

VISIT = page('visit', 'ຕິດຕໍ່ & ທີ່ຕັ້ງ · Maison Matcha', 'Visit · Maison Matcha',
  'Maison Matcha, Ban Wat Sene Village, Sakkaline Rd, Luang Prabang. Open daily 09:00–17:00.', f'''
<section class="wrap page-hero">
  <div class="eyebrow">Visit</div>
  <h1>{t('ຕິດຕໍ່ & ທີ່ຕັ້ງ', 'Visit us')}</h1>
  <p>{t('ຢູ່ໃນເຮືອນເກົ່າ ກາງເມືອງຫຼວງພະບາງ.', 'In the heart of Luang Prabang’s old town.')}</p>
</section>
<section class="wrap visit-grid">
  <div>
    <div class="info-card">
      <h2>{t('ທີ່ຢູ່', 'Address')}</h2>
      <p>Maison Matcha Luang Prabang<br>Ban Wat Sene Village, Sakkaline Rd<br>{t('ຫຼວງພະບາງ', 'Luang Prabang')} 06000, {t('ລາວ', 'Laos')}</p>
      <p class="small muted en">Plus code: V4WR+5R</p>
      <a class="btn small" href="https://maps.app.goo.gl/Sb9Ym96esf5CzEWN8" target="_blank" rel="noopener">{t('ເສັ້ນທາງໃນ Google Maps', 'Directions in Google Maps')}</a>
    </div>
    <div class="info-card">
      <h2>{t('ເວລາເປີດ', 'Opening hours')}</h2>
      {OPEN_BADGE}
      <table class="hours" style="margin-top:10px">{HOURS_ROWS}</table>
    </div>
    <div class="info-card">
      <h2>{t('ຕິດຕໍ່', 'Contact')}</h2>
      <p>WhatsApp: <a class="num" href="https://wa.me/8562051111711" target="_blank" rel="noopener">+856 20 5111 1711</a></p>
      <p>Instagram: <a href="https://www.instagram.com/maisonmatchaluangprabang/" target="_blank" rel="noopener">@maisonmatchaluangprabang</a></p>
      <a class="btn ghost small" href="/order">{t('ສັ່ງລ່ວງໜ້າ', 'Order ahead')}</a>
    </div>
  </div>
  <iframe class="map-frame" title="Maison Matcha on Google Maps" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
    src="https://www.google.com/maps?q=Maison+Matcha+Luang+Prabang&ll=19.8953767,102.1420037&z=17&output=embed"></iframe>
</section>
''')

NOT_FOUND = page('', 'ບໍ່ພົບໜ້ານີ້ · Maison Matcha', 'Page not found · Maison Matcha', 'Page not found', f'''
<section class="wrap page-hero">
  <div class="eyebrow">404</div>
  <h1>{t('ບໍ່ພົບໜ້ານີ້', 'This page doesn’t exist')}</h1>
  <p>{t('ລິ້ງອາດຜິດ ຫຼື ຖືກຍ້າຍແລ້ວ.', 'The link may be wrong or the page has moved.')}</p>
  <p style="margin-top:18px"><a class="btn" href="/">{t('ໄປໜ້າຫຼັກ', 'Go to the home page')}</a> <a class="btn ghost" href="/order">{t('ສັ່ງອໍເດີ', 'Order')}</a></p>
</section>
''')
