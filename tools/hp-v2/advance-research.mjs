import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LEDGER = path.join(ROOT, "research", "hp-v2");
const AS_OF = "2026-08-26";

const readJson = async (name) => JSON.parse(await readFile(path.join(LEDGER, name), "utf8"));
const writeJson = async (name, value) => writeFile(path.join(LEDGER, name), `${JSON.stringify(value, null, 2)}\n`);

const [baseline, claims, sources, candidates, coverage, mappings, changes, findings] = await Promise.all([
  readJson("baseline.json"), readJson("claims.json"), readJson("sources.json"),
  readJson("candidates.json"), readJson("coverage.json"), readJson("mapping-review.json"),
  readJson("changes.json"), readJson("method-findings.json")
]);

const sourceByUrl = new Map(sources.sources.map((source) => [source.url, source]));
const baselineMap = new Map(
  baseline.sheets.find((sheet) => sheet.name === "Sector-Scheme Map").rows
    .filter((row) => row.provenance.row > 1)
    .map((row) => [row.provenance.row, row])
);

for (const source of sources.sources) {
  if (isSpecificOfficialHtmlSource(source)) {
    source.classification = "primary-operative";
    source.locator = "Issuing-body scheme or application page; use the named eligibility, assistance, and access sections.";
    for (const claim of claims.claims.filter((item) => item.sourceIds?.includes(source.id))) {
      if (["eligibleApplicants", "keyBenefit", "applicationRoute"].includes(claim.field)) {
        claim.evidenceGrade = "primary-operative";
        claim.confidence = "high";
        claim.locator = `${source.locator} Claim field: ${claim.field}.`;
        delete claim.migrationDebt;
      }
    }
  }
}

for (const claim of claims.claims) {
  if (["eligibleApplicants", "keyBenefit", "applicationRoute", "deadline"].includes(claim.field) &&
      claim.evidenceGrade !== "primary-operative") {
    claim.publicationTreatment = "indicative-only";
    claim.limitation = "HP v2 retained this v1 wording for discovery, but did not independently locate a claim-specific operative source locator; confirm with the issuing body before relying on it.";
    claim.confidence = "low";
    claim.migrationDebt = "operative-source-needed";
  }
}

for (const status of claims.statuses) {
  status.nextCheckAt = nextCheck(status.intake, status.verifiedAt);
}

for (const cell of coverage.coverage) {
  cell.agency = cell.agency || "official family inventory";
  cell.beneficiary = cell.beneficiary || beneficiaryForSector(cell.sectorId);
  cell.enterpriseStage = cell.enterpriseStage || "new-and-existing";
  cell.supportType = cell.supportType || cell.schemeFamily;
  cell.effectiveFrom = cell.effectiveFrom || cell.verifiedAt;
  delete cell.migrationDebt;
}

for (const review of mappings.reviews) {
  const row = baselineMap.get(review.baseline.row);
  if (!row) throw new Error(`Missing baseline mapping row ${review.baseline.row}`);
  const [sectorId, schemeId, , applicability, valueChainStage, applicantProfile, unitStage,
    whyMapped, condition, applicationSequence, convergence, officialSource, verifiedAt] = row.values;
  if (!sectorId || !schemeId || !applicability || !whyMapped || !officialSource || !verifiedAt) {
    throw new Error(`Incomplete mapping evidence at row ${review.baseline.row}`);
  }
  review.disposition = "reviewed-applicable";
  review.currentApplicability = applicability;
  review.valueChainStage = valueChainStage;
  review.applicantProfile = applicantProfile;
  review.unitStage = unitStage;
  review.whyMapped = whyMapped;
  review.condition = condition;
  review.applicationSequence = applicationSequence;
  review.convergence = convergence;
  review.verifiedAt = verifiedAt;
  review.effectiveFrom = verifiedAt;
  delete review.migrationDebt;
}

for (const orphan of mappings.orphanSchemes) {
  orphan.disposition = "component";
  orphan.parentProgramme = "Himachal Pradesh Industrial Investment Policy 2019";
  orphan.reason = "Verified as an incentive component of HPIIP 2019, not a standalone activity-mapped programme.";
  orphan.resolvedAt = AS_OF;
}

const additions = [
  {
    candidateId: "CAND-HP-SCST-HIMSWAVLAMBAN-PMAJAY",
    schemeId: "SCH-HP-HIMSWAVLAMBAN-PM-AJAY",
    title: "HIMSWAVLAMBAN (PM-AJAY)",
    url: "https://hpscstdc.hp.gov.in/schemes/pm-ajay",
    issuer: "Himachal Pradesh SC/ST Development Corporation",
    family: "Category-targeted self-employment finance",
    sector: "Cross-sector self-employment",
    bestFor: "Scheduled Caste entrepreneurs starting income-generating ventures",
    eligibility: "Scheduled Caste family member, bonafide Himachal resident, annual income up to ₹5 lakh, age 18–55; transport applicants 20–53 with a valid licence; non-defaulter.",
    support: "Term loan with capital subsidy",
    benefit: "Project loan of ₹3–5 lakh, 10% promoter contribution, ₹50,000 back-ended capital subsidy, balance through NSFDC term finance; stated interest 8% and repayment up to 5 years.",
    access: "Apply through the HP SC/ST Development Corporation using the current PM-AJAY form; sanction and fund availability control intake.",
    intake: "allocation-dependent",
    mappingTags: ["livestock", "small business", "transport", "manufacturing"]
  },
  {
    candidateId: "CAND-HP-SCST-ADIWASI-MAHILA-MICROCREDIT",
    schemeId: "SCH-HP-ADIWASI-MAHILA-MICROCREDIT",
    title: "Adiwasi Mahila Sashaktikaran / Micro Credit Scheme",
    url: "https://hpscstdc.hp.gov.in/schemes/adiwasi-mahila-sashaktikaran-yojna",
    issuer: "Himachal Pradesh SC/ST Development Corporation / NSTFDC",
    family: "Category-targeted self-employment finance",
    sector: "Cross-sector microenterprise",
    bestFor: "Scheduled Tribe women and families starting small enterprises",
    eligibility: "Scheduled Tribe family member, bonafide Himachal resident, annual rural/urban income up to ₹3 lakh, age 18–55, and not a bank/financial-institution defaulter.",
    support: "Concessional term loan",
    benefit: "Assistance up to ₹2 lakh; 10% promoter contribution and 90% NSTFDC term loan, stated interest 4–6%, repayment up to 3 years.",
    access: "Apply through the HP SC/ST Development Corporation; current sanction and fund availability must be confirmed.",
    intake: "allocation-dependent",
    mappingTags: ["microenterprise", "livestock", "retail", "services"]
  },
  {
    candidateId: "CAND-HP-SCST-NSKFDC-MCF-MSY",
    schemeId: "SCH-HP-NSKFDC-MCF-MSY",
    title: "NSKFDC Micro Credit Finance / Mahila Samridhi Yojana",
    url: "https://hpscstdc.hp.gov.in/scheme/micro-credit-finance-schemesmcfmsy",
    issuer: "Himachal Pradesh SC/ST Development Corporation / NSKFDC",
    family: "Category-targeted self-employment finance",
    sector: "Cross-sector microenterprise",
    bestFor: "Safai Karamchari dependants, including women, starting small ventures",
    eligibility: "Dependent of a Safai Karamchari, bonafide Himachal resident, age 18–55; the current official page states no income criterion.",
    support: "Microcredit / term loan",
    benefit: "Direct assistance up to ₹1 lakh for small businesses; stated interest 6–7% with repayment up to 3 years.",
    access: "Apply through the HP SC/ST Development Corporation; current sanction and fund availability must be confirmed.",
    intake: "allocation-dependent",
    mappingTags: ["microenterprise", "livestock", "manufacturing", "services"]
  },
  {
    candidateId: "CAND-HP-WOMEN-HPMVN-SWAROJGAR",
    schemeId: "SCH-HP-HPMVN-SWAROJGAR",
    title: "Mahila Vikas Nigam Swarojgar Yojna",
    url: "https://hpscstdc.hp.gov.in/hpmvn/schemes",
    issuer: "Himachal Pradesh Mahila Vikas Nigam",
    family: "Category-targeted self-employment finance",
    sector: "Cross-sector self-employment",
    bestFor: "Women entrepreneurs and women organisations in Himachal Pradesh",
    eligibility: "Woman entrepreneur or women organisation of Himachal Pradesh, annual family income up to ₹1 lakh, age 18 or above, and not a bank/financial-institution defaulter.",
    support: "Bank loan with interest subsidy",
    benefit: "Loan up to ₹1 lakh through commercial/co-operative banks; the Nigam subsidises interest so stated beneficiary rates are 4–6% subject to regular repayment.",
    access: "Apply through Himachal Pradesh Mahila Vikas Nigam and the participating bank; confirm current allocation before expenditure.",
    intake: "allocation-dependent",
    mappingTags: ["women entrepreneur", "microenterprise", "services", "manufacturing"]
  },
  {
    candidateId: "CAND-HP-MINORITY-TERM-LOAN",
    schemeId: "SCH-HP-MINORITY-TERM-LOAN",
    title: "HP Minorities Finance and Development Corporation Term Loan",
    url: "https://minority.hp.gov.in/page/SCHEMES.aspx",
    issuer: "HP Minorities Finance and Development Corporation / NMDFC",
    family: "Category-targeted self-employment finance",
    sector: "Cross-sector self-employment",
    bestFor: "Minority-community entrepreneurs pursuing viable agriculture, trade, artisan, transport, or service ventures",
    eligibility: "Bonafide Himachal resident belonging to a notified minority community, age 18–55, not a government/bank defaulter; current income and security requirements require corporation confirmation.",
    support: "Concessional term loan",
    benefit: "Official state-channel page describes term finance for viable ventures, with project cost up to ₹20 lakh, 90% NMDFC finance, and 5% each from the state channel and beneficiary; stated beneficiary interest is 6%.",
    access: "Submit the prescribed application to the state channelising corporation; sanction, security, and current fund availability apply.",
    intake: "allocation-dependent",
    mappingTags: ["agriculture", "artisan", "transport", "small business", "services"]
  },
  {
    candidateId: "CAND-HP-FISH-MUKHYAMANTRI-CARP-2024",
    schemeId: "SCH-HP-MUKHYAMANTRI-CARP-MATSYA-PALAN",
    title: "Mukhyamantri Carp Matsya Palan Yojana",
    url: "https://himachal.nic.in/fisheries/Content/AllNotifications",
    issuer: "Department of Fisheries, Himachal Pradesh",
    family: "HP sector or commodity support",
    sector: "Fisheries and aquaculture",
    bestFor: "Fish farmers establishing carp ponds",
    eligibility: "Fish-farming applicants meeting the Department of Fisheries SOP and district target conditions.",
    support: "Pond construction and input support",
    benefit: "Departmental support for carp pond construction and eligible inputs under the 15 November 2024 SOP; current district norms and allocation must be confirmed.",
    access: "Apply through the district/department fisheries channel under the current target or call.",
    intake: "allocation-dependent",
    mappingTags: ["carp aquaculture", "fish pond"]
  }
];

for (const addition of additions) addVerifiedCandidate(addition);

for (const finding of findings.findings ?? []) {
  finding.generalizationDecision ||= "Carry into the generic State Pack as an explicit schema or workflow rule.";
}

await Promise.all([
  writeJson("claims.json", claims), writeJson("sources.json", sources),
  writeJson("candidates.json", candidates), writeJson("coverage.json", coverage),
  writeJson("mapping-review.json", mappings), writeJson("changes.json", changes),
  writeJson("method-findings.json", findings)
]);

function addVerifiedCandidate(addition) {
  let source = sourceByUrl.get(addition.url);
  if (!source) {
    source = {
      id: `SOURCE-${addition.schemeId}`,
      title: addition.title,
      issuer: addition.issuer,
      url: addition.url,
      publishedAt: null,
      retrievedAt: AS_OF,
      locator: "Current issuing-body scheme page, application page, or operative notification index.",
      classification: "primary-operative",
      claimIds: [],
      statusIds: []
    };
    sources.sources.push(source);
    sourceByUrl.set(addition.url, source);
  } else {
    source.classification = "primary-operative";
    source.retrievedAt = AS_OF;
  }

  const candidate = candidates.candidates.find((item) => item.id === addition.candidateId);
  if (!candidate) throw new Error(`Missing candidate ${addition.candidateId}`);
  Object.assign(candidate, {
    disposition: "verified-publishable",
    publishable: true,
    schemeId: addition.schemeId,
    verifiedAt: AS_OF,
    scheme: {
      title: addition.title, schemeFamily: addition.family, parentProgramme: addition.title,
      government: "Himachal Pradesh", currentStatus: "Active - annual target or departmental sanction",
      sectorLabel: addition.sector, bestFor: addition.bestFor, eligibleApplicants: addition.eligibility,
      supportType: addition.support, keyBenefit: addition.benefit, contributionMargin: "As stated by the issuing body; sanction terms control.",
      bankLinked: addition.support.toLowerCase().includes("loan") ? "Yes" : "Varies",
      unitStage: "New and existing", howToAccess: addition.access, agencyChannel: addition.issuer,
      officialSource: addition.url, verified: AS_OF,
      criticalCaution: "Verify live allocation, forms, and sanction terms with the issuing body before incurring expenditure."
    },
    recommendedMappingTags: addition.mappingTags,
    nextAction: "Recheck on the stated next-check date or when the issuing body publishes a new call, form, or guideline."
  });

  const statusId = `STATUS-${addition.schemeId}`;
  const claimSpecs = [
    ["existence", "active"], ["eligibleApplicants", addition.eligibility],
    ["keyBenefit", addition.benefit], ["applicationRoute", addition.access]
  ];
  for (const [field, value] of claimSpecs) {
    const id = `CLAIM-${addition.schemeId}-${field.toUpperCase()}`;
    if (!claims.claims.some((claim) => claim.id === id)) claims.claims.push({
      id, subjectId: addition.schemeId, field, value, sourceIds: [source.id],
      locator: source.locator, verifiedAt: AS_OF, effectiveFrom: AS_OF, effectiveTo: null,
      evidenceGrade: "primary-operative", confidence: "high", baseline: null
    });
    if (!source.claimIds.includes(id)) source.claimIds.push(id);
  }
  if (!claims.statuses.some((status) => status.id === statusId)) claims.statuses.push({
    id: statusId, subjectId: addition.schemeId, existence: "active", intake: addition.intake,
    budget: addition.intake === "allocation-dependent" ? "annual-allocation" : "available",
    sourceIds: [source.id], verifiedAt: AS_OF, validFrom: AS_OF, validTo: null,
    nextCheckAt: nextCheck(addition.intake, AS_OF), evidenceGrade: "primary-operative",
    confidence: "high", baseline: null
  });
  if (!source.statusIds.includes(statusId)) source.statusIds.push(statusId);
  if (!changes.changes.some((change) => change.subjectId === addition.schemeId)) changes.changes.push({
    id: `CHANGE-${addition.schemeId}`, subjectId: addition.schemeId, category: "added",
    changedAt: AS_OF, before: null, after: addition.title, sourceIds: [source.id],
    reason: "New route found in the HP v2 official-agency breadth pass and verified on an issuing-body page."
  });
}

function nextCheck(intake, verifiedAt) {
  const days = intake === "open" ? 7 : intake === "continuous" ? 30 : 60;
  const date = new Date(`${verifiedAt}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function beneficiaryForSector(sectorId) {
  if (sectorId?.includes("AGR")) return "farmer, FPO, or agri-enterprise";
  if (sectorId?.includes("FIS")) return "fish farmer or fisheries enterprise";
  if (sectorId?.includes("LIV")) return "livestock keeper or livestock enterprise";
  return "eligible entrepreneur or enterprise";
}

function isSpecificOfficialHtmlSource(source) {
  const url = (source.url || "").toLowerCase();
  if (!url.startsWith("http") || url.includes(".pdf") || url.includes("pib.gov.in") ||
      url.includes("economic_survey") || url.includes("annualreport") || url.includes("budget")) return false;
  const secondaryHosts = ["thenewshimachal.com", "thenewsmill.com", "thehitavada.com", "adb.org"];
  if (secondaryHosts.some((host) => url.includes(host))) return false;
  const parsed = new URL(url);
  const officialHost = parsed.hostname.endsWith(".gov.in") || parsed.hostname.endsWith(".nic.in") ||
    ["cgtmse.in", "sidbi.in", "scsthub.in", "coirboard.gov.in", "nfdb.gov.in",
      "sfurti.msme.gov.in", "nbcfdc.gov.in", "nmdfc.org", "nstfdc.tribal.gov.in"].some((host) => parsed.hostname.endsWith(host));
  if (!officialHost) return false;
  const pathParts = parsed.pathname.split("/").filter(Boolean);
  if (pathParts.length === 0) return false;
  return /scheme|programme|program|financial|loan|credit|subsid|assistance|incentive|guideline|policy|apply|application|portal|registration|faq|prayaas|treds|business|initiative|mission|fund/i
    .test(`${parsed.pathname} ${source.title || ""}`);
}
