import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadHpV2Workbench, runHpV2Qa } from "./lib/qa.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dateArgument = process.argv.slice(2).find((argument) => /^\d{4}-\d{2}-\d{2}$/.test(argument));
const asOfIndex = process.argv.indexOf("--as-of");
const asOf = dateArgument ?? (asOfIndex >= 0 ? process.argv[asOfIndex + 1] : null) ?? "2026-08-26";
const qa = await runHpV2Qa(await loadHpV2Workbench({ root }), { asOf });

console.log(JSON.stringify({ asOf: qa.asOf, errorCount: qa.errors.length, errors: qa.errors }, null, 2));
if (qa.errors.length) process.exitCode = 1;
