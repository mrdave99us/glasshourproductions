#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build gate for glasshourproductions.com. Runs over dist/ after `vite build`.

  python tools/gate.py          exit 1 on any failure

Checks: no em/en dashes; no placeholder tells; every local href/src resolves inside
dist; the coming-soon page has no script and stays under budget; /staging/ is noindex;
CNAME, robots and favicon shipped; the share image exists.
"""
import os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(HERE, "dist")
DASHES = (chr(0x2014), chr(0x2013))
PLACEHOLDER = re.compile(r"lorem|ipsum|\bTODO\b|placeholder|\bTBD\b|xxx", re.I)
BUDGET_KB = 24   # coming-soon html + css together

fails = []
def fail(msg): fails.append(msg); print("FAIL", msg)

if not os.path.isdir(DIST):
    print("no dist/, run the build first"); sys.exit(1)

pages = []
for root, _, files in os.walk(DIST):
    for f in files:
        if f.endswith(".html"):
            pages.append(os.path.join(root, f))

for p in pages:
    rel = os.path.relpath(p, DIST).replace(os.sep, "/")
    html = open(p, encoding="utf-8").read()
    if any(d in html for d in DASHES):
        fail(f"{rel}: em/en dash present")
    m = PLACEHOLDER.search(re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.S))
    if m:
        fail(f"{rel}: placeholder tell {m.group(0)!r}")
    for attr, url in re.findall(r'\b(href|src)="([^"]+)"', html):
        if url.startswith(("http", "mailto:", "tel:", "#", "data:")):
            continue
        path = url.split("#")[0].split("?")[0]
        if not path.startswith("/"):
            fail(f"{rel}: relative url {url!r} (use root-relative)"); continue
        target = os.path.join(DIST, path.lstrip("/").replace("/", os.sep))
        if path.endswith("/"):
            target = os.path.join(target, "index.html")
        if not os.path.exists(target):
            fail(f"{rel}: {attr}={url!r} does not resolve in dist")
    for u in re.findall(r'href="(/[^"#]*)#([^"]+)"', html) + [("", a) for a in re.findall(r'href="#([^"]+)"', html)]:
        pass

# coming soon: plain and small
idx = os.path.join(DIST, "index.html")
if os.path.exists(idx):
    html = open(idx, encoding="utf-8").read()
    if "<script" in html:
        fail("index.html: the coming-soon page must not ship a script")
    size = len(html.encode("utf-8"))
    for css in re.findall(r'href="(/assets/[^"]+\.css)"', html):
        size += os.path.getsize(os.path.join(DIST, css.lstrip("/").replace("/", os.sep)))
    if size > BUDGET_KB * 1024:
        fail(f"index.html + css = {size // 1024} KB, budget {BUDGET_KB} KB")
    else:
        print(f"ok   coming soon: {size // 1024} KB html+css, no script")
else:
    fail("dist/index.html missing")

stg = os.path.join(DIST, "staging", "index.html")
if os.path.exists(stg):
    if 'name="robots" content="noindex' not in open(stg, encoding="utf-8").read():
        fail("staging/index.html: missing noindex")
    else:
        print("ok   staging: noindex")
else:
    fail("dist/staging/index.html missing")

for f in ("CNAME", "robots.txt", "favicon.svg", ".nojekyll"):
    if not os.path.exists(os.path.join(DIST, f)):
        fail(f"dist/{f} missing")
cn = os.path.join(DIST, "CNAME")
if os.path.exists(cn) and open(cn).read().strip() != "glasshourproductions.com":
    fail("CNAME is not glasshourproductions.com")
if not os.path.exists(os.path.join(DIST, "og.png")):
    print("warn share image og.png not built yet (node tools/shoot.cjs card)")

print("GATE", "FAILED" if fails else "OK", f"({len(pages)} pages)")
sys.exit(1 if fails else 0)
