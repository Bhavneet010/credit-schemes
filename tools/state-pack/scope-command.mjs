import { parseArgs } from "./lib/args.mjs";
import { readJson } from "./lib/io.mjs";
import { resolveScope } from "./lib/scope.mjs";

function list(value) {
  return value ? String(value).split(",").map((item) => item.trim()).filter(Boolean) : [];
}

export async function run(args = []) {
  const options = parseArgs(args);
  if (!options.mode || !options.state) {
    console.error("Use --mode <mode> --state <slug> and optional --sectors/--families/--agencies/--schemes.");
    return 2;
  }
  const manifest = await readJson(`scheme-data/states/${options.state}/manifest.json`);
  const scope = resolveScope(manifest, {
    mode: options.mode,
    sectorIds: list(options.sectors),
    familyIds: list(options.families),
    agencyIds: list(options.agencies),
    schemeIds: list(options.schemes),
    scheduledSourceIds: list(options.sources)
  });
  console.log(JSON.stringify(scope, null, 2));
  return 0;
}
