import { parseArgs } from "./lib/args.mjs";
import { diffPacks } from "./lib/diff.mjs";
import { readJson, writeJsonStable } from "./lib/io.mjs";

export async function run(args = []) {
  const options = parseArgs(args);
  if (!options.before || !options.after) {
    console.error("Use --before <json> --after <json> [--output <json>].");
    return 2;
  }
  const report = diffPacks(await readJson(options.before), await readJson(options.after));
  if (options.output) await writeJsonStable(options.output, report);
  console.log(JSON.stringify(report, null, 2));
  return 0;
}
