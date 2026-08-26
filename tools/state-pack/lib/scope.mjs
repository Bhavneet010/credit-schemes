import { readdir } from "node:fs/promises";
import path from "node:path";
import { hashValue, readJson } from "./io.mjs";

const MODES = new Set(["add-state", "refresh-state", "refresh-sector", "refresh-family", "refresh-agency", "refresh-scheme", "audit-scope"]);

export function resolveScope(manifest, request) {
  if (!MODES.has(request.mode)) throw new Error(`INVALID_SCOPE_MODE: ${request.mode}`);
  const include = {
    stateIds: request.stateIds ?? (request.stateId ? [request.stateId] : [manifest.stateId]),
    sectorIds: request.sectorIds ?? [],
    familyIds: request.familyIds ?? [],
    agencyIds: request.agencyIds ?? [],
    schemeIds: request.schemeIds ?? []
  };
  const scheduledSourceIds = [...new Set(request.scheduledSourceIds ?? [])].sort();
  return {
    mode: request.mode,
    include,
    previousCutoff: request.previousCutoff ?? manifest.researchCutoff ?? null,
    scheduledSourceIds,
    propagatedDependencyIds: [...affectedDependencies(manifest, { include })].sort(),
    exclusions: request.exclusions ?? manifest.defaultExclusions ?? []
  };
}

export function affectedDependencies(pack, scope) {
  const selected = new Set([
    ...(scope.include?.schemeIds ?? []),
    ...(scope.include?.sectorIds ?? []),
    ...(scope.include?.familyIds ?? []),
    ...(scope.include?.agencyIds ?? [])
  ]);
  const reverse = pack.reverseIndexes ?? {};
  const affected = new Set();
  const queue = [...selected];
  while (queue.length) {
    const current = queue.shift();
    for (const dependent of reverse[current] ?? []) {
      if (!affected.has(dependent)) {
        affected.add(dependent);
        queue.push(dependent);
      }
    }
  }
  return affected;
}

function recordAllowed(record, scope) {
  const include = scope.include ?? {};
  const permitted = new Set(Object.values(include).flat());
  const propagated = new Set(scope.propagatedDependencyIds ?? []);
  const references = [record.id, record.stateId, record.sectorId, record.schemeId, record.familyId, record.agencyId].filter(Boolean);
  return references.some((value) => permitted.has(value) || propagated.has(value));
}

export async function captureOutOfScopeHashes(packRoot, scope) {
  const result = new Map();
  const files = (await readdir(packRoot)).filter((file) => file.endsWith(".json")).sort();
  for (const file of files) {
    const value = await readJson(path.join(packRoot, file));
    for (const [key, records] of Object.entries(value)) {
      if (!Array.isArray(records)) continue;
      records.forEach((record, index) => {
        if (!recordAllowed(record, scope)) result.set(`${file}#${key}/${record.id ?? index}`, hashValue(record));
      });
    }
  }
  return result;
}

export function assertOutOfScopeUnchanged(before, after) {
  const keys = new Set([...before.keys(), ...after.keys()]);
  const changed = [...keys].filter((key) => before.get(key) !== after.get(key)).sort();
  if (changed.length) throw new Error(`OUT_OF_SCOPE_CHANGE: ${changed.join(", ")}`);
}
