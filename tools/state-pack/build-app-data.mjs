import { mkdir } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "./lib/args.mjs";
import { compileAllStates, compileRepositoryState } from "./lib/app-compiler.mjs";
import { hashValue, readJson, writeJsonStable } from "./lib/io.mjs";
import { validateRepositoryState } from "./lib/validation.mjs";

export async function run(args = []) {
  const options = parseArgs(args);
  if (options.all) {
    const outputDir = options["output-dir"] ?? "app/data";
    const build = await compileAllStates();
    for (const state of build.index.states) {
      const validation = await validateRepositoryState(state.slug);
      if (!validation.ok) {
        console.error(JSON.stringify({ state: state.slug, ...validation }, null, 2));
        return 1;
      }
    }
    await mkdir(outputDir, { recursive: true });
    await writeJsonStable(path.join(outputDir, "states.json"), build.index);
    for (const [slug, dataset] of build.datasets) await writeJsonStable(path.join(outputDir, `${slug}.json`), dataset);
    console.log(JSON.stringify({ outputDir, states: build.index.states.map((state) => state.slug) }, null, 2));
    return 0;
  }
  const state = options.state ?? "himachal-pradesh";
  const output = options.output ?? path.join("outputs", state, "data.json");
  const validation = await validateRepositoryState(state);
  if (!validation.ok) {
    console.error(JSON.stringify(validation, null, 2));
    return 1;
  }
  const data = await compileRepositoryState(state);
  await mkdir(path.dirname(output), { recursive: true });
  let changed = true;
  try {
    changed = hashValue(await readJson(output)) !== hashValue(data);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (changed) await writeJsonStable(output, data);
  console.log(JSON.stringify({ state, output, changed, counts: data.meta.counts }, null, 2));
  return 0;
}
