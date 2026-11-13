# Shared pieces for every page of maisonmatcha.live
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Lao:wght@400;500;600;700&family=Solway:wght@300;400;500;700&display=swap">\n')

def head(title, desc, extra=''):
    return f'''<!doctype html>
<html lang="lo">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#243229">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="/assets/img/og.jpg">
<link rel="icon" href="/assets/img/icon.svg" type="image/svg+xml">
{FONTS}<link rel="stylesheet" href="/assets/site.css">
<script>try{{var l=JSON.parse(localStorage.getItem('mm-lang')||'null');if(l==='en'||l==='lo')document.documentElement.lang=l}}catch(e){{}}</script>
{extra}</head>
<body>
'''

NAV = [('/', 'home', 'ໜ້າຫຼັກ', 'Home'), ('/menu', 'menu', 'ເມນູ', 'Menu'), ('/matcha', 'matcha', 'ມັດຊະຂອງເຮົາ', 'Our matcha'),
       ('/order', 'order', 'ສັ່ງອໍເດີ', 'Order'), ('/visit', 'visit', 'ຕິດຕໍ່ & ທີ່ຕັ້ງ', 'Visit')]

def t(lo, en):
    return f'<span data-l="lo">{lo}</span><span data-l="en">{en}</span>'

def header(active):
    parts = []
    for href, key, lo, en in NAV:
        attrs = ' aria-current="page"' if key == active else ''
        attrs += ' class="nav-cta"' if key == 'order' else ''
        parts.append('<a href="%s"%s>%s</a>' % (href, attrs, t(lo, en)))
    links = ''.join(parts)
    return f'''<header class="site-head">
  <div class="wrap head-row">
    <a class="logo-link" href="/" aria-label="Maison Matcha"><img src="/assets/img/logo.webp" alt="Maison Matcha" width="360" height="308"></a>
    <nav class="site-nav" aria-label="Maison Matcha">{links}</nav>
    <div class="lang" role="group" aria-label="Language / ພາສາ">
      <button type="button" data-lang="lo" aria-pressed="true" style="font-family:var(--font-lao)">ລາວ</button>
      <button type="button" data-lang="en" aria-pressed="false" class="en">EN</button>
    </div>
  </div>
</header>
'''

def footer(show_phone=True):
    wa = ('WhatsApp <a href="https://wa.me/8562051111711" target="_blank" rel="noopener" class="num">+856 20 5111 1711</a><br>\n      ') if show_phone else ''
    return f'''<footer class="site-foot">
  <div class="wrap foot-grid">
    <div>
      <img src="/assets/img/logo.webp" alt="Maison Matcha" width="360" height="308" class="foot-logo">
      <div class="tag en">FROM KYOTO TO LUANG PRABANG</div>
    </div>
    <div>
      <h2>{t('ທີ່ຕັ້ງ', 'Find us')}</h2>
      <p>Ban Wat Sene Village, Sakkaline Rd<br>{t('ຫຼວງພະບາງ', 'Luang Prabang')} 06000</p>
      <a href="https://maps.app.goo.gl/Sb9Ym96esf5CzEWN8" target="_blank" rel="noopener">{t('ເປີດໃນ Google Maps', 'Open in Google Maps')}</a>
    </div>
    <div>
      <h2>{t('ເວລາເປີດ', 'Opening hours')}</h2>
      <p>{t('ທຸກວັນ', 'Every day')} <span class="num">09:00 – 17:00</span></p>
    </div>
    <div>
      <h2>{t('ຕິດຕໍ່', 'Contact')}</h2>
      <p>{wa}Instagram <a href="https://www.instagram.com/maisonmatchaluangprabang/" target="_blank" rel="noopener">@maisonmatchaluangprabang</a></p>
    </div>
  </div>
  <div class="wrap foot-base tiny">© <span id="yr">2026</span> Maison Matcha · <span class="en">Luang Prabang</span></div>
</footer>
'''

FOOTER = footer()
