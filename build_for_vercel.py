"""Vercel build: publish the ready-made website in ./site to ./dist.

./site is generated from the Maison Matcha website sources (home, menu, matcha, order, visit,
the Matcha Club staff pages and member cards). Vercel runs this script and serves ./dist.
Routing (clean URLs, /staff/club, /m/<card>, /api/club → Supabase) lives in ./vercel.json.
"""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parent
src, out = root / "site", root / "dist"
if out.exists():
    shutil.rmtree(out)
shutil.copytree(src, out, ignore=shutil.ignore_patterns("vercel.json"))
for page in ("index.html", "menu/index.html", "matcha/index.html", "order/index.html", "visit/index.html",
             "staff.html", "staff-club.html", "member.html", "assets/site.css", "assets/menu-data.js"):
    assert (out / page).exists(), f"missing {page}"
print("Built Maison Matcha:", sum(1 for p in out.rglob("*") if p.is_file()), "files in dist/")
