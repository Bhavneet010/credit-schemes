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
  const sheets = workbook.worksheets.items.map(importSheet);
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

function importSheet(worksheet) {
  const values = worksheet.getUsedRange().values;
  const headerRow = tableHeaderRows.get(worksheet.name) ?? null;
  return {
    name: worksheet.name,
    headers: headerRow === null ? [] : values[headerRow - 1].map(toDisplayedText),
    rows: values.map((row, index) => ({
      values: row.map(toDisplayedText),
      provenance: {
        sheet: worksheet.name,
        row: index + 1
      }
    }))
  };
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
