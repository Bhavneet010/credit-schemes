import { readdir } from "node:fs/promises";
import { parseArgs } from "./lib/args.mjs";
import { validateRepositoryState } from "./lib/validation.mjs";

export async function run(args = []) {
  const options = parseArgs(args);
  let states;
  if (options.all) states = (await readdir("scheme-data/states", { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  else if (options.state) states = [options.state];
  else {
    console.error("Use --all or --state <slug>.");
    return 2;
  }
  let ok = true;
  for (const state of states) {
    const result = await validateRepositoryState(state);
    console.log(JSON.stringify({ state, ...result }, null, 2));
    ok &&= result.ok;
  }
  return ok ? 0 : 1;
}
