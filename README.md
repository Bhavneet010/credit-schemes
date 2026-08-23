# HP Scheme Finder

**Live: https://bhavneet010.github.io/credit-schemes/**

A minimalist, installable PWA for searching Himachal Pradesh and central government
schemes by business activity. All content comes from
`Himachal_Pradesh_MSME_Agri_Scheme_Guide_2026_verified.xlsx` (research cutoff 2026-08-23).

- **382** business activities across 15 macro sectors
- **182** schemes and routes
- **6,767** activity-to-scheme matches, graded Direct / Strong / Conditional / Horizontal
- Works fully offline after the first load; no backend, no tracking, no dependencies

## Run it locally

```bash
python -m http.server 5757 --directory app
```

Then open `http://localhost:5757`. On a phone, use "Add to Home Screen" to install it.

## Deploy

Pushing to `main` deploys `app/` to GitHub Pages via
`.github/workflows/pages.yml`. Otherwise, `app/` is a static folder — publish it as-is to GitHub Pages, Netlify, Vercel, or any
static host. HTTPS is required for the service worker (and therefore for offline use
and installability); `localhost` is exempt.

## Rebuild the data after editing the workbook

The source workbook is not committed (see `.gitignore`) — keep
`Himachal_Pradesh_MSME_Agri_Scheme_Guide_2026_verified.xlsx` in the repo root locally,
then run:

```bash
python tools/build_data.py
```

That regenerates `app/data.json` from the Sector Catalogue, Scheme Master,
Sector–Scheme Map, Component Norms, Key Contacts and Legacy & Closed sheets.
Then bump `CACHE` in `app/sw.js` (e.g. `hpsf-v1` → `hpsf-v2`) so installed copies
pick up the new data instead of serving the cached version.

## Rebuild the icon and launch screen

Both are derived from the source art in `tools/artwork/`, so edit the art and
re-run — there is nothing to hand-tune in `app/`:

```bash
python tools/make_icons.py     # app/icons/
python tools/make_splash.py    # app/splash/ — a few minutes, it is pure Python
```

`tools/pngkit.py` does the decoding, resampling and palette encoding, so neither
script needs an image library. The icon source paints its rounded corners black;
`make_icons.py` floods that back out to transparency and builds the full-bleed
maskable variant with the artwork held inside Android's inner-80% safe circle.

Bump `CACHE` in `app/sw.js` after regenerating the icons — they are precached,
so installed copies keep the old ones otherwise. The launch images are not
precached: only iOS reads them and a device uses exactly one.

## Layout

```
app/
  index.html            app shell
  styles.css            shared mobile-first components
  theme.css             bright light theme + redesigned home
  app.js                hash router, search index, settings menu, all views
  install.js            install banner shown on every uninstalled visit
  install.css           install banner styles
  data.json             generated — do not edit by hand
  icons/                generated — app icons
  splash/               generated — iOS launch images
  manifest.webmanifest  install metadata
  sw.js                 offline cache
  icons/
tools/
  build_data.py         workbook  ->  data.json
  make_icons.py         artwork  ->  app/icons/
  make_splash.py        artwork  ->  app/splash/
  pngkit.py             PNG read/write, resampling and palette encoding
  artwork/              source art for the icon and the launch screen
```

## How the app is organised

| Screen | What it does |
| --- | --- |
| Home | Use the centered activity search, or start with all schemes and official departments/portals |
| Search | Type an activity ("apple orchard", "bakery", "loan") and get matching activities and schemes |
| Activity | Udyam treatment, who applies, first contact, approvals, HP gate, plus every mapped scheme grouped by match strength |
| Scheme | Benefit and ceiling, your margin, eligibility, how to apply, agency, official page, cautions, stacking rules, and every activity it reaches |
| Schemes | All 182 routes, filterable by scheme family |
| Settings | The top-right menu opens Saved and More without a bottom tab bar |
| Install | Every visit that is not already installed opens with a banner offering the app — the browser's own install prompt where one is available, otherwise the "add to home screen" steps for that platform. "Not now" hides it for that visit; installing hides it for good |
| Launch | Android builds its splash from the manifest's `background_color` and icon; iOS uses the matching image in `app/splash/` |
| Saved | Bookmarked activities and schemes, kept in local storage |
| More | Cost norms and caps, closed/legacy schemes, about and disclaimer |

Status labels are carried through from the workbook unchanged — "Open now",
"Bank / continuous route", "Annual target / sanction", "Cluster or project area" and
"Fresh window closed" — because they determine whether a scheme can actually be used
for a new project. Closed routes carry an explicit warning on the scheme screen.

## Caveat

The app is a reference, not an approval. Ceilings, district targets and windows change;
eligibility must be confirmed in writing with the department, lender or portal before
committing money to a project.
