import path from "node:path";
import { fileURLToPath } from "node:url";

import { importHpWorkbook } from "./lib/workbook.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const result = await importHpWorkbook({
  workbookPath: path.join(root, "Himachal_Pradesh_MSME_Agri_Scheme_Guide_2026_verified.xlsx"),
  appDataPath: path.join(root, "app", "data.json"),
  outputPath: path.join(root, "research", "hp-v2", "baseline.json")
});

console.log(JSON.stringify({
  counts: result.counts,
  hashes: result.hashes,
  appCounts: result.appCounts
}, null, 2));
