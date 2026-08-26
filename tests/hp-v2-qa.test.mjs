import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { loadHpV2Workbench, runHpV2Qa } from "../tools/hp-v2/lib/qa.mjs";

const root = path.resolve(import.meta.dirname, "..");

async function loadBaselineWorkbench() {
  return loadHpV2Workbench({ root });
}

test("every publishable route has current existence and intake evidence", async () => {
  const qa = await runHpV2Qa(await loadBaselineWorkbench(), { asOf: "2026-08-25" });

  assertNoGateDebt(qa, "MISSING_EXISTENCE", "MISSING_INTAKE", "STALE_OPEN_STATUS");
});

test("hard claims require primary-operative evidence", async () => {
  const qa = await runHpV2Qa(await loadBaselineWorkbench(), { asOf: "2026-08-25" });

  assertNoGateDebt(qa, "EVIDENCE_HARD_CLAIM");
});

test("required coverage cells and mapping reviews are complete", async () => {
  const qa = await runHpV2Qa(await loadBaselineWorkbench(), { asOf: "2026-08-25" });

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
    { name: "scheduled", status: { intake: "scheduled" } },
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
