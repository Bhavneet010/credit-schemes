# HP v2 Research Method Pilot and Artifacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate the complete research method on Himachal Pradesh first, produce a more reliable and broader HP v2 workbook/app dataset, and capture the real edge cases that the later generalized State Pack must support.

**Architecture:** A small HP-specific, version-controlled research workbench sits beside the existing workbook. It records baseline rows, claim evidence, status, sources, candidates, coverage, mapping review, and changes without prematurely generalizing schemas for all states. HP v2 artifacts are generated from this workbench; its accepted data and method findings then become the input to the State Pack plan.

**Tech Stack:** Official web/PDF research, Node.js ESM, Node test runner, JSON research ledgers, `@oai/artifact-tool` workbook import/export/rendering, existing vanilla PWA compatibility data.

**Spec:** `docs/superpowers/specs/2026-08-25-state-pack-research-system-design.md`

## Global Constraints

- HP v2 research precedes generalized State Pack design and migration.
- The workbench is only the minimum durable structure needed to avoid losing evidence; do not build multi-state overlays, generic scope propagation, or the reusable skill in this phase.
- Import every current HP workbook record before correcting or expanding it.
- Search snippets, news, aggregators, and secondary pages may create candidates but may not support published hard claims.
- Scheme existence, intake, and budget status are separate claims.
- Hard numbers, eligibility thresholds, deadlines, and application routes require primary-operative evidence.
- Every official source checked is recorded even when it yields no applicable scheme.
- Do not target an arbitrary scheme count; prove breadth with agency and coverage sweeps.
- Existing v1 workbook/app artifacts remain untouched until every HP v2 publication gate passes.
- Use the actual completion date and Asia/Calcutta timezone for the final cutoff.

---

## File Structure

**Create:**

- `research/hp-v2/run.json` — frozen pilot scope and checkpoints.
- `research/hp-v2/baseline.json` — lossless normalized snapshot of all 13 v1 sheets.
- `research/hp-v2/claims.json` — claim-level values, status, evidence links, and confidence.
- `research/hp-v2/sources.json` — source inventory and retrieval metadata.
- `research/hp-v2/candidates.json` — all discovered, rejected, duplicate, closed, and pending candidates.
- `research/hp-v2/coverage.json` — existing family audit plus expanded coverage outcomes.
- `research/hp-v2/mapping-review.json` — reviewed applicability and orphan resolution.
- `research/hp-v2/changes.json` — evidence-backed semantic changes from v1.
- `research/hp-v2/method-findings.json` — real schema/workflow edge cases for later generalization.
- `tools/hp-v2/{import,validate,build-data,export-workbook}.mjs` — HP-only pilot commands.
- `tools/hp-v2/lib/*.mjs` — focused workbook, evidence, QA, and generation helpers.
- `tests/hp-v2-*.test.mjs` — workbench and artifact behavior tests.
- `outputs/himachal-pradesh/*` — generated, ignored HP v2 artifacts.

**Modify only after all gates pass:**

- `app/data.json`
- `README.md`

## Task 1: Freeze and import the complete HP v1 baseline into the workbench

**Files:**

- Create: `package.json`
- Modify: `.gitignore`
- Create: `research/hp-v2/run.json`
- Create: `research/hp-v2/baseline.json`
- Create: `tools/hp-v2/import.mjs`
- Create: `tools/hp-v2/lib/workbook.mjs`
- Create: `tests/hp-v2-import.test.mjs`

**Interfaces:**

- Consumes: `Himachal_Pradesh_MSME_Agri_Scheme_Guide_2026_verified.xlsx` and `app/data.json`.
- Produces: a deterministic baseline containing every used row from all 13 workbook sheets plus current app counts and hashes.

- [ ] **Step 1: Write the failing lossless-import test**

```js
test("HP v1 workbench import retains all authoritative workbook rows", async () => {
  const result = await importHpWorkbook({ workbookPath, outputPath: tempBaseline });
  assert.deepEqual(result.counts, {
    sectors: 382,
    schemes: 182,
    mappings: 6767,
    componentNorms: 71,
    contacts: 79,
    legacy: 35,
    sources: 214,
    coverageRows: 4584,
    originalAuditRows: 62,
    correctionEntries: 108
  });
  assert.deepEqual(result.sheetNames, [
    "Start Here", "Business Navigator", "Sector Catalogue", "Sector-Scheme Map",
    "Scheme Master", "Corrections Log", "Verification Notes", "Coverage Audit",
    "Component Norms", "Legacy & Closed", "Key Contacts", "Original Audit", "Source Register"
  ]);
});

test("every imported table row retains sheet and one-based row provenance", async () => {
  const result = await importHpWorkbook({ workbookPath, outputPath: tempBaseline });
  assert.ok(result.tableRows.every((row) => row.provenance.sheet && row.provenance.row >= 2));
});
```

- [ ] **Step 2: Run and verify RED**

Run with bundled `@oai/artifact-tool`: `node --test tests/hp-v2-import.test.mjs`
Expected: FAIL because the importer/workbench is absent.

- [ ] **Step 3: Implement the HP-only importer**

Use `SpreadsheetFile.importXlsx` to read the workbook. Preserve displayed text and current IDs exactly. Store each sheet as `{name, headers, rows}` with provenance and a workbook hash. Do not split common/state schemes or invent generalized IDs in this phase.

Create `package.json` scripts:

```json
{
  "private": true,
  "scripts": {
    "test:hp-v2": "node --test tests/hp-v2-*.test.mjs",
    "hp-v2:import": "node tools/hp-v2/import.mjs",
    "hp-v2:validate": "node tools/hp-v2/validate.mjs",
    "hp-v2:build": "node tools/hp-v2/build-data.mjs"
  }
}
```

Ignore `outputs/` and `.hp-v2-staging/`, not the `research/hp-v2` ledgers.

- [ ] **Step 4: Generate and verify the frozen run declaration**

`run.json` must contain:

```json
{
  "id": "HP-V2-PILOT-2026-08",
  "mode": "full-state-method-pilot",
  "state": "Himachal Pradesh",
  "previousCutoff": "2026-08-23",
  "included": ["all 13 workbook sheets", "all current HP routes", "referenced central routes", "expanded discovery coverage"],
  "excluded": ["other states", "generalized State Pack implementation", "multi-state PWA"],
  "publicationBlockedUntilQaPasses": true
}
```

Run the importer and confirm baseline/app hashes are stable across two runs.

- [ ] **Step 5: Commit the frozen baseline**

```powershell
git add package.json .gitignore research/hp-v2 tools/hp-v2 tests/hp-v2-import.test.mjs
git commit -m "research: freeze HP v1 baseline for v2 pilot"
```

## Task 2: Define HP v2 claims, status, candidates, coverage, and QA gates

**Files:**

- Create: `research/hp-v2/{claims,sources,candidates,coverage,mapping-review,changes,method-findings}.json`
- Create: `tools/hp-v2/validate.mjs`
- Create: `tools/hp-v2/lib/qa.mjs`
- Create: `tests/hp-v2-qa.test.mjs`

**Interfaces:**

- Produces deterministic failures with codes and baseline row references.
- Permits migration debt during work but blocks final publication.

- [ ] **Step 1: Write failing HP v2 QA tests**

```js
test("every publishable route has current existence and intake evidence", async () => {
  const qa = await runHpV2Qa(workbench, { asOf: "2026-08-25" });
  assert.deepEqual(qa.byCodes("MISSING_EXISTENCE", "MISSING_INTAKE", "STALE_OPEN_STATUS"), []);
});

test("hard claims require primary-operative evidence", async () => {
  const qa = await runHpV2Qa(workbench, { asOf: "2026-08-25" });
  assert.deepEqual(qa.byCodes("EVIDENCE_HARD_CLAIM"), []);
});

test("required coverage cells and mapping reviews are complete", async () => {
  const qa = await runHpV2Qa(workbench, { asOf: "2026-08-25" });
  assert.deepEqual(qa.byCodes("COVERAGE_UNEXAMINED", "MAPPING_UNREVIEWED", "ORPHAN_SCHEME"), []);
});
```

- [ ] **Step 2: Verify RED against the imported baseline**

Run: `node --test tests/hp-v2-qa.test.mjs`
Expected: FAIL with explicit queues for v1 row-level evidence, seven `Open now` routes, broad allocation statuses, hard claims, incomplete expanded coverage, and six unmapped HPIIP routes.

- [ ] **Step 3: Implement only the HP pilot record contracts**

Use stable workbench IDs tied to v1 row provenance. Claim records include subject row/ID, field, value, source IDs, locator, verified/effective dates, evidence grade, and confidence. Status separates existence, intake, and budget. Candidates and coverage use the approved dispositions/outcomes. Do not add central/state overlay or general scope resolution yet.

- [ ] **Step 4: Seed ledgers without making QA artificially green**

Convert current row URLs/dates to initial source and claim links, marking multi-claim rows and summary-only hard claims as unresolved migration debt. Seed existing Coverage Audit outcomes and the six orphan scheme IDs. `method-findings.json` starts with an empty `findings` array and an explicit schema version.

- [ ] **Step 5: Commit failing gates and seeded workbench**

```powershell
git add research/hp-v2 tools/hp-v2 tests/hp-v2-qa.test.mjs
git commit -m "test: define HP v2 research gates"
```

## Task 3: Complete the official HP source inventory and candidate breadth pass

**Files:**

- Modify: `research/hp-v2/sources.json`
- Modify: `research/hp-v2/candidates.json`
- Modify: `research/hp-v2/coverage.json`
- Modify: `research/hp-v2/method-findings.json`

- [ ] **Step 1: Add the failing agency-inventory test**

Every agency named in Scheme Master, Key Contacts, Source Register, and the approved discovery list must have official index URLs, sectors, beneficiary/support tags, checked date, outcome, and next-check date.

- [ ] **Step 2: Seed and then browse the complete agency inventory**

Cover Industries/Single Window, Agriculture, Horticulture, Animal Husbandry, Fisheries, Rural Development/NRLM, Urban Development, Tourism, Energy/HIMURJA, Forest, Handloom/Handicrafts, Labour/Employment/Skill, Cooperatives, Startup/Incubation, Food Processing, Pharma/Medical Devices, AYUSH, SC/ST development finance, OBC/minority development finance, women development, transport/logistics, district/cluster channels, and relevant central implementing bodies.

- [ ] **Step 3: Record every plausible candidate before depth verification**

Search official scheme/guideline/notification/circular indexes, budgets, Economic Survey, demands for grants, outcome documents, annual reports, application portals, and successor/closure notices. Secondary material may add a lead only. Record `verified-none` when an official sweep finds nothing additional.

- [ ] **Step 4: Capture method edge cases immediately**

For each discovery ambiguity—renamed schemes, components presented as schemes, institutional finance, seasonal calls, broken portals, district-only notices, conflicting titles—add a finding with the concrete HP example, required record behavior, and later generalization requirement.

- [ ] **Step 5: Verify agency coverage and commit**

Run: `node --test --test-name-pattern="agency|inventory" tests/hp-v2-qa.test.mjs`
Expected: PASS.

```powershell
git add research/hp-v2
git commit -m "research: complete HP v2 source breadth pass"
```

## Task 4: Reverify all current route status and hard claims

**Files:**

- Modify: `research/hp-v2/{claims,sources,candidates,changes,method-findings}.json`

- [ ] **Step 1: Reverify the seven `Open now` routes**

Use a current official call, portal state, notification, or issuing-agency update. Set `intake: open` only when evidence remains valid on the research date; otherwise use scheduled, closed, unknown, or allocation-dependent. Apply the seven-day open-status recheck rule.

- [ ] **Step 2: Reverify the 135 allocation/sanction routes by issuing agency**

Separate continuing programme existence from live intake and current allocation. Record evidence-backed status changes and retain previous wording in `changes.json`.

- [ ] **Step 3: Reverify continuous, cluster, and closed-window routes**

Check all 23 bank/continuous routes, 11 cluster/project-area routes, and six fresh-window-closed routes. Preserve predecessor/successor and existing-beneficiary distinctions.

- [ ] **Step 4: Upgrade every queued hard claim**

Locate issuing notifications, operative guidelines, rules, current portal instructions, or official circulars. Record page/section/table locator and effective dates. If operative evidence is unavailable, narrow/downgrade the claim or candidate status rather than repeat a precise unsupported entitlement.

- [ ] **Step 5: Spot-check high-impact claim families**

Manually reconcile MMSY, State Mission on Food Processing, Startup Himachal, PMEGP, MUDRA, CGTMSE, horticulture component norms, fisheries, livestock infrastructure, industrial-policy incentives, and category-targeted finance.

- [ ] **Step 6: Run status/evidence QA and commit**

```powershell
node tools/hp-v2/validate.mjs --gate status
node tools/hp-v2/validate.mjs --gate evidence
node --test --test-name-pattern="existence|hard claims" tests/hp-v2-qa.test.mjs
```

Expected: PASS with no expired open label and no unsupported published hard claim.

```powershell
git add research/hp-v2
git commit -m "research: reverify HP v2 claims and status"
```

## Task 5: Verify candidates, expand coverage, and review every mapping

**Files:**

- Modify: `research/hp-v2/{claims,sources,candidates,coverage,mapping-review,changes,method-findings}.json`

- [ ] **Step 1: Deduplicate and classify every candidate**

Use title, acronym, issuer, parent, legal authority, aliases, and predecessor/successor. Dispositions are publishable, component, no-current-intake, institutional, superseded, duplicate, out-of-scope, or unverified-lead.

- [ ] **Step 2: Depth-verify every viable candidate**

Verify existence, intake, beneficiary scope, benefit, access, dates, and HP implementation. Retain all rejected/deferred candidates with checked sources and next-check dates.

- [ ] **Step 3: Complete the expanded HP coverage cube**

For required Agency × Sector × Beneficiary × Enterprise-stage × Support-type intersections, record verified-applicable, verified-none, candidate-pending, or not-relevant with evidence. Link existing 382-by-12 family audit rows rather than discarding them.

- [ ] **Step 4: Review mappings and resolve six HPIIP orphans**

Confirm Direct only from explicit official activity/component evidence; justify Strong; name the missing condition for Conditional; reserve Horizontal for genuinely cross-sector support. Classify each orphan as active mapped route, component, existing-beneficiary/legacy route, or duplicate.

- [ ] **Step 5: Record mapping/discovery method findings**

Capture cases where one programme has multiple components, one central scheme has HP-specific implementation, eligibility changes mapping reach, or horizontal expansion causes noise. These findings directly constrain the later generic model.

- [ ] **Step 6: Run coverage/mapping QA and commit**

```powershell
node tools/hp-v2/validate.mjs --gate coverage
node tools/hp-v2/validate.mjs --gate mappings
node --test --test-name-pattern="coverage|mapping|orphan" tests/hp-v2-qa.test.mjs
```

Expected: PASS; every viable candidate has a disposition and every published mapping is reviewed.

```powershell
git add research/hp-v2
git commit -m "research: expand HP v2 coverage and mappings"
```

## Task 6: Generate and visually verify HP v2 workbook and compatibility app data

**Files:**

- Create: `tools/hp-v2/export-workbook.mjs`
- Create: `tools/hp-v2/build-data.mjs`
- Create: `tools/hp-v2/lib/{workbook-export,app-data}.mjs`
- Create: `tests/hp-v2-artifacts.test.mjs`
- Generate: `outputs/himachal-pradesh/Himachal_Pradesh_Scheme_Guide_2026-08-25_verified.xlsx`

- [ ] **Step 1: Read spreadsheet API/style instructions and mark the artifact operation**

Load workspace dependencies, read the complete spreadsheet API quick start and style guidelines, and run the create-operation marker exactly once before authoring.

- [ ] **Step 2: Write failing artifact reconciliation tests**

The workbook must retain the 13 current sheets and add `Claim Evidence` and `Candidate Ledger`. Row counts in Scheme Master, mapping, claims, candidates, sources, coverage, and app JSON must equal accepted workbench counts. Every v1 removal/change must have a change entry.

- [ ] **Step 3: Implement HP-only artifact generation**

Generate corrected Scheme Master, component rows, mappings, contacts, norms, legacy, source register, coverage, corrections, verification notes, Claim Evidence, and Candidate Ledger from workbench data. Build current `app/data.json` shape so the existing PWA can consume HP v2 before multi-state work.

- [ ] **Step 4: Render every workbook sheet and repair severe defects**

Inspect all used ranges for clipped headers, unreadable URLs, broken tables, blank sheets, and awkward row heights. Run formula/error scans. Export one final workbook only.

- [ ] **Step 5: Run artifact tests without publishing**

Run: `node --test tests/hp-v2-artifacts.test.mjs`
Expected: PASS; generated app data and workbook reconcile with the workbench.

- [ ] **Step 6: Commit generator code**

```powershell
git add tools/hp-v2 tests/hp-v2-artifacts.test.mjs
git commit -m "feat: generate verified HP v2 artifacts"
```

## Task 7: Publish HP v2 and close the method pilot

**Files:**

- Modify: `app/data.json`
- Modify: `README.md`
- Modify: `research/hp-v2/{run,method-findings}.json`
- Create: `research/hp-v2/acceptance.json`
- Generate: `outputs/himachal-pradesh/{qa-report,change-report,hp-v2-acceptance}.json`

- [ ] **Step 1: Run every HP v2 publication gate**

```powershell
npm run test:hp-v2
node tools/hp-v2/validate.mjs --all-gates
node --test tests/service-worker.test.js
```

Expected: PASS. Run the existing Playwright suite against staged HP v2 data and require no regressions.

- [ ] **Step 2: Generate QA, change, and acceptance reports**

The acceptance report contains final counts, all input/output hashes, cutoff, source-inventory completion, candidate dispositions, coverage outcomes, mapping distribution, unresolved limitations, and gate results. Write the same hand-reviewed acceptance content to version-controlled `research/hp-v2/acceptance.json`; the later State Pack migration treats that file as its independent reconciliation contract. The change report categorizes added, corrected, status-updated, retired, merged, split, evidence-upgraded, and unchanged records.

- [ ] **Step 3: Publish app data atomically and update README**

Replace `app/data.json` only after staged outputs pass. README must distinguish programmes from components/routes and describe the validated research method without claiming absolute completeness.

- [ ] **Step 4: Finalize method findings for State Pack generalization**

For each finding, record whether the generic system needs a schema field, status rule, dependency rule, candidate disposition, mapping rule, source behavior, or workflow checkpoint. Mark `run.json` complete only when every finding has a decided generalization requirement.

- [ ] **Step 5: Run regression and commit HP v2**

```powershell
npm run test:hp-v2
node tools/hp-v2/validate.mjs --all-gates
git diff --check
git status --short
```

```powershell
git add research/hp-v2 app/data.json README.md
git commit -m "feat: publish HP v2 research baseline"
```
