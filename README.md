# HP Scheme Finder

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

`python tools/make_icons.py` regenerates the app icons (no image library needed).

## Layout

```
app/
  index.html            shell + bottom tab bar
  styles.css            light/dark theme, mobile-first
  app.js                hash router, search index, all views
  data.json             generated — do not edit by hand
  manifest.webmanifest  install metadata
  sw.js                 offline cache
  icons/
tools/
  build_data.py         workbook  ->  data.json
  make_icons.py         PNG icon generator
```

## How the app is organised

| Screen | What it does |
| --- | --- |
| Search | Type an activity ("apple orchard", "bakery", "loan") and get matching activities and schemes |
| Sectors | Browse 15 macro sectors → subsectors → activities |
| Activity | Udyam treatment, who applies, first contact, approvals, HP gate, plus every mapped scheme grouped by match strength |
| Scheme | Benefit and ceiling, your margin, eligibility, how to apply, agency, official page, cautions, stacking rules, and every activity it reaches |
| Schemes | All 182 routes, filterable by scheme family |
| Saved | Bookmarked activities and schemes, kept in local storage |
| More | Departments and portals, cost norms and caps, closed/legacy schemes, about and disclaimer |

Status labels are carried through from the workbook unchanged — "Open now",
"Bank / continuous route", "Annual target / sanction", "Cluster or project area" and
"Fresh window closed" — because they determine whether a scheme can actually be used
for a new project. Closed routes carry an explicit warning on the scheme screen.

## Caveat

The app is a reference, not an approval. Ceilings, district targets and windows change;
eligibility must be confirmed in writing with the department, lender or portal before
committing money to a project.
