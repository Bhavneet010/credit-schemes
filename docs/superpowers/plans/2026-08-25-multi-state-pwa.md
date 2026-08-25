# Multi-State Scheme Finder PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the HP-only static PWA into a state-aware offline Scheme Finder that consumes generated State Packs without losing the approved HP visual design or existing bookmarks.

**Architecture:** A small state index identifies available generated datasets. The app loads one selected state at a time, uses stable record IDs in routes and saved items, migrates legacy HP index bookmarks, and caches the state index plus the default HP dataset while runtime-caching additional states after first use.

**Tech Stack:** Vanilla JavaScript, HTML, CSS, static JSON, Service Worker, Node test runner, Playwright with Chrome.

**Spec:** `docs/superpowers/specs/2026-08-25-state-pack-research-system-design.md`

## Global Constraints

- Preserve the approved alpine visual treatment, compact mobile layout, two starting routes, and existing accessibility behavior.
- Keep the deployment static, offline-capable, dependency-free at runtime, and free of accounts or analytics.
- Routes and bookmarks use stable State Pack IDs, never array indexes.
- Existing HP bookmarks migrate without data loss.
- Each loaded state works offline after its first successful load; the default HP state is pre-cached.
- State data and state index are generated from canonical State Packs.
- Scheme existence and intake status remain distinct in details even when shown as a combined badge.

---

## File Structure

**Create:**

- `app/data/states.json` — generated state index.
- `app/data/himachal-pradesh.json` — generated HP dataset.
- `tests/multi-state-data.test.mjs` — state-index/compiler tests.

**Modify:**

- `tools/state-pack/lib/app-compiler.mjs`
- `tools/state-pack/build-app-data.mjs`
- `app/app.js`
- `app/index.html`
- `app/manifest.webmanifest`
- `app/sw.js`
- `app/styles.css` and/or `app/theme.css` only for the state selector and evidence blocks.
- `tests/home-ui.test.js`
- `tests/service-worker.test.js`
- `README.md`

**Remove after successful migration:**

- `app/data.json` — superseded by `app/data/states.json` and per-state files.

## Task 1: Generate a state index and per-state datasets

**Files:**

- Create: `tests/multi-state-data.test.mjs`
- Modify: `tools/state-pack/lib/app-compiler.mjs`
- Modify: `tools/state-pack/build-app-data.mjs`
- Create: `app/data/states.json`
- Create: `app/data/himachal-pradesh.json`

**Interfaces:**

- Produces index:

```json
{
  "defaultState": "himachal-pradesh",
  "states": [
    {
      "id": "STATE-IN-HP",
      "slug": "himachal-pradesh",
      "name": "Himachal Pradesh",
      "data": "data/himachal-pradesh.json",
      "verified": "2026-08-25"
    }
  ]
}
```

- Produces command: `build-app --all --output-dir app/data`.

- [ ] **Step 1: Write failing data-index tests**

```js
test("the state index points to every generated state dataset", async () => {
  const build = await compileAllStates(repositoryRoot);
  assert.equal(build.index.defaultState, "himachal-pradesh");
  assert.deepEqual(build.index.states.map((state) => state.slug), ["himachal-pradesh"]);
  assert.equal(build.datasets.get("himachal-pradesh").meta.stateId, "STATE-IN-HP");
});

test("compiled records expose stable IDs and status evidence", async () => {
  const hp = (await compileAllStates(repositoryRoot)).datasets.get("himachal-pradesh");
  assert.ok(hp.sectors.every((record) => record.id.startsWith("SECTOR-")));
  assert.ok(hp.schemes.every((record) => record.id.startsWith("SCHEME-") || record.id.startsWith("COMPONENT-")));
  assert.ok(hp.schemes.every((record) => record.status.existence && record.status.intake && record.status.verifiedAt));
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/multi-state-data.test.mjs`  
Expected: FAIL because multi-state compiler output is absent.

- [ ] **Step 3: Implement index and dataset generation**

Compile state metadata from each validated manifest. Include state name, slug, cutoff, counts, data path, and material QA limitations. Use stable IDs in sectors, schemes, mappings, and alias tables. Write all files to `.state-pack-staging/app-data`, validate cross-file references, then replace `app/data/` atomically.

- [ ] **Step 4: Verify GREEN and generate HP files**

Run:

```powershell
node --test tests/multi-state-data.test.mjs
node tools/state-pack/cli.mjs build-app --all --output-dir app/data --require-all-gates
```

Expected: PASS; `states.json` references a valid HP dataset.

- [ ] **Step 5: Commit**

```powershell
git add tools/state-pack tests/multi-state-data.test.mjs app/data
git commit -m "feat: generate state-aware app data"
```

## Task 2: Load the selected state and route by stable IDs

**Files:**

- Modify: `app/app.js`
- Modify: `tests/home-ui.test.js`

**Interfaces:**

- Adds: `loadStateIndex()`, `loadState(slug)`, `selectState(slug)`, `sectorById`, `schemeById`.
- Routes: `#/state/<slug>`, `#/state/<slug>/s/<sector-id>`, `#/state/<slug>/k/<scheme-id>`, and state-prefixed list/reference routes.
- Legacy HP routes redirect after resolving current array indexes once.

- [ ] **Step 1: Write failing browser tests for state loading and stable routes**

```js
test("the app loads the default state from the generated index", async () => {
  await page.goto(baseUrl);
  await page.getByText("Himachal Pradesh", { exact: true }).waitFor();
  assert.match(await page.locator(".home-hero").innerText(), /382 business activities/);
});

test("activity and scheme links use stable IDs", async () => {
  await page.goto(`${baseUrl}#/state/himachal-pradesh`);
  await page.locator("#q").fill("apple orchard");
  const activityHref = await page.locator('a[href*="/s/SECTOR-"]').first().getAttribute("href");
  assert.match(activityHref, /^#\/state\/himachal-pradesh\/s\/SECTOR-/);
});
```

- [ ] **Step 2: Verify RED**

Run the Playwright test file with the configured bundled Playwright path.  
Expected: new tests FAIL because app still fetches `data.json` and routes by indexes.

- [ ] **Step 3: Implement asynchronous state boot and ID lookup maps**

Boot sequence:

```js
Promise.all([
  fetch("data/states.json").then((response) => response.json()),
  navigator.serviceWorker?.ready.catch(() => null)
]).then(([index]) => loadState(resolveRequestedOrSavedState(index)));
```

Build maps from stable IDs to records and preserve array order only for display. Generate all links with state slug and stable IDs. Legacy `#/s/<number>` and `#/k/<number>` routes resolve against HP once, replace history with the stable route, and render normally.

- [ ] **Step 4: Verify GREEN and existing search/navigation tests**

Run the complete `tests/home-ui.test.js`. Expected: all old and new tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add app/app.js tests/home-ui.test.js
git commit -m "feat: load states with stable routes"
```

## Task 3: Add the state selector without disturbing the approved home design

**Files:**

- Modify: `app/app.js`
- Modify: `app/styles.css`
- Modify: `app/theme.css`
- Modify: `tests/home-ui.test.js`

**Interfaces:**

- Adds an accessible `Select state` control in the header/home context.
- Persists selection in `localStorage` key `scheme-finder-selected-state-v1`.

- [ ] **Step 1: Write failing selector behavior tests**

```js
test("state selector precedes scheme navigation and persists selection", async () => {
  await page.goto(baseUrl);
  const selector = page.getByRole("combobox", { name: "Select state" });
  await selector.waitFor();
  assert.equal(await selector.inputValue(), "himachal-pradesh");
  assert.equal(await page.locator(".start-here").getByRole("link").count(), 2);
  assert.equal(await page.evaluate(() => localStorage.getItem("scheme-finder-selected-state-v1")), "himachal-pradesh");
});
```

Add a fixture state to the browser test server only, select it, and assert its dataset and routes load without a full page reload.

- [ ] **Step 2: Verify RED**

Run the selector tests. Expected: FAIL because no control exists.

- [ ] **Step 3: Implement the selector and compact responsive styles**

Use a native `<select>` with a visible state label, keyboard/focus support, and no custom menu dependency. Keep the alpine crest, one-line mobile headline, two starting routes, search size, and 320px no-overflow constraints unchanged.

- [ ] **Step 4: Verify GREEN and visual invariants**

Run all home UI tests at desktop, 390px, 360px, and 320px viewports. Expected: PASS; selector does not create horizontal overflow or add a third starting route.

- [ ] **Step 5: Commit**

```powershell
git add app/app.js app/styles.css app/theme.css tests/home-ui.test.js
git commit -m "feat: add persistent state selector"
```

## Task 4: Migrate saved items and expose evidence/status detail

**Files:**

- Modify: `app/app.js`
- Modify: `tests/home-ui.test.js`

**Interfaces:**

- New saved key: `scheme-finder-saved-v2` entries `{stateId,type,id}`.
- Migrates legacy keys `s<number>` and `k<number>` to HP stable IDs once.
- Scheme detail shows existence, intake, budget, verified date, evidence links, and limitations.

- [ ] **Step 1: Write failing migration and evidence tests**

```js
test("legacy HP bookmarks migrate to state-qualified stable IDs", async () => {
  await page.addInitScript(() => localStorage.setItem("saved", JSON.stringify(["s0", "k0"])));
  await page.goto(baseUrl);
  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem("scheme-finder-saved-v2")));
  assert.ok(migrated.every((item) => item.stateId === "STATE-IN-HP" && /^(SECTOR|SCHEME|COMPONENT)-/.test(item.id)));
});

test("scheme detail distinguishes existence from intake", async () => {
  await page.goto(`${baseUrl}#/state/himachal-pradesh/k/SCHEME-HP-MMSY`);
  await page.getByText("Scheme status", { exact: true }).waitFor();
  await page.getByText(/Existence:/).waitFor();
  await page.getByText(/Intake:/).waitFor();
  await page.getByText(/Verified:/).waitFor();
});
```

- [ ] **Step 2: Verify RED**

Run the targeted browser tests. Expected: FAIL because saves use index keys and status is one string.

- [ ] **Step 3: Implement idempotent bookmark migration and evidence panels**

Migration runs only when v2 key is absent, resolves legacy indexes against the loaded HP dataset, deduplicates stable entries, writes v2, and retains the old key for one release as rollback evidence. Evidence panels list official source titles/links and checked dates; they do not dump internal claim JSON.

- [ ] **Step 4: Verify GREEN**

Run targeted and complete home UI tests. Expected: PASS; repeat load does not duplicate bookmarks.

- [ ] **Step 5: Commit**

```powershell
git add app/app.js tests/home-ui.test.js
git commit -m "feat: migrate saves and show evidence status"
```

## Task 5: Add research metadata and multi-state offline caching

**Files:**

- Modify: `app/app.js`
- Modify: `app/sw.js`
- Modify: `tests/service-worker.test.js`
- Modify: `tests/home-ui.test.js`

**Interfaces:**

- Adds route: `#/state/<slug>/research`.
- Pre-caches shell, `data/states.json`, and default HP data.
- Runtime-caches any successfully loaded additional state dataset.

- [ ] **Step 1: Write failing service-worker and research-view tests**

```js
test("install precaches the state index and default HP dataset", async () => {
  // existing cache harness
  assert.ok(cachedShell.includes("./data/states.json"));
  assert.ok(cachedShell.includes("./data/himachal-pradesh.json"));
  assert.ok(!cachedShell.includes("./data.json"));
});

test("research view shows cutoff, coverage, candidates, and limitations", async () => {
  await page.goto(`${baseUrl}#/state/himachal-pradesh/research`);
  await page.getByRole("heading", { name: "Research and coverage" }).waitFor();
  await page.getByText(/Research cutoff/).waitFor();
  await page.getByText(/Candidate disposition/).waitFor();
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/service-worker.test.js` and the targeted browser test.  
Expected: FAIL because old cache lists `data.json` and no research route exists.

- [ ] **Step 3: Implement v8 cache and research view**

Set `CACHE = "scheme-finder-v8"`, pre-cache the state index and HP dataset, and preserve cache-first/runtime-refresh behavior for other same-origin state JSON. The research view summarizes manifest/QA data and unresolved candidate counts without claiming government endorsement.

- [ ] **Step 4: Verify GREEN and offline behavior**

Run service-worker tests. In Playwright, load HP online once, switch browser context offline, reload the HP route, and verify home/search render. Load a fixture second state online, go offline, and verify that state reloads from runtime cache.

- [ ] **Step 5: Commit**

```powershell
git add app/app.js app/sw.js tests/service-worker.test.js tests/home-ui.test.js
git commit -m "feat: cache state packs and show research metadata"
```

## Task 6: Generalize app metadata and documentation

**Files:**

- Modify: `app/index.html`
- Modify: `app/manifest.webmanifest`
- Modify: `README.md`
- Remove: `app/data.json`

- [ ] **Step 1: Write the failing generic-metadata assertion**

Add a test that reads index/manifest and asserts the product name is `Scheme Finder`, the description covers Indian state and central schemes, and shortcuts use state-aware routes.

- [ ] **Step 2: Verify RED**

Run the metadata test. Expected: FAIL on HP-only copy.

- [ ] **Step 3: Update metadata and README, then remove obsolete data**

Change page/manifest title and description to the multi-state product while keeping `lang: en-IN`. Document state generation, focused refresh commands, stable IDs, offline behavior, research limitations, and deployment. Remove `app/data.json` only after app and service worker no longer reference it.

- [ ] **Step 4: Run full verification**

```powershell
npm run test:unit
npm run data:validate
rg -n 'data\.json|HP Scheme Finder|Himachal Pradesh and central' app tests README.md
git diff --check
```

Expected: tests PASS; any remaining HP-specific text is state data or an explicit migration note, not hard-coded product identity.

Run full Playwright tests with the bundled Playwright path and Chrome. Confirm no console errors, broken routes, or 320px overflow.

- [ ] **Step 5: Commit**

```powershell
git add app tests README.md
git commit -m "feat: ship multi-state scheme finder"
```

## Task 7: End-to-end acceptance with a second-state fixture

**Files:**

- Create: `tests/fixtures/state-pack/second-state-valid/**`
- Modify: `tests/multi-state-data.test.mjs`
- Modify: `tests/home-ui.test.js`

- [ ] **Step 1: Add a hand-checked minimal second-state fixture**

Use two sectors, one state scheme, one shared central scheme implementation, three mappings, claim evidence, coverage outcomes, one contact, and one legacy candidate. This is a test fixture, not researched production data.

- [ ] **Step 2: Prove add-state build behavior**

Compile HP plus the fixture and assert the index has two states, datasets do not leak state-only records, shared central IDs match, and HP output is unchanged.

- [ ] **Step 3: Prove state switching and saved-item isolation**

In Playwright, switch between HP and the fixture state, verify counts/content change, save one item in each, and verify the Saved view groups entries by state without collisions.

- [ ] **Step 4: Run all acceptance checks**

```powershell
npm run test:unit
npm run data:validate
git diff --check
git status --short
```

Run complete Playwright and offline tests. Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add tests
git commit -m "test: verify multi-state end-to-end flow"
```
