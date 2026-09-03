# glasshourproductions.com

Paul Mullay's production company site. Started 2026-09-03 (David: "coming soon site and a
staging skeleton... get the boring parts out of the way").

## What is here

| Path | What |
|---|---|
| `index.html` + `src/coming-soon/` | The live coming-soon page. Plain HTML + one CSS file, no fonts, no script. 3 KB. |
| `staging/index.html` + `src/staging/` | The staging skeleton at `/staging/`: React shell, three.js hero (`glass-scene.ts`), noindex. |
| `public/` | CNAME, robots.txt, favicon.svg, og.png (share card), .nojekyll |
| `tools/gate.py` | Build gate: dashes, placeholders, links resolve, coming-soon has no script and stays under 24 KB, staging noindex, CNAME/robots shipped |
| `tools/shoot.cjs` | Headless Edge sweep (no deps): shots + a JSON truth line per page; `card` mode renders `tools/card.html` to `public/og.png` |
| `tools/card.html` | The 1200x630 share card source |
| `.github/workflows/pages.yml` | Build on push to `main`, deploy to GitHub Pages |
| `docs/HOSTING-DNS.md` | Where it is hosted, the DNS records, how to roll back |
| `docs/PLAN.md` | State and next steps |

## Commands

```bash
npm install
npm run dev          # Vite dev server, http://localhost:5192/ and /staging/
npm run build        # dist/
npm run gate         # python tools/gate.py over dist/
npm run serve        # preview dist/ on :8092 (the sweep needs this running)
npm run shoot        # node tools/shoot.cjs -> shots/*.png + truth lines
node tools/shoot.cjs card   # re-render the share card to public/og.png
```

## Rules

- No em or en dashes anywhere in copy (the gate fails the build).
- The coming-soon page stays plain: no script, no web fonts. It is the page that has to load instantly.
- `/staging/` is where the head-turning work goes (WebGL, React). It is noindex and linked only from the footer.
- Deploy = push to `main`. GitHub Actions builds and publishes; nothing is uploaded by hand.
- Headless captures: never retry a hung capture; the tool kills only its own browser tree.
