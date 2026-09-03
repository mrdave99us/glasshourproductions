# Plan

## Done (2026-09-03)

- Discovery: domain parked on GoDaddy DNS, no hosting in Paul's account (see HOSTING-DNS.md).
- Project scaffold: Vite 8 multi-page, TypeScript, React 19 for `/staging/`, three.js.
- Coming-soon page: plain, 3 KB, no script, no fonts. Email link to glasshourproductions@gmail.com.
- Staging skeleton: React shell (header, hero, Work/About/Contact frames, footer) with the
  glass hourglass WebGL hero. noindex + robots Disallow.
- Gate + headless sweep tooling. GitHub Pages workflow. Share card.
- Deployed: repo github.com/mrdave99us/glasshourproductions, Pages source = GitHub Actions,
  custom domain glasshourproductions.com saved (DNS check pending the GoDaddy records).

## Waiting on David

- GoDaddy DNS for glasshourproductions.com: replace `A @ Parked` with the four GitHub A records
  and point `CNAME www` at mrdave99us.github.io (exact table in HOSTING-DNS.md). Then in the repo
  Settings > Pages tick Enforce HTTPS once the certificate is issued.

## Needs Paul

- The one line under "Coming soon." and whether the Gmail address is the one he wants public.
- What Glass Hour Productions does, in his words, and the three pieces of work to show first.
- Logo or wordmark if one exists (the hourglass glyph is a stand-in).
- Socials to list.

## Next

1. Paul's brief (above).
2. Direction for the real site in `/staging/`: the hourglass is one candidate moment; the
   page shell is ready for whatever he wants.
3. When the real site is ready: it moves to `/`, the coming-soon page retires, and
   `/staging/` becomes the next version's home.
