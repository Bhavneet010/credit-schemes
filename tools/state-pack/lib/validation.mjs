import { readdir } from "node:fs/promises";
import path from "node:path";
import { readJson } from "./io.mjs";

const HARD_FIELDS = new Set(["eligibleApplicants", "keyBenefit", "applicationRoute", "deadline", "financialBenefit"]);

function add(errors, code, recordPath, message) {
  errors.push({ code, path: recordPath, message });
}

function arrays(value) {
  return Object.entries(value ?? {}).filter(([, records]) => Array.isArray(records));
}

export async function loadStatePack(stateSlug, root = "scheme-data") {
  const stateRoot = path.join(root, "states", stateSlug);
  const stateFiles = {};
  for (const file of (await readdir(stateRoot)).filter((name) => name.endsWith(".json"))) {
    stateFiles[file.replace(/\.json$/, "")] = await readJson(path.join(stateRoot, file));
  }
  const common = {};
  const commonRoot = path.join(root, "common");
  for (const file of (await readdir(commonRoot)).filter((name) => name.endsWith(".json"))) {
    common[file.replace(/\.json$/, "")] = await readJson(path.join(commonRoot, file));
  }
  return { root, stateSlug, ...stateFiles, common };
}

export async function validateStatePack(packRoot, options = {}) {
  const errors = [];
  const files = {};
  for (const file of (await readdir(packRoot)).filter((name) => name.endsWith(".json")).sort()) {
    try {
      files[file.replace(/\.json$/, "")] = await readJson(path.join(packRoot, file));
    } catch (error) {
      add(errors, "INVALID_JSON", file, error.message);
    }
  }
  const common = options.common ?? {};
  const manifest = files.manifest;
  if (!manifest) add(errors, "MISSING_MANIFEST", "manifest.json", "A state pack requires manifest.json.");

  const idLocations = new Map();
  const entityKeys = new Set(["schemes", "components", "sources", "changes", "sectors", "implementations", "reviews", "claims", "statuses", "candidates", "coverage", "agencyCoverage", "agencyInventory"]);
  for (const [file, body] of [...Object.entries(common), ...Object.entries(files)]) {
    for (const [key, records] of arrays(body).filter(([key]) => entityKeys.has(key))) {
      records.forEach((record, index) => {
        if (!record?.id) return add(errors, "MISSING_ID", `${file}.${key}[${index}]`, "Record requires a stable id.");
        const location = `${file}.${key}[${index}]`;
        if (idLocations.has(record.id)) add(errors, "DUPLICATE_ID", location, `${record.id} also appears at ${idLocations.get(record.id)}.`);
        else idLocations.set(record.id, location);
      });
    }
  }

  const commonSchemes = common.schemes?.schemes ?? [];
  const stateSchemes = files.schemes?.schemes ?? [];
  const schemes = [...commonSchemes, ...stateSchemes];
  const schemeIds = new Set(schemes.map((record) => record.id));
  const implementations = files.implementations?.implementations ?? [];
  for (const item of implementations) {
    if (!schemeIds.has(item.schemeId)) add(errors, "UNRESOLVED_REFERENCE", `implementations.${item.id}.schemeId`, item.schemeId);
    if (item.stateId !== manifest?.stateId) add(errors, "STATE_MISMATCH", `implementations.${item.id}.stateId`, item.stateId);
  }

  const sources = [...(common.sources?.sources ?? []), ...(files.sources?.sources ?? [])];
  const sourceIds = new Set(sources.map((record) => record.id));
  const claims = files.evidence?.claims ?? [];
  const claimIds = new Set(claims.map((record) => record.id));
  for (const scheme of schemes) {
    for (const claimId of scheme.claimIds ?? []) {
      if (!claimIds.has(claimId)) add(errors, "UNRESOLVED_REFERENCE", `schemes.${scheme.id}.claimIds`, claimId);
    }
  }
  for (const claim of claims) {
    for (const sourceId of claim.sourceIds ?? []) {
      if (!sourceIds.has(sourceId)) add(errors, "UNRESOLVED_REFERENCE", `evidence.${claim.id}.sourceIds`, sourceId);
    }
    if (HARD_FIELDS.has(claim.field) && claim.evidenceGrade !== "primary-operative") {
      const safeIndicative = claim.publicationTreatment === "indicative-only" && Boolean(claim.limitation?.trim());
      if (!safeIndicative) add(errors, "EVIDENCE_HARD_CLAIM", `evidence.${claim.id}`, "Hard claims need primary-operative evidence or explicit indicative-only treatment.");
    }
  }

  const sectorIds = new Set((files.sectors?.sectors ?? []).map((record) => record.id));
  for (const mapping of files.mappings?.reviews ?? []) {
    if (!sectorIds.has(mapping.sectorId)) add(errors, "UNRESOLVED_REFERENCE", `mappings.${mapping.id}.sectorId`, mapping.sectorId);
    if (!schemeIds.has(mapping.schemeId)) add(errors, "UNRESOLVED_REFERENCE", `mappings.${mapping.id}.schemeId`, mapping.schemeId);
  }

  for (const coverage of files.coverage?.coverage ?? []) {
    if (!sectorIds.has(coverage.sectorId)) add(errors, "UNRESOLVED_REFERENCE", `coverage.${coverage.id}.sectorId`, coverage.sectorId);
    if (!coverage.outcome) add(errors, "MISSING_COVERAGE_OUTCOME", `coverage.${coverage.id}`, "Coverage requires a recorded outcome.");
  }

  for (const status of files.evidence?.statuses ?? []) {
    if (!status.verifiedAt || !status.nextCheckAt) add(errors, "STATUS_FRESHNESS", `statuses.${status.id}`, "Status requires verifiedAt and nextCheckAt.");
  }

  const findingIds = manifest?.acceptedMethodFindingIds ?? [];
  const traceability = manifest?.methodTraceability ?? {};
  for (const findingId of findingIds) {
    if (!traceability[findingId]) add(errors, "UNMAPPED_METHOD_FINDING", `manifest.methodTraceability.${findingId}`, "Accepted HP v2 finding has no generalized rule.");
  }

  errors.sort((left, right) => `${left.path}|${left.code}`.localeCompare(`${right.path}|${right.code}`));
  return { ok: errors.length === 0, errors };
}

export async function validateRepositoryState(stateSlug, root = "scheme-data") {
  const common = {
    schemes: await readJson(path.join(root, "common", "schemes.json")),
    sources: await readJson(path.join(root, "common", "sources.json")),
    changes: await readJson(path.join(root, "common", "changes.json")),
    components: await readJson(path.join(root, "common", "components.json"))
  };
  return validateStatePack(path.join(root, "states", stateSlug), { common });
}
