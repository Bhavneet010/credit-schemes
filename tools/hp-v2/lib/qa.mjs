import { readFile } from "node:fs/promises";
import path from "node:path";

const HARD_CLAIM_FIELDS = new Set([
  "eligibleApplicants",
  "keyBenefit",
  "applicationRoute",
  "deadline"
]);
const EXISTENCE_VALUES = new Set(["active", "superseded", "withdrawn", "completed", "unconfirmed"]);
const INTAKE_VALUES = new Set(["open", "continuous", "scheduled", "allocation-dependent", "closed", "unknown"]);
const PUBLISHABLE_INTAKE_VALUES = new Set(["open", "continuous", "scheduled", "allocation-dependent"]);
const BUDGET_VALUES = new Set(["available", "annual-allocation", "exhausted", "not-applicable", "unknown"]);
const COVERAGE_OUTCOMES = new Set([
  "verified-applicable",
  "verified-none",
  "candidate-pending",
  "not-relevant"
]);
const MAPPING_REVIEW_DISPOSITIONS = new Set([
  "unreviewed",
  "reviewed-applicable",
  "reviewed-not-applicable",
  "retired"
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
    ...hardClaimErrors(workbench, asOf),
    ...coverageErrors(workbench, asOf),
    ...mappingErrors(workbench, asOf)
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
  const sourceIds = knownSourceIds(workbench);

  return schemeRows(workbench).flatMap((scheme) => {
    if (!isPublishableBaselineStatus(scheme.values[5])) return [];
    const subjectId = scheme.values[0];
    const baseline = scheme.provenance;
    const existenceClaim = (claimsBySubject.get(subjectId) ?? []).find((claim) => claim.field === "existence");
    const status = (statusesBySubject.get(subjectId) ?? [])[0];
    const errors = [];

    if (!isCurrentExistenceClaim(existenceClaim, sourceIds, asOf)) {
      errors.push(error("MISSING_EXISTENCE", subjectId, baseline, "Publishable route lacks current existence evidence."));
    }
    if (!isCurrentPublishableIntake(status, sourceIds, asOf)) {
      errors.push(error("MISSING_INTAKE", subjectId, baseline, "Publishable route lacks current operative intake evidence."));
    }
    if (status && !BUDGET_VALUES.has(status.budget)) {
      errors.push(error("INVALID_BUDGET_STATUS", subjectId, baseline, "Status budget facet must use an approved value."));
    }
    if (status?.intake === "open" && (!isIsoDate(status.nextCheckAt) || status.nextCheckAt < asOf)) {
      errors.push(error("STALE_OPEN_STATUS", subjectId, baseline, "Open route lacks a current status recheck deadline."));
    }
    return errors;
  });
}

function hardClaimErrors(workbench, asOf) {
  const sourceIds = knownSourceIds(workbench);
  return (workbench.claims?.claims ?? []).flatMap((claim) => {
    if (!HARD_CLAIM_FIELDS.has(claim.field)) return [];
    if (claim.publicationTreatment === "indicative-only") {
      return nonEmptyString(claim.limitation) ? [] : [error(
        "INDICATIVE_CLAIM_WITHOUT_LIMITATION", claim.subjectId, claim.baseline,
        "An indicative-only claim must state why operative evidence is unavailable.", claim.id
      )];
    }
    return (
      claim.evidenceGrade !== "primary-operative" ||
      !isCurrentEvidence(claim, sourceIds, asOf, "effective")
    ) ? [error(
      "EVIDENCE_HARD_CLAIM",
      claim.subjectId,
      claim.baseline,
      `Hard ${claim.field} claim requires primary-operative evidence.`,
      claim.id
    )] : [];
  });
}

function coverageErrors(workbench, asOf) {
  const sourceIds = knownSourceIds(workbench);
  return (workbench.coverage?.coverage ?? [])
    .filter((coverage) => coverage.required && !isCompleteCoverage(coverage, sourceIds, asOf))
    .map((coverage) => error(
      "COVERAGE_UNEXAMINED",
      coverage.id,
      coverage.baseline,
      "Required Agency × Sector × Beneficiary × Enterprise stage × Support type coverage cell is unexamined."
    ));
}

function mappingErrors(workbench, asOf) {
  const sourceIds = knownSourceIds(workbench);
  const unreviewed = (workbench.mappingReview?.reviews ?? [])
    .filter((review) => !isCompleteMappingReview(review, sourceIds, asOf))
    .map((review) => error(
      "MAPPING_UNREVIEWED",
      review.schemeId ?? review.id,
      review.baseline,
      "Baseline mapping has not received an HP v2 applicability review."
    ));
  const orphans = (workbench.mappingReview?.orphanSchemes ?? [])
    .filter((orphan) => !orphan.disposition || orphan.disposition === "unresolved")
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

function isCurrentExistenceClaim(claim, sourceIds, asOf) {
  return Boolean(
    claim?.field === "existence" &&
    claim.value === "active" &&
    isCurrentEvidence(claim, sourceIds, asOf, "effective")
  );
}

function isCurrentPublishableIntake(status, sourceIds, asOf) {
  return Boolean(
    EXISTENCE_VALUES.has(status?.existence) &&
    status.existence === "active" &&
    INTAKE_VALUES.has(status.intake) &&
    PUBLISHABLE_INTAKE_VALUES.has(status.intake) &&
    isCurrentEvidence(status, sourceIds, asOf, "valid")
  );
}

function isCurrentEvidence(record, sourceIds, asOf, rangePrefix) {
  const startsAt = record?.[`${rangePrefix}From`];
  const endsAt = record?.[`${rangePrefix}To`];
  return Boolean(
    hasResolvableSources(record?.sourceIds, sourceIds) &&
    isIsoDate(record?.verifiedAt) &&
    record.verifiedAt <= asOf &&
    (!startsAt || (isIsoDate(startsAt) && startsAt <= asOf)) &&
    (!endsAt || (isIsoDate(endsAt) && endsAt >= asOf))
  );
}

function knownSourceIds(workbench) {
  return new Set((workbench.sources?.sources ?? []).map((source) => source.id));
}

function hasResolvableSources(recordSourceIds, knownIds) {
  return Boolean(recordSourceIds?.length && recordSourceIds.every((sourceId) => knownIds.has(sourceId)));
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function isCompleteCoverage(coverage, sourceIds, asOf) {
  return COVERAGE_OUTCOMES.has(coverage.outcome) &&
    isCurrentEvidence(coverage, sourceIds, asOf, "effective") &&
    hasExpandedCoverageDimensions(coverage);
}

function hasExpandedCoverageDimensions(coverage) {
  return ["agency", "sectorId", "beneficiary", "enterpriseStage", "supportType"]
    .every((field) => typeof coverage[field] === "string" && coverage[field].trim().length > 0);
}

function isCompleteMappingReview(review, sourceIds, asOf) {
  return MAPPING_REVIEW_DISPOSITIONS.has(review.disposition) &&
    review.disposition !== "unreviewed" &&
    nonEmptyString(review.sectorId) &&
    nonEmptyString(review.schemeId) &&
    isCurrentEvidence(review, sourceIds, asOf, "effective");
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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
