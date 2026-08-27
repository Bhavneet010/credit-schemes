# Scheme Finder

**Live: https://bhavneet010.github.io/credit-schemes/**

A minimalist, installable multi-state PWA for searching Indian state and central
government schemes by business activity. Production State Packs currently cover
Himachal Pradesh and Punjab, with research cutoffs of 2026-08-26.

- **Himachal Pradesh:** 382 activities, 188 schemes/routes and 8,700 reviewed matches
- **Punjab:** 369 activities, 156 schemes/routes and 4,941 activity-to-scheme matches with recorded rationale
- Claim-level evidence, explicit intake status, candidate ledgers and official-agency inventories
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

## Rebuild the accepted HP v2 research fixture

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
the canonical records, declare a focused scope, and build the multi-state app data with:

```bash
npm run data:import-hp
npm run data:validate
node tools/state-pack/cli.mjs scope --mode refresh-sector --state himachal-pradesh --sectors SEC-AGR-HOR-01
npm run data:build
```

The accepted Punjab pack can be regenerated deterministically with
`npm run data:generate-punjab` before validation and build.

For updates, the scope declaration lists exactly which records and dependencies may
change. The hash guard rejects unrelated record changes. See
`docs/state-pack-operations.md` for all modes and failure behavior.

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
  data/
    states.json         generated state index
    himachal-pradesh.json generated HP dataset with evidence/status detail
    punjab.json         generated Punjab dataset with evidence/status detail
  icons/                generated — app icons
  splash/               generated — iOS launch images
  manifest.webmanifest  install metadata
  sw.js                 offline cache
  icons/
scheme-data/            canonical shared records, state packs and schemas
research/hp-v2/         accepted HP v2 research workbench and migration input
  baseline-app-data.json frozen 182-scheme v1 app baseline used only by HP pilot tests
tools/state-pack/       reusable validation, scope, migration, diff and build engine
tools/hp-v2/            HP pilot research and workbook generators
tools/
  build_data.py         compatibility wrapper for the State Pack app builder
  make_icons.py         artwork  ->  app/icons/
  make_splash.py        artwork  ->  app/splash/
  pngkit.py             PNG read/write, resampling and palette encoding
  artwork/              source art for the icon and the launch screen
```

## How the app is organised

| Screen | What it does |
| --- | --- |
| Home | Use the centered activity search, or start with all schemes and official departments/portals |
| Search | Type an activity ("apple orchard", "bakery", "loan") and get matching activities and schemes. The whole scheme record is indexed, not just its headline, so "collateral free", "interest subvention" or "DIC" reach the schemes that say so |
| Activity | Udyam treatment, who applies, first contact, approvals, state-specific gate, plus every mapped scheme grouped by match strength. Opening a scheme from here carries the activity with it, so the scheme screen also shows why that match was made, what to do first, and any condition specific to that pairing |
| Scheme | Benefit and ceiling, your margin, eligibility, how to apply, agency, official page, cautions, stacking rules, and every activity it reaches. Below that, "Go deeper" panels — collapsed until tapped — carry the scheme's own official pages and the department to ask, the benchmark cost norms that size the assistance, why a closed route is flagged, and related routes under the same programme or family |
| Schemes | All routes for the selected state, filterable by scheme family |
| State selector | Switches generated State Packs without reloading the app |
| Settings | The top-right menu opens Saved and More without a bottom tab bar |
| Install | Every visit that is not already installed opens with a banner offering the app — the browser's own install prompt where one is available, otherwise the "add to home screen" steps for that platform. "Not now" hides it for that visit; installing hides it for good |
| Launch | Android builds its splash from the manifest's `background_color` and icon; iOS uses the matching image in `app/splash/` |
| Saved | Bookmarked activities and schemes, kept in local storage |
| More | Cost norms and caps, closed/legacy schemes, about and disclaimer |
| Research | Shows cutoff, coverage, candidate dispositions and material limitations |

Status labels retain separate existence, intake and budget evidence — "Open now",
"Bank / continuous route", "Annual target / sanction", "Cluster or project area" and
"Fresh window closed" — because they determine whether a scheme can actually be used
for a new project. Closed routes carry an explicit warning on the scheme screen.

## Caveat

The app is a reference, not an approval. HP v2 labels 372 retained v1 claim wordings as
indicative-only where a claim-specific operative locator was not independently recovered;
the app surfaces that caution rather than presenting those statements as verified
entitlements. Punjab likewise keeps inaccessible or unconfirmed fisheries, horticulture,
targeted-finance and annual-allocation leads in its candidate ledger rather than inferring
benefits. Ceilings, district targets and windows change;
eligibility must be confirmed in writing with the department, lender or portal before
committing money to a project.
