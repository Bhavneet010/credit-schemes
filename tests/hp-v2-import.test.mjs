import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { importHpWorkbook } from "../tools/hp-v2/lib/workbook.mjs";

const root = path.resolve(import.meta.dirname, "..");
const workbookPath = path.join(root, "Himachal_Pradesh_MSME_Agri_Scheme_Guide_2026_verified.xlsx");
const appDataPath = path.join(root, "app", "data.json");
const expectedCounts = {
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
};
const expectedSheetNames = [
  "Start Here", "Business Navigator", "Sector Catalogue", "Sector-Scheme Map",
  "Scheme Master", "Corrections Log", "Verification Notes", "Coverage Audit",
  "Component Norms", "Legacy & Closed", "Key Contacts", "Original Audit", "Source Register"
];

async function importIntoTempFile() {
  const outputDirectory = await mkdtemp(path.join(tmpdir(), "hp-v2-import-"));
  const outputPath = path.join(outputDirectory, "baseline.json");
  const result = await importHpWorkbook({ workbookPath, appDataPath, outputPath });
  return { outputPath, result };
}

test("HP v1 workbench import retains all authoritative workbook rows", async () => {
  const { result } = await importIntoTempFile();

  assert.deepEqual(result.counts, expectedCounts);
  assert.deepEqual(result.sheetNames, expectedSheetNames);
});

test("every imported table row retains sheet and one-based row provenance", async () => {
  const { result } = await importIntoTempFile();

  assert.ok(result.tableRows.every((row) => row.provenance.sheet && row.provenance.row >= 2));
});

test("HP v1 workbench import writes deterministic baseline and input hashes", async () => {
  const first = await importIntoTempFile();
  const second = await importIntoTempFile();
  const firstBaseline = await readFile(first.outputPath, "utf8");
  const secondBaseline = await readFile(second.outputPath, "utf8");

  assert.equal(firstBaseline, secondBaseline);
  assert.equal(first.result.hashes.workbook, sha256(await readFile(workbookPath)));
  assert.equal(first.result.hashes.appData, sha256(await readFile(appDataPath)));
  assert.deepEqual(first.result.appCounts, { sectors: 382, schemes: 182, mappings: 6767 });
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
