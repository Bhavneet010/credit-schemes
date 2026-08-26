import { readFile } from "node:fs/promises";
import path from "node:path";

const HARD_CLAIM_FIELDS = new Set([
  "eligibleApplicants",
  "keyBenefit",
  "applicationRoute",
  "deadline"
]);

export async function loadHpV2Workbench({ root }) {
  const ledgerDirectory = path.join(root, "research", "hp-v2");
  const readJson = async (name) => JSON.parse(await readFile(path.join(ledgerDirectory, name), "utf8"));
  const [baseline, claims, sources, candidates, coverage, mappingReview, changes, methodFindings] = await Promise.all([
    readJson("baseline.json"),
    readJson("claims.json"),
    readJson("sources.json"),
    readJson("candidates.json"),
    readJson("coverage.json"),
    readJson("mapping-review.json"),
    readJson("changes.json"),
    readJson("method-findings.json")
  ]);

  return { baseline, claims, sources, candidates, coverage, mappingReview, changes, methodFindings };
}

export async function runHpV2Qa(workbench, { asOf }) {
  const errors = [
    ...statusErrors(workbench, asOf),
    ...hardClaimErrors(workbench),
    ...coverageErrors(workbench),
    ...mappingErrors(workbench)
  ].sort(compareErrors);

  return {
    asOf,
    errors,
    byCodes(...codes) {
      const wanted = new Set(codes);
      return errors.filter((error) => wanted.has(error.code));
    }
  };
}

function statusErrors(workbench, asOf) {
  const claimsBySubject = groupBy(workbench.claims?.claims ?? [], "subjectId");
  const statusesBySubject = groupBy(workbench.claims?.statuses ?? [], "subjectId");

  return schemeRows(workbench).flatMap((scheme) => {
    if (!isPublishableBaselineStatus(scheme.values[5])) return [];
    const subjectId = scheme.values[0];
    const baseline = scheme.provenance;
    const existenceClaim = (claimsBySubject.get(subjectId) ?? []).find((claim) => claim.field === "existence");
    const status = (statusesBySubject.get(subjectId) ?? [])[0];
    const errors = [];

    if (!isCurrentClaim(existenceClaim, asOf)) {
      errors.push(error("MISSING_EXISTENCE", subjectId, baseline, "Publishable route lacks current existence evidence."));
    }
    if (!status || !status.intake || !hasStatusEvidence(status) || status.intake === "allocation-dependent") {
      errors.push(error("MISSING_INTAKE", subjectId, baseline, "Publishable route lacks current operative intake evidence."));
    }
    if (status?.intake === "open" && (!isIsoDate(status.nextCheckAt) || status.nextCheckAt < asOf)) {
      errors.push(error("STALE_OPEN_STATUS", subjectId, baseline, "Open route lacks a current status recheck deadline."));
    }
    return errors;
  });
}

function hardClaimErrors(workbench) {
  return (workbench.claims?.claims ?? [])
    .filter((claim) => HARD_CLAIM_FIELDS.has(claim.field) && claim.evidenceGrade !== "primary-operative")
    .map((claim) => error(
      "EVIDENCE_HARD_CLAIM",
      claim.subjectId,
      claim.baseline,
      `Hard ${claim.field} claim requires primary-operative evidence.`,
      claim.id
    ));
}

function coverageErrors(workbench) {
  return (workbench.coverage?.coverage ?? [])
    .filter((coverage) => coverage.required && !hasExpandedCoverageDimensions(coverage))
    .map((coverage) => error(
      "COVERAGE_UNEXAMINED",
      coverage.id,
      coverage.baseline,
      "Required Agency × Sector × Beneficiary × Enterprise stage × Support type coverage cell is unexamined."
    ));
}

function mappingErrors(workbench) {
  const unreviewed = (workbench.mappingReview?.reviews ?? [])
    .filter((review) => review.disposition === "unreviewed")
    .map((review) => error(
      "MAPPING_UNREVIEWED",
      review.schemeId ?? review.id,
      review.baseline,
      "Baseline mapping has not received an HP v2 applicability review."
    ));
  const orphans = (workbench.mappingReview?.orphanSchemes ?? [])
    .map((orphan) => error(
      "ORPHAN_SCHEME",
      orphan.schemeId,
      orphan.baseline,
      "Published scheme has no Sector-Scheme Map route."
    ));
  return [...unreviewed, ...orphans];
}

function schemeRows(workbench) {
  return workbench.baseline?.sheets
    ?.find((sheet) => sheet.name === "Scheme Master")
    ?.rows
    .filter((row) => row.provenance.row > 1) ?? [];
}

function isPublishableBaselineStatus(status) {
  return status !== "Fresh window closed";
}

function isCurrentClaim(claim, asOf) {
  return Boolean(
    claim?.sourceIds?.length &&
    isIsoDate(claim.verifiedAt) &&
    claim.verifiedAt <= asOf &&
    (!claim.effectiveTo || (isIsoDate(claim.effectiveTo) && claim.effectiveTo >= asOf))
  );
}

function hasStatusEvidence(status) {
  return Boolean(status.sourceIds?.length && isIsoDate(status.verifiedAt));
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function hasExpandedCoverageDimensions(coverage) {
  return ["agency", "sectorId", "beneficiary", "enterpriseStage", "supportType"]
    .every((field) => Boolean(coverage[field]));
}

function groupBy(values, key) {
  return values.reduce((groups, value) => {
    const group = groups.get(value[key]) ?? [];
    group.push(value);
    groups.set(value[key], group);
    return groups;
  }, new Map());
}

function error(code, subjectId, baseline, message, claimId) {
  return {
    code,
    subjectId,
    ...(claimId ? { claimId } : {}),
    baseline: baseline ? { sheet: baseline.sheet, row: baseline.row } : null,
    message
  };
}

function compareErrors(left, right) {
  return [
    left.baseline?.sheet ?? "",
    String(left.baseline?.row ?? "").padStart(8, "0"),
    left.code,
    left.subjectId,
    left.claimId ?? ""
  ].join("\u0000").localeCompare([
    right.baseline?.sheet ?? "",
    String(right.baseline?.row ?? "").padStart(8, "0"),
    right.code,
    right.subjectId,
    right.claimId ?? ""
  ].join("\u0000"));
}
