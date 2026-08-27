import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const commonRoot = path.join(root, "scheme-data", "common");
const hpRoot = path.join(root, "scheme-data", "states", "himachal-pradesh");
const out = path.join(root, "scheme-data", "states", "punjab");
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (name, body) => fs.writeFileSync(path.join(out, name), `${JSON.stringify(body, null, 2)}\n`);
const cutoff = "2026-08-26";
const nextCheck = "2026-09-25";
fs.mkdirSync(out, { recursive: true });

const commonSchemes = read(path.join(commonRoot, "schemes.json")).schemes;
const commonSources = read(path.join(commonRoot, "sources.json")).sources;
const hpEvidence = read(path.join(hpRoot, "evidence.json"));
const hpSources = read(path.join(hpRoot, "sources.json")).sources;
const hpSectors = read(path.join(hpRoot, "sectors.json")).sectors;
const hpStatic = read(path.join(hpRoot, "manifest.json")).appStatic;

const sourceDefs = [
  ["SOURCE-PB-IBDP-2026", "Punjab Industrial and Business Development Policy 2026 — Gazette notification", "Department of Industries and Commerce, Punjab", "https://static.investindia.gov.in/s3fs-public/2026-03/punjab_industrial_policy_2026.pdf", "primary-operative", "Policy notification PIU/Industrial & Business Development Policy-2026/898 dated 8 March 2026."],
  ["SOURCE-PB-SECTOR-POLICIES-2026", "Punjab sectoral policies 2026", "Department of Industries and Commerce, Punjab", "https://static.investindia.gov.in/s3fs-public/2026-03/sectoral_policies_2026.pdf", "primary-operative", "Notified sector-policy compendium accompanying IBDP 2026."],
  ["SOURCE-PB-DSOG-2026", "Detailed Schemes and Operational Guidelines 2026 — Gazette scan", "Government of Punjab", "https://www.royalpatiala.in/wp-content/uploads/2026/03/Notification-no-916-dated-08-03-2026-regarding-DSOG-2026_watermark-2.pdf", "primary-operative", "Gazette content; accessed through a third-party mirror because a stable official direct file was not indexed."],
  ["SOURCE-PB-PSPCL-CC19-2026", "PSPCL Commercial Circular 19/2026 — electricity-duty treatment under IBDP 2026", "Punjab State Power Corporation Limited", "https://docs.pspcl.in/docs/cecommercial2620260327151710847.pdf", "primary-operative", "Implementation circular corroborating the electricity-duty route."],
  ["SOURCE-PB-AGRI-SUBSIDY-PORTAL", "Punjab Agriculture Subsidy Portal", "Department of Agriculture and Farmers Welfare, Punjab", "https://agrimachinerypb.com/", "primary-summary", "Live application portal for machinery and seasonal crop-support calls."],
  ["SOURCE-PB-AGRI-2026-27-NOTICE", "Applications invited under CRM, SMAM and CDP for 2026-27", "District Administration Ludhiana / Department of Agriculture", "https://ludhiana.nic.in/applications-invited-for-subsidy-on-agriculture-machinery-under-different-schemes-like-crm-smam-cdp-scheme-for-year-2026-27/", "primary-operative", "Current official district intake notice dated 20 April 2026."],
  ["SOURCE-PB-CRM-NORMS", "Crop-residue management machinery assistance architecture", "Press Information Bureau / Ministry of Agriculture", "https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1707021&lang=2&reg=48", "primary-operative", "Official assistance architecture; current Punjab intake remains controlled by the 2026-27 notice and portal."],
  ["SOURCE-PB-DSR-CAQM", "Punjab paddy-straw management action plan — direct-seeded rice incentive", "Commission for Air Quality Management", "https://caqm.nic.in/WriteReadData/LINKS/e2b2514a-e0b6-48c9-96c4-c1e62173af66.pdf", "primary-operative", "Official plan records the ₹1,500 per acre DSR incentive; annual verification remains necessary."],
  ["SOURCE-PB-DAIRY-HOME", "Dairy Development Department Punjab — schemes and 2026-27 training schedule", "Dairy Development Department, Punjab", "https://dairydevpunjab.in/", "primary-summary", "Current department portal."],
  ["SOURCE-PB-DAIRY-DD8", "DD-8 dairy-unit scheme — RTI manual", "Dairy Development Department, Punjab", "https://dairydevpunjab.in/skleinbkdfb25dfdhh/22112023233752RTI%20Manual%202023-24.pdf", "primary-operative", "Official manual contains scheme rules; live sanction and budget must be reconfirmed."],
  ["SOURCE-PB-DAIRY-2025-26", "Dairy Development Department RTI manual 2025-26", "Dairy Development Department, Punjab", "https://dairydevpunjab.in/skleinbkdfb25dfdhh/1962025234738RTI_Manual_2025-26.pdf", "primary-summary", "Confirms training, loan sponsorship and subsidy remittance functions."],
  ["SOURCE-PB-DAIRY-SERVICES", "Services for farmers", "Dairy Development Department, Punjab", "https://dairydevpunjab.in/services-for-farmers", "primary-summary", "Lists training, institutional finance and silage-baler assistance."],
  ["SOURCE-PB-PEDA-KUSUM", "PM-KUSUM status in Punjab", "Punjab Energy Development Agency", "https://www.peda.gov.in/pm-kusum.php", "primary-operative", "Records Punjab component terms, historic/current work and closure of PM-KUSUM 1.0 pending 2.0 allocation."],
  ["SOURCE-PB-PEDA-RIF", "Revolving Investment Fund scheme", "Punjab Energy Development Agency", "https://www.peda.gov.in/ec/revolving-investment-fund.php", "primary-operative", "Official energy-efficiency finance terms."],
  ["SOURCE-PB-PEDA-ROOFTOP", "Punjab rooftop-solar arrangements", "Punjab Energy Development Agency", "https://www.peda.gov.in/roof-top-solar-power-projects.php", "primary-operative", "Official page reflects PSERC regulations and 11 April 2026 amendments."],
  ["SOURCE-PB-SCFC", "Punjab Scheduled Castes Land Development and Finance Corporation", "National Portal of India / Government of Punjab", "https://www.india.gov.in/category/benefits-social-development/subcategory/minorities-castes-tribes/details/punjab-scheduled-castes-land-development-and-finance-corporation", "primary-summary", "Official-government summary reviewed in August 2026; sanction-specific financial terms were not exposed."],
  ["SOURCE-PB-WELFARE", "Department of Social Justice, Empowerment and Minorities", "Government of Punjab", "https://punjab.gov.in/government/departments/department-of-welfare-of-scs-bcs/", "primary-summary", "Official department and corporation routing surface."],
  ["SOURCE-PB-NRLM-2026", "DAY-NRLM 2026-27 Punjab allocation and expenditure", "Press Information Bureau / Ministry of Rural Development", "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2287316&lang=1&reg=1", "primary-operative", "Official July 2026 state-wise allocation confirms current Punjab implementation."],
  ["SOURCE-PB-DEPARTMENTS", "Punjab government department directory", "Government of Punjab", "https://punjab.gov.in/government/departments/", "primary-summary", "Official discovery and routing index."],
  ["SOURCE-PB-HORTICULTURE", "Department of Horticulture", "Government of Punjab", "https://punjab.gov.in/government/departments/department-of-horticulture/", "primary-summary", "Current official department surface; detailed 2026-27 component sanctions were not exposed."],
  ["SOURCE-PB-AHDF", "Animal Husbandry, Dairy Development and Fisheries Department", "Government of Punjab", "https://punjab.gov.in/government/departments/department-of-animal-husbandry-dairy-development-and-fisheries/", "primary-summary", "Current official department route."],
  ["SOURCE-PB-COOPERATION", "Department of Cooperation", "Government of Punjab", "https://punjab.gov.in/government/departments/department-of-cooperation/", "primary-summary", "Current official department route."],
  ["SOURCE-PB-PEDA", "About PEDA and programme surface", "Punjab Energy Development Agency", "https://www.peda.gov.in/about-peda.php", "primary-summary", "Official agency remit and programme surface."],
  ["SOURCE-PB-SINGLE-WINDOW", "Punjab single-window business portal", "Department of Industries and Commerce, Punjab", "https://pbindustries.gov.in/", "primary-summary", "State application and facilitation route; live service availability controls filing."],
];
const stateSources = sourceDefs.map(([id,title,issuer,url,classification,locator]) => ({ id, title, issuer, url, classification, locator, publishedAt: null, retrievedAt: cutoff, claimIds: [], statusIds: [] }));
const sourceById = new Map(stateSources.map(s => [s.id, s]));

const families = {
  industry: "Industrial investment and enterprise incentives", agriculture: "Agriculture and mechanisation",
  dairy: "Dairy and livestock enterprise support", energy: "Renewable energy and efficiency",
  social: "Targeted livelihood and social finance", horticulture: "Horticulture development"
};
const base = (id, name, sourceId, family, support, benefit, eligible, access, caution, status="Active — policy route; portal and sanction conditions apply") => ({
  id, name, aliases: [], issuerType: "state", familyId: `FAMILY-PB-${family.toUpperCase()}`,
  sourceId, support, claimIds: [], legacy: { id, name, gov: "Punjab", family: families[family], label: support,
    support, benefit, eligible, access, agency: family === "industry" ? "Department of Industries and Commerce / Invest Punjab / DIC" : "Relevant Punjab line department",
    bank: benefit.toLowerCase().includes("loan") ? "Yes" : "May be", margin: "Applicant contribution, non-admissible cost and lender terms apply.",
    bestFor: eligible, status, caution, src: sourceById.get(sourceId)?.url ?? "", stage: "New and existing", parent: "", reach: 80,
    evidence: { treatment: "operative", verified: cutoff, unresolvedClaimCount: 0 } }
});

const schemes = [
  base("SCH-PB-IBDP26-CAPITAL", "IBDP 2026 — capital investment subsidy", "SOURCE-PB-IBDP-2026", "industry", "Capital subsidy", "Up to 20% of eligible fixed capital investment, capped at ₹10 crore, within the policy's annual and cumulative ceilings.", "Eligible new industrial units and qualifying expansion projects under IBDP 2026", "File a common application form on the Punjab business portal and proceed through Invest Punjab/DIC before claiming incentives.", "Classification, negative list, location, fixed-capital eligibility and annual capping determine the sanction."),
  base("SCH-PB-IBDP26-MODERNISATION", "IBDP 2026 — modernisation capital subsidy", "SOURCE-PB-IBDP-2026", "industry", "Modernisation subsidy", "20% of eligible plant and machinery investment, capped at ₹10 crore, payable in ten annual instalments; available once in five years subject to the policy.", "Eligible existing industrial units undertaking modernisation", "Apply through the Punjab business portal before undertaking the claimed modernisation.", "Only eligible modernisation expenditure is counted; approval and annual instalment conditions apply."),
  base("SCH-PB-IBDP26-SGST", "IBDP 2026 — net SGST reimbursement", "SOURCE-PB-IBDP-2026", "industry", "Tax reimbursement", "Reimbursement of 75% of eligible net SGST for the chosen eligibility period, within annual and overall incentive ceilings; expansion is assessed on incremental sales.", "Eligible new units and qualifying expansions", "Apply and submit tax evidence through Invest Punjab/DIC under the DSOG.", "This is reimbursement after eligible tax payment, not an upfront exemption."),
  base("SCH-PB-IBDP26-DUTIES", "IBDP 2026 — stamp-duty and electricity-duty support", "SOURCE-PB-PSPCL-CC19-2026", "industry", "Duty exemption or reimbursement", "100% eligible stamp-duty exemption/reimbursement and 100% electricity-duty exemption over the applicable eligibility period, subject to policy and DSOG conditions.", "Eligible new units and qualifying expansions", "Use the Punjab business portal; stamp-duty exemption may require security and reimbursement follows the prescribed milestones.", "Electricity-duty relief does not automatically cover IDF or social-security levies."),
  base("SCH-PB-IBDP26-EMPLOYMENT", "IBDP 2026 — employment generation subsidy", "SOURCE-PB-IBDP-2026", "industry", "Employment subsidy", "For five years: ₹3,000 per month for eligible male Punjab-resident employees and ₹4,000 per month for eligible female, SC, OBC/BC or PwD employees.", "Eligible units with at least ₹25 crore fixed capital investment and at least 50 direct Punjab-resident jobs", "Claim through Invest Punjab/DIC with payroll, residence and PF/ESI evidence.", "Sector-policy rates prevail where specified; headcount and payroll evidence are audited."),
  base("SCH-PB-IBDP26-MSME", "IBDP 2026 — MSME competitiveness assistance basket", "SOURCE-PB-DSOG-2026", "industry", "Quality, market and finance assistance", "Application-based assistance for eligible freight, market development, CGTMSE guarantee fee, listing/technology adoption, ZED, audits, patents, certifications and digital marketing under the DSOG.", "Eligible Punjab micro, small and medium enterprises", "Select the relevant component and file supporting expenditure and approval records through DIC/Invest Punjab.", "Each component has separate ceilings and documentation; assistance is not a single automatic grant."),
  base("SCH-PB-IBDP26-GREEN", "IBDP 2026 — environmental technology, testing and ZLD support", "SOURCE-PB-IBDP-2026", "industry", "Environmental capital assistance", "Policy-based capital assistance for eligible R&D/testing facilities, zero-liquid-discharge and specified environmental upgrades, within component and overall ceilings.", "Eligible industrial units investing in notified environmental systems", "Seek eligibility approval through Invest Punjab/DIC and pollution-control authorities before expenditure.", "Technical admissibility and consent requirements must be verified component by component."),
  base("SCH-PB-IBDP26-STRAW-BOILER", "IBDP 2026 — paddy-straw boiler capital subsidy", "SOURCE-PB-IBDP-2026", "industry", "Clean-technology capital subsidy", "New/expansion units: lower of 50% cost or ₹1 crore per 8 TPH, up to ₹5 crore; higher ceilings apply to specified conversions by existing units.", "Eligible Punjab industrial units installing or converting to paddy-straw boilers", "Apply through Invest Punjab/DIC with technical design, fuel linkage and pollution approvals.", "Separate norms apply to new installation, fuel switching and upgrading; sanction before purchase is essential."),
  base("SCH-PB-STARTUP26", "Punjab Startup Policy 2026 — seed and growth support", "SOURCE-PB-SECTOR-POLICIES-2026", "industry", "Startup grant and operating support", "Seed grant up to ₹5 lakh and a second-stage tranche up to ₹10 lakh, plus notified interest, lease-rental and stamp-duty support subject to approval.", "Punjab startups recognised by the Punjab Startup Coordination Committee", "Apply through Startup Punjab/Invest Punjab and the designated evaluation process.", "Recognition does not guarantee funding; committee appraisal, milestones and budget govern release."),
  base("SCH-PB-FOOD26", "Punjab Food Processing Policy 2026", "SOURCE-PB-SECTOR-POLICIES-2026", "industry", "Sector incentive package", "IBDP incentives plus sector provisions, including eligible exemption from mandi, market, RDF and specified state levies on raw material for five years.", "Eligible food-processing units in Punjab", "Apply through Invest Punjab/DIC and the food-processing nodal route.", "Product eligibility, raw-material sourcing, food licences and the policy negative list apply."),
  ...[
    ["ESDM", "ESDM and Semiconductor", "electronics, semiconductor and component manufacturing units"],
    ["EV", "Electric Vehicle Manufacturing", "EV, battery and eligible component manufacturers"],
    ["LOGISTICS", "Logistics and Warehousing", "eligible logistics, warehouse and cold-chain projects"],
    ["TOURISM", "Tourism and Hospitality", "eligible hotels, resorts and tourism projects"],
    ["FILM", "Film Promotion", "eligible film productions and film-infrastructure projects"],
    ["HEALTH", "Hospital and Medical College Investment", "eligible hospital and medical-college projects"],
    ["EDUCATION", "Higher Education Investment", "eligible higher-education projects"],
    ["RENEWABLE", "Renewable Energy", "eligible renewable-energy manufacturing and projects"],
    ["IT", "IT, ITeS, Data Centre and GCC", "eligible IT/ITeS, data-centre and global-capability-centre projects"],
    ["TEXTILE", "Textiles, Apparel, Spinning, Weaving, Dyeing and Finishing", "eligible textile and apparel units"],
    ["PHARMA", "Pharmaceuticals", "eligible pharmaceutical and medical-product units"],
    ["AUTO", "Automobile and Auto Components", "eligible automobile and component manufacturers"],
    ["BICYCLE", "Bicycle Manufacturing", "eligible bicycle and component manufacturers"],
    ["SPORTS", "Sports Goods", "eligible sports-goods manufacturers"],
    ["TOOLS", "Machine and Hand Tools", "eligible machine-tool and hand-tool manufacturers"],
    ["STEEL", "Steel and Rolling", "eligible steel and rolling units"],
    ["CHEMICAL", "Plastics and Chemicals", "eligible plastics and chemical units"],
    ["FURNITURE", "Furniture and Plywood", "eligible furniture and plywood units"],
  ].map(([code,label,eligible]) => base(`SCH-PB-SECTOR26-${code}`, `Punjab ${label} Policy 2026`, "SOURCE-PB-SECTOR-POLICIES-2026", "industry", "Sector incentive package", "Sector-specific IBDP 2026 package within the notified fixed-capital, annual and cumulative ceilings.", eligible, "File through Invest Punjab/DIC using the sector-policy and DSOG route.", "Thresholds, eligible costs and sector-specific conditions must be checked before investment.")),
  base("SCH-PB-CRM-2026-27", "Punjab Crop Residue Management machinery assistance 2026-27", "SOURCE-PB-AGRI-2026-27-NOTICE", "agriculture", "Machinery subsidy", "Current Punjab intake under CRM; the programme architecture supports eligible individual machinery and higher assistance for approved custom-hiring centres, subject to the current portal cost norms.", "Punjab farmers, cooperatives, panchayats, FPOs and eligible rural entrepreneurs under the notified component", "Apply on the Punjab Agriculture Subsidy Portal during the notified window.", "The district notice establishes the 2026-27 call; machine-wise cost, beneficiary share and deadline shown in the portal control."),
  base("SCH-PB-DSR-2026", "Punjab Direct Seeded Rice incentive 2026", "SOURCE-PB-DSR-CAQM", "agriculture", "Per-acre cultivation incentive", "₹1,500 per acre for eligible verified area under direct-seeded rice, subject to the annual state process.", "Punjab paddy farmers adopting the notified DSR method", "Register through the agriculture subsidy process and complete field verification as directed.", "Annual dates, acreage cap and verification workflow must be confirmed for the current season."),
  base("SCH-PB-SMAM-CDP-2026-27", "Punjab SMAM and Crop Diversification machinery assistance 2026-27", "SOURCE-PB-AGRI-2026-27-NOTICE", "agriculture", "Machinery subsidy", "Assistance on notified agricultural machinery under the 2026-27 SMAM and crop-diversification call.", "Eligible Punjab farmers and approved group institutions", "Apply through the Punjab Agriculture Subsidy Portal during the notified call.", "Machinery, category, priority and subsidy amount are portal-notification specific."),
  base("SCH-PB-MIDH-HORTICULTURE", "Punjab horticulture assistance under MIDH", "SOURCE-PB-HORTICULTURE", "horticulture", "Horticulture capital assistance", "Component-based support for eligible planting material, protected cultivation, mushroom and post-harvest assets under current MIDH norms and Punjab allocations.", "Eligible horticulture growers, groups and enterprises in Punjab", "Confirm the live component and apply through the Punjab Horticulture Department before investment.", "The department page confirms the route, but current component allocation and district target require direct confirmation."),
  base("SCH-PB-DD8", "DD-8 — setting up dairy units", "SOURCE-PB-DAIRY-DD8", "dairy", "Dairy animal subsidy", "25% assistance for general applicants and 33% for eligible reserved-category applicants on the approved animal cost; the manual records a maximum approved rate of ₹70,000 per animal.", "Eligible rural Punjab residents with prescribed dairy training and bank finance", "Complete recognised dairy training, obtain bank appraisal and apply through the Dairy Development Department.", "The detailed manual is older than the research cutoff; confirm current allocation and approved animal cost before purchase."),
  base("SCH-PB-DAIRY-SILAGE", "Punjab automatic silage baler and wrapper assistance", "SOURCE-PB-DAIRY-SERVICES", "dairy", "Equipment subsidy", "Department portal lists subsidy of ₹5.60 lakh for an eligible automatic silage baler and wrapper.", "Eligible dairy farmers or enterprises meeting current departmental conditions", "Apply through the Dairy Development Department and obtain sanction before purchase.", "Confirm current-year target, approved specifications and beneficiary contribution."),
  base("SCH-PB-DAIRY-TRAINING", "Punjab dairy entrepreneurship training and loan sponsorship", "SOURCE-PB-DAIRY-HOME", "dairy", "Training and institutional finance facilitation", "Departmental dairy training, project guidance, bank-loan sponsorship and subsidy-remittance support; 2026-27 training schedules are published on the official portal.", "Punjab residents planning or operating dairy enterprises", "Enroll through the district Dairy Development office or the current online schedule.", "Training is not itself a loan sanction; the lender independently appraises finance."),
  base("SCH-PB-PEDA-KUSUM", "PM-KUSUM implementation in Punjab — allocation watch", "SOURCE-PB-PEDA-KUSUM", "energy", "Solar agriculture support", "Punjab's official page records approximately 60% support for general and 80% for SC beneficiaries under Component B, but PM-KUSUM 1.0 closed on 31 December 2025 and fresh Punjab targets await PM-KUSUM 2.0.", "Punjab farmers under the applicable PM-KUSUM component when a new allocation opens", "Monitor PEDA's PM-KUSUM page and apply only against a fresh notified allocation.", "No fresh application should be assumed open until PEDA publishes the PM-KUSUM 2.0 allocation.", "Allocation pending — no fresh intake confirmed"),
  base("SCH-PB-PEDA-RIF", "PEDA Revolving Investment Fund for energy efficiency", "SOURCE-PB-PEDA-RIF", "energy", "Revolving energy-efficiency finance", "Finance up to 100% of eligible project cost or ₹25 lakh, whichever is lower, for covered public-agency energy-efficiency projects; PEDA may consider more based on creditworthiness and proposal quality.", "Eligible public agencies for covered lighting, building and water-pumping projects", "Submit the prescribed proposal and security documents to PEDA.", "This is repayable revolving finance, not a grant; bank guarantee, tenure and repayment terms apply."),
  base("SCH-PB-SCFC-ECONOMIC-VENTURE", "Punjab SC Finance Corporation — economic venture finance route", "SOURCE-PB-SCFC", "social", "Targeted enterprise finance", "Direct-lending and collaborative-loan routes for eligible Scheduled Caste applicants undertaking income-generating ventures; current amount, margin and interest are sanction-specific.", "Eligible Scheduled Caste residents of Punjab under corporation income and activity rules", "Approach the Punjab Scheduled Castes Land Development and Finance Corporation through the welfare department/corporation channel.", "The official summary did not expose current financial slabs; obtain the sanction sheet before relying on an amount."),
];

for (const scheme of schemes) {
  const slug = scheme.id.replace("SCH-", "");
  const fields = [
    ["existence", "active"], ["eligibleApplicants", scheme.legacy.eligible], ["keyBenefit", scheme.legacy.benefit], ["applicationRoute", scheme.legacy.access]
  ];
  scheme.claimIds = fields.map(([field]) => `CLAIM-${slug}-${field.toUpperCase()}`);
  const src = sourceById.get(scheme.sourceId);
  src.claimIds.push(...scheme.claimIds);
}

const stateClaims = schemes.flatMap(scheme => {
  const hardGrade = sourceById.get(scheme.sourceId).classification;
  return [["existence", "active"], ["eligibleApplicants", scheme.legacy.eligible], ["keyBenefit", scheme.legacy.benefit], ["applicationRoute", scheme.legacy.access]].map(([field,value]) => {
    const hard = field !== "existence";
    const grade = hard && hardGrade !== "primary-operative" ? "primary-summary" : hardGrade;
    return { id: `CLAIM-${scheme.id.replace("SCH-", "")}-${field.toUpperCase()}`, subjectId: scheme.id, field, value,
      sourceIds: [scheme.sourceId], locator: sourceById.get(scheme.sourceId).locator, evidenceGrade: grade,
      confidence: grade === "primary-operative" ? "high" : "medium", verifiedAt: cutoff, effectiveFrom: null, effectiveTo: null,
      ...(hard && grade !== "primary-operative" ? { publicationTreatment: "indicative-only", limitation: scheme.legacy.caution } : {}) };
  });
});
const stateStatuses = schemes.map(scheme => {
  const pending = scheme.id === "SCH-PB-PEDA-KUSUM";
  const unconfirmed = new Set(["SCH-PB-MIDH-HORTICULTURE", "SCH-PB-DD8", "SCH-PB-DAIRY-SILAGE", "SCH-PB-SCFC-ECONOMIC-VENTURE"]).has(scheme.id);
  const id = `STATUS-${scheme.id.replace("SCH-", "")}`;
  sourceById.get(scheme.sourceId).statusIds.push(id);
  return { id, subjectId: scheme.id, existence: pending ? "active-without-open-intake" : unconfirmed ? "programme-route-verified" : "active",
    intake: pending ? "closed-or-pending-allocation" : unconfirmed ? "current-intake-unconfirmed" : "continuous-or-call-based",
    budget: pending ? "pending-allocation" : unconfirmed ? "unconfirmed" : "allocation-dependent", confidence: unconfirmed ? "medium" : "high", evidenceGrade: sourceById.get(scheme.sourceId).classification,
    sourceIds: [scheme.sourceId], verifiedAt: cutoff, nextCheckAt: nextCheck, validFrom: null, validTo: null };
});

const commonSchemeIds = new Set(commonSchemes.map(s => s.id));
const commonClaimIds = new Set(commonSchemes.flatMap(s => s.claimIds ?? []));
let inheritedClaims = hpEvidence.claims.filter(c => commonClaimIds.has(c.id));
let inheritedStatuses = hpEvidence.statuses.filter(s => commonSchemeIds.has(s.subjectId));
const inheritedSourceIds = new Set(inheritedClaims.flatMap(c => c.sourceIds ?? []));
const commonSourceIds = new Set(commonSources.map(s => s.id));
const inheritedSources = hpSources.filter(s => inheritedSourceIds.has(s.id) && !commonSourceIds.has(s.id));

const excludedShared = new Set([
  "SCH-PM-KUSUM-SAUR-SINCHAI-IMPLEMENTATION-IN-HP-51246F", "SCH-MIDH-IMPLEMENTATION-IN-HIMACHAL-PRADESH-F434B5",
  "SCH-WEATHER-BASED-CROP-INSURANCE-SCHEME-HORTIC-5AB1B7", "SCH-MARKET-INTERVENTION-SCHEME-FOR-APPLE-MANGO-006D7B",
  "SCH-FISHERIES-INSURANCE-UNDER-PMMSY-HP-IMPLEME-512871", "SCH-HIMACHAL-PRADESH-BULK-DRUG-PARK-HAROLI-UNA-12483C",
  "SCH-PM-DHAN-DHAANYA-KRISHI-YOJANA-BILASPUR-DIS-1EA8FC", "SCH-LIVESTOCK-INSURANCE-PROGRAMME-HP-IMPLEMENT-688FF7",
  "SCH-NATIONAL-PROGRAMME-FOR-DAIRY-DEVELOPMENT-N-72791A", "SCH-HIMCARE-HOSPITAL-EMPANELMENT-3491F7",
  "SCH-TEA-DEVELOPMENT-AND-PROMOTION-SCHEME-2021--3677E0", "SCH-APEDA-FINANCIAL-ASSISTANCE-SCHEME-2021-26-B04DC2",
  "SCH-PRADHAN-MANTRI-FASAL-BIMA-YOJANA-PMFBY-7C1EEB"
]);
const selectedCommon = commonSchemes.filter(s => !excludedShared.has(s.id));
const selectedCommonIds = new Set(selectedCommon.map(s => s.id));
const sharedPunjabSource = (scheme) => {
  const name = (scheme.legacyCore?.name ?? scheme.name).toLowerCase();
  if (/horticulture|mushroom|nhb/.test(name)) return "SOURCE-PB-HORTICULTURE";
  if (/livestock|dairy|animal husbandry/.test(name)) return "SOURCE-PB-AHDF";
  if (/fish|matsya/.test(name)) return "SOURCE-PB-AHDF";
  if (/nrlm|svep/.test(name)) return "SOURCE-PB-NRLM-2026";
  if (/nbcfdc|nmdfc|nstfdc/.test(name)) return "SOURCE-PB-WELFARE";
  if (/energy|solar|ireda|e-drive/.test(name)) return "SOURCE-PB-PEDA";
  if (/agri|kisan|crop|soil|seed|fpo|rkvy|atma|aasha|e-nam|bamboo|natural farming|pulse|oilseed/.test(name)) return "SOURCE-PB-AGRI-SUBSIDY-PORTAL";
  return "SOURCE-PB-SINGLE-WINDOW";
};
const commonById = new Map(commonSchemes.map(s => [s.id, s]));
const hpMarker = /Himachal|\bHP\b|himurja|agridbt\.hp|himachal\.nic|agriculture\.hp\.gov|himachalservices\.nic/i;
const evidenceSourceById = new Map([...commonSources, ...hpSources].map(source => [source.id, source]));
const sourceIsHpSpecific = source => hpMarker.test([source?.title, source?.issuer, source?.url, source?.locator].filter(Boolean).join(" "));
inheritedClaims = inheritedClaims.filter(claim => selectedCommonIds.has(claim.subjectId)).map(claim => {
  const scheme = commonById.get(claim.subjectId);
  const hasHpSource = (claim.sourceIds ?? []).some(id => sourceIsHpSpecific(evidenceSourceById.get(id)));
  const sourceId = sharedPunjabSource(scheme);
  if (!hpMarker.test(String(claim.value ?? "")) && !hasHpSource) return claim;
  const values = {
    existence: "Punjab route retained subject to the current national programme and state intake.",
    eligibleApplicants: "Eligible Punjab applicants under the current national programme guidelines.",
    keyBenefit: "Assistance under the current national programme guidelines; component, category and project ceilings apply.",
    applicationRoute: "Apply through the official national portal or the designated Punjab implementing agency."
  };
  return { ...claim, value: values[claim.field] ?? "Current national programme terms apply in Punjab.", sourceIds: [sourceId], evidenceGrade: "primary-summary",
    confidence: "medium", publicationTreatment: "indicative-only", limitation: "The shared catalogue wording was state-specific; Punjab users must confirm the current national guideline and Punjab implementing channel." };
});
inheritedStatuses = inheritedStatuses.filter(status => selectedCommonIds.has(status.subjectId)).map(status => {
  const hasHpSource = (status.sourceIds ?? []).some(id => sourceIsHpSpecific(evidenceSourceById.get(id)));
  return { ...status, ...(hasHpSource ? { sourceIds: [sharedPunjabSource(commonById.get(status.subjectId))], confidence: "medium" } : {}), verifiedAt: cutoff, nextCheckAt: nextCheck };
});
const implementations = selectedCommon.map(s => {
  const core = s.legacyCore ?? {};
  const name = core.name ?? s.name;
  let agency = "Relevant central implementing agency / lender / Punjab line department";
  let access = "Apply through the official national portal or designated Punjab implementing office; confirm the live Punjab intake before expenditure.";
  if (/agri|kisan|crop|soil|seed|FPO|RKVY|ATMA|AASHA|e-NAM/i.test(name)) agency = "Department of Agriculture and Farmers Welfare, Punjab / designated central agency / lender";
  if (/horticulture|mushroom|NHB/i.test(name)) agency = "Department of Horticulture, Punjab / NHB / lender";
  if (/livestock|dairy|animal husbandry/i.test(name)) agency = "Animal Husbandry or Dairy Development Department, Punjab / lender";
  if (/fish|matsya/i.test(name)) agency = "Department of Fisheries, Punjab / NFDB / lender";
  if (/NRLM|SVEP/i.test(name)) agency = "Punjab State Rural Livelihood Mission / Department of Rural Development";
  if (/NBCFDC|NMDFC|NSTFDC/i.test(name)) agency = "Punjab channelising corporation / concerned national corporation / lender";
  const sourceId = sharedPunjabSource(s);
  const fallback = (value, replacement) => hpMarker.test(String(value ?? "")) ? replacement : (value ?? replacement);
  const legacyProjection = { ...core, id: s.id, name, gov: s.issuerType === "joint" ? "Central + Punjab" : "Central", agency, access,
    family: fallback(core.family, "Enterprise and sector support"),
    benefit: fallback(core.benefit, `Assistance under the current national ${name} guidelines; component and project ceilings apply.`),
    eligible: fallback(core.eligible, "Eligible Punjab applicants under the current national programme guidelines."),
    margin: fallback(core.margin, "Applicant contribution and lender or programme conditions apply."),
    bestFor: fallback(core.bestFor, "Eligible Punjab applicants seeking this national programme route."),
    caution: fallback(core.caution, "Confirm the current national guideline, Punjab implementing channel and live intake before expenditure."),
    src: fallback(core.src, sourceById.get(sourceId).url), evidence: { treatment: "operative-or-indicative-as-recorded", verified: cutoff } };
  return { id: `IMPLEMENTATION-PB-${s.id.replace("SCH-", "")}`, schemeId: s.id, stateId: "STATE-IN-PB", claimIds: s.claimIds ?? [],
    overrides: { agency, access, status: "Active or call-based — verify current intake", stateCaution: legacyProjection.caution }, legacyProjection };
});

const hpExcludes = /apple|pear|peach|nectarine|plum|apricot|cherry|kiwi|walnut|almond|hazelnut|kangra tea|trout|mountaineering|rafting|paragliding|skiing|snow-activity|small hydro/i;
let sectors = hpSectors.filter(s => !hpExcludes.test(`${s.a} ${s.sub}`)).map(({migrationSource,...s}) => s);
const additions = [
  ["SEC-PB-AGR-COT-01","Cotton cultivation","Cotton and fibre crops",0,0], ["SEC-PB-AGR-SUG-01","Sugarcane cultivation","Sugarcane",0,0],
  ["SEC-PB-AGR-BAS-01","Basmati rice cultivation","Premium cereals",0,0], ["SEC-PB-FOD-SUG-01","Sugar mill and value-added sugar products","Sugar processing",5,2],
  ["SEC-PB-FOD-MAI-01","Maize starch and ethanol unit","Maize processing",5,2], ["SEC-PB-TEX-HOS-01","Hosiery and knitwear manufacturing","Hosiery and knitwear",8,2],
  ["SEC-PB-ENG-BIC-01","Bicycle manufacturing unit","Bicycles",9,2], ["SEC-PB-ENG-BIC-02","Bicycle component manufacturing","Bicycles",9,2],
  ["SEC-PB-ENG-SPT-01","Sports goods manufacturing","Sports goods",9,2], ["SEC-PB-ENG-TOO-01","Hand tool manufacturing","Machine and hand tools",9,2],
  ["SEC-PB-ENG-TRC-01","Tractor and agricultural equipment manufacturing","Automotive and farm machinery",9,2], ["SEC-PB-GRN-CBG-01","Paddy-straw compressed biogas plant","Bioenergy",10,5],
  ["SEC-PB-GRN-HYD-01","Green hydrogen from biomass project","Green hydrogen",10,2], ["SEC-PB-DIG-GCC-01","Global capability centre","IT and business services",12,3],
  ["SEC-PB-TOU-HER-01","Heritage tourism enterprise","Heritage tourism",11,3], ["SEC-PB-TOU-REL-01","Religious tourism service","Religious tourism",11,3]
];
sectors.push(...additions.map(([id,a,sub,m,st],i) => ({ id,a,sub,m,st,ec:0,ms:0,ap:0,rg:0,ct:0,gt:0,sr:0,n:sectors.length+i })));
sectors = sectors.map((s,i) => ({...s,n:i}));

const schemeOrder = [...schemes.map(s=>s.id), ...selectedCommon.map(s=>s.id)];
const schemeIndex = new Map(schemeOrder.map((id,i)=>[id,i]));
const stateById = new Map(schemes.map(s=>[s.id,s]));
const sharedByName = new Map(selectedCommon.map(s=>[(s.legacyCore?.name ?? s.name).toLowerCase(),s.id]));
const findShared = (...terms) => selectedCommon.filter(s => terms.some(t => (s.legacyCore?.name ?? s.name).toLowerCase().includes(t))).map(s=>s.id);
const horizontal = [
  "SCH-PRIME-MINISTER-S-EMPLOYMENT-GENERATION-PRO-D1FEA0", "SCH-PRADHAN-MANTRI-MUDRA-YOJANA-PMMY-1FCCD7",
  "SCH-CGTMSE-CREDIT-GUARANTEE-A17996", "SCH-MSME-SUSTAINABLE-ZED-CERTIFICATION-9DC992", "SCH-MSME-COMPETITIVE-LEAN-0AFE18",
  "SCH-RAISING-AND-ACCELERATING-MSME-PERFORMANCE--8ED3FE", "SCH-ENTREPRENEURSHIP-AND-SKILL-DEVELOPMENT-PRO-8C6AA1",
  "SCH-TREDS-INVOICE-DISCOUNTING-B2B9D2"
].filter(id => schemeIndex.has(id));
const macroState = {
  0:["SCH-PB-CRM-2026-27","SCH-PB-DSR-2026","SCH-PB-SMAM-CDP-2026-27"], 1:["SCH-PB-MIDH-HORTICULTURE"],
  2:["SCH-PB-DD8","SCH-PB-DAIRY-SILAGE","SCH-PB-DAIRY-TRAINING"], 3:[], 4:["SCH-PB-SECTOR26-LOGISTICS"], 5:["SCH-PB-FOOD26"],
  6:["SCH-PB-STARTUP26"], 7:["SCH-PB-SECTOR26-PHARMA"], 8:["SCH-PB-SECTOR26-TEXTILE","SCH-PB-SECTOR26-FURNITURE"],
  9:["SCH-PB-IBDP26-CAPITAL","SCH-PB-SECTOR26-AUTO","SCH-PB-SECTOR26-ESDM","SCH-PB-SECTOR26-EV","SCH-PB-SECTOR26-BICYCLE","SCH-PB-SECTOR26-SPORTS","SCH-PB-SECTOR26-TOOLS","SCH-PB-SECTOR26-STEEL"],
  10:["SCH-PB-IBDP26-GREEN","SCH-PB-IBDP26-STRAW-BOILER","SCH-PB-SECTOR26-RENEWABLE","SCH-PB-SECTOR26-CHEMICAL","SCH-PB-PEDA-RIF"],
  11:["SCH-PB-SECTOR26-TOURISM"], 12:["SCH-PB-STARTUP26","SCH-PB-SECTOR26-IT","SCH-PB-SECTOR26-FILM"],
  13:["SCH-PB-SECTOR26-HEALTH","SCH-PB-SECTOR26-EDUCATION"], 14:["SCH-PB-SECTOR26-LOGISTICS"]
};
const macroSharedTerms = {
  0:["kisan credit", "agricultural mechanization", "soil health", "food & nutrition", "seeds and planting", "natural farming", "oilseeds", "pulses", "pm-kisan", "fasal bima"],
  1:["nhb ", "mushroom", "medicinal-plant", "bamboo"], 2:["livestock mission", "gokul", "animal husbandry infrastructure", "dairy cooperatives"],
  3:["matsya", "fisheries and aquaculture", "beekeeping"], 4:["agriculture infrastructure", "cold storage", "post-harvest", "e-nwr"],
  5:["kisan sampada", "micro food processing", "food-processing"], 6:["10,000 fpo", "e-nam", "agrisure", "agri-entrepreneurship", "ncdc"],
  7:["pharmaceutical", "janaushadhi", "biotechnology ignition"], 8:["handicraft", "handloom", "weaver", "sfurt"],
  9:["electronics component", "defence excellence", "technology development fund", "pm e-drive"], 10:["ireda", "mse gift", "mse spice", "adeetie"],
  11:["pmegp", "mudra"], 12:["startup", "genesis", "tide 2.0", "stpi"], 13:["pm-jay", "apprenticeship", "pmkvy"], 14:["svanidhi", "mudra"]
};
const sourceForScheme = id => stateById.get(id)?.sourceId ?? inheritedClaims.find(c=>c.subjectId===id)?.sourceIds?.[0] ?? commonSources[0]?.id;
const reviews=[]; const compressedLinks={};
for (const [sectorNo,sector] of sectors.entries()) {
  const direct = [...(macroState[sector.m]??[]), ...findShared(...(macroSharedTerms[sector.m]??[]))];
  if (/bicycle/i.test(sector.a)) direct.push("SCH-PB-SECTOR26-BICYCLE");
  if (/sports/i.test(sector.a)) direct.push("SCH-PB-SECTOR26-SPORTS");
  if (/tool/i.test(sector.a)) direct.push("SCH-PB-SECTOR26-TOOLS");
  if (/hosiery|knitwear/i.test(sector.a)) direct.push("SCH-PB-SECTOR26-TEXTILE");
  if (/paddy-straw|biogas/i.test(sector.a)) direct.push("SCH-PB-IBDP26-STRAW-BOILER");
  const enterpriseLike = sector.m >= 4 || [2,3,4,5,6,7,8,9,10,11].includes(sector.st);
  const ids=[...new Set([...direct,...(enterpriseLike ? horizontal : [])])].filter(id=>schemeIndex.has(id)).slice(0,24);
  compressedLinks[sectorNo]=ids.map(id=>[schemeIndex.get(id), direct.includes(id)?0:3, 1, 0]);
  for(const id of ids) reviews.push({ id:`MAP-PB-${sectorNo}-${schemeIndex.get(id)}`, sectorId:sector.id, schemeId:id,
    disposition:"reviewed-applicable", currentApplicability:direct.includes(id)?"Direct":"Horizontal", unitStage:"New and existing",
    valueChainStage:hpStatic.stages?.[sector.st]??"As applicable", applicantProfile:hpStatic.pools?.applicants?.[sector.m]??"Eligible applicant",
    whyMapped:direct.includes(id)?"Sector or activity directly matches the programme route.":"Horizontal enterprise, credit, quality or market support may apply.",
    condition:"Confirm live intake, eligible cost and sanction before expenditure.", applicationSequence:"Check eligibility and live intake; obtain approval before incurring scheme-linked expenditure.",
    convergence:"Disclose all assistance and do not claim the same eligible cost twice.", sourceIds:[sourceForScheme(id)].filter(Boolean), verifiedAt:cutoff, effectiveFrom:cutoff });
}

const agencies = [
  ["INDUSTRIES","Department of Industries and Commerce / Invest Punjab",["industry","MSME","startup"],"SOURCE-PB-SINGLE-WINDOW",[4,5,6,7,8,9,10,11,12,13,14]],
  ["AGRICULTURE","Department of Agriculture and Farmers Welfare",["agriculture","mechanisation","crop support"],"SOURCE-PB-AGRI-SUBSIDY-PORTAL",[0,4,6]],
  ["HORTICULTURE","Department of Horticulture",["horticulture","mushroom","post-harvest"],"SOURCE-PB-HORTICULTURE",[1,4,5]],
  ["AHDF","Animal Husbandry, Dairy Development and Fisheries Department",["livestock","dairy","fisheries"],"SOURCE-PB-AHDF",[2,3,5]],
  ["DAIRY","Dairy Development Department / Punjab Dairy Development Board",["dairy","training","equipment"],"SOURCE-PB-DAIRY-HOME",[2,5]],
  ["PEDA","Punjab Energy Development Agency",["renewable energy","energy efficiency","solar"],"SOURCE-PB-PEDA",[0,9,10,14]],
  ["RURAL","Department of Rural Development / Punjab SRLM",["SHG","rural livelihood","enterprise"],"SOURCE-PB-NRLM-2026",[0,1,2,3,5,6,8,12,14]],
  ["COOP","Department of Cooperation",["cooperative","credit","marketing"],"SOURCE-PB-COOPERATION",[0,1,2,3,4,5,6,14]],
  ["SCFC","Punjab SC Land Development and Finance Corporation",["Scheduled Caste","enterprise finance"],"SOURCE-PB-SCFC",[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14]],
  ["BACKFINCO","Punjab Backward Classes Land Development and Finance Corporation",["Backward Classes","minority finance"],"SOURCE-PB-WELFARE",[]],
  ["KVIB","Punjab Khadi and Village Industries Board",["PMEGP","village industry","artisan"],"SOURCE-PB-DEPARTMENTS",[5,8,9,10,11,12,14]],
  ["TOURISM","Department of Tourism and Cultural Affairs",["tourism","hospitality","film"],"SOURCE-PB-SECTOR-POLICIES-2026",[11,12]],
  ["EMPLOYMENT","Department of Employment Generation, Skill Development and Training",["skills","employment","apprenticeship"],"SOURCE-PB-DEPARTMENTS",[5,7,8,9,10,11,12,13,14]],
  ["SOCIAL","Department of Social Justice, Empowerment and Minorities",["SC","BC","minority"],"SOURCE-PB-WELFARE",[]],
  ["FORESTS","Department of Forests and Wildlife",["agroforestry","bamboo","forest produce"],"SOURCE-PB-DEPARTMENTS",[1,3,8,10]],
  ["LOCAL","Department of Local Government",["street vending","urban enterprise","local services"],"SOURCE-PB-DEPARTMENTS",[11,12,14]],
  ["PSPCL","Punjab State Power Corporation Limited",["electricity duty","grid","solar"],"SOURCE-PB-PSPCL-CC19-2026",[9,10]],
  ["PPCB","Punjab Pollution Control Board",["environment","ZLD","waste"],"SOURCE-PB-IBDP-2026",[5,7,8,9,10,11,14]],
];
const agencyInventory=agencies.map(([code,issuer,sectorsList,sourceId])=>({ id:`AGENCY-PB-${code}`, title:issuer, issuer, url:sourceById.get(sourceId)?.url,
  aliases:[], categories:sectorsList, sectors:sectorsList, beneficiaryTags:["eligible Punjab applicant"], supportTags:["finance","subsidy","facilitation"], agencyMatchTerms:sectorsList,
  checkedAt:cutoff, retrievedAt:cutoff, nextCheckAt:nextCheck, outcome:"routes-or-candidates-found", retrievalNote:"Official programme, policy or department surface checked; missing operative detail is retained as a candidate rather than inferred." }));
const candidateIdsByAgency = {
  INDUSTRIES:["CAND-PB-IBDP22"], HORTICULTURE:["CAND-PB-HORT-JICA","CAND-PB-HORT-MUSHROOM-OLD","CAND-PB-HORT-POTATO-OLD"],
  AHDF:["CAND-PB-FISH-STATE"], DAIRY:["CAND-PB-DAIRY-FORMS"], PEDA:["CAND-PB-PMKUSUM2","CAND-PB-PEDA-EC-AWARD"],
  BACKFINCO:["CAND-PB-BACKFINCO-DETAILS"], SOCIAL:["CAND-PB-WOMEN-CORP"]
};
const agencyCoverage=agencies.map(([code,issuer,,sourceId])=>({id:`AGENCY-COVERAGE-PB-${code}`,category:code.toLowerCase(),sourceIds:[sourceId],outcome:"routes-or-candidates-found",evidence:"Official surface checked and publishable routes or documented candidates recorded.",verifiedAt:cutoff,nextCheckAt:nextCheck,candidateIds:candidateIdsByAgency[code]??[]}));
const firstByMacro=new Map(sectors.map(s=>[s.m,sectors.find(x=>x.m===s.m)]));
const pendingMacrosByAgency = { BACKFINCO:[...Array(15).keys()], SOCIAL:[...Array(15).keys()] };
const coverage=agencies.flatMap(([code,issuer,,sourceId,relevantMacros])=>[...Array(15)].map((_,m)=>({id:`COVERAGE-PB-${code}-M${m}`,agency:issuer,sectorId:firstByMacro.get(m).id,
  beneficiary:"Applicant matching programme conditions",enterpriseStage:"new-and-existing",schemeFamily:hpStatic.macros[m],supportType:"finance, subsidy, training or facilitation",
  required:true,outcome:relevantMacros.includes(m)?"verified-applicable":pendingMacrosByAgency[code]?.includes(m)?"candidate-pending":"not-relevant",
  evidence:relevantMacros.includes(m)?"Official remit or programme surface supports this macro route.":pendingMacrosByAgency[code]?.includes(m)?"The agency route may be relevant, but current operative detail was not available; the lead remains in the candidate ledger.":"The agency's documented remit does not cover this macro; no absence claim is made.",sourceIds:[sourceId],verifiedAt:cutoff,effectiveFrom:cutoff})));

const candidates = [
  ["HORT-JICA","Punjab high-value climate-resilient horticulture project","candidate-pending","Budget announcement located, but operative beneficiary guidelines and intake were not found.","SOURCE-PB-HORTICULTURE"],
  ["HORT-MUSHROOM-OLD","Punjab mushroom subsidy references predating 2026","unverified-lead","Older department/RTI references were not treated as current sanction authority.","SOURCE-PB-HORTICULTURE"],
  ["HORT-POTATO-OLD","Punjab potato-development subsidy references predating 2026","unverified-lead","Current operative call and financial norms were not located.","SOURCE-PB-HORTICULTURE"],
  ["FISH-STATE","Punjab state fisheries subsidy components","candidate-pending","Department route exists, but no current state-specific operative component page was accessible; central PMMSY routes remain mapped.","SOURCE-PB-AHDF"],
  ["BACKFINCO-DETAILS","Punjab Backfinco state-loan slabs","candidate-pending","Agency route verified; current operative financial slabs were not accessible, so NBCFDC common schemes are used without inventing state terms.","SOURCE-PB-WELFARE"],
  ["WOMEN-CORP","Punjab Women Development Corporation enterprise finance","candidate-pending","No current operative enterprise-finance guideline was located on the checked official surfaces.","SOURCE-PB-WELFARE"],
  ["PMKUSUM2","Punjab PM-KUSUM 2.0 allocation","candidate-pending","PEDA states that PM-KUSUM 1.0 closed and fresh allocation awaits 2.0.","SOURCE-PB-PEDA-KUSUM"],
  ["IBDP22","Punjab Industrial and Business Development Policy 2022","superseded","New common application forms are governed by IBDP 2026; limited migration provisions exist for qualifying earlier cases.","SOURCE-PB-IBDP-2026"],
  ["PEDA-EC-AWARD","Punjab State Energy Conservation Awards 2026","outside-beneficiary-scope","Recognition programme recorded but not mapped as ordinary enterprise finance.","SOURCE-PB-PEDA"],
  ["DAIRY-FORMS","Older Punjab dairy equipment subsidy forms","candidate-pending","Forms remain discoverable, but current allocations for each equipment component were not confirmed.","SOURCE-PB-DAIRY-SERVICES"],
].map(([code,title,disposition,note,sourceId])=>({id:`CAND-PB-${code}`,title,issuer:sourceById.get(sourceId).issuer,url:sourceById.get(sourceId).url,sourceIds:[sourceId],sectorTags:[],beneficiaryTags:[],supportTags:[],discoveredAt:cutoff,verifiedAt:cutoff,nextAction:note,disposition,publishable:false}));

const contacts = agencies.map(([code,issuer,sectorsList,sourceId])=>({name:issuer,use:sectorsList.join(", "),url:sourceById.get(sourceId)?.url,note:"Confirm the live intake and obtain written sanction before incurring scheme-linked expenditure."}));
const norms = [
  ["Industrial capital subsidy","20% eligible FCI","₹10 crore","New/expansion units","IBDP classification and annual capping apply","SOURCE-PB-IBDP-2026"],
  ["Modernisation subsidy","20% eligible plant and machinery","₹10 crore","Existing eligible industrial units","Ten annual instalments; once in five years","SOURCE-PB-IBDP-2026"],
  ["Employment subsidy","₹3,000/₹4,000 per eligible employee per month","5 years","Qualifying units with ₹25 crore FCI and 50 direct Punjab-resident jobs","Payroll, PF/ESI and category evidence required","SOURCE-PB-IBDP-2026"],
  ["DSR incentive","₹1,500 per acre","Annual verified area","Eligible Punjab paddy farmer","Seasonal registration and field verification apply","SOURCE-PB-DSR-CAQM"],
  ["DD-8 dairy units","25% general / 33% eligible reserved category","Approved animal rate in manual: ₹70,000","Trained rural Punjab applicant with bank finance","Current allocation and rate must be reconfirmed","SOURCE-PB-DAIRY-DD8"],
  ["Silage baler and wrapper","₹5.60 lakh subsidy listed","Current departmental sanction","Eligible dairy applicant","Specifications and annual target apply","SOURCE-PB-DAIRY-SERVICES"],
  ["PEDA RIF","Up to 100% eligible cost","Ordinarily ₹25 lakh","Eligible public agency","Repayable finance secured by bank guarantee","SOURCE-PB-PEDA-RIF"],
].map(([item,norm,cap,who,cond,sourceId])=>({theme:"Punjab verified norms",item,norm,cap,who,cond,route:"Apply through the responsible Punjab agency",src:sourceById.get(sourceId).url}));

const components = [
  ["COMP-PB-IBDP-SGST","SCH-PB-IBDP26-SGST","Net SGST reimbursement"], ["COMP-PB-IBDP-DUTIES","SCH-PB-IBDP26-DUTIES","Stamp and electricity duty relief"],
  ["COMP-PB-IBDP-EMPLOYMENT","SCH-PB-IBDP26-EMPLOYMENT","Employment generation subsidy"], ["COMP-PB-IBDP-MSME","SCH-PB-IBDP26-MSME","MSME competitiveness basket"],
  ["COMP-PB-IBDP-GREEN","SCH-PB-IBDP26-GREEN","Environmental technology assistance"], ["COMP-PB-IBDP-STRAW","SCH-PB-IBDP26-STRAW-BOILER","Paddy-straw boiler assistance"]
].map(([id,schemeId,title])=>({id,schemeId,parentProgramme:"Punjab Industrial and Business Development Policy 2026",title,disposition:"component",reason:"Published separately for discoverability while preserving the common IBDP 2026 ceiling and DSOG conditions.",resolvedAt:cutoff}));

const legacy = [
  {name:"Punjab Industrial and Business Development Policy 2022 — new CAF route",position:"Superseded for new common application forms by IBDP 2026",why:"IBDP 2026 was notified on 8 March 2026; qualifying 2022 cases may use the notified migration window.",alt:"Use IBDP 2026 and its sector policies.",src:sourceById.get("SOURCE-PB-IBDP-2026").url},
  {name:"PM-KUSUM 1.0 fresh Punjab intake",position:"Closed pending the next allocation",why:"PEDA records closure from 31 December 2025 and awaits PM-KUSUM 2.0 targets.",alt:"Monitor PEDA; do not assume a fresh intake.",src:sourceById.get("SOURCE-PB-PEDA-KUSUM").url},
  {name:"Older Punjab horticulture component references",position:"Current status not established",why:"Historic scheme descriptions were not backed by a current 2026-27 operative call.",alt:"Confirm live MIDH components with the Horticulture Department.",src:sourceById.get("SOURCE-PB-HORTICULTURE").url}
];

const appStatic = JSON.parse(JSON.stringify(hpStatic));
appStatic.meta = { title:"Punjab Scheme Finder", subtitle:"Punjab enterprise, MSME, agriculture and livelihood schemes", verified:cutoff,
  counts:{sectors:sectors.length,schemes:schemeOrder.length,links:Object.values(compressedLinks).reduce((n,a)=>n+a.length,0)},
  statePack:{method:"HP v2",agencyInventoryChecks:agencyInventory.length,candidateCount:candidates.length,operativeStateSchemes:schemes.length} };
appStatic.pools.contacts = appStatic.pools.contacts.map(s=>s.replaceAll("HP ","Punjab ").replaceAll("HIMURJA","PEDA").replaceAll("Startup Himachal","Startup Punjab"));
appStatic.pools.gates = [
  "Annual district targets, Punjab agro-climatic suitability and notified cost norms apply",
  "Crop suitability, soil and water conditions, plant material and annual district allocation control access",
  "Species, component and cluster eligibility are notification-specific",
  "Raw-material linkage, applicable licence and technical standards apply",
  "Breed, herd size, fodder, veterinary biosecurity and bank appraisal requirements vary by programme",
  "Water body, carrying capacity, species, bee flora or host-plant suitability controls eligibility",
  "Commodity linkage, capacity utilisation, land, power and technical cost norms are decisive",
  "Raw-material linkage, food licence, building and utility adequacy, and no double subsidy on the same asset",
  "Organisation registration, member base, business plan and cluster coverage control eligibility",
  "Schedule M, licensing, testing, product standards and pollution requirements are material",
  "Traditional skills, raw-material legality, artisan identity and cluster structure may determine the route",
  "Industrial-area availability, power, logistics, product standards and minimum investment thresholds vary",
  "Punjab logistics, environmental clearance, waste authorisation, energy audit and product standards are material",
  "Registration category, land use, building safety, carrying capacity and commercial viability are decisive",
  "Innovation status, employment, export contract, data handling and service classification affect scheme fit",
  "Professional qualification, clinical registration, location norms and service accreditation may be mandatory",
  "Permit, route, vehicle, shop registration, land use and activity positive-list rules apply"
];
appStatic.pools.sources = [
  "https://agrimachinerypb.com/", "https://punjab.gov.in/government/departments/department-of-horticulture/", "https://nmpb.nic.in/",
  "https://dairydevpunjab.in/", "https://dahd.gov.in/", "https://fisheries.gov.in/", "https://nbb.gov.in/", "https://agriinfra.dac.gov.in/",
  "https://www.mofpi.gov.in/", "https://pharma-dept.gov.in/", "https://ayush.gov.in/", "https://cdsco.gov.in/opencms/opencms/en/Home/",
  "https://texmin.nic.in/", "https://handicrafts.nic.in/", "https://msme.gov.in/", "https://www.meity.gov.in/", "https://drdo.gov.in/",
  "https://www.peda.gov.in/", "https://pbindustries.gov.in/", "https://punjab.gov.in/government/departments/"
];
appStatic.sources = [...new Set(stateSources.map(source => source.url))];
const limitations = [
  "Annual and allocation-dependent programmes must be rechecked with the issuing body before expenditure.",
  "The DSOG 2026 Gazette content was accessible through a third-party mirror; the policy and major electricity-duty rule were cross-checked against official primary sources.",
  "Current operative state-specific fisheries and Backfinco financial slabs were not publicly accessible and remain candidates rather than inferred entitlements.",
  "Common central-scheme evidence is inherited from the shared catalogue; Punjab-specific intake and channel details are supplied only where verified."
];
const allClaims = [...inheritedClaims, ...stateClaims];
const allStatuses = [...inheritedStatuses, ...stateStatuses];
const reverseIndexes = Object.fromEntries([
  ...allClaims.map(record => [record.id, record.sourceIds ?? []]),
  ...allStatuses.map(record => [record.id, record.sourceIds ?? []]),
  ...reviews.map(record => [record.id, record.sourceIds ?? []])
]);
const manifest = {
  schemaVersion:"state-pack-1", stateId:"STATE-IN-PB", slug:"punjab", name:"Punjab", researchCutoff:cutoff,
  schemeOrder, acceptedMethodFindingIds:[], methodTraceability:{}, reverseIndexes,
  defaultExclusions:["Schemes without an enterprise, credit, subsidy, market, skill or productive-asset route","Commercial bank products without a government or development-finance programme","Other-state programmes and expired calls"],
  appStatic, accepted:true,
  acceptance:{accepted:true,runId:"PB-ADD-STATE-2026-08",schemaVersion:"state-pack-acceptance-1",cutoff,limitations,
    counts:{schemes:schemeOrder.length,stateSchemes:schemes.length,sharedImplementations:implementations.length,sectors:sectors.length,mappings:reviews.length,claims:inheritedClaims.length+stateClaims.length,sources:commonSources.length+inheritedSources.length+stateSources.length,candidates:candidates.length,agencyInventoryChecks:agencyInventory.length},
    candidateDispositions:Object.fromEntries([...new Set(candidates.map(c=>c.disposition))].map(d=>[d,candidates.filter(c=>c.disposition===d).length])),
    coverageOutcomes:Object.fromEntries([...new Set(coverage.map(c=>c.outcome))].map(d=>[d,coverage.filter(c=>c.outcome===d).length])),
    gateResults:{asOf:cutoff,passed:null,errorCount:null,gates:["status","evidence","coverage","mappings"]}}
};

write("manifest.json",manifest);
write("schemes.json",{schemaVersion:"state-pack-1",schemes});
write("implementations.json",{schemaVersion:"state-pack-1",implementations});
write("sectors.json",{schemaVersion:"state-pack-1",sectors});
write("mappings.json",{schemaVersion:"state-pack-1",count:reviews.length,reviews,compressedLinks});
write("coverage.json",{schemaVersion:"state-pack-coverage-1",outcomes:["verified-applicable","not-relevant","candidate-pending","verified-none"],coverage,agencyCoverage});
write("sources.json",{schemaVersion:"state-pack-1",sources:[...inheritedSources,...stateSources],agencyInventory});
write("evidence.json",{schemaVersion:"state-pack-1",claims:allClaims,statuses:allStatuses});
write("candidates.json",{schemaVersion:"state-pack-1",candidates});
write("contacts.json",{schemaVersion:"state-pack-1",contacts});
write("component-norms.json",{schemaVersion:"state-pack-1",norms});
write("components.json",{schemaVersion:"state-pack-1",components});
write("legacy.json",{schemaVersion:"state-pack-1",legacy});
const { validateRepositoryState } = await import("./lib/validation.mjs");
const validation = await validateRepositoryState("punjab");
manifest.acceptance.gateResults.passed = validation.ok;
manifest.acceptance.gateResults.errorCount = validation.errors.length;
write("manifest.json", manifest);
if (!validation.ok) throw new Error(`Punjab state-pack validation failed: ${JSON.stringify(validation.errors.slice(0, 10))}`);
console.log(JSON.stringify({state:"Punjab",stateSchemes:schemes.length,sharedSchemes:selectedCommon.length,sectors:sectors.length,mappings:reviews.length,claims:inheritedClaims.length+stateClaims.length,sources:inheritedSources.length+stateSources.length,candidates:candidates.length},null,2));
