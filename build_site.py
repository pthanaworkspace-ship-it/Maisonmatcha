"""Builds the multi-page Maison Matcha website into ../site (ready to upload to Vercel)."""
import os, re, shutil, sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'site')
IMG_SRC = '/home/claude/maison-orders/public/img'
sys.path.insert(0, HERE)
import pages  # noqa: E402
from partials import head, header, FOOTER, footer  # noqa: E402

shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(os.path.join(OUT, 'assets', 'img'))

def write(rel, text):
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(text)

# ── Images
for n in ['original', 'latte', 'coconut-clear', 'oat-cold-whisk', 'earl-grey', 'on-cloud', 'roasted-velvet', 'emerald-umami', 'nutty-reserve']:
    shutil.copy(os.path.join(IMG_SRC, n + '.webp'), os.path.join(OUT, 'assets', 'img', n + '.webp'))
shutil.copytree(os.path.join(HERE, 'ig'), os.path.join(OUT, 'assets', 'img', 'ig'))
shutil.copy(os.path.join(ROOT, 'logo.webp'), os.path.join(OUT, 'assets', 'img', 'logo.webp'))
write('assets/img/icon.svg', "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='#243229'/>"
      "<text x='16' y='23' text-anchor='middle' font-family='serif' font-size='25' fill='#ede9df'>M</text></svg>")
og = Image.new('RGB', (1200, 630), (238, 234, 225))
logo = Image.open(os.path.join(IMG_SRC, 'logo-crop.png')).convert('RGBA')
logo = logo.resize((460, round(logo.height * 460 / logo.width)), Image.LANCZOS)
og.paste(logo, ((1200 - logo.width) // 2, 150), logo)
ImageDraw.Draw(og).text((600, 520), 'FROM KYOTO TO LUANG PRABANG', fill=(87, 100, 82), anchor='mm')
og.save(os.path.join(OUT, 'assets', 'img', 'og.jpg'), quality=88)

# ── Shared CSS = order page styles + site shell
order_head = open(os.path.join(ROOT, 'head.part'), encoding='utf-8').read()
order_css = order_head[order_head.index('<style>') + 7: order_head.index('</style>')]
site_css = open(os.path.join(HERE, 'site-extra.css'), encoding='utf-8').read()
write('assets/site.css', order_css + site_css + """
/* Order page inside the site shell */
.cats { top: calc(env(safe-area-inset-top, 0px) + 64px); }
@media (max-width: 760px) { .cats { top: env(safe-area-inset-top, 0px); } }
@media (min-width: 1000px) { .layout aside { top: 80px; max-height: calc(100vh - 96px); } }
""")
shutil.copy(os.path.join(HERE, 'site.js'), os.path.join(OUT, 'assets', 'site.js'))
shutil.copy(os.path.join(HERE, 'menu-page.js'), os.path.join(OUT, 'assets', 'menu-page.js'))
shutil.copy(os.path.join(HERE, 'matcha-page.js'), os.path.join(OUT, 'assets', 'matcha-page.js'))

# ── Shared menu + shop settings (used by /menu, /matcha and /order)
body = open(os.path.join(ROOT, 'body.part'), encoding='utf-8').read()
s0 = body.index('/* ───────── Shop settings ───────── */')
s1 = body.index("const LOGO = '{{IMG:logo}}';")
data = body[s0:s1]
data = re.sub(r"\{\{IMG:([a-z\-]+)\}\}", r"/assets/img/\1.webp", data)
data += """
// Longer descriptions for the Our matcha page (from the public menu).
const LONG = {
  'roasted-velvet': { lo: 'ມັດຊະເກຣດພິທີການລົດຊາດເຂັ້ມຂຸ້ນ ມີກິ່ນຫອມຖົ່ວຄົ່ວເດັ່ນຊັດ, ອູມາມິລ້ຳເລິກ ແລະ ກິ່ນຄວັນອ່ອນໆ. ເນື້ອສຳຜັດນຸ່ມນວນ ພ້ອມກິ່ນຫອມຄົ່ວທີ່ຕິດປາຍລີ້ນ.',
    en: 'A rich ceremonial matcha with pronounced roasted-nut character, deep umami and a gentle smoky aroma. Full-bodied and smooth, with a lingering roasted finish.' },
  'emerald-umami': { lo: 'ມັດຊະເກຣດພິທີການສີຂຽວເຂັ້ມ ເລີ່ມດ້ວຍຄວາມຫວານທຳມະຊາດ ແລະ ອູມາມິທີ່ຊັດເຈນ. ນຸ່ມນວນປານີດ, ລົດຊາດຫຼັງດື່ມສະອາດ ແລະ ຂົມໜ້ອຍຫຼາຍ.',
    en: 'An intensely green ceremonial matcha with a naturally sweet opening and clear umami. Smooth and refined, with a clean finish and very little bitterness.' },
  'nutty-reserve': { lo: 'ຫອມຖົ່ວດິນຄົ່ວ, ອູມາມິນຸ່ມນວນ ແລະ ກິ່ນຄວັນບາງໆ, ຂົມໜ້ອຍຫຼາຍ.',
    en: 'A single-cultivar ceremonial matcha from Uji, Kyoto, grown without pesticides and shaded for 21 days before the first spring harvest. Roasted-peanut and toasted-nut aromas unfold into smooth umami, with a delicate smoky finish and very little bitterness.' },
};
PRODUCTS.forEach((p) => { if (LONG[p.id]) p.long = LONG[p.id]; });
"""
write('assets/menu-data.js', '// Maison Matcha — shop settings, menu and prices. Edit here; /menu, /matcha and /order all update.\n' + data)

# ── Order page: same app, now inside the site shell, reading settings from menu-data.js
b0 = body.index('<main>')
order_markup = body[b0: body.index('<script>')]
order_js = body[body.index('<script>') + 8: body.index('</script>')]
order_js = order_js.replace(body[s0:s1], '')
order_js = order_js.replace("const LOGO = '{{IMG:logo}}';", "const LOGO = '/assets/img/logo.webp';")
assert '{{IMG' not in order_js and '{{IMG' not in order_markup
order_extra = '<meta name="robots" content="index">\n'
order = (head('Maison Matcha · ສັ່ງອໍເດີ', 'Order Maison Matcha drinks and send the order to the shop on WhatsApp.', order_extra)
         + header('order') + order_markup.replace('<main>', '<main style="padding-top:8px">') + FOOTER
         + '<script src="/assets/menu-data.js"></script>\n<script>\n' + order_js + '</script>\n</body>\n</html>\n')
write('order/index.html', order)

write('index.html', pages.HOME)
write('menu/index.html', pages.MENU)
write('matcha/index.html', pages.MATCHA)
write('visit/index.html', pages.VISIT)
write('404.html', pages.NOT_FOUND)
write('vercel.json', '{\n  "cleanUrls": true,\n  "trailingSlash": false\n}\n')
write('robots.txt', 'User-agent: *\nAllow: /\nSitemap: https://maisonmatcha.live/sitemap.xml\n')
write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      + ''.join(f'  <url><loc>https://maisonmatcha.live{p}</loc></url>\n' for p in ['/', '/menu', '/matcha', '/order', '/visit'])
      + '</urlset>\n')

total = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(OUT) for f in fs)
print('Built', OUT, f'{total // 1024} KB')
