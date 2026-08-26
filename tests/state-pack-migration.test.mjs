import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { compileRepositoryState } from "../tools/state-pack/lib/app-compiler.mjs";
import { convertHpV2 } from "../tools/state-pack/lib/hp-v2-conversion.mjs";
import { validateRepositoryState, validateStatePack } from "../tools/state-pack/lib/validation.mjs";

test("HP v2 canonical migration reconciles accepted counts", async () => {
  const accepted = JSON.parse(await readFile("research/hp-v2/acceptance.json", "utf8"));
  const result = await convertHpV2();
  assert.deepEqual(result.counts, accepted.counts);
  assert.equal(result.files["states/himachal-pradesh/sectors.json"].sectors.length, accepted.counts.sectors);
  const schemeCount = result.files["common/schemes.json"].schemes.length + result.files["states/himachal-pradesh/schemes.json"].schemes.length;
  assert.equal(schemeCount, accepted.counts.schemes);
});

test("migrated canonical records retain provenance", async () => {
  const result = await convertHpV2();
  const collections = [
    result.files["common/schemes.json"].schemes,
    result.files["states/himachal-pradesh/schemes.json"].schemes,
    result.files["states/himachal-pradesh/sectors.json"].sectors,
    result.files["states/himachal-pradesh/evidence.json"].claims,
    result.files["states/himachal-pradesh/mappings.json"].reviews
  ];
  assert.ok(collections.flat().every((record) => record.migrationSource?.sheet && Number.isInteger(record.migrationSource.row)));
});

test("canonical HP validates and compiles to the exact current app contract", async () => {
  assert.deepEqual(await validateRepositoryState("himachal-pradesh"), { ok: true, errors: [] });
  const current = JSON.parse(await readFile("app/data.json", "utf8"));
  assert.deepEqual(await compileRepositoryState("himachal-pradesh"), current);
});

test("validation blocks unsupported hard claims and unmapped method findings", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "invalid-state-pack-"));
  try {
    const files = {
      "manifest.json": { schemaVersion: "state-pack-1", stateId: "STATE-IN-XX", acceptedMethodFindingIds: ["METHOD-X"], methodTraceability: {} },
      "schemes.json": { schemes: [{ id: "SCHEME-X", name: "X", issuerType: "state", familyId: "FAMILY-X", aliases: [], claimIds: ["CLAIM-X"] }] },
      "sectors.json": { sectors: [] },
      "implementations.json": { implementations: [] },
      "sources.json": { sources: [{ id: "SOURCE-X" }] },
      "evidence.json": { claims: [{ id: "CLAIM-X", subjectId: "SCHEME-X", field: "keyBenefit", value: "50%", sourceIds: ["SOURCE-X"], evidenceGrade: "primary-summary" }], statuses: [] },
      "mappings.json": { reviews: [] },
      "coverage.json": { coverage: [] }
    };
    await Promise.all(Object.entries(files).map(([file, value]) => writeFile(path.join(root, file), JSON.stringify(value))));
    const result = await validateStatePack(root);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((error) => error.code === "EVIDENCE_HARD_CLAIM"));
    assert.ok(result.errors.some((error) => error.code === "UNMAPPED_METHOD_FINDING"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
