# HP v2 Research and Artifact Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the migrated HP State Pack to claim-level evidence, current multidimensional status, expanded official-source coverage, stronger mappings, and verified v2 workbook/app artifacts.

**Architecture:** Research proceeds through explicit HP scopes and a persistent candidate/source ledger. QA tests are made red by the migration debt, research resolves or explicitly downgrades each failure, and generated artifacts replace prior outputs only after structural, evidence, coverage, mapping, and visual gates pass.

**Tech Stack:** State Pack CLI, official web/PDF research, canonical JSON, Node tests, `@oai/artifact-tool` workbook generation and rendering.

**Spec:** `docs/superpowers/specs/2026-08-25-state-pack-research-system-design.md`

## Global Constraints

- Research cutoff uses the actual completion date and Asia/Calcutta timezone.
- Search snippets, news, aggregators, and secondary pages may create candidates but may not support published hard claims.
- Scheme existence, intake, and budget status are separate claims.
- Hard numbers, eligibility thresholds, deadlines, and application routes require primary-operative evidence.
- Every official source checked is recorded even when it yields no applicable scheme.
- New candidates, exclusions, duplicates, institutional routes, supersessions, and unresolved leads remain in the candidate ledger.
- No target number of schemes is imposed; completeness is proved by coverage and source sweeps.
- Existing data is not removed or changed without an evidence-backed change entry.
- Generated workbook and app output remain unchanged until all publication gates pass.

---

## File Structure

**Create:**

- `scheme-data/states/himachal-pradesh/research-source-inventory.json`
- `scheme-data/states/himachal-pradesh/research-runs/2026-08-hp-v2.json`
- `tools/state-pack/export-workbook.mjs`
- `tools/state-pack/lib/workbook-export.mjs`
- `tests/state-pack-hp-v2-qa.test.mjs`
- `tests/state-pack-workbook.test.mjs`
- `outputs/himachal-pradesh/*` — generated and ignored.

**Modify through research:**

- `scheme-data/common/{schemes,components,sources,changes}.json`
- `scheme-data/states/himachal-pradesh/{manifest,sectors,schemes,implementations,components,mappings,component-norms,contacts,legacy,sources,evidence,candidates,coverage,changes}.json`
- `app/data.json` only after final QA.

## Task 1: Make HP v2 publication gates fail for the known migration debt

**Files:**

- Create: `tests/state-pack-hp-v2-qa.test.mjs`
- Create: `scheme-data/states/himachal-pradesh/research-runs/2026-08-hp-v2.json`

**Interfaces:**

- Consumes: migrated HP State Pack.
- Produces: a deterministic queue of stale status, hard-claim evidence, orphan mapping, coverage, and source-quality failures.

- [ ] **Step 1: Write the failing HP v2 QA tests**

```js
test("every published HP scheme has current existence and intake evidence", async () => {
  const qa = await runPublicationQa(await loadStatePack("himachal-pradesh"), { asOf: "2026-08-25" });
  assert.deepEqual(qa.failures.filter((item) => ["MISSING_EXISTENCE", "MISSING_INTAKE", "STALE_OPEN_STATUS"].includes(item.code)), []);
});

test("every HP hard claim is anchored to acceptable evidence", async () => {
  const qa = await runPublicationQa(await loadStatePack("himachal-pradesh"), { asOf: "2026-08-25" });
  assert.deepEqual(qa.failures.filter((item) => item.code === "EVIDENCE_HARD_CLAIM"), []);
});

test("HP has no orphan published schemes or mappings", async () => {
  const qa = await runPublicationQa(await loadStatePack("himachal-pradesh"), { asOf: "2026-08-25" });
  assert.deepEqual(qa.failures.filter((item) => ["ORPHAN_SCHEME", "ORPHAN_MAPPING"].includes(item.code)), []);
});

test("the required HP coverage cube has no unexamined cells", async () => {
  const qa = await runPublicationQa(await loadStatePack("himachal-pradesh"), { asOf: "2026-08-25" });
  assert.deepEqual(qa.failures.filter((item) => item.code === "COVERAGE_UNEXAMINED"), []);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/state-pack-hp-v2-qa.test.mjs`  
Expected: FAIL with explicit lists corresponding to the seven open routes, broad allocation-dependent records, summary-only hard claims, six unmapped HPIIP routes, and incomplete v2 coverage dimensions.

- [ ] **Step 3: Freeze the research run declaration**

Write the run file with:

```json
{
  "id": "RESEARCH-RUN-HP-V2-2026-08",
  "mode": "refresh-state",
  "stateId": "STATE-IN-HP",
  "previousCutoff": "2026-08-23",
  "purpose": "HP v2 evidence migration and expanded official-source discovery",
  "included": ["all HP sectors", "all HP implementations", "referenced central schemes", "all HP coverage dimensions"],
  "excluded": ["unreferenced central schemes", "other states"],
  "publicationBlockedUntilQaPasses": true
}
```

Capture pre-run canonical hashes and current app/workbook reconciliation.

- [ ] **Step 4: Commit the failing gates and frozen scope**

```powershell
git add tests/state-pack-hp-v2-qa.test.mjs scheme-data/states/himachal-pradesh/research-runs/2026-08-hp-v2.json
git commit -m "test: define HP v2 publication gates"
```

## Task 2: Build and complete the official HP source inventory

**Files:**

- Create: `scheme-data/states/himachal-pradesh/research-source-inventory.json`
- Modify: `scheme-data/states/himachal-pradesh/sources.json`
- Modify: `scheme-data/states/himachal-pradesh/candidates.json`

**Interfaces:**

- Produces one inventory row per issuing department, directorate, corporation, board, mission, SPV, portal, budget/economic-survey source, and relevant central implementation channel.
- Each row has `agencyId`, `officialIndexUrls`, `sectors`, `beneficiaries`, `supportTypes`, `lastCheckedAt`, `outcome`, `sourceIds`, and `nextCheckAt`.

- [ ] **Step 1: Write the failing source-inventory coverage test**

```js
test("every HP agency referenced by a scheme or contact has an inventory outcome", async () => {
  const pack = await loadStatePack("himachal-pradesh");
  const referenced = referencedAgencyIds(pack);
  const inventoried = new Set(pack.researchSourceInventory.map((item) => item.agencyId));
  assert.deepEqual(referenced.filter((id) => !inventoried.has(id)), []);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test --test-name-pattern="agency" tests/state-pack-hp-v2-qa.test.mjs`  
Expected: FAIL because the inventory does not yet exist.

- [ ] **Step 3: Seed the inventory from current official records**

Generate initial agency rows from Scheme Master, Key Contacts, and Source Register. Ensure explicit coverage for Industries/Single Window, Agriculture, Horticulture, Animal Husbandry, Fisheries, Rural Development/NRLM, Urban Development, Tourism, Energy/HIMURJA, Forest, Handloom/Handicrafts, Labour/Employment/Skill, Cooperatives, Startup/Incubation, Food Processing, Pharma/Medical Devices, AYUSH, SC/ST development finance, OBC/minority development finance, women development, transport/logistics, and relevant district/cluster channels.

- [ ] **Step 4: Browse each official index and record outcomes**

For every inventory row:

1. Open official scheme, guideline, notification, circular, annual-report, portal, and current-call indexes.
2. Record every plausible beneficiary-facing candidate.
3. Record `verified-none` when an official sweep finds no additional route.
4. Retain institutional/intermediary routes with their classification.
5. Record broken or inaccessible official pages and a next-check date.

Do not publish candidates during this breadth pass.

- [ ] **Step 5: Verify GREEN and commit inventory evidence**

Run: `node --test --test-name-pattern="agency" tests/state-pack-hp-v2-qa.test.mjs`  
Expected: PASS.

```powershell
git add scheme-data/states/himachal-pradesh/research-source-inventory.json scheme-data/states/himachal-pradesh/sources.json scheme-data/states/himachal-pradesh/candidates.json
git commit -m "research: inventory HP official scheme sources"
```

## Task 3: Reverify multidimensional status for all current routes

**Files:**

- Modify: HP/common schemes, implementations, evidence, sources, legacy, candidates, and changes ledgers.

**Interfaces:**

- Produces status claims: `existence`, `intake`, `budget`, `verifiedAt`, `validFrom`, `validTo`, `nextCheckAt`, `sourceIds`, `confidence`.
- Removes the ambiguous v1 status only after equivalent v2 status evidence exists.

- [ ] **Step 1: Export the failing status queue**

Run: `node tools/state-pack/cli.mjs validate --state himachal-pradesh --gate status --format json`  
Expected: a deterministic queue beginning with expired `Open now`, allocation-dependent, closed-window, and migration-only status claims.

- [ ] **Step 2: Reverify the seven v1 `Open now` routes first**

For each route, find a current official call, portal state, notification, or issuing-agency update. Set `intake: open` only when evidence is still valid on the research date; otherwise use `scheduled`, `closed`, `unknown`, or `allocation-dependent`. Set the seven-day recheck rule for open deadlines.

- [ ] **Step 3: Reverify the 135 v1 allocation/sanction routes by issuing agency**

Separate programme existence from live intake and current allocation. A continuing scheme with no verified application window remains publishable with `intake: allocation-dependent` or `unknown`, not `open`. Record one change entry per semantic status correction; evidence-only refreshes use `evidence-upgraded`.

- [ ] **Step 4: Reverify continuous, cluster, and closed-window routes**

Check the 23 bank/continuous routes, 11 cluster/project-area routes, and six fresh-window-closed routes against current official evidence. Preserve predecessor/successor relations in legacy records.

- [ ] **Step 5: Run status QA and commit**

Run:

```powershell
node tools/state-pack/cli.mjs validate --state himachal-pradesh --gate status
node --test --test-name-pattern="existence and intake" tests/state-pack-hp-v2-qa.test.mjs
```

Expected: PASS; no expired evidence yields `intake: open`.

```powershell
git add scheme-data/common scheme-data/states/himachal-pradesh
git commit -m "research: reverify HP scheme status"
```

## Task 4: Upgrade hard claims to claim-level operative evidence

**Files:**

- Modify: common and HP schemes/components/evidence/sources/changes.

**Interfaces:**

- Every hard claim has an evidence locator and an accepted evidence grade.

- [ ] **Step 1: Export the hard-claim evidence queue**

Run: `node tools/state-pack/cli.mjs validate --state himachal-pradesh --gate evidence --format json`  
Expected: a non-empty queue, including precise claims currently supported only by broad official summaries such as the Economic Survey.

- [ ] **Step 2: Verify financial and eligibility claims against operative sources**

For each queued claim, locate the issuing notification, guideline, rule, current portal instruction, or official circular. Record exact page/section/table locator, issuer, publication/effective dates, retrieval date, and source fingerprint when obtainable.

- [ ] **Step 3: Resolve unavailable or conflicting evidence**

If no primary-operative evidence is reachable, replace precise entitlement language with the strongest supportable wording, set confidence and limitation explicitly, or move the record to candidate/legacy as appropriate. When official sources conflict, record both and resolve by legal authority, effective date, and scope.

- [ ] **Step 4: Verify representative high-impact claims manually**

Spot-check MMSY capital/interest support, State Mission on Food Processing, Startup Himachal, PMEGP, MUDRA, CGTMSE, horticulture component norms, fisheries, livestock infrastructure, industrial-policy incentives, and category-targeted finance. Reconcile displayed value, underlying claim, source locator, and current applicability.

- [ ] **Step 5: Run evidence QA and commit**

Run:

```powershell
node tools/state-pack/cli.mjs validate --state himachal-pradesh --gate evidence
node --test --test-name-pattern="hard claim" tests/state-pack-hp-v2-qa.test.mjs
```

Expected: PASS with no unsupported published hard claims.

```powershell
git add scheme-data/common scheme-data/states/himachal-pradesh
git commit -m "research: anchor HP claims to operative evidence"
```

## Task 5: Verify new candidates and expand HP scheme coverage

**Files:**

- Modify: HP/common candidate, scheme, implementation, component, evidence, source, contact, legacy, mapping, coverage, and change files.

**Interfaces:**

- Candidate dispositions: `publishable`, `component`, `no-current-intake`, `institutional`, `superseded`, `duplicate`, `out-of-scope`, `unverified-lead`.
- Coverage outcomes: `verified-applicable`, `verified-none`, `candidate-pending`, `not-relevant`.

- [ ] **Step 1: Deduplicate the breadth-pass candidate ledger**

Match official title, acronym, issuer, parent programme, legal authority, aliases, and predecessor/successor IDs. Do not count a component as a distinct programme, but preserve it as a searchable route when it has distinct eligibility or benefit rules.

- [ ] **Step 2: Perform the depth pass for every viable candidate**

Verify existence, intake, beneficiary scope, benefit, access route, dates, and HP implementation. Publish only candidates passing evidence gates. Retain every rejection/deferment with sources checked and next-check date.

- [ ] **Step 3: Complete the expanded coverage cube**

For each required intersection of agency, sector, beneficiary, enterprise stage, and support type, record an evidence-backed outcome. Retain the existing 382-by-12 family audit and link its rows to the richer cube.

- [ ] **Step 4: Reconcile mappings and the six orphan HPIIP records**

Classify each orphan as an active mapped route, a component, an existing-beneficiary/legacy route, or a duplicate. For new and changed schemes, create only evidence-justified Direct/Strong/Conditional/Horizontal mappings. Flag indiscriminate horizontal expansion and explain large mapping-count changes.

- [ ] **Step 5: Run coverage/mapping QA and commit**

Run:

```powershell
node tools/state-pack/cli.mjs validate --state himachal-pradesh --gate coverage
node tools/state-pack/cli.mjs validate --state himachal-pradesh --gate mappings
node --test --test-name-pattern="coverage|orphan" tests/state-pack-hp-v2-qa.test.mjs
```

Expected: PASS; candidate ledger has no viable candidate lacking a disposition; required coverage cells are complete.

```powershell
git add scheme-data/common scheme-data/states/himachal-pradesh
git commit -m "research: expand verified HP scheme coverage"
```

## Task 6: Generate and visually verify the HP v2 workbook

**Files:**

- Create: `tools/state-pack/export-workbook.mjs`
- Create: `tools/state-pack/lib/workbook-export.mjs`
- Create: `tests/state-pack-workbook.test.mjs`
- Generate: `outputs/himachal-pradesh/Himachal_Pradesh_Scheme_Guide_2026-08-25_verified.xlsx`

**Interfaces:**

- Produces the 13 retained sheets plus `Claim Evidence` and `Candidate Ledger`.
- Preserves state-pack stable IDs, evidence URLs, verification dates, filters, and readable formatting.

- [ ] **Step 1: Read the spreadsheet skill API and style references before authoring**

Load the workspace dependencies, read the complete spreadsheet API quick start and style guidelines, and run the artifact-operation marker exactly once for an XLSX create operation.

- [ ] **Step 2: Write failing workbook reconciliation tests**

```js
test("HP v2 workbook reconciles canonical row counts and sheets", async () => {
  const summary = await inspectGeneratedWorkbook(outputPath);
  assert.deepEqual(summary.sheetNames, [
    "Start Here", "Business Navigator", "Sector Catalogue", "Sector-Scheme Map",
    "Scheme Master", "Corrections Log", "Verification Notes", "Coverage Audit",
    "Component Norms", "Legacy & Closed", "Key Contacts", "Migration Audit",
    "Source Register", "Claim Evidence", "Candidate Ledger"
  ]);
  assert.equal(summary.schemeRows, canonical.schemeCount);
  assert.equal(summary.mappingRows, canonical.mappingCount);
  assert.equal(summary.claimRows, canonical.claimCount);
});
```

- [ ] **Step 3: Verify RED**

Run: `node --test tests/state-pack-workbook.test.mjs`  
Expected: FAIL because the exporter/output is absent.

- [ ] **Step 4: Implement the workbook exporter**

Use `@oai/artifact-tool` block writes, explicit header formatting, bounded widths, wrapped narrative columns, filters/tables, frozen headers, and visible official URLs. Generate Business Navigator from canonical sectors/mappings/schemes. Generate Coverage Audit, Claim Evidence, Candidate Ledger, and changes from their ledgers. Export only after data reconciliation passes.

- [ ] **Step 5: Render every sheet and repair severe visual defects**

Render used ranges at readable scale. Inspect all previews for clipped headers, unreadable URLs, broken tables, blank sheets, and awkward row heights. Run formula/error scans even if formulas are minimal. Save only the final workbook.

- [ ] **Step 6: Verify GREEN and commit exporter code**

Run: `node --test tests/state-pack-workbook.test.mjs`  
Expected: PASS. Do not commit the ignored workbook.

```powershell
git add tools/state-pack tests/state-pack-workbook.test.mjs
git commit -m "feat: export verified state workbooks"
```

## Task 7: Publish HP v2 app data and acceptance evidence

**Files:**

- Modify: `app/data.json`
- Generate: `outputs/himachal-pradesh/{qa-report,change-report}.json`
- Modify: `scheme-data/states/himachal-pradesh/manifest.json`
- Modify: `README.md`

- [ ] **Step 1: Run all publication gates without replacing outputs**

```powershell
node tools/state-pack/cli.mjs validate --state himachal-pradesh --all-gates
node --test tests/state-pack-*.test.mjs tests/service-worker.test.js
```

Expected: PASS.

- [ ] **Step 2: Generate the HP v2 QA and change reports**

The change report must categorize every change from the migration baseline and list added, corrected, status-updated, retired, merged, split, evidence-upgraded, and unchanged counts. The QA report must list cutoff, source-inventory completion, candidate dispositions, coverage outcomes, mapping distribution, and all gate results.

- [ ] **Step 3: Build and atomically replace `app/data.json`**

Run: `node tools/state-pack/cli.mjs build-app --state himachal-pradesh --output app/data.json --require-all-gates`  
Expected: output counts exactly match the canonical HP pack; the prior file is replaced only after validation.

- [ ] **Step 4: Update manifest and README**

Record the actual HP v2 cutoff, full-audit date, per-slice verification dates, counts, source inventory completion, and generated artifact path. README must distinguish distinct programmes from components/routes and describe the evidence/status improvements without making unsupported completeness claims.

- [ ] **Step 5: Run full regression and commit**

```powershell
npm run test:unit
npm run data:validate
git diff --check
git status --short
```

Run the existing Playwright suite with the bundled Playwright path and Chrome. Expected: all unit, data, and UI tests PASS.

```powershell
git add scheme-data app/data.json README.md
git commit -m "feat: publish verified HP v2 state pack"
```
