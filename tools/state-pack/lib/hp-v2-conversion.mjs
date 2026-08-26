import path from "node:path";
import { familyId } from "./ids.mjs";
import { hashValue, readJson, writeJsonStable } from "./io.mjs";

const STATE = "STATE-IN-HP";
const STATE_SLUG = "himachal-pradesh";

function provenance(record, file, index, sheet) {
  const baseline = record.baseline;
  return {
    ...record,
    migrationSource: {
      workbench: `research/hp-v2/${file}`,
      sheet: baseline?.sheet ?? sheet,
      row: Number.isInteger(baseline?.row) ? baseline.row : index + 2
    }
  };
}

function issuerType(gov) {
  if (gov === "Himachal Pradesh" || gov.startsWith("Himachal Pradesh +")) return "state";
  if (gov.includes("Himachal Pradesh")) return "joint";
  if (gov === "Central" || gov.startsWith("Central ")) return "central";
  return "institutional";
}

function makeScheme(scheme, claims, index) {
  return {
    id: scheme.id,
    name: scheme.name,
    issuerType: issuerType(scheme.gov),
    familyId: familyId(scheme.family),
    claimIds: claims.filter((claim) => claim.subjectId === scheme.id).map((claim) => claim.id).sort(),
    aliases: [...new Set([scheme.name, scheme.parent].filter(Boolean))],
    legacy: scheme,
    migrationSource: { workbench: "app/data.json", sheet: "Scheme Master", row: index + 2 }
  };
}

function reverseIndexes(app, implementations, reviews, claims, sources) {
  const result = {};
  const add = (key, value) => {
    if (!key || !value) return;
    (result[key] ??= []).push(value);
  };
  for (const implementation of implementations) add(implementation.schemeId, implementation.id);
  for (const review of reviews) {
    add(review.schemeId, review.id);
    add(review.sectorId, review.id);
  }
  for (const claim of claims) {
    add(claim.subjectId, claim.id);
    for (const sourceId of claim.sourceIds ?? []) add(sourceId, claim.id);
  }
  for (const source of sources) for (const claimId of source.claimIds ?? []) add(claimId, source.id);
  return Object.fromEntries(Object.entries(result).map(([key, values]) => [key, [...new Set(values)].sort()]));
}

export async function convertHpV2({ workbenchRoot = "research/hp-v2" } = {}) {
  const [acceptance, run, findings, claimData, sourceData, candidateData, coverageData, mappingData, changeData, app] = await Promise.all([
    readJson(path.join(workbenchRoot, "acceptance.json")),
    readJson(path.join(workbenchRoot, "run.json")),
    readJson(path.join(workbenchRoot, "method-findings.json")),
    readJson(path.join(workbenchRoot, "claims.json")),
    readJson(path.join(workbenchRoot, "sources.json")),
    readJson(path.join(workbenchRoot, "candidates.json")),
    readJson(path.join(workbenchRoot, "coverage.json")),
    readJson(path.join(workbenchRoot, "mapping-review.json")),
    readJson(path.join(workbenchRoot, "changes.json")),
    readJson("app/data.json")
  ]);
  const claims = claimData.claims.map((item, index) => provenance(item, "claims.json", index, "Claim Evidence"));
  const statuses = claimData.statuses.map((item, index) => provenance(item, "claims.json", index, "Claim Evidence"));
  const allSchemes = app.schemes.map((item, index) => makeScheme(item, claims, index));
  const commonSchemes = allSchemes.filter((item) => item.issuerType !== "state");
  const stateSchemes = allSchemes.filter((item) => item.issuerType === "state");
  const implementations = commonSchemes.map((scheme, index) => ({
    id: `IMPLEMENTATION-HP-${scheme.id.replace(/^SCH-/, "")}`,
    schemeId: scheme.id,
    stateId: STATE,
    overrides: {
      agency: scheme.legacy.agency,
      access: scheme.legacy.access,
      status: scheme.legacy.status,
      stateCaution: scheme.legacy.caution
    },
    claimIds: scheme.claimIds,
    migrationSource: { workbench: "app/data.json", sheet: "Scheme Master", row: app.schemes.findIndex((item) => item.id === scheme.id) + 2 }
  }));
  const sources = sourceData.sources.map((item, index) => provenance(item, "sources.json", index, "Source Register"));
  const commonClaimIds = new Set(claims.filter((claim) => commonSchemes.some((scheme) => scheme.id === claim.subjectId)).map((claim) => claim.id));
  const commonSources = sources.filter((source) => (source.claimIds ?? []).some((claimId) => commonClaimIds.has(claimId)));
  const commonSourceIds = new Set(commonSources.map((source) => source.id));
  const stateSources = sources.filter((source) => !commonSourceIds.has(source.id));
  const reviews = mappingData.reviews.map((item, index) => provenance(item, "mapping-review.json", index, "Sector-Scheme Map"));
  const methodTraceability = Object.fromEntries(findings.findings.map((finding) => [finding.id, {
    rule: finding.laterGeneralizationRequirement,
    enforcement: finding.id.includes("FAILED-ACCESS") ? "candidate-outcome" : finding.id.includes("BUDGET-SUMMARY") ? "evidence-grade" : "canonical-record-and-workflow"
  }]));
  const manifest = {
    schemaVersion: "state-pack-1",
    stateId: STATE,
    slug: STATE_SLUG,
    name: "Himachal Pradesh",
    researchCutoff: acceptance.cutoff,
    accepted: acceptance.accepted,
    sourceRunId: run.id,
    acceptance,
    acceptedMethodFindingIds: findings.findings.map((finding) => finding.id).sort(),
    methodTraceability,
    schemeOrder: app.schemes.map((scheme) => scheme.id),
    reverseIndexes: reverseIndexes(app, implementations, reviews, claims, sources),
    defaultExclusions: ["records outside the declared scope", "non-government commercial products"],
    appStatic: Object.fromEntries(Object.entries(app).filter(([key]) => !["sectors", "schemes", "links", "norms", "contacts", "legacy"].includes(key)))
  };
  const files = {
    "common/schemes.json": { schemaVersion: "state-pack-1", schemes: commonSchemes },
    "common/components.json": { schemaVersion: "state-pack-1", components: [] },
    "common/sources.json": { schemaVersion: "state-pack-1", sources: commonSources },
    "common/changes.json": { schemaVersion: "state-pack-1", changes: [] },
    [`states/${STATE_SLUG}/manifest.json`]: manifest,
    [`states/${STATE_SLUG}/sectors.json`]: { schemaVersion: "state-pack-1", sectors: app.sectors.map((item, index) => provenance(item, "app/data.json", index, "Sector Catalogue")) },
    [`states/${STATE_SLUG}/schemes.json`]: { schemaVersion: "state-pack-1", schemes: stateSchemes },
    [`states/${STATE_SLUG}/implementations.json`]: { schemaVersion: "state-pack-1", implementations },
    [`states/${STATE_SLUG}/components.json`]: { schemaVersion: "state-pack-1", components: mappingData.orphanSchemes.map((item, index) => provenance(item, "mapping-review.json", index, "Scheme Master")) },
    [`states/${STATE_SLUG}/mappings.json`]: { schemaVersion: "state-pack-1", count: acceptance.counts.mappings, compressedLinks: app.links, reviews },
    [`states/${STATE_SLUG}/component-norms.json`]: { schemaVersion: "state-pack-1", norms: app.norms.map((item, index) => provenance(item, "app/data.json", index, "Component Norms")) },
    [`states/${STATE_SLUG}/contacts.json`]: { schemaVersion: "state-pack-1", contacts: app.contacts.map((item, index) => provenance(item, "app/data.json", index, "Key Contacts")) },
    [`states/${STATE_SLUG}/legacy.json`]: { schemaVersion: "state-pack-1", legacy: app.legacy.map((item, index) => provenance(item, "app/data.json", index, "Legacy & Closed")) },
    [`states/${STATE_SLUG}/sources.json`]: { schemaVersion: "state-pack-1", sources: stateSources, agencyInventory: sourceData.agencyInventory.map((item, index) => provenance(item, "sources.json", index, "Candidate Ledger")) },
    [`states/${STATE_SLUG}/evidence.json`]: { schemaVersion: "state-pack-1", claims, statuses },
    [`states/${STATE_SLUG}/candidates.json`]: { ...candidateData, candidates: candidateData.candidates.map((item, index) => provenance(item, "candidates.json", index, "Candidate Ledger")) },
    [`states/${STATE_SLUG}/coverage.json`]: { ...coverageData, coverage: coverageData.coverage.map((item, index) => provenance(item, "coverage.json", index, "Coverage Audit")), agencyCoverage: coverageData.agencyCoverage.map((item, index) => provenance(item, "coverage.json", index, "Coverage Audit")) },
    [`states/${STATE_SLUG}/changes.json`]: { ...changeData, changes: changeData.changes.map((item, index) => provenance(item, "changes.json", index, "Change Log")) }
  };
  return { files, acceptance, app, counts: acceptance.counts, workbenchHash: hashValue({ acceptance, run, findings, claimData, sourceData, candidateData, coverageData, mappingData, changeData }) };
}

export async function importHpV2({ workbenchRoot = "research/hp-v2", outputRoot = "scheme-data" } = {}) {
  const result = await convertHpV2({ workbenchRoot });
  for (const [relative, value] of Object.entries(result.files)) await writeJsonStable(path.join(outputRoot, relative), value);
  return result;
}
