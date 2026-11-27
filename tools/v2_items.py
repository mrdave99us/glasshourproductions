"""Builds the shelf for staging v2 from work already on this PC.

NOTHING GOES UP UNLESS IT IS PICKED. The owner hand-picks what is shown: tools/shelf_picks.json lists the ids that
are on the shelf, and only those are copied into the site. With an empty list the shelf is empty.

  python tools/v2_items.py   builds the shelf from the picks (pictures, template demos)

There is no pick page (David, Nov 27 2026: "lose the pick page altogether, ill pick them myself"). He names what
goes up; only then do its ids go into shelf_picks.json.

Copies, never links: every picked picture is resized into public/v2/img and the list is written to
src/v2/items.json. Candidates are the templates cleared to show, every 360 scene in the stock batches, and the
stock pieces that are assets for building websites, each in a category. Paintings, wallpapers and photographs are
never candidates (they are sold on Adobe Stock). Stock made with image generation is marked ai: true."""
import csv
import glob
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FOUNDRY = Path("E:/Development/TemplateFoundry")
STOCK = Path("E:/Development/asetbaseAI/adobe_stock_ops")
PICKS = ROOT / "tools" / "shelf_picks.json"
IMG = ROOT / "public" / "v2" / "img"
PANO = ROOT / "public" / "v2" / "pano"
DEMO = ROOT / "public" / "v2" / "demo"
W, H = 800, 500
PW, PH = 3072, 1536  # look-around copies: smaller than the file that is sold, and marked
# Only the templates cleared to show.
TEMPLATES = ["orbit", "flightdeck", "confetti"]
# 360 scenes are off Glass Hour (David, Nov 24 2026: "lose 360 scenes"), so none are candidates. The batches that
# held them are kept here, empty, so the change is one line to undo.
SCENE_BATCHES = []  # was 003, 004, 006-013
GRAPHIC_BATCHES = ["002", "005", "006", "007", "008", "010", "012"]
# Web graphics: first rule that matches wins; anything matching none is left out.
PAINTING = re.compile(r"painting", re.I)
SURFACE = re.compile(r"texture|terrazzo|planks|concrete|pattern|in rows", re.I)
NOT_WEB = re.compile(r"top view|flat lay|piggy bank|moving boxes|interface", re.I)
GROUPS = [
    ("backdrop", re.compile(r"podium|display stand|product display|kitchen counter|bathroom shelf|oak desk", re.I)),
    ("icon", re.compile(r"\bicon\b|neon .* graphic", re.I)),
    ("seasonal", re.compile(r"copy space|frame on|border on|celebration|confetti|ramadan|halloween", re.I)),
    ("background", re.compile(r"technology|optical illusion|abstract background|gradient|paper cut|bokeh|watercolor|botanical", re.I)),
    ("texture", SURFACE),
]
GROUP_NAME = {"background": "Backgrounds", "texture": "Textures and patterns", "backdrop": "Product backdrops", "icon": "Icons and illustrations", "seasonal": "Seasonal banners"}


def group_of(title):
    if PAINTING.search(title):
        return None
    for name, rule in GROUPS[:2]:  # a backdrop or an icon is one whatever else its title says
        if rule.search(title):
            return name
    if NOT_WEB.search(title):
        return "texture" if SURFACE.search(title) and "technology" not in title.lower() else None
    for name, rule in GROUPS[2:]:
        if rule.search(title):
            return name
    return None


def fit(im, pano=False, size=(W, H)):
    im = im.convert("RGB")
    w, h = im.size
    if pano:  # the view straight ahead out of the full turn
        im = im.crop((int(w * 0.25), int(h * 0.19), int(w * 0.75), int(h * 0.81)))
        w, h = im.size
    r = max(size[0] / w, size[1] / h)
    im = im.resize((round(w * r), round(h * r)), Image.LANCZOS)
    x, y = (im.width - size[0]) // 2, (im.height - size[1]) // 2
    return im.crop((x, y, x + size[0], y + size[1]))


def mark():
    """A faint repeated name, the way a stock preview is marked. Drawn once, laid over every scene."""
    layer = Image.new("RGBA", (PW, PH), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    try:
        face = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 34)
    except OSError:
        face = ImageFont.load_default()
    for row, y in enumerate(range(150, PH - 120, 210)):
        for x in range(-200 + (row % 2) * 260, PW, 520):
            d.text((x, y), "GLASS HOUR  PREVIEW", font=face, fill=(255, 255, 255, 21))
    return layer


def tidy(title):
    t = re.sub(r"^360 degree equirectangular panorama of (an? |the )?", "", title.strip(), flags=re.I)
    t = re.sub(r"^Fictional 360 equirectangular ", "", t, flags=re.I)
    t = re.sub(r"\s+(interior )?panorama$", "", t, flags=re.I)
    return t[:1].upper() + t[1:]


def candidates():
    """Everything that could go on the shelf, with where its source file is. Nothing is copied here."""
    out = []
    cat = json.load(open(FOUNDRY / "catalog.json", encoding="utf-8"))
    for t in cat["templates"]:
        if t["slug"] in TEMPLATES:
            out.append({"id": f"t-{t['slug']}", "kind": "template", "title": t["name"], "note": t["tagline"], "ai": False,
                        "words": " ".join(t.get("tags") or []), "src": FOUNDRY / "storefront" / "thumbs" / f"{t['slug']}.jpg", "slug": t["slug"]})
    seen, titles = set(), {}
    for batch in sorted(set(SCENE_BATCHES + GRAPHIC_BATCHES)):
        folder = STOCK / f"pilot_batch_{batch}"
        for f in sorted(glob.glob(str(folder / "*_20*_batch*.csv"))):
            for row in csv.DictReader(open(f, encoding="utf-8-sig", errors="replace")):
                src = folder / row["Filename"]
                iid = "s-" + Path(row["Filename"]).stem.replace("stockpilot", "")
                if iid in seen or not src.exists() or not re.fullmatch(r"s-\d{3}_\d{3}", iid):
                    continue
                with Image.open(src) as im:
                    pano = 1.9 < im.width / im.height < 2.1
                words = ", ".join(k.strip() for k in row["Keywords"].split(",")[:9])
                if pano and batch in SCENE_BATCHES:
                    seen.add(iid)
                    out.append({"id": iid, "kind": "scene", "title": tidy(row["Title"]), "note": "", "ai": True, "pano": True, "words": words, "src": src})
                elif not pano and batch in GRAPHIC_BATCHES and group_of(row["Title"]):
                    seen.add(iid)
                    title = tidy(row["Title"])
                    titles[title] = titles.get(title, 0) + 1
                    if titles[title] > 1:  # several pieces share one stock title: number them so they can be told apart
                        title = f"{title}, no. {titles[title]}"
                    out.append({"id": iid, "kind": "graphic", "group": group_of(row["Title"]), "title": title, "note": "", "ai": True, "pano": False, "words": words, "src": src})
    return out


def build(cands):
    picked = set(json.load(open(PICKS, encoding="utf-8"))["items"])
    unknown = picked - {c["id"] for c in cands}
    if unknown:
        raise SystemExit(f"Picked but not a candidate: {sorted(unknown)}")
    for d in (IMG, PANO, DEMO):
        d.mkdir(parents=True, exist_ok=True)
    stamp = mark() if any(c["id"] in picked and c.get("pano") for c in cands) else None
    items = []
    for c in cands:
        if c["id"] not in picked:
            continue
        item = {k: v for k, v in c.items() if k not in ("src", "slug")}
        im = Image.open(c["src"])
        fit(im, c.get("pano", False)).save(IMG / f"{c['id']}.jpg", quality=80, optimize=True)
        if c.get("pano"):
            big = im.convert("RGB").resize((PW, PH), Image.LANCZOS).convert("RGBA")
            Image.alpha_composite(big, stamp).convert("RGB").save(PANO / f"{c['id']}.jpg", quality=78, optimize=True, progressive=True)
        if c["kind"] == "template":
            # The template itself, as built for its demo, so the site can run it in a live preview.
            dest = DEMO / c["slug"]
            shutil.rmtree(dest, ignore_errors=True)
            shutil.copytree(FOUNDRY / "storefront" / "demo" / c["slug"], dest)
            pages = []
            for f in sorted(dest.glob("*.html"), key=lambda p: (p.name != "index.html", p.name != "home-2.html", p.name)):
                if f.name == "404.html":
                    continue
                m = re.search(r"<title>(.*?)</title>", f.read_text(encoding="utf-8", errors="replace"), re.S)
                name = "Home" if f.name == "index.html" else "Home, second design" if f.name == "home-2.html" else f.stem.replace("-", " ").capitalize()
                pages.append({"file": f.name, "name": name, "title": (m.group(1).strip() if m else name)})
            item["pages"] = len(pages)
            item["demo"] = {"slug": c["slug"], "pages": pages}
        items.append(item)
    # Whatever is not picked comes off the site: pictures, 360 copies and template demos.
    keep = {i["id"] for i in items}
    for folder in (IMG, PANO):
        for f in folder.glob("*.jpg"):
            if f.stem not in keep:
                f.unlink()
    slugs = {i["demo"]["slug"] for i in items if i.get("demo")}
    for d in DEMO.iterdir():
        if d.is_dir() and d.name not in slugs:
            shutil.rmtree(d)
    (ROOT / "src" / "v2").mkdir(parents=True, exist_ok=True)
    json.dump(items, open(ROOT / "src" / "v2" / "items.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    kinds = {}
    for i in items:
        k = i["kind"] + ("/" + i["group"] if i.get("group") else "")
        kinds[k] = kinds.get(k, 0) + 1
    print(f"{len(items)} of {len(cands)} candidates are on the shelf", kinds)


if __name__ == "__main__":
    if not PICKS.exists():
        PICKS.write_text('{\n  "_note": "The ids that are on the shelf. Hand-picked by the owner; nothing else goes up.",\n  "items": []\n}\n', encoding="utf-8")
    c = candidates()
    build(c)
