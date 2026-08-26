import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadHpV2Workbench, runHpV2Qa } from "./lib/qa.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const asOf = process.argv[2] ?? "2026-08-25";
const qa = await runHpV2Qa(await loadHpV2Workbench({ root }), { asOf });

console.log(JSON.stringify({ asOf: qa.asOf, errorCount: qa.errors.length, errors: qa.errors }, null, 2));
if (qa.errors.length) process.exitCode = 1;
