"""Build the complete Maison Matcha static website for Vercel from repository sources."""
from pathlib import Path
import re
import shutil
import pages
from partials import head, header, FOOTER

root = Path(__file__).resolve().parent
out = root / "dist"
if out.exists():
    shutil.rmtree(out)
(out / "assets" / "img" / "ig").mkdir(parents=True)

def write(path, value):
    dest = out / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(value, encoding="utf-8")

# Restore the asset paths expected by every HTML page.
for name in ("site.css", "site.js", "menu-page.js", "matcha-page.js"):
    shutil.copy2(root / name, out / "assets" / name)
for name in ("logo.webp", "icon.svg", "og.jpg", "original.webp",
             "latte.webp", "coconut-clear.webp", "oat-cold-whisk.webp",
             "earl-grey.webp", "on-cloud.webp", "roasted-velvet.webp",
             "emerald-umami.webp", "nutty-reserve.webp"):
    shutil.copy2(root / name, out / "assets" / "img" / name)
for src in root.glob("ig-*.webp"):
    shutil.copy2(src, out / "assets" / "img" / "ig" / src.name)

# Share menu data and pricing across menu, matcha and cart.
body = (root / "body.part").read_text(encoding="utf-8")
start = body.index("/* ───────── Shop settings ───────── */")
end = body.index("const LOGO = '{{IMG:logo}}';")
data = re.sub(r"\{\{IMG:([a-z\-]+)\}\}", r"/assets/img/\1.webp", body[start:end])
write("assets/menu-data.js", "// Maison Matcha menu and shop settings\n" + data)

# Reassemble the full, original cart application rather than a placeholder.
order_markup = body[body.index("<main>"):body.index("<script>")]
order_js = body[body.index("<script>") + len("<script>"):body.index("</script>")]
order_js = order_js.replace(body[start:end], "")
order_js = order_js.replace("const LOGO = '{{IMG:logo}}';",
                            "const LOGO = '/assets/img/logo.webp';")
assert "{{IMG" not in order_markup and "{{IMG" not in order_js
order = (
    head("Maison Matcha · ສັ່ງອໍເດີ",
         "Order Maison Matcha drinks and send the order to the shop on WhatsApp.",
         '<meta name="robots" content="index">\n')
    + header("order")
    + order_markup.replace("<main>", '<main style="padding-top:8px">')
    + FOOTER
    + '<script src="/assets/menu-data.js"></script>\n<script>\n'
    + order_js + '</script>\n</body>\n</html>\n'
)
write("order/index.html", order)

for path, html in [
    ("index.html", pages.HOME),
    ("menu/index.html", pages.MENU),
    ("matcha/index.html", pages.MATCHA),
    ("visit/index.html", pages.VISIT),
    ("404.html", pages.NOT_FOUND),
]:
    write(path, html)
write("robots.txt", "User-agent: *\nAllow: /\nSitemap: https://maisonmatcha.live/sitemap.xml\n")
write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n'
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      + ''.join('  <url><loc>https://maisonmatcha.live' + p + '</loc></url>\n'
                for p in ("/", "/menu", "/matcha", "/order", "/visit"))
      + '</urlset>\n')
print("Built Maison Matcha:", len(list(out.rglob("*"))), "files.")
