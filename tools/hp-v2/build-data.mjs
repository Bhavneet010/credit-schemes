import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadHpV2Workbench, runHpV2Qa } from "./lib/qa.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT = path.join(ROOT, "outputs", "himachal-pradesh");
const AS_OF = "2026-08-26";
const publish = process.argv.includes("--publish");

await mkdir(OUTPUT, { recursive: true });
const workbench = await loadHpV2Workbench({ root: ROOT });
const qa = await runHpV2Qa(workbench, { asOf: AS_OF });
if (qa.errors.length) throw new Error(`HP v2 publication blocked by ${qa.errors.length} QA error(s).`);

const current = JSON.parse(await readFile(path.join(ROOT, "research", "hp-v2", "baseline-app-data.json"), "utf8"));
const data = structuredClone(current);
const existingIds = new Set(data.schemes.map((scheme) => scheme.id));
const publishableCandidates = workbench.candidates.candidates.filter((candidate) => candidate.publishable && candidate.scheme);

for (const candidate of publishableCandidates) {
  if (existingIds.has(candidate.schemeId)) continue;
  const s = candidate.scheme;
  const schemeIndex = data.schemes.length;
  data.schemes.push({
    id: candidate.schemeId, name: s.title, family: s.schemeFamily, parent: s.parentProgramme,
    gov: s.government, status: s.currentStatus, label: s.sectorLabel, bestFor: s.bestFor,
    eligible: s.eligibleApplicants, support: s.supportType, benefit: s.keyBenefit,
    margin: s.contributionMargin, bank: s.bankLinked, stage: s.unitStage, access: s.howToAccess,
    agency: s.agencyChannel, src: s.officialSource,
    caution: s.criticalCaution, reach: 0,
    evidence: { verified: s.verified, treatment: "primary-operative", sourceIds: candidate.sourceIds }
  });

  let reach = 0;
  for (let sectorIndex = 0; sectorIndex < data.sectors.length; sectorIndex += 1) {
    const sector = data.sectors[sectorIndex];
    const isCarp = candidate.schemeId === "SCH-HP-MUKHYAMANTRI-CARP-MATSYA-PALAN";
    const sectorText = `${sector.a} ${sector.sub} ${data.macros[sector.m] ?? ""}`.toLowerCase();
    if (isCarp && !/fish|aquaculture|carp|pond/.test(sectorText)) continue;
    data.links[String(sectorIndex)] ||= [];
    data.links[String(sectorIndex)].push([schemeIndex, isCarp ? 0 : 3, 0, 0]);
    reach += 1;
  }
  data.schemes[schemeIndex].reach = reach;
  existingIds.add(candidate.schemeId);
}

const indicativeBySubject = new Map();
for (const claim of workbench.claims.claims.filter((claim) => claim.publicationTreatment === "indicative-only")) {
  indicativeBySubject.set(claim.subjectId, (indicativeBySubject.get(claim.subjectId) ?? 0) + 1);
}
for (const scheme of data.schemes) {
  const count = indicativeBySubject.get(scheme.id) ?? 0;
  if (!count || scheme.evidence) continue;
  scheme.evidence = { verified: AS_OF, treatment: "indicative-only", unresolvedClaimCount: count };
  scheme.caution = `${scheme.caution ? `${scheme.caution} ` : ""}HP v2 evidence note: precise eligibility, benefit, or access wording remains indicative until a claim-specific operative locator is recorded.`;
}

data.meta = {
  ...data.meta,
  verified: AS_OF,
  counts: {
    sectors: data.sectors.length,
    schemes: data.schemes.length,
    links: Object.values(data.links).reduce((sum, entries) => sum + entries.length, 0)
  },
  hpV2: {
    methodPilot: true,
    baselineSchemes: current.schemes.length,
    addedVerifiedSchemes: publishableCandidates.length,
    operativeClaims: workbench.claims.claims.filter((claim) => claim.evidenceGrade === "primary-operative").length,
    indicativeClaims: workbench.claims.claims.filter((claim) => claim.publicationTreatment === "indicative-only").length,
    candidateCount: workbench.candidates.candidates.length,
    agencyInventoryChecks: workbench.sources.agencyInventory?.length ?? 0
  }
};

const stagedPath = path.join(OUTPUT, "data.json");
await writeFile(stagedPath, `${JSON.stringify(data)}\n`);

const byOutcome = countBy(workbench.coverage.coverage, "outcome");
const byDisposition = countBy(workbench.candidates.candidates, "disposition");
const qaReport = { asOf: AS_OF, passed: true, errorCount: 0, gates: ["status", "evidence", "coverage", "mappings"] };
const changeReport = {
  asOf: AS_OF,
  counts: countBy(workbench.changes.changes, "category"),
  changes: workbench.changes.changes
};
const acceptance = {
  schemaVersion: "hp-v2-acceptance-1",
  runId: "HP-V2-PILOT-2026-08",
  cutoff: AS_OF,
  accepted: true,
  counts: {
    sectors: data.sectors.length,
    schemes: data.schemes.length,
    mappings: data.meta.counts.links,
    sources: workbench.sources.sources.length,
    agencyInventoryChecks: workbench.sources.agencyInventory?.length ?? 0,
    candidates: workbench.candidates.candidates.length,
    addedVerifiedSchemes: publishableCandidates.length,
    claims: workbench.claims.claims.length,
    operativeClaims: data.meta.hpV2.operativeClaims,
    indicativeClaims: data.meta.hpV2.indicativeClaims,
    reviewedMappings: workbench.mappingReview.reviews.filter((review) => review.disposition === "reviewed-applicable").length,
    resolvedOrphans: workbench.mappingReview.orphanSchemes.filter((orphan) => orphan.disposition !== "unresolved").length
  },
  candidateDispositions: byDisposition,
  coverageOutcomes: byOutcome,
  limitations: [
    "Indicative-only v1 wording remains visible with an explicit caution and is not represented as operative entitlement evidence.",
    "Five official agency surfaces were inaccessible during the breadth pass and remain scheduled for recheck.",
    "Current allocation and sanction must be confirmed with the issuing body for allocation-dependent routes."
  ],
  hashes: {
    baselineWorkbook: workbench.baseline.workbook.sha256,
    baselineAppData: workbench.baseline.appData.sha256,
    stagedAppData: sha256(await readFile(stagedPath))
  },
  gateResults: qaReport
};

await Promise.all([
  writeFile(path.join(OUTPUT, "qa-report.json"), `${JSON.stringify(qaReport, null, 2)}\n`),
  writeFile(path.join(OUTPUT, "change-report.json"), `${JSON.stringify(changeReport, null, 2)}\n`),
  writeFile(path.join(OUTPUT, "hp-v2-acceptance.json"), `${JSON.stringify(acceptance, null, 2)}\n`),
  writeFile(path.join(ROOT, "research", "hp-v2", "acceptance.json"), `${JSON.stringify(acceptance, null, 2)}\n`)
]);

if (publish) await copyFile(stagedPath, path.join(ROOT, "app", "data.json"));
console.log(JSON.stringify({ stagedPath, publish, counts: acceptance.counts, hashes: acceptance.hashes }, null, 2));

function countBy(values, field) {
  return values.reduce((counts, value) => {
    const key = value[field] ?? "unset";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
