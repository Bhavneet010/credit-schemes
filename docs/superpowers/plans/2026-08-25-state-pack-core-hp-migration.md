# State Pack Core and HP Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the canonical State Pack toolchain and migrate every current HP workbook record losslessly into version-controlled data.

**Architecture:** Node-based schemas, validators, scope guards, overlay logic, and application-data generation operate on canonical JSON. A one-time workbook importer reads the existing 13-sheet HP workbook, produces canonical records plus a reconciliation report, and preserves the current app output until later HP v2 research changes it.

**Tech Stack:** Node.js ESM, Node built-in test runner, JSON Schema documents, `@oai/artifact-tool` for workbook import, existing vanilla PWA data contract.

**Spec:** `docs/superpowers/specs/2026-08-25-state-pack-research-system-design.md`

## Global Constraints

- The State Pack is canonical; workbooks and app JSON are generated outputs.
- IDs are permanent and independent of display text.
- Central definitions and HP implementation details are separate records.
- Records outside a declared focused scope remain byte-identical except declared dependencies.
- Hard financial, eligibility, deadline, and application-route claims require acceptable claim-level evidence.
- Failed validation must leave the current `app/data.json` and workbook untouched.
- The initial migration is lossless before any corrective HP v2 research begins.
- Do not commit `.xlsx` artifacts; they remain ignored by the repository.

## Cross-Plan Execution and Acceptance Traceability

Execute the plans in this order:

1. This core/migration plan.
2. `docs/superpowers/plans/2026-08-25-credit-scheme-research-skill.md`.
3. `docs/superpowers/plans/2026-08-25-hp-v2-research-artifacts.md`.
4. `docs/superpowers/plans/2026-08-25-multi-state-pwa.md`.

| Spec acceptance criterion | Owning plan evidence |
|---|---|
| Lossless canonical HP State Pack | Core Tasks 5–7 reconciliation and parity tests |
| HP v2 structural, evidence, coverage, mapping, workbook, and app gates | HP v2 Tasks 1–7 |
| Short `add-state` prompt | Skill Tasks 1–7 plus PWA Task 7 second-state fixture |
| Sector refresh preserves unrelated records | Core Task 4 scope/hash tests and skill focused-update tests |
| Named-scheme refresh updates dependencies only | Core Task 4 dependency tests and installed-skill scenario |
| Shared central schemes researched once | Core Task 3 overlay tests and PWA Task 7 shared-ID test |
| Candidate and verified-none memory | HP v2 Tasks 2 and 5 plus skill QA contract |
| Reproducible workbook, app data, QA, and change report | Core Tasks 6–7 and HP v2 Tasks 6–7 |
| Behavior-tested reusable skill | Skill RED/GREEN/REFACTOR campaign and installation checks |

---

## File Structure

**Create:**

- `package.json` — local commands for unit tests, validation, migration, and data builds.
- `scheme-data/schema/*.schema.json` — public record contracts.
- `scheme-data/common/*.json` — shared central records and shared source/change ledgers.
- `scheme-data/states/himachal-pradesh/*.json` — canonical HP records.
- `tools/state-pack/lib/*.mjs` — focused I/O, identity, overlay, scope, validation, and diff modules.
- `tools/state-pack/import-hp-v1.mjs` — lossless workbook importer.
- `tools/state-pack/build-app-data.mjs` — canonical-to-PWA compiler.
- `tools/state-pack/cli.mjs` — stable command interface consumed by the future skill.
- `tests/fixtures/state-pack/**` — small hand-checked fixtures.
- `tests/state-pack-*.test.mjs` — behavior tests for each module.

**Modify:**

- `.gitignore` — ignore generated `outputs/` and temporary State Pack staging directories.
- `tools/build_data.py` — retain as a compatibility wrapper that explains and invokes the canonical builder after migration.
- `README.md` — document the canonical build commands without yet changing the HP-only UI.

## Task 1: Establish the test and command surface

**Files:**

- Create: `package.json`
- Create: `tests/state-pack-cli.test.mjs`
- Create: `tools/state-pack/cli.mjs`
- Modify: `.gitignore`

**Interfaces:**

- Produces: `node tools/state-pack/cli.mjs <command> [options]`
- Produces commands: `validate`, `scope`, `import-hp`, `build-app`, `diff`
- Consumes: command modules added by later tasks.

- [ ] **Step 1: Write the failing CLI behavior test**

```js
// tests/state-pack-cli.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("unknown commands fail without changing data", () => {
  const run = spawnSync(process.execPath, ["tools/state-pack/cli.mjs", "unknown"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /Unknown command: unknown/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/state-pack-cli.test.mjs`  
Expected: FAIL because `tools/state-pack/cli.mjs` does not exist.

- [ ] **Step 3: Implement the minimal CLI dispatcher and commands**

```js
// tools/state-pack/cli.mjs
const command = process.argv[2];
const modules = {
  validate: "./validate-command.mjs",
  scope: "./scope-command.mjs",
  "import-hp": "./import-hp-v1.mjs",
  "build-app": "./build-app-data.mjs",
  diff: "./diff-command.mjs"
};

if (!modules[command]) {
  console.error(`Unknown command: ${command || "<missing>"}`);
  process.exit(2);
}

const { run } = await import(modules[command]);
process.exitCode = await run(process.argv.slice(3));
```

Create stub command modules whose `run()` prints `not implemented` and returns `2`; later tasks replace them under their own failing tests. Add these scripts to `package.json`:

```json
{
  "private": true,
  "scripts": {
    "test:unit": "node --test tests/state-pack-*.test.mjs tests/service-worker.test.js",
    "data:validate": "node tools/state-pack/cli.mjs validate --all",
    "data:import-hp": "node tools/state-pack/cli.mjs import-hp",
    "data:build": "node tools/state-pack/cli.mjs build-app --all"
  }
}
```

Append to `.gitignore`:

```gitignore
# Generated State Pack artifacts and transactional staging
outputs/
.state-pack-staging/
```

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/state-pack-cli.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add package.json .gitignore tools/state-pack tests/state-pack-cli.test.mjs
git commit -m "build: add state pack command surface"
```

## Task 2: Define schemas and enforce canonical record invariants

**Files:**

- Create: `scheme-data/schema/state-pack.schema.json`
- Create: `scheme-data/schema/scheme.schema.json`
- Create: `scheme-data/schema/evidence.schema.json`
- Create: `scheme-data/schema/mapping.schema.json`
- Create: `tools/state-pack/lib/validation.mjs`
- Create: `tools/state-pack/validate-command.mjs`
- Create: `tests/fixtures/state-pack/valid-minimal/**`
- Create: `tests/state-pack-validation.test.mjs`

**Interfaces:**

- Produces: `validateStatePack(packRoot): {ok:boolean, errors:Array<{code,path,message}>}`
- Produces: CLI `validate --state himachal-pradesh` and `validate --all`
- Consumes: canonical JSON files defined in the spec.

- [ ] **Step 1: Write failing validation tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateStatePack } from "../tools/state-pack/lib/validation.mjs";

test("a minimal pack with resolved IDs and evidence passes", async () => {
  const result = await validateStatePack("tests/fixtures/state-pack/valid-minimal");
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("a hard financial claim without primary-operative evidence fails", async () => {
  const result = await validateStatePack("tests/fixtures/state-pack/invalid-hard-claim");
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === "EVIDENCE_HARD_CLAIM"));
});

test("duplicate and unresolved IDs fail", async () => {
  const result = await validateStatePack("tests/fixtures/state-pack/invalid-ids");
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.code === "DUPLICATE_ID"));
  assert.ok(result.errors.some((error) => error.code === "UNRESOLVED_REFERENCE"));
});
```

Fixtures use literal hand-checked records, not output from the validator.

- [ ] **Step 2: Run and verify RED**

Run: `node --test tests/state-pack-validation.test.mjs`  
Expected: FAIL because the schemas and validation module do not exist.

- [ ] **Step 3: Add schema documents and minimal real validation**

The scheme schema requires:

```json
{
  "required": ["id", "name", "issuerType", "familyId", "claimIds", "aliases"],
  "properties": {
    "id": { "type": "string", "pattern": "^SCHEME-[A-Z0-9-]+$" },
    "issuerType": { "enum": ["central", "state", "joint", "institutional"] },
    "claimIds": { "type": "array", "items": { "type": "string" } },
    "aliases": { "type": "array", "items": { "type": "string" } }
  }
}
```

Implement `validation.mjs` with explicit validators for required fields, enum values, unique IDs, resolved references, status freshness, hard-claim evidence grades, orphan mappings, and coverage outcomes. Return all errors in deterministic path/code order. Do not rely on generated expected values in tests.

- [ ] **Step 4: Run targeted and regression tests**

Run: `node --test tests/state-pack-validation.test.mjs tests/state-pack-cli.test.mjs`  
Expected: PASS with no warnings.

- [ ] **Step 5: Commit**

```powershell
git add scheme-data/schema tools/state-pack tests/fixtures/state-pack tests/state-pack-validation.test.mjs
git commit -m "feat: validate canonical state packs"
```

## Task 3: Implement stable IDs, central overlays, and deterministic serialization

**Files:**

- Create: `tools/state-pack/lib/ids.mjs`
- Create: `tools/state-pack/lib/io.mjs`
- Create: `tools/state-pack/lib/overlay.mjs`
- Create: `tests/state-pack-overlay.test.mjs`

**Interfaces:**

- Produces: `normalizeAlias(value): string`
- Produces: `resolveAlias(index, value): string | null`
- Produces: `overlayScheme(commonScheme, implementation): object`
- Produces: `writeJsonStable(path, value): Promise<void>` with sorted object keys and stable array order supplied by callers.

- [ ] **Step 1: Write failing behavior tests**

```js
test("renaming display text does not change the permanent ID", () => {
  const index = new Map([[normalizeAlias("PM Formalisation of Micro Food Processing Enterprises"), "SCHEME-CENTRAL-PMFME"]]);
  assert.equal(resolveAlias(index, "PMFME"), null);
  index.set(normalizeAlias("PMFME"), "SCHEME-CENTRAL-PMFME");
  assert.equal(resolveAlias(index, "PMFME"), "SCHEME-CENTRAL-PMFME");
});

test("an HP implementation overrides only declared state fields", () => {
  const combined = overlayScheme(
    { id: "SCHEME-CENTRAL-PMFME", name: "PMFME", claimIds: ["CLAIM-CENTRAL-1"] },
    { id: "IMPLEMENTATION-HP-PMFME", schemeId: "SCHEME-CENTRAL-PMFME", stateId: "STATE-IN-HP", overrides: { agency: "HP Industries" }, claimIds: ["CLAIM-HP-1"] }
  );
  assert.equal(combined.name, "PMFME");
  assert.equal(combined.agency, "HP Industries");
  assert.deepEqual(combined.claimIds, ["CLAIM-CENTRAL-1", "CLAIM-HP-1"]);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/state-pack-overlay.test.mjs`  
Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement identity, overlay allowlist, and stable writes**

`overlayScheme` may override only `agency`, `access`, `status`, `stateContribution`, `stateNorms`, and `stateCaution`. Reject attempts to replace the common ID, issuer, or national claim list. Use temporary files in `.state-pack-staging/` and atomic rename only after successful serialization.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/state-pack-overlay.test.mjs tests/state-pack-validation.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add tools/state-pack/lib tests/state-pack-overlay.test.mjs
git commit -m "feat: add stable scheme overlays"
```

## Task 4: Enforce focused scopes and dependency propagation

**Files:**

- Create: `tools/state-pack/lib/scope.mjs`
- Create: `tools/state-pack/scope-command.mjs`
- Create: `tests/state-pack-scope.test.mjs`
- Create: `tests/fixtures/state-pack/scoped-hp/**`

**Interfaces:**

- Produces: `resolveScope(manifest, request): ScopeDeclaration`
- Produces: `captureOutOfScopeHashes(packRoot, scope): Map<string,string>`
- Produces: `assertOutOfScopeUnchanged(before, after): void`
- Produces: `affectedDependencies(pack, scope): Set<string>`

- [ ] **Step 1: Write failing scope tests**

```js
test("horticulture scope excludes unrelated manufacturing records", async () => {
  const scope = resolveScope(manifest, { mode: "refresh-sector", stateId: "STATE-IN-HP", sectorIds: ["SECTOR-HP-HORT"] });
  assert.deepEqual(scope.include.sectorIds, ["SECTOR-HP-HORT"]);
  assert.ok(!scope.include.sectorIds.includes("SECTOR-HP-MFG"));
});

test("changing an unrelated record fails the scope guard", async () => {
  const before = await captureOutOfScopeHashes(fixtureRoot, horticultureScope);
  await mutateFixtureManufacturingRecord();
  const after = await captureOutOfScopeHashes(fixtureRoot, horticultureScope);
  assert.throws(() => assertOutOfScopeUnchanged(before, after), /OUT_OF_SCOPE_CHANGE/);
});

test("a shared scheme propagates only to referencing state implementations", () => {
  assert.deepEqual([...affectedDependencies(pack, pmfmeScope)].sort(), ["IMPLEMENTATION-HP-PMFME", "MAPPING-HP-FOOD-PMFME"]);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/state-pack-scope.test.mjs`  
Expected: FAIL because scope logic is absent.

- [ ] **Step 3: Implement manifest slices, reverse indexes, and hash guard**

The scope declaration contains mode, state IDs, sector/family/agency/scheme IDs, previous cutoff, scheduled source IDs, propagated dependency IDs, and explicit exclusions. Hash canonical serialized records, not file timestamps. The CLI prints the declaration as JSON before any external research.

- [ ] **Step 4: Verify GREEN and mutation resistance**

Run: `node --test tests/state-pack-scope.test.mjs`  
Expected: PASS; temporarily changing the guard to ignore hashes must make the second test fail.

- [ ] **Step 5: Commit**

```powershell
git add tools/state-pack tests/state-pack-scope.test.mjs tests/fixtures/state-pack/scoped-hp
git commit -m "feat: guard focused state pack updates"
```

## Task 5: Import the complete HP workbook losslessly

**Files:**

- Create: `tools/state-pack/import-hp-v1.mjs`
- Create: `tools/state-pack/lib/workbook-import.mjs`
- Create: `tests/state-pack-import.test.mjs`
- Create: `scheme-data/states/himachal-pradesh/*.json`
- Create: `scheme-data/common/*.json`
- Create: `outputs/himachal-pradesh/migration-reconciliation.json` (generated, ignored)

**Interfaces:**

- Consumes workbook: `Himachal_Pradesh_MSME_Agri_Scheme_Guide_2026_verified.xlsx`
- Produces canonical HP files listed in the spec.
- Produces reconciliation counts and deterministic source-row provenance.

- [ ] **Step 1: Write failing importer reconciliation tests**

```js
test("HP v1 import reconciles all authoritative workbook sheets", async () => {
  const result = await importHpV1({ workbookPath, outputRoot: tempRoot });
  assert.deepEqual(result.counts, {
    sectors: 382,
    schemes: 182,
    mappings: 6767,
    componentNorms: 71,
    contacts: 79,
    legacy: 35,
    sources: 214,
    coverageRows: 4584,
    originalAuditRows: 62
  });
});

test("every imported row retains workbook sheet and row provenance", async () => {
  const result = await importHpV1({ workbookPath, outputRoot: tempRoot });
  assert.ok(result.records.every((record) => record.migrationSource?.sheet && Number.isInteger(record.migrationSource.row)));
});
```

The test derives counts from the verified baseline already inspected: workbook counts exclude header rows.

- [ ] **Step 2: Verify RED**

Run with the bundled dependency runtime linked for `@oai/artifact-tool`: `node --test tests/state-pack-import.test.mjs`  
Expected: FAIL because importer modules do not exist.

- [ ] **Step 3: Implement workbook reading and canonical conversion**

Use:

```js
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
```

Read all 13 sheets. Preserve exact source text in migration fields. Convert the six app-consumed sheets into normalized records, retain Corrections Log and Verification Notes as change/note entries, retain Coverage Audit outcomes, retain Original Audit, and import Source Register records. Generate aliases from current IDs; do not discard them.

- [ ] **Step 4: Run import, validate, and reconcile**

Run:

```powershell
node tools/state-pack/cli.mjs import-hp --workbook "Himachal_Pradesh_MSME_Agri_Scheme_Guide_2026_verified.xlsx"
node tools/state-pack/cli.mjs validate --state himachal-pradesh --migration-mode
```

Expected: exact counts above; zero missing imported rows; migration-mode permits explicitly tagged claim-level evidence debt but reports it.

- [ ] **Step 5: Commit canonical migration**

```powershell
git add scheme-data tools/state-pack tests/state-pack-import.test.mjs
git commit -m "feat: migrate HP workbook into state pack"
```

## Task 6: Compile canonical HP data back to the existing PWA contract

**Files:**

- Create: `tools/state-pack/build-app-data.mjs`
- Create: `tools/state-pack/lib/app-compiler.mjs`
- Create: `tests/state-pack-app-compiler.test.mjs`
- Modify: `tools/build_data.py`
- Modify: `README.md`

**Interfaces:**

- Produces: `compileStateForLegacyApp(pack): LegacyAppData`
- Produces CLI: `build-app --state himachal-pradesh --output app/data.json`
- Preserves current `app/data.json` keys and counts before HP v2 corrections.

- [ ] **Step 1: Write failing parity tests**

```js
test("canonical HP compilation preserves the current visible dataset", async () => {
  const current = JSON.parse(await readFile("app/data.json", "utf8"));
  const compiled = await compileStateForLegacyApp(await loadStatePack("himachal-pradesh"));
  assert.deepEqual(compiled.meta.counts, { sectors: 382, schemes: 182, links: 6767 });
  assert.deepEqual(compiled.sectors.map((item) => item.id), current.sectors.map((item) => item.id));
  assert.deepEqual(compiled.schemes.map((item) => item.name), current.schemes.map((item) => item.name));
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/state-pack-app-compiler.test.mjs`  
Expected: FAIL because compiler is absent.

- [ ] **Step 3: Implement the legacy compiler and atomic output**

Reuse current enum/pool compression semantics from `tools/build_data.py`. Resolve common schemes plus HP implementations before compiling. Write to `.state-pack-staging/data.json`, validate counts, then atomically replace the requested output.

Replace `tools/build_data.py` with a compatibility wrapper that runs `node tools/state-pack/cli.mjs build-app --state himachal-pradesh --output app/data.json` and exits with the child status. Update README to state that canonical JSON, not the workbook, is authoritative.

- [ ] **Step 4: Verify parity and existing non-browser tests**

Run:

```powershell
node --test tests/state-pack-app-compiler.test.mjs tests/service-worker.test.js
node tools/state-pack/cli.mjs build-app --state himachal-pradesh --output app/data.json
git diff --exit-code -- app/data.json
```

Expected: tests PASS and pre-HP-v2 `app/data.json` has no semantic or byte diff.

- [ ] **Step 5: Commit**

```powershell
git add tools README.md tests/state-pack-app-compiler.test.mjs
git commit -m "feat: build HP app data from state pack"
```

## Task 7: Add migration QA and phase acceptance

**Files:**

- Create: `tools/state-pack/diff-command.mjs`
- Create: `tools/state-pack/lib/diff.mjs`
- Create: `tests/state-pack-diff.test.mjs`
- Create: `docs/state-pack-operations.md`

**Interfaces:**

- Produces: categorized diff values `added`, `corrected`, `status-updated`, `retired`, `merged`, `split`, `evidence-upgraded`, `unchanged`.
- Produces: machine-readable reconciliation and QA reports.

- [ ] **Step 1: Write the failing categorized-diff test**

```js
test("diff categorizes semantic changes and ignores key order", () => {
  const report = diffPacks(beforeFixture, afterFixture);
  assert.deepEqual(report.summary, {
    added: 1,
    corrected: 1,
    "status-updated": 1,
    retired: 1,
    merged: 0,
    split: 0,
    "evidence-upgraded": 1,
    unchanged: 2
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/state-pack-diff.test.mjs`  
Expected: FAIL because diff logic is absent.

- [ ] **Step 3: Implement categorized diffs and operating documentation**

Use stable IDs as join keys. Classify status-only and evidence-only changes before general corrections. Document exact commands for import, validate, scope declaration, app build, and diff. Include failure behavior and the rule that generated artifacts are replaced only after validation.

- [ ] **Step 4: Run the complete phase verification**

Run:

```powershell
npm run test:unit
npm run data:validate
node tools/state-pack/cli.mjs build-app --state himachal-pradesh --output app/data.json
git diff --check
git status --short
```

Expected: all tests and validation PASS; only intended committed or staged files exist; the current app remains behaviorally unchanged.

- [ ] **Step 5: Commit**

```powershell
git add tools/state-pack tests/state-pack-diff.test.mjs docs/state-pack-operations.md
git commit -m "docs: complete state pack migration workflow"
```
