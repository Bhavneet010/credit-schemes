import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { normalizeAlias, resolveAlias } from "../tools/state-pack/lib/ids.mjs";
import { overlayScheme } from "../tools/state-pack/lib/overlay.mjs";
import { assertOutOfScopeUnchanged, captureOutOfScopeHashes, resolveScope } from "../tools/state-pack/lib/scope.mjs";
import { diffPacks } from "../tools/state-pack/lib/diff.mjs";

test("CLI rejects unknown commands without changing data", () => {
  const run = spawnSync(process.execPath, ["tools/state-pack/cli.mjs", "unknown"], { encoding: "utf8" });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /Unknown command: unknown/);
});

test("aliases resolve to permanent IDs independently of display text", () => {
  const index = new Map([[normalizeAlias("PM Formalisation of Micro Food Processing Enterprises"), "SCHEME-CENTRAL-PMFME"]]);
  assert.equal(resolveAlias(index, "PMFME"), null);
  index.set(normalizeAlias("PMFME"), "SCHEME-CENTRAL-PMFME");
  assert.equal(resolveAlias(index, "PMFME"), "SCHEME-CENTRAL-PMFME");
});

test("state overlays are allowlisted and preserve national claims", () => {
  const combined = overlayScheme(
    { id: "SCHEME-CENTRAL-PMFME", name: "PMFME", claimIds: ["CLAIM-CENTRAL-1"] },
    { id: "IMPLEMENTATION-HP-PMFME", schemeId: "SCHEME-CENTRAL-PMFME", stateId: "STATE-IN-HP", overrides: { agency: "HP Industries" }, claimIds: ["CLAIM-HP-1"] }
  );
  assert.equal(combined.agency, "HP Industries");
  assert.deepEqual(combined.claimIds, ["CLAIM-CENTRAL-1", "CLAIM-HP-1"]);
  assert.throws(() => overlayScheme({ id: "SCHEME-CENTRAL-PMFME" }, { schemeId: "SCHEME-CENTRAL-PMFME", overrides: { name: "Changed" } }), /ILLEGAL_OVERLAY_FIELD/);
});

test("focused scopes expose dependencies and guard unrelated records", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "state-pack-scope-"));
  try {
    await writeFile(path.join(root, "records.json"), JSON.stringify({ records: [
      { id: "SECTOR-HP-HORT", sectorId: "SECTOR-HP-HORT", value: 1 },
      { id: "SECTOR-HP-MFG", sectorId: "SECTOR-HP-MFG", value: 1 }
    ] }));
    const manifest = { stateId: "STATE-IN-HP", researchCutoff: "2026-08-26", reverseIndexes: { "SECTOR-HP-HORT": ["MAPPING-HP-HORT-1"] } };
    const scope = resolveScope(manifest, { mode: "refresh-sector", sectorIds: ["SECTOR-HP-HORT"] });
    assert.deepEqual(scope.propagatedDependencyIds, ["MAPPING-HP-HORT-1"]);
    const before = await captureOutOfScopeHashes(root, scope);
    await writeFile(path.join(root, "records.json"), JSON.stringify({ records: [
      { id: "SECTOR-HP-HORT", sectorId: "SECTOR-HP-HORT", value: 2 },
      { id: "SECTOR-HP-MFG", sectorId: "SECTOR-HP-MFG", value: 2 }
    ] }));
    const after = await captureOutOfScopeHashes(root, scope);
    assert.throws(() => assertOutOfScopeUnchanged(before, after), /OUT_OF_SCOPE_CHANGE/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("diff ignores key order and prioritizes status and evidence changes", () => {
  const report = diffPacks(
    { records: [{ id: "A", name: "same", status: "old" }, { id: "B", evidenceGrade: "primary-summary", name: "x" }] },
    { records: [{ status: "new", name: "same", id: "A" }, { name: "x", id: "B", evidenceGrade: "primary-operative" }, { id: "C" }] }
  );
  assert.equal(report.summary["status-updated"], 1);
  assert.equal(report.summary["evidence-upgraded"], 1);
  assert.equal(report.summary.added, 1);
});
