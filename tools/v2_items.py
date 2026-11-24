"""Builds the shelf for staging v2 from work already on this PC. Copies, never links: every picture is resized into
public/v2/img and the list is written to src/v2/items.json.

  python tools/v2_items.py

Sources: Template Foundry's catalog (only the templates cleared to show) and our own stock batches with the
titles written for them. Stock made with image generation is marked ai: true so the site can say so on the item."""
import csv
import glob
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FOUNDRY = Path("E:/Development/TemplateFoundry")
STOCK = Path("E:/Development/asetbaseAI/adobe_stock_ops")
MOTION = Path("E:/Development/MotionLibrary/stage/review/p13_b.jpg")
IMG = ROOT / "public" / "v2" / "img"
IMG.mkdir(parents=True, exist_ok=True)
W, H = 800, 500
# Only the templates cleared to show.
TEMPLATES = ["orbit", "flightdeck", "confetti"]
# Always on the shelf: the pieces the home page shows by name.
MUST = {"006_031", "006_036", "013_001", "013_005", "013_009", "013_013", "006_021", "006_026", "009_022", "011_016", "011_026", "013_021", "011_021", "011_031"}
BATCHES = {"006": 4, "007": 5, "009": 5, "010": 5, "011": 4, "012": 5, "013": 2}  # batch: take every nth


def fit(im, pano=False):
    im = im.convert("RGB")
    w, h = im.size
    if pano:  # the view straight ahead out of the full turn
        im = im.crop((int(w * 0.25), int(h * 0.19), int(w * 0.75), int(h * 0.81)))
        w, h = im.size
    r = max(W / w, H / h)
    im = im.resize((round(w * r), round(h * r)), Image.LANCZOS)
    x, y = (im.width - W) // 2, (im.height - H) // 2
    return im.crop((x, y, x + W, y + H))


def tidy(title):
    t = re.sub(r"^360 degree equirectangular panorama of (an? |the )?", "", title.strip(), flags=re.I)
    t = re.sub(r"^Fictional 360 equirectangular ", "", t, flags=re.I)
    t = re.sub(r"\s+(interior )?panorama$", "", t, flags=re.I)
    return t[:1].upper() + t[1:]


items = []
cat = json.load(open(FOUNDRY / "catalog.json", encoding="utf-8"))
for t in cat["templates"]:
    if t["slug"] not in TEMPLATES:
        continue
    fit(Image.open(FOUNDRY / "storefront" / "thumbs" / f"{t['slug']}.jpg")).save(IMG / f"t-{t['slug']}.jpg", quality=82, optimize=True)
    items.append({"id": f"t-{t['slug']}", "kind": "template", "title": t["name"], "note": t["tagline"], "pages": t.get("pages"), "ai": False,
                  "words": " ".join(t.get("tags") or [])})

for batch, step in BATCHES.items():
    folder = STOCK / f"pilot_batch_{batch}"
    rows = []
    for f in glob.glob(str(folder / "*_20*_batch*.csv")):
        rows += list(csv.DictReader(open(f, encoding="utf-8-sig", errors="replace")))
    picked = [r for i, r in enumerate(rows) if i % step == 0 or Path(r["Filename"]).stem.replace("stockpilot", "") in MUST]
    for row in picked:
        src = folder / row["Filename"]
        if not src.exists():
            continue
        im = Image.open(src)
        ratio = im.width / im.height
        pano = 1.9 < ratio < 2.1
        kind = "scene" if pano else "graphic" if re.search(r"neon|icon|logo|pattern|background|podium|display", row["Title"], re.I) else "art"
        iid = "s-" + Path(row["Filename"]).stem.replace("stockpilot", "")
        fit(im, pano).save(IMG / f"{iid}.jpg", quality=80, optimize=True)
        words = ", ".join(k.strip() for k in row["Keywords"].split(",")[:9])
        items.append({"id": iid, "kind": kind, "title": tidy(row["Title"]), "note": "", "ai": True, "words": words})

if MOTION.exists():
    m = Image.open(MOTION)
    fit(m.crop((int(m.width * 0.75), 0, m.width, m.height))).save(IMG / "m-stage.jpg", quality=82, optimize=True)

(ROOT / "src" / "v2").mkdir(parents=True, exist_ok=True)
json.dump(items, open(ROOT / "src" / "v2" / "items.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
kinds = {}
for i in items:
    kinds[i["kind"]] = kinds.get(i["kind"], 0) + 1
size = sum(f.stat().st_size for f in IMG.glob("*.jpg")) // 1024
print(len(items), kinds, f"{size} KB in {IMG}")
for i in items[:3] + items[-4:]:
    print(" ", i["id"], "|", i["kind"], "|", i["title"])
