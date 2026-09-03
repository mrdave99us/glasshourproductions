# Hosting and DNS

## Decision (2026-09-03)

Paul's GoDaddy account holds four domains (clockcircle.com, artofpaulnoir.com,
glasshourproductions.com, glasshourrecords.com) and two Website Builder sites
(vampireanthems.com, glasshourrecords.com). It has NO web hosting product and no
Managed WordPress. Website Builder cannot host custom code, so a Vite/React/WebGL
site needs a static host.

Chosen: **GitHub Pages** from the repo `mrdave99us/glasshourproductions`, built by
GitHub Actions on every push to `main`. Free, HTTPS issued automatically for the
custom domain, no new accounts (David already has GitHub), and the repo can be
transferred to Paul's own GitHub later without touching DNS.

The domain's nameservers stay at GoDaddy (ns57/ns58.domaincontrol.com). Only the
records change.

## Status (2026-09-03)

Repo created, Pages enabled (source = GitHub Actions), custom domain saved in Settings > Pages.
David switched the GoDaddy records on 2026-09-03 (evening). GitHub reports the site live over
HTTP; the certificate for HTTPS is issued by GitHub within the hour, then Enforce HTTPS is ticked.

## Records

Before (parked):

| Type | Name | Data |
|---|---|---|
| A | @ | Parked |
| CNAME | www | glasshourproductions.com. |
| CNAME | _domainconnect | _domainconnect.gd.domaincontrol.com. |
| NS/SOA | @ | GoDaddy defaults |

After:

| Type | Name | Data | TTL |
|---|---|---|---|
| A | @ | 185.199.108.153 | 600 |
| A | @ | 185.199.109.153 | 600 |
| A | @ | 185.199.110.153 | 600 |
| A | @ | 185.199.111.153 | 600 |
| CNAME | www | mrdave99us.github.io. | 1 hour |
| CNAME | _domainconnect | unchanged | |
| NS/SOA | @ | unchanged | |

GitHub side: repo Settings > Pages > Source = GitHub Actions; Custom domain =
glasshourproductions.com; Enforce HTTPS once the certificate is issued (minutes to
an hour after DNS resolves).

## Rollback

Delete the four A records, add `A @ Parked` back (or point at anything else), and set
`CNAME www` back to `glasshourproductions.com.`. The site keeps building at the
github.io URL regardless.

## Later options

- Paul's own GitHub: transfer the repo, change `CNAME www` to `<his-user>.github.io.`, set
  the custom domain again in his repo settings.
- Cloudflare Pages / Netlify: also static, also free; would need an account and, for
  Cloudflare, moving the nameservers.
