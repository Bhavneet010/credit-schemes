import path from "node:path";
import { parseArgs } from "./lib/args.mjs";
import { importHpV2 } from "./lib/hp-v2-conversion.mjs";
import { writeJsonStable } from "./lib/io.mjs";
import { validateRepositoryState } from "./lib/validation.mjs";

export async function run(args = []) {
  const options = parseArgs(args);
  const result = await importHpV2({ workbenchRoot: options.workbench ?? "research/hp-v2", outputRoot: options.output ?? "scheme-data" });
  const validation = await validateRepositoryState("himachal-pradesh", options.output ?? "scheme-data");
  const report = { stateId: "STATE-IN-HP", accepted: result.acceptance.accepted, counts: result.counts, workbenchHash: result.workbenchHash, validation };
  await writeJsonStable(path.join("outputs", "himachal-pradesh", "migration-reconciliation.json"), report);
  console.log(JSON.stringify(report, null, 2));
  return validation.ok ? 0 : 1;
}
