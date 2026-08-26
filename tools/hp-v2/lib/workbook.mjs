import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const tableHeaderRows = new Map([
  ["Business Navigator", 1],
  ["Sector Catalogue", 1],
  ["Sector-Scheme Map", 1],
  ["Scheme Master", 1],
  ["Corrections Log", 5],
  ["Coverage Audit", 1],
  ["Component Norms", 1],
  ["Legacy & Closed", 1],
  ["Key Contacts", 1],
  ["Original Audit", 1],
  ["Source Register", 1]
]);

const countDefinitions = {
  sectors: "Sector Catalogue",
  schemes: "Scheme Master",
  mappings: "Sector-Scheme Map",
  componentNorms: "Component Norms",
  contacts: "Key Contacts",
  legacy: "Legacy & Closed",
  sources: "Source Register",
  coverageRows: "Coverage Audit",
  originalAuditRows: "Original Audit",
  correctionEntries: "Corrections Log"
};

export async function importHpWorkbook({ workbookPath, appDataPath, outputPath }) {
  const [workbookBytes, appDataBytes] = await Promise.all([
    readFile(workbookPath),
    readFile(appDataPath)
  ]);
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(workbookPath));
  const sourceSheets = workbook.worksheets.items.map(readWorksheet);
  const sheets = sourceSheets.map((sheet) => importSheet(sheet, sourceSheets));
  const tableRows = sheets.flatMap(extractTableRows);
  const appData = JSON.parse(appDataBytes.toString("utf8"));
  const appCounts = readAppCounts(appData);
  const counts = countRowsBySheet(sheets);
  const hashes = {
    workbook: sha256(workbookBytes),
    appData: sha256(appDataBytes)
  };
  const baseline = {
    schemaVersion: "hp-v1-baseline-1",
    workbook: {
      file: path.basename(workbookPath),
      sha256: hashes.workbook
    },
    appData: {
      file: "app/data.json",
      sha256: hashes.appData,
      counts: appCounts
    },
    counts,
    sheetNames: sheets.map((sheet) => sheet.name),
    sheets
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");

  return {
    counts,
    sheetNames: baseline.sheetNames,
    tableRows,
    appCounts,
    hashes
  };
}

function readWorksheet(worksheet) {
  const usedRange = worksheet.getUsedRange();
  return {
    name: worksheet.name,
    values: usedRange.values,
    formulas: usedRange.formulas
  };
}

function importSheet(sourceSheet, sourceSheets) {
  const rows = sourceSheet.values.map((row, index) => importRow({
      values: row,
      formulas: sourceSheet.formulas[index],
      sheet: sourceSheet.name,
      row: index + 1,
      sourceSheets
    }));
  const headerRow = tableHeaderRows.get(sourceSheet.name) ?? null;
  return {
    name: sourceSheet.name,
    headers: headerRow === null ? [] : rows[headerRow - 1].values,
    rows
  };
}

function importRow({ values, formulas, sheet, row, sourceSheets }) {
  const importedRow = {
    values: values.map((value, columnIndex) => {
      const formula = formulas[columnIndex];
      if (!formula) return toDisplayedText(value);
      const evaluatedValue = evaluateHpFormula({
        formula,
        sheets: sourceSheets,
        location: `${sheet}!${columnName(columnIndex)}${row}`
      });
      return toDisplayedText(value ?? evaluatedValue);
    }),
    provenance: { sheet, row }
  };
  if (formulas.some(Boolean)) importedRow.formulas = formulas;
  return importedRow;
}

export function evaluateHpFormula({ formula, sheets, location }) {
  const countaMatch = formula.match(/^=COUNTA\((.*)\)$/);
  if (!countaMatch) throw unsupportedFormula(location, formula);

  const uniqueMatch = countaMatch[1].match(/^(?:_xlfn\.)?UNIQUE\((.*)\)$/);
  const range = readSingleColumnRange(uniqueMatch ? uniqueMatch[1] : countaMatch[1], location, formula);
  const values = valuesForRange(sheets, range, location, formula).filter(isNonBlank);
  return uniqueMatch ? String(new Set(values.map(String)).size) : String(values.length);
}

function readSingleColumnRange(reference, location, formula) {
  const rangeMatch = reference.match(/^'((?:[^']|'')+)'!([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!rangeMatch || rangeMatch[2] !== rangeMatch[4]) throw unsupportedFormula(location, formula);

  return {
    sheet: rangeMatch[1].replace(/''/g, "'"),
    column: columnIndex(rangeMatch[2]),
    startRow: Number(rangeMatch[3]),
    endRow: Number(rangeMatch[5])
  };
}

function valuesForRange(sheets, range, location, formula) {
  const sheet = sheets.find((candidate) => candidate.name === range.sheet);
  if (!sheet) throw unsupportedFormula(location, formula);

  return Array.from(
    { length: range.endRow - range.startRow + 1 },
    (_, index) => sheet.values[range.startRow - 1 + index]?.[range.column]
  );
}

function isNonBlank(value) {
  return value !== null && value !== undefined && value !== "";
}

function columnIndex(column) {
  return [...column].reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function columnName(index) {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function unsupportedFormula(location, formula) {
  return new Error(`Unsupported formula at ${location}: ${formula}`);
}

function extractTableRows(sheet) {
  const headerRow = tableHeaderRows.get(sheet.name);
  if (!headerRow) return [];

  return sheet.rows
    .filter((row) => row.provenance.row > headerRow && row.values.some(Boolean))
    .map((row) => ({
      values: row.values,
      provenance: row.provenance
    }));
}

function countRowsBySheet(sheets) {
  const tableRowsBySheet = new Map();
  for (const tableRow of sheets.flatMap(extractTableRows)) {
    tableRowsBySheet.set(
      tableRow.provenance.sheet,
      (tableRowsBySheet.get(tableRow.provenance.sheet) ?? 0) + 1
    );
  }

  return Object.fromEntries(
    Object.entries(countDefinitions).map(([countName, sheetName]) => [
      countName,
      tableRowsBySheet.get(sheetName) ?? 0
    ])
  );
}

function readAppCounts(appData) {
  return {
    sectors: appData.meta.counts.sectors,
    schemes: appData.meta.counts.schemes,
    mappings: appData.meta.counts.links
  };
}

function toDisplayedText(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
