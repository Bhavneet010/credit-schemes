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
    coverage: { coverage: [] },
    mappingReview: { reviews: [], orphanSchemes: [] }
  }, { asOf: "2026-08-25" });

  assert.deepEqual(
    qa.errors.map(({ code, baseline }) => ({ code, baseline })),
    [{ code: "STALE_OPEN_STATUS", baseline: { sheet: "Scheme Master", row: 43 } }]
  );
});

function assertNoGateDebt(qa, ...codes) {
  const errors = qa.byCodes(...codes);
  const counts = Object.fromEntries(codes.map((code) => [
    code,
    errors.filter((error) => error.code === code).length
  ]));
  const samples = errors.slice(0, 3).map(({ code, subjectId, baseline }) => ({ code, subjectId, baseline }));
  assert.equal(errors.length, 0, `Unresolved research debt: ${JSON.stringify({ counts, samples })}`);
}
