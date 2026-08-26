# HP Scheme Finder

**Live: https://bhavneet010.github.io/credit-schemes/**

A minimalist, installable PWA for searching Himachal Pradesh and central government
schemes by business activity. The canonical source is now the version-controlled HP
State Pack in `scheme-data/states/himachal-pradesh` (research cutoff 2026-08-26).

- **382** business activities across 15 macro sectors
- **188** schemes and routes, including 6 newly verified official routes
- **8,700** activity-to-scheme matches, graded Direct / Strong / Conditional / Horizontal
- **220** source records and a 33-entry official-agency inventory
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

## Rebuild HP v2

Keep `Himachal_Pradesh_MSME_Agri_Scheme_Guide_2026_verified.xlsx` in the repo root,
then run the deterministic HP v2 pipeline:

```bash
npm run hp-v2:import
npm run hp-v2:research
npm run test:hp-v2
npm run hp-v2:build
npm run hp-v2:workbook
```

`hp-v2:build` stages app data and QA/change/acceptance reports under
`outputs/himachal-pradesh`; add `-- --publish` only after all gates pass. The workbook
keeps the 13 existing sheets and adds Claim Evidence and Candidate Ledger.

## State Pack workflow

HP v2 is the accepted migration fixture for every future state. Import it once, validate
the canonical records, declare a focused scope, and build the app contract with:

```bash
npm run data:import-hp
npm run data:validate
node tools/state-pack/cli.mjs scope --mode refresh-sector --state himachal-pradesh --sectors SEC-AGR-HOR-01
npm run data:build
```

For updates, the scope declaration lists exactly which records and dependencies may
change. The hash guard rejects unrelated record changes. See
`docs/state-pack-operations.md` for all modes and failure behavior.

`python tools/make_icons.py` regenerates the app icons (no image library needed).

## Layout

```
app/
  index.html            app shell
  styles.css            shared mobile-first components
  theme.css             bright light theme + redesigned home
  app.js                hash router, search index, settings menu, all views
  data.json             generated from the accepted HP v2 workbench
  manifest.webmanifest  install metadata
  sw.js                 offline cache
  icons/
scheme-data/            canonical shared records, state packs and schemas
research/hp-v2/         accepted HP v2 research workbench and migration input
tools/state-pack/       reusable validation, scope, migration, diff and build engine
tools/hp-v2/            HP pilot research and workbook generators
tools/
  build_data.py         compatibility wrapper for the State Pack app builder
  make_icons.py         PNG icon generator
```

## How the app is organised

| Screen | What it does |
| --- | --- |
| Home | Use the centered activity search, or start with all schemes and official departments/portals |
| Search | Type an activity ("apple orchard", "bakery", "loan") and get matching activities and schemes |
| Activity | Udyam treatment, who applies, first contact, approvals, HP gate, plus every mapped scheme grouped by match strength |
| Scheme | Benefit and ceiling, your margin, eligibility, how to apply, agency, official page, cautions, stacking rules, and every activity it reaches |
| Schemes | All 188 routes, filterable by scheme family |
| Settings | The top-right menu opens Saved and More without a bottom tab bar |
| Saved | Bookmarked activities and schemes, kept in local storage |
| More | Cost norms and caps, closed/legacy schemes, about and disclaimer |

Status labels retain separate existence, intake and budget evidence — "Open now",
"Bank / continuous route", "Annual target / sanction", "Cluster or project area" and
"Fresh window closed" — because they determine whether a scheme can actually be used
for a new project. Closed routes carry an explicit warning on the scheme screen.

## Caveat

The app is a reference, not an approval. HP v2 labels 372 retained v1 claim wordings as
indicative-only where a claim-specific operative locator was not independently recovered;
the app surfaces that caution rather than presenting those statements as verified
entitlements. Ceilings, district targets and windows change;
eligibility must be confirmed in writing with the department, lender or portal before
committing money to a project.
