import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const INPUT = path.join(ROOT, "Himachal_Pradesh_MSME_Agri_Scheme_Guide_2026_verified.xlsx");
const OUTPUT_DIR = path.join(ROOT, "outputs", "himachal-pradesh");
const PREVIEW_DIR = path.join(OUTPUT_DIR, "previews");
const INPUT_PREVIEW_DIR = path.join(ROOT, ".hp-v2-staging", "input-previews");
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(INPUT));

if (process.argv.includes("--preview-input")) {
  await renderAll(INPUT_PREVIEW_DIR);
  console.log(INPUT_PREVIEW_DIR);
  process.exit(0);
}

const [claims, sources, candidates] = await Promise.all([
  readJson("claims.json"), readJson("sources.json"), readJson("candidates.json")
]);
const sourceById = new Map(sources.sources.map((source) => [source.id, source]));

const claimSheet = workbook.worksheets.add("Claim Evidence");
const claimHeaders = ["Claim ID", "Subject ID", "Field", "Value", "Evidence grade", "Publication treatment", "Confidence", "Source URL(s)", "Locator", "Verified", "Effective from", "Effective to", "Limitation"];
const claimRows = claims.claims.map((claim) => [
  claim.id, claim.subjectId, claim.field, claim.value, claim.evidenceGrade,
  claim.publicationTreatment ?? "publishable", claim.confidence,
  claim.sourceIds.map((id) => sourceById.get(id)?.url ?? id).join("\n"), claim.locator,
  claim.verifiedAt, claim.effectiveFrom, claim.effectiveTo, claim.limitation ?? ""
]);
writeLedgerSheet(claimSheet, claimHeaders, claimRows, [190, 190, 115, 360, 110, 125, 85, 300, 300, 90, 90, 90, 360]);

const candidateSheet = workbook.worksheets.add("Candidate Ledger");
const candidateHeaders = ["Candidate ID", "Title", "Issuer", "Disposition", "Publishable", "Sector tags", "Beneficiary tags", "Support tags", "Official URL", "Discovered", "Verified", "Next action"];
const candidateRows = candidates.candidates.map((candidate) => [
  candidate.id, candidate.title, candidate.issuer, candidate.disposition, candidate.publishable,
  candidate.sectorTags?.join("; ") ?? "", candidate.beneficiaryTags?.join("; ") ?? "",
  candidate.supportTags?.join("; ") ?? "", candidate.url, candidate.discoveredAt,
  candidate.verifiedAt ?? "", candidate.nextAction
]);
writeLedgerSheet(candidateSheet, candidateHeaders, candidateRows, [210, 260, 220, 130, 85, 180, 180, 180, 300, 90, 90, 360]);

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await renderAll(PREVIEW_DIR);
const inspect = await workbook.inspect({ kind: "table", range: "Claim Evidence!A1:M8", include: "values,formulas", tableMaxRows: 8, tableMaxCols: 13, maxChars: 7000 });
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan", maxChars: 5000 });
console.log(inspect.ndjson);
console.log(errors.ndjson);
const outputPath = path.join(OUTPUT_DIR, "Himachal_Pradesh_Scheme_Guide_2026-08-26_verified.xlsx");
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);

function writeLedgerSheet(sheet, headers, rows, widths) {
  sheet.showGridLines = false;
  const matrix = [headers, ...rows];
  sheet.getRangeByIndexes(0, 0, matrix.length, headers.length).values = matrix;
  const header = sheet.getRangeByIndexes(0, 0, 1, headers.length);
  header.format = { fill: "#174E5A", font: { bold: true, color: "#FFFFFF" }, wrapText: true, verticalAlignment: "center" };
  header.format.rowHeightPx = 34;
  const data = sheet.getRangeByIndexes(1, 0, Math.max(rows.length, 1), headers.length);
  data.format = { font: { color: "#24343A" }, verticalAlignment: "top", wrapText: true };
  data.format.rowHeightPx = sheet.name === "Claim Evidence" ? 60 : 54;
  widths.forEach((width, index) => { sheet.getRangeByIndexes(0, index, matrix.length, 1).format.columnWidthPx = width; });
  sheet.freezePanes.freezeRows(1);
  const table = sheet.tables.add(`A1:${columnName(headers.length)}${matrix.length}`, true, `${sheet.name.replace(/\s/g, "")}Table`);
  table.style = "TableStyleMedium2";
}

async function renderAll(directory) {
  await fs.mkdir(directory, { recursive: true });
  for (const sheet of workbook.worksheets.items) {
    const values = sheet.getUsedRange()?.values ?? [[]];
    const rowCount = Math.max(1, Math.min(values.length, 40));
    const columnCount = Math.max(1, Math.min(20, values.reduce((max, row) => Math.max(max, row?.length ?? 0), 0)));
    const range = `A1:${columnName(columnCount)}${rowCount}`;
    const preview = await workbook.render({ sheetName: sheet.name, range, scale: 0.8, format: "png" });
    await fs.writeFile(path.join(directory, `${sheet.name.replace(/[\\/:*?"<>|]/g, "-")}.png`), new Uint8Array(await preview.arrayBuffer()));
  }
}

function columnName(count) {
  let name = "";
  while (count) {
    count -= 1;
    name = String.fromCharCode(65 + (count % 26)) + name;
    count = Math.floor(count / 26);
  }
  return name;
}

async function readJson(name) {
  return JSON.parse(await fs.readFile(path.join(ROOT, "research", "hp-v2", name), "utf8"));
}
