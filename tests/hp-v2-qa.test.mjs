import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { loadHpV2Workbench, runHpV2Qa } from "../tools/hp-v2/lib/qa.mjs";

const root = path.resolve(import.meta.dirname, "..");

async function loadBaselineWorkbench() {
  return loadHpV2Workbench({ root });
}

test("agency inventory covers every baseline agency and approved discovery category", async () => {
  const workbench = await loadBaselineWorkbench();
  const inventory = workbench.sources.agencyInventory ?? [];
  const approvedCategories = [
    "industries-single-window",
    "agriculture",
    "horticulture",
    "animal-husbandry",
    "fisheries",
    "rural-development-nrlm",
    "urban-development",
    "tourism",
    "energy-himurja",
    "forest",
    "handloom-handicrafts",
    "labour-employment-skill",
    "cooperatives",
    "startup-incubation",
    "food-processing",
    "pharma-medical-devices",
    "ayush",
    "sc-st-development-finance",
    "obc-minority-development-finance",
    "women-development",
    "transport-logistics",
    "district-cluster-channels",
    "central-implementing-bodies",
    "budget-cross-government"
  ];
  const baselineAgencyColumns = new Map([
    ["Scheme Master", 15],
    ["Key Contacts", 0],
    ["Source Register", 2]
  ]);
  const baselineAgencies = workbench.baseline.sheets.flatMap((sheet) => {
    const column = baselineAgencyColumns.get(sheet.name);
    if (column === undefined) return [];
    return sheet.rows.slice(1).map((row) => row.values[column]).filter(nonEmptyString);
  });
  const coveredCategories = new Set(inventory.flatMap((entry) => entry.categories ?? []));

  assert.deepEqual(
    [...new Set(baselineAgencies)].filter((agency) => !inventory.some((entry) =>
      entry.aliases?.includes(agency) ||
      entry.agencyMatchTerms?.some((term) => agency.toLowerCase().includes(term.toLowerCase()))
    )),
    [],
    "Every agency label imported from the three baseline sheets must resolve to an official index check."
  );
  assert.deepEqual(
    approvedCategories.filter((category) => !coveredCategories.has(category)),
    [],
    "Every approved discovery category must have an official index check."
  );

  const ids = new Set();
  const urls = new Set();
  for (const entry of inventory) {
    assert.match(entry.id, /^AGENCY-INDEX-[A-Z0-9-]+$/);
    assert.equal(ids.has(entry.id), false, `Duplicate agency-inventory ID: ${entry.id}`);
    ids.add(entry.id);
    assert.ok(nonEmptyString(entry.issuer), `${entry.id} issuer`);
    assert.ok(nonEmptyString(entry.title), `${entry.id} title`);
    assert.match(entry.url, /^https:\/\//, `${entry.id} official index URL`);
    assert.equal(urls.has(entry.url), false, `Duplicate agency-inventory URL: ${entry.url}`);
    urls.add(entry.url);
    assert.ok(entry.categories?.length, `${entry.id} categories`);
    assert.ok(entry.sectors?.length, `${entry.id} sectors`);
    assert.ok(entry.beneficiaryTags?.length, `${entry.id} beneficiaryTags`);
    assert.ok(entry.supportTags?.length, `${entry.id} supportTags`);
    assert.ok(entry.aliases?.length || entry.agencyMatchTerms?.length, `${entry.id} agency coverage selectors`);
    assert.ok((entry.agencyMatchTerms ?? []).every((term) => nonEmptyString(term) && term.length >= 4), `${entry.id} agencyMatchTerms`);
    assert.ok(isIsoDate(entry.checkedAt) && entry.checkedAt <= "2026-08-26", `${entry.id} checkedAt`);
    assert.ok(isIsoDate(entry.retrievedAt) && entry.retrievedAt <= "2026-08-26", `${entry.id} retrievedAt`);
    assert.ok(isIsoDate(entry.nextCheckAt) && entry.nextCheckAt > entry.checkedAt, `${entry.id} nextCheckAt`);
    assert.ok(["candidates-found", "verified-none", "failed-access", "pending"].includes(entry.outcome), `${entry.id} outcome`);
    assert.ok(nonEmptyString(entry.retrievalNote), `${entry.id} retrievalNote`);
    if (entry.outcome === "failed-access") {
      assert.match(entry.retrievalNote, /fail|unreachable|timeout|blocked|error/i, `${entry.id} failed-access note`);
    }
  }
});

test("every publishable route has current existence and intake evidence", async () => {
  const qa = await runHpV2Qa(await loadBaselineWorkbench(), { asOf: "2026-08-26" });

  assertNoGateDebt(qa, "MISSING_EXISTENCE", "MISSING_INTAKE", "STALE_OPEN_STATUS");
});

test("hard claims require primary-operative evidence", async () => {
  const qa = await runHpV2Qa(await loadBaselineWorkbench(), { asOf: "2026-08-26" });

  assertNoGateDebt(qa, "EVIDENCE_HARD_CLAIM");
});

test("required coverage cells and mapping reviews are complete", async () => {
  const qa = await runHpV2Qa(await loadBaselineWorkbench(), { asOf: "2026-08-26" });

  assertNoGateDebt(qa, "COVERAGE_UNEXAMINED", "MAPPING_UNREVIEWED", "ORPHAN_SCHEME");
});

test("QA reports unresolved research debt with stable baseline references", async () => {
  const qa = await runHpV2Qa({
    baseline: {
      sheets: [{
        name: "Scheme Master",
        rows: [{
          values: ["SCH-TEST", "Test route", "", "", "", "Open now"],
          provenance: { sheet: "Scheme Master", row: 42 }
        }]
      }, {
        name: "Sector-Scheme Map",
        rows: []
      }]
    },
    claims: {
      claims: [{
        id: "CLAIM-SCHEME-MASTER-R42-EXISTENCE",
        subjectId: "SCH-TEST",
        field: "existence",
        value: "active",
        sourceIds: ["SOURCE-TEST"],
        locator: "baseline",
        verifiedAt: "2026-08-23",
        effectiveFrom: null,
        effectiveTo: null,
        evidenceGrade: "primary-summary",
        confidence: "low",
        baseline: { sheet: "Scheme Master", row: 42 }
      }, {
        id: "CLAIM-SCHEME-MASTER-R42-KEY-BENEFIT",
        subjectId: "SCH-TEST",
        field: "keyBenefit",
        value: "50% support",
        sourceIds: ["SOURCE-TEST"],
        locator: "baseline",
        verifiedAt: "2026-08-23",
        effectiveFrom: null,
        effectiveTo: null,
        evidenceGrade: "primary-summary",
        confidence: "low",
        baseline: { sheet: "Scheme Master", row: 42 }
      }],
      statuses: [{
        id: "STATUS-SCHEME-MASTER-R42",
        subjectId: "SCH-TEST",
        existence: "active",
        intake: "open",
        budget: "available",
        sourceIds: ["SOURCE-TEST"],
        verifiedAt: "2026-08-23",
        validFrom: null,
        validTo: null,
        nextCheckAt: null,
        confidence: "low",
        baseline: { sheet: "Scheme Master", row: 42 }
      }]
    },
    sources: { sources: [{ id: "SOURCE-TEST" }] },
    coverage: {
      coverage: [{
        id: "COVERAGE-COVERAGE-AUDIT-R2",
        required: true,
        outcome: "verified-applicable",
        baseline: { sheet: "Coverage Audit", row: 2 }
      }]
    },
    mappingReview: {
      reviews: [{
        id: "MAPPING-REVIEW-SECTOR-SCHEME-MAP-R2",
        disposition: "unreviewed",
        baseline: { sheet: "Sector-Scheme Map", row: 2 }
      }],
      orphanSchemes: [{
        schemeId: "SCH-TEST",
        baseline: { sheet: "Scheme Master", row: 42 }
      }]
    }
  }, { asOf: "2026-08-25" });

  assert.deepEqual(
    qa.errors.map(({ code, baseline }) => ({ code, baseline })),
    [
      { code: "COVERAGE_UNEXAMINED", baseline: { sheet: "Coverage Audit", row: 2 } },
      { code: "EVIDENCE_HARD_CLAIM", baseline: { sheet: "Scheme Master", row: 42 } },
      { code: "ORPHAN_SCHEME", baseline: { sheet: "Scheme Master", row: 42 } },
      { code: "STALE_OPEN_STATUS", baseline: { sheet: "Scheme Master", row: 42 } },
      { code: "MAPPING_UNREVIEWED", baseline: { sheet: "Sector-Scheme Map", row: 2 } }
    ]
  );
  assert.equal(qa.byCodes("STALE_OPEN_STATUS")[0].subjectId, "SCH-TEST");
});

test("validator rejects unparseable verification dates instead of treating them as current evidence", async () => {
  const qa = await runHpV2Qa({
    baseline: {
      sheets: [{
        name: "Scheme Master",
        rows: [{
          values: ["SCH-INVALID-DATE", "Invalid date route", "", "", "", "Active - bank or continuous route"],
          provenance: { sheet: "Scheme Master", row: 42 }
        }]
      }]
    },
    claims: {
      claims: [{
        id: "CLAIM-SCHEME-MASTER-R42-EXISTENCE",
        subjectId: "SCH-INVALID-DATE",
        field: "existence",
        value: "active",
        sourceIds: ["SOURCE-TEST"],
        locator: "baseline",
        verifiedAt: "2026-00-00",
        effectiveFrom: null,
        effectiveTo: null,
        evidenceGrade: "primary-summary",
        confidence: "low",
        baseline: { sheet: "Scheme Master", row: 42 }
      }],
      statuses: [{
        id: "STATUS-SCHEME-MASTER-R42",
        subjectId: "SCH-INVALID-DATE",
        existence: "active",
        intake: "continuous",
        budget: "available",
        sourceIds: ["SOURCE-TEST"],
        verifiedAt: "2026-00-00",
        validFrom: null,
        validTo: null,
        nextCheckAt: null,
        confidence: "low",
        baseline: { sheet: "Scheme Master", row: 42 }
      }]
    },
    sources: { sources: [{ id: "SOURCE-TEST" }] },
    coverage: { coverage: [] },
    mappingReview: { reviews: [], orphanSchemes: [] }
  }, { asOf: "2026-08-25" });

  assert.deepEqual(
    qa.errors.map(({ code, baseline }) => ({ code, baseline })),
    [
      { code: "MISSING_EXISTENCE", baseline: { sheet: "Scheme Master", row: 42 } },
      { code: "MISSING_INTAKE", baseline: { sheet: "Scheme Master", row: 42 } }
    ]
  );
});

test("validator rejects an unparseable open-status recheck date", async () => {
  const qa = await runHpV2Qa({
    baseline: {
      sheets: [{
        name: "Scheme Master",
        rows: [{
          values: ["SCH-INVALID-RECHECK", "Invalid recheck route", "", "", "", "Open now"],
          provenance: { sheet: "Scheme Master", row: 43 }
        }]
      }]
    },
    claims: {
      claims: [{
        id: "CLAIM-SCHEME-MASTER-R43-EXISTENCE",
        subjectId: "SCH-INVALID-RECHECK",
        field: "existence",
        value: "active",
        sourceIds: ["SOURCE-TEST"],
        locator: "baseline",
        verifiedAt: "2026-08-23",
        effectiveFrom: null,
        effectiveTo: null,
        evidenceGrade: "primary-summary",
        confidence: "low",
        baseline: { sheet: "Scheme Master", row: 43 }
      }],
      statuses: [{
        id: "STATUS-SCHEME-MASTER-R43",
        subjectId: "SCH-INVALID-RECHECK",
        existence: "active",
        intake: "open",
        budget: "available",
        sourceIds: ["SOURCE-TEST"],
        verifiedAt: "2026-08-23",
        validFrom: null,
        validTo: null,
        nextCheckAt: "2026-99-99",
        confidence: "low",
        baseline: { sheet: "Scheme Master", row: 43 }
      }]
    },
    sources: { sources: [{ id: "SOURCE-TEST" }] },
    coverage: { coverage: [] },
    mappingReview: { reviews: [], orphanSchemes: [] }
  }, { asOf: "2026-08-25" });

  assert.deepEqual(
    qa.errors.map(({ code, baseline }) => ({ code, baseline })),
    [{ code: "STALE_OPEN_STATUS", baseline: { sheet: "Scheme Master", row: 43 } }]
  );
});

test("existence requires an active claim with current effective evidence from resolvable sources", async () => {
  const cases = [
    { name: "inactive", claim: { value: "withdrawn" } },
    { name: "dangling-source", claim: { sourceIds: ["SOURCE-MISSING"] } },
    { name: "future-evidence", claim: { verifiedAt: "2026-08-26" } },
    { name: "expired-evidence", claim: { effectiveTo: "2026-08-24" } }
  ];

  for (const { name, claim } of cases) {
    const qa = await runHpV2Qa(completeRouteWorkbench({ schemeId: `SCH-EXISTENCE-${name}`, claim }), { asOf: "2026-08-25" });
    assert.equal(qa.byCodes("MISSING_EXISTENCE").length, 1, name);
  }
});

test("intake requires active, currently effective, publishable status evidence from resolvable sources", async () => {
  const cases = [
    { name: "inactive", status: { existence: "superseded" } },
    { name: "closed", status: { intake: "closed" } },
    { name: "arbitrary", status: { intake: "anything" } },
    { name: "dangling-source", status: { sourceIds: ["SOURCE-MISSING"] } },
    { name: "future-evidence", status: { verifiedAt: "2026-08-26" } },
    { name: "expired-evidence", status: { validTo: "2026-08-24" } }
  ];

  for (const { name, status } of cases) {
    const qa = await runHpV2Qa(completeRouteWorkbench({ schemeId: `SCH-INTAKE-${name}`, status }), { asOf: "2026-08-25" });
    assert.equal(qa.byCodes("MISSING_INTAKE").length, 1, name);
  }
});

test("current scheduled and allocation-dependent intake evidence is publishable without claiming open intake", async () => {
  for (const intake of ["scheduled", "allocation-dependent"]) {
    const qa = await runHpV2Qa(completeRouteWorkbench({
      schemeId: `SCH-INTAKE-${intake}`,
      status: { intake }
    }), { asOf: "2026-08-25" });
    assert.equal(qa.byCodes("MISSING_INTAKE").length, 0, intake);
  }
});

test("status rejects an invalid budget facet without conflating it with intake", async () => {
  const qa = await runHpV2Qa(completeRouteWorkbench({
    status: { budget: "made-up-budget" }
  }), { asOf: "2026-08-25" });

  assert.equal(qa.byCodes("MISSING_INTAKE").length, 0);
  assert.equal(qa.byCodes("INVALID_BUDGET_STATUS").length, 1);
});

test("hard claims require current primary-operative evidence from resolvable sources", async () => {
  const cases = [
    { name: "dangling-source", claim: { sourceIds: ["SOURCE-MISSING"] } },
    { name: "future-evidence", claim: { verifiedAt: "2026-08-26" } },
    { name: "expired-evidence", claim: { effectiveTo: "2026-08-24" } }
  ];

  for (const { name, claim } of cases) {
    const workbench = completeRouteWorkbench({ schemeId: `SCH-HARD-${name}` });
    workbench.claims.claims.push({
      id: `CLAIM-SCH-HARD-${name}-BENEFIT`,
      subjectId: `SCH-HARD-${name}`,
      field: "keyBenefit",
      value: "50% support",
      sourceIds: ["SOURCE-TEST"],
      locator: "baseline",
      verifiedAt: "2026-08-23",
      effectiveFrom: null,
      effectiveTo: null,
      evidenceGrade: "primary-operative",
      confidence: "high",
      baseline: { sheet: "Scheme Master", row: 42 },
      ...claim
    });
    const qa = await runHpV2Qa(workbench, { asOf: "2026-08-25" });
    assert.equal(qa.byCodes("EVIDENCE_HARD_CLAIM").length, 1, name);
  }
});

test("unsupported hard claims may be retained only as explicitly limited indicative text", async () => {
  const workbench = completeRouteWorkbench({ schemeId: "SCH-INDICATIVE" });
  workbench.claims.claims.push({
    id: "CLAIM-SCH-INDICATIVE-BENEFIT",
    subjectId: "SCH-INDICATIVE",
    field: "keyBenefit",
    value: "Legacy workbook summary",
    sourceIds: ["SOURCE-TEST"],
    locator: "legacy summary",
    verifiedAt: "2026-08-23",
    effectiveFrom: null,
    effectiveTo: null,
    evidenceGrade: "primary-summary",
    confidence: "low",
    publicationTreatment: "indicative-only",
    limitation: "Operative entitlement source is not yet located.",
    baseline: { sheet: "Scheme Master", row: 42 }
  });
  const qa = await runHpV2Qa(workbench, { asOf: "2026-08-25" });
  assert.equal(qa.byCodes("EVIDENCE_HARD_CLAIM", "INDICATIVE_CLAIM_WITHOUT_LIMITATION").length, 0);

  workbench.claims.claims.at(-1).limitation = "";
  const invalid = await runHpV2Qa(workbench, { asOf: "2026-08-25" });
  assert.equal(invalid.byCodes("INDICATIVE_CLAIM_WITHOUT_LIMITATION").length, 1);
});

test("coverage and mapping reviews retain debt for invalid outcomes, dimensions, and dispositions", async () => {
  const qa = await runHpV2Qa(completeRouteWorkbench({
    coverage: [{
      id: "COVERAGE-COVERAGE-AUDIT-R2",
      required: true,
      outcome: "made-up-outcome",
      agency: "Industries",
      sectorId: "SEC-TEST",
      beneficiary: "MSME",
      enterpriseStage: "new",
      supportType: "grant",
      sourceIds: ["SOURCE-TEST"],
      verifiedAt: "2026-08-23",
      baseline: { sheet: "Coverage Audit", row: 2 }
    }, {
      id: "COVERAGE-COVERAGE-AUDIT-R3",
      required: true,
      outcome: "verified-applicable",
      agency: "",
      sectorId: "SEC-TEST",
      beneficiary: "MSME",
      enterpriseStage: "new",
      supportType: "grant",
      sourceIds: ["SOURCE-TEST"],
      verifiedAt: "2026-08-23",
      baseline: { sheet: "Coverage Audit", row: 3 }
    }],
    reviews: [{
      id: "MAPPING-REVIEW-SECTOR-SCHEME-MAP-R2",
      sectorId: "SEC-TEST",
      schemeId: "SCH-TEST",
      disposition: "made-up-disposition",
      sourceIds: ["SOURCE-TEST"],
      verifiedAt: "2026-08-23",
      baseline: { sheet: "Sector-Scheme Map", row: 2 }
    }, {
      id: "MAPPING-REVIEW-SECTOR-SCHEME-MAP-R3",
      sectorId: "SEC-TEST",
      schemeId: "SCH-TEST",
      sourceIds: ["SOURCE-TEST"],
      verifiedAt: "2026-08-23",
      baseline: { sheet: "Sector-Scheme Map", row: 3 }
    }]
  }), { asOf: "2026-08-25" });

  assert.equal(qa.byCodes("COVERAGE_UNEXAMINED").length, 2);
  assert.equal(qa.byCodes("MAPPING_UNREVIEWED").length, 2);
});

function completeRouteWorkbench({ schemeId = "SCH-TEST", claim = {}, status = {}, coverage = [], reviews = [] } = {}) {
  return {
    baseline: {
      sheets: [{
        name: "Scheme Master",
        rows: [{
          values: [schemeId, "Test route", "", "", "", "Open now"],
          provenance: { sheet: "Scheme Master", row: 42 }
        }]
      }]
    },
    claims: {
      claims: [{
        id: `CLAIM-${schemeId}-EXISTENCE`,
        subjectId: schemeId,
        field: "existence",
        value: "active",
        sourceIds: ["SOURCE-TEST"],
        locator: "baseline",
        verifiedAt: "2026-08-23",
        effectiveFrom: null,
        effectiveTo: null,
        evidenceGrade: "primary-summary",
        confidence: "low",
        baseline: { sheet: "Scheme Master", row: 42 },
        ...claim
      }],
      statuses: [{
        id: `STATUS-${schemeId}`,
        subjectId: schemeId,
        existence: "active",
        intake: "continuous",
        budget: "available",
        sourceIds: ["SOURCE-TEST"],
        verifiedAt: "2026-08-23",
        validFrom: null,
        validTo: null,
        nextCheckAt: null,
        confidence: "low",
        baseline: { sheet: "Scheme Master", row: 42 },
        ...status
      }]
    },
    sources: { sources: [{ id: "SOURCE-TEST" }] },
    coverage: { coverage },
    mappingReview: { reviews, orphanSchemes: [] }
  };
}

function assertNoGateDebt(qa, ...codes) {
  const errors = qa.byCodes(...codes);
  const counts = Object.fromEntries(codes.map((code) => [
    code,
    errors.filter((error) => error.code === code).length
  ]));
  const samples = errors.slice(0, 3).map(({ code, subjectId, baseline }) => ({ code, subjectId, baseline }));
  assert.equal(errors.length, 0, `Unresolved research debt: ${JSON.stringify({ counts, samples })}`);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
