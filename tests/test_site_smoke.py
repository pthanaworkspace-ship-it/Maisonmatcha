"""Non-destructive regression checks for the existing public website."""
import subprocess
import sys
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]
PAGES = ["index.html","menu/index.html","matcha/index.html","order/index.html","visit/index.html"]
class Tags(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in ("script","link","img"):
            self.links.append(a.get("src") or a.get("href",""))

def test_static_site():
    subprocess.run([sys.executable,"build_for_vercel.py"],cwd=ROOT,check=True)
    out=ROOT/"dist"
    for page in PAGES:
        path=out/page
        assert path.is_file(),f"Missing {page}"
        html=path.read_text(encoding="utf-8")
        assert "Maison Matcha" in html
        tags=Tags(); tags.feed(html)
        for link in tags.links:
            if link.startswith("/assets/"):
                assert (out/link.lstrip("/")).is_file(),f"{page}: missing asset {link}"
    order=(out/"order/index.html").read_text(encoding="utf-8")
    assert 'id="wa"' in order
    if (ROOT/"QR Code - Payment  (1).png").exists():
        assert 'class="mm-pay"' in order
        assert (out/"assets/img/payment-qr.png").exists()
if __name__=="__main__":
    test_static_site()
    print("Existing public routes, assets, WhatsApp, QR markup: PASS")
