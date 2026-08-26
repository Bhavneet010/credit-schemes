import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
import { evaluateHpFormula, importHpWorkbook } from "../tools/hp-v2/lib/workbook.mjs";

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
const expectedStartHereFormulaCells = [
  { row: 6, column: 2, value: "382", formula: "=COUNTA('Sector Catalogue'!A2:A5000)" },
  { row: 7, column: 2, value: "110", formula: "=COUNTA(_xlfn.UNIQUE('Sector Catalogue'!C2:C5000))" },
  { row: 8, column: 2, value: "182", formula: "=COUNTA('Scheme Master'!A2:A2000)" },
  { row: 9, column: 2, value: "6767", formula: "=COUNTA('Sector-Scheme Map'!A2:A20000)" },
  { row: 10, column: 2, value: "4584", formula: "=COUNTA('Coverage Audit'!A2:A10000)" },
  { row: 11, column: 2, value: "214", formula: "=COUNTA('Source Register'!A2:A3000)" }
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

test("every used row and unavailable formula result remains recoverable from the baseline", async () => {
  const { outputPath } = await importIntoTempFile();
  const baseline = JSON.parse(await readFile(outputPath, "utf8"));
  const sourceWorkbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
  const sourceSheets = sourceWorkbook.worksheets.items.map((sheet) => {
    const usedRange = sheet.getUsedRange();
    return {
      name: sheet.name,
      values: usedRange.values.map((row) => row.map(toDisplayedText)),
      formulas: usedRange.formulas
    };
  });
  const sourceVisibleValues = sourceSheets.map(({ name, values }) => ({
    name,
    values: values.map((row) => [...row])
  }));
  for (const cell of expectedStartHereFormulaCells) {
    sourceVisibleValues
      .find((sheet) => sheet.name === "Start Here")
      .values[cell.row - 1][cell.column - 1] = cell.value;
  }

  assert.deepEqual(
    baseline.sheets.map((sheet) => ({
      name: sheet.name,
      values: sheet.rows.map((row) => row.values)
    })),
    sourceVisibleValues
  );
  assert.deepEqual(extractFormulaCells(baseline.sheets), extractFormulaCells(sourceSheets));
  assert.deepEqual(
    baseline.sheets
      .find((sheet) => sheet.name === "Start Here")
      .rows
      .slice(5, 11)
      .map((row) => ({ value: row.values[1], formula: row.formulas[1] })),
    expectedStartHereFormulaCells.map(({ value, formula }) => ({ value, formula }))
  );
});

test("HP formula evaluator rejects unsupported expressions instead of blanking them", () => {
  assert.throws(
    () => evaluateHpFormula({
      formula: "=SUM('Input'!A2:A2)",
      sheets: [{ name: "Input", values: [["Label"], ["value"]] }],
      location: "Test!A1"
    }),
    /Unsupported formula at Test!A1/
  );
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

function toDisplayedText(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function extractFormulaCells(sheets) {
  return sheets.flatMap((sheet) => sheet.formulas
    ? sheet.formulas.flatMap((formulas, rowIndex) => formulas.flatMap((formula, columnIndex) => (
      formula ? [{ sheet: sheet.name, row: rowIndex + 1, column: columnIndex + 1, formula }] : []
    )))
    : sheet.rows.flatMap((row) => (row.formulas ?? []).flatMap((formula, columnIndex) => (
      formula ? [{ sheet: sheet.name, row: row.provenance.row, column: columnIndex + 1, formula }] : []
    )))
  );
}
