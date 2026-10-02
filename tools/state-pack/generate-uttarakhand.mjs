import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { validateRepositoryState } from './lib/validation.mjs';
import { diffRecords } from './lib/diff.mjs';

// Research snapshot: re-running this generator does not imply a fresh source check.
const cutoff = '2026-10-02';
const nextCheck = '2026-10-16';
const out = 'scheme-data/states/uttarakhand';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, data) => fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
fs.mkdirSync(out, { recursive: true });
const seed = read('research/uttarakhand/research.json');
const hp = read('scheme-data/states/himachal-pradesh/manifest.json').appStatic;
const common = read('scheme-data/common/schemes.json').schemes;
const commonSources = read('scheme-data/common/sources.json').sources;
const inheritedEvidence = read('scheme-data/states/himachal-pradesh/evidence.json');
const inheritedSources = read('scheme-data/states/himachal-pradesh/sources.json').sources;
const sources = seed.sources.map(s => ({ ...s, id: `SOURCE-UK-${s.code}`, retrievedAt: s.retrievedAt ?? cutoff, publishedAt: s.publishedAt ?? null, claimIds: [], statusIds: [] }));
const sourceByCode = new Map(sources.map(s => [s.code, s]));
const previousCandidates = fs.existsSync(`${out}/candidates.json`) ? read(`${out}/candidates.json`).candidates : [];
const previousCandidateIds = new Map(previousCandidates.map(c=>[c.name,c.id]));
const reservedCandidateIds = new Set(previousCandidates.map(c=>c.id));
let nextCandidate=1;
const candidates = seed.candidates.map(c => { while(reservedCandidateIds.has(`CAND-UK-${nextCandidate}`))nextCandidate++; const id=previousCandidateIds.get(c.name)??`CAND-UK-${nextCandidate++}`; reservedCandidateIds.add(id); return ({ ...c, id, checkedAt: cutoff, nextCheckAt: nextCheck, sourceIds: (c.sources ?? []).map(code => sourceByCode.get(code).id) }); });
const caution = 'Current intake, district allocation, admissible costs and sanction must be confirmed before expenditure. Summary-only details are indicative, not an entitlement.';
const claims = [];
const statuses = [];
const schemes = seed.schemes.map(def => {
  const id = `SCH-UK-${def.code}`;
  const source = sourceByCode.get(def.source);
  const legacy = { id, name: def.name, gov: 'Uttarakhand', family: def.family, label: def.support, support: def.support,
    benefit: def.benefit, eligible: def.eligible, access: def.access, agency: source.issuer,
    bank: /loan|credit|interest/i.test(def.support + def.benefit) ? 'Yes' : 'May be',
    margin: 'Applicant contribution and lender or programme conditions apply.', bestFor: def.eligible,
    status: 'Programme route verified — current intake unconfirmed', caution: def.caution ?? caution, src: source.url,
    stage: def.stage ?? 'As specified by the programme', parent: def.parent ?? '', reach: 65,
    evidence: { treatment: source.classification === 'primary-operative' ? 'operative' : 'indicative-only', verified: cutoff } };
  const claimIds = [];
  for (const [field, value] of [['existence', 'programme-route-verified'], ['keyBenefit', def.benefit], ['eligibleApplicants', def.eligible], ['applicationRoute', def.access]]) {
    const claimId = `CLAIM-UK-${def.code}-${field.toUpperCase()}`;
    const evidenceSource = def.code === 'HOMESTAY' && field === 'eligibleApplicants' ? sourceByCode.get('HOMESTAY') : source;
    claimIds.push(claimId); evidenceSource.claimIds.push(claimId);
    claims.push({ id: claimId, subjectId: id, field, value, sourceIds: [evidenceSource.id], locator: def.locator ?? evidenceSource.locator,
      evidenceGrade: evidenceSource.classification, confidence: evidenceSource.classification === 'primary-operative' ? 'high' : 'medium', verifiedAt: cutoff,
      effectiveFrom: def.effectiveFrom ?? null, effectiveTo: def.effectiveTo ?? null, ...(field !== 'existence' && evidenceSource.classification !== 'primary-operative' ? { publicationTreatment: 'indicative-only', limitation: legacy.caution } : {}) });
  }
  const statusId = `STATUS-UK-${def.code}`; source.statusIds.push(statusId);
  statuses.push({ id: statusId, subjectId: id, existence: 'programme-route-verified', intake: 'current-intake-unconfirmed', budget: 'allocation-unconfirmed',
    confidence: 'medium', evidenceGrade: source.classification, sourceIds: [source.id], verifiedAt: cutoff, nextCheckAt: nextCheck, validFrom: null, validTo: null });
  return { id, name: def.name, aliases: def.aliases ?? [], issuerType: 'state', familyId: `FAMILY-UK-${def.family.toUpperCase().replace(/[^A-Z]+/g, '-')}`, claimIds, legacy, researchDefinition: def };
});

// Shared national facts remain unchanged, including their original evidence dates.
// State routing is projected locally; national records and their evidence dates remain untouched.
const otherState = /Himachal|\bHP\b|Punjab|\bPB\b|himurja|Baddi|Kangra|agriculture\.hp|himachal\.(nic|gov)|agridbt\.hp/i;
const allSourceById = new Map([...commonSources, ...inheritedSources].map(s => [s.id, s]));
const implementations = [];
const selected = [];
for (const route of seed.sharedRoutes) {
  const scheme = common.find(s => s.id.includes(route.match));
  if (!scheme) throw new Error(`Unknown shared route ${route.match}`);
  const inherited = inheritedEvidence.claims.filter(c => c.subjectId === scheme.id);
  if (otherState.test(scheme.name) || /HIMCARE/i.test(scheme.name)) {
    candidates.push({ id: `CAND-UK-SHARED-${route.match}`, name: scheme.name, disposition: 'unverified-lead', reason: 'Shared record contains other-state facts; deferred to a separately scoped common-scheme refresh.', checkedAt: cutoff, nextCheckAt: nextCheck, sourceIds: [sourceByCode.get(route.source).id] });
    continue;
  }
  selected.push({ scheme, route });
  const source = sourceByCode.get(route.source);
  for (const claim of inherited) {
    if (claim.field === 'applicationRoute') {
      claims.push({ ...claim, value: route.access, sourceIds: [source.id], locator: source.locator, evidenceGrade: source.classification, confidence: 'medium', verifiedAt: cutoff,
        ...(source.classification !== 'primary-operative' ? { publicationTreatment: 'indicative-only', limitation: 'Uttarakhand access route verified separately; current intake, allocation and applicant approval remain unconfirmed.' } : {}) });
      source.claimIds.push(claim.id);
      continue;
    }
    const stateSpecific = otherState.test(String(claim.value)) || (claim.sourceIds ?? []).some(id => otherState.test(JSON.stringify(allSourceById.get(id))));
    if (!stateSpecific) { claims.push(claim); continue; }
    // Replace only the state-local evidence projection, never a common record.
    const values = { existence: 'Shared programme reference; Uttarakhand intake unconfirmed.', eligibleApplicants: 'Applicants satisfying the national programme and current Uttarakhand implementation conditions.',
      keyBenefit: 'Refer to the common national programme rules; Uttarakhand allocation and sanction remain unconfirmed.', applicationRoute: route.access };
    claims.push({ ...claim, value: values[claim.field] ?? 'Uttarakhand implementation requires confirmation.', sourceIds: [source.id], locator: source.locator,
      evidenceGrade: 'primary-summary', confidence: 'medium', verifiedAt: cutoff, publicationTreatment: 'indicative-only', limitation: 'This state implementation note replaces other-state routing text. National terms were not re-researched.' });
  }
  const core = scheme.legacyCore ?? {};
  const status = 'Shared programme reference — current Uttarakhand intake unconfirmed';
  const nationalCore = Object.fromEntries(Object.entries(core).map(([key,value]) => [key, typeof value==='string' ? value.replace(/\s*\(Himachal Pradesh qualifies\)/g,'').replace(/including Himachal Pradesh,?\s*/g,'') : value]));
  const cleanCore = Object.fromEntries(Object.entries(nationalCore).map(([key,value]) => [key, typeof value === 'string' && otherState.test(value) ? ({ benefit: 'National programme terms apply. The former state-specific example is omitted; confirm the current admissible assistance with the implementing agency.', eligible: 'Applicants meeting the national programme eligibility and current local implementation conditions.', label: 'Programme-specific enterprise support', margin: 'Programme and lender contribution conditions apply.', bestFor: 'Eligible activity under the national programme', src: source.url }[key] ?? value.replace(/Himachal Pradesh|Himachal/g, 'Uttarakhand')) : value]));
  const projection = { ...cleanCore, id: scheme.id, name: scheme.name, gov: scheme.issuerType === 'joint' ? 'Central + Uttarakhand' : 'Central',
    family: otherState.test(core.family ?? '') ? 'Central sector or commodity support' : core.family,
    agency: route.agency, access: route.access, status, caution: `${core.caution ?? ''} ${caution} National evidence dates are retained from the shared catalogue.`,
    evidence: { treatment: 'inherited-national-evidence', verified: inherited[0]?.verifiedAt ?? null } };
  implementations.push({ id: `IMPLEMENTATION-UK-${scheme.id.slice(4)}`, stateId: 'STATE-IN-UK', schemeId: scheme.id, claimIds: scheme.claimIds,
    sourceIds: [source.id], verifiedAt: cutoff, overrides: { agency: route.agency, access: route.access, status, stateCaution: projection.caution }, legacyProjection: projection });
  const statusId = `STATUS-UK-ROUTE-${scheme.id.slice(4)}`; source.statusIds.push(statusId);
  statuses.push({ id: statusId, subjectId: scheme.id, existence: 'shared-programme-reference', intake: 'current-intake-unconfirmed', budget: 'unconfirmed', confidence: 'medium',
    evidenceGrade: source.classification, sourceIds: [source.id], verifiedAt: cutoff, nextCheckAt: nextCheck });
}
const requiredSourceIds = new Set(claims.flatMap(c => c.sourceIds));
const commonSourceIds = new Set(commonSources.map(s => s.id));
sources.push(...inheritedSources.filter(s => requiredSourceIds.has(s.id) && !commonSourceIds.has(s.id)));
for (const source of sources) {
  source.claimIds = claims.filter(c => c.sourceIds.includes(source.id)).map(c => c.id);
  source.statusIds = statuses.filter(s => s.sourceIds.includes(source.id)).map(s => s.id);
}
const appStatic = structuredClone(hp);
appStatic.pools.contacts = appStatic.pools.contacts.map(v => v.replaceAll('HIMURJA', 'UREDA').replaceAll('Startup Himachal', 'Startup Uttarakhand'));
appStatic.pools.gates[9] = 'Product licences, quality standards and pollution approvals apply.';
appStatic.pools.sources = sources.map(s => s.url);
const sectors = read('scheme-data/states/himachal-pradesh/sectors.json').sectors
  .filter(s => !otherState.test(s.a + ' ' + s.sub))
  .map(({ migrationSource, ...s }, i) => ({ ...s, n: i, sr: 0 }));
for (const [code, a, sub, m, st] of seed.activities) sectors.push({ id: `SEC-UK-${code}`, a, sub, m, st, ec: 0, ms: 0, ap: 0, rg: 0, ct: 0, gt: 0, sr: 0, n: sectors.length });
const schemeOrder = [...schemes.map(s => s.id), ...selected.map(s => s.scheme.id)];
const schemeIndex = new Map(schemeOrder.map((id, i) => [id, i]));
const originalRecords = fs.existsSync('research/uttarakhand/records-before-expansion.json') ? read('research/uttarakhand/records-before-expansion.json') : [];
const originalMappingIds = new Map(originalRecords.filter(r=>r.sectorId&&r.schemeId).map(r=>[`${r.sectorId}/${r.schemeId}`,r.id]));
const reviews = [], compressedLinks = {};
const fits = (def, sector) => (!def.macros || def.macros.includes(sector.m)) && (!def.stages || def.stages.includes(sector.st)) && (!def.pattern || new RegExp(def.pattern, 'i').test(sector.a + ' ' + sector.sub));
for (const [i, sector] of sectors.entries()) {
  const routes = [...schemes.map(s => ({ id: s.id, def: s.researchDefinition, source: sourceByCode.get(s.researchDefinition.source) })),
    ...selected.map(({ scheme, route }) => ({ id: scheme.id, def: route, source: sourceByCode.get(route.source) }))].filter(r => fits(r.def, sector));
  compressedLinks[i] = routes.map(r => [schemeIndex.get(r.id), 2, 1, 0]);
  for (const r of routes) reviews.push({ id: originalMappingIds.get(`${sector.id}/${r.id}`) ?? `MAP-UK-${sector.id}-${r.id}`, sectorId: sector.id, schemeId: r.id,
    disposition: 'reviewed-conditional', currentApplicability: 'Conditional', predicate: { macros: r.def.macros, stages: r.def.stages, activityPattern: r.def.pattern ?? null },
    unitStage: r.def.stage ?? 'Programme-specific', valueChainStage: appStatic.stages[sector.st], applicantProfile: r.def.eligible ?? appStatic.pools.applicants[sector.m],
    whyMapped: r.def.rationale ?? 'Activity and value-chain stage match the published programme surface; applicant and component eligibility remain mandatory.',
    condition: r.def.caution ?? caution, applicationSequence: appStatic.pools.seq[0], convergence: 'Disclose other assistance; apply the programme top-up and no-double-funding rules.', sourceIds: [r.source.id], verifiedAt: cutoff, effectiveFrom: cutoff });
}
const agencyInventory = seed.agencies.map(a => ({ ...a, id: `AGENCY-UK-${a.code}`, sourceIds: [sourceByCode.get(a.source).id], checkedAt: cutoff, nextCheckAt: nextCheck }));
for (const scheme of schemes) scheme.legacy.reach = reviews.filter(r => r.schemeId === scheme.id).length;
for (const implementation of implementations) implementation.legacyProjection.reach = reviews.filter(r => r.schemeId === implementation.schemeId).length;
const coverage = agencyInventory.flatMap(a => sectors.map(s => {
  const relatedSources = sources.filter(source=>source.issuer===sourceByCode.get(a.source).issuer).map(source=>source.id);
  const applicable = a.macros.includes(s.m) && reviews.some(r => r.sectorId === s.id && r.sourceIds.some(id=>relatedSources.includes(id)));
  const relevant = a.macros.includes(s.m);
  return { id: `COVERAGE-UK-${a.code}-${s.id}`, agencyId: a.id, sectorId: s.id, beneficiary: appStatic.pools.applicants[s.m], enterpriseStage: appStatic.stages[s.st],
    supportType: 'productive assets, finance, subsidy or facilitation', required: true, outcome: applicable ? 'verified-applicable' : relevant ? 'candidate-pending' : 'not-relevant',
    evidence: applicable ? 'A conditionally mapped route is documented; this is not confirmation of intake.' : relevant ? 'Current beneficiary terms or an activity-specific route remain unverified.' : 'Outside the enterprise remit examined for this agency; no absence claim.',
    sourceIds: a.sourceIds, verifiedAt: cutoff };
}));
const limitations = seed.limitations;
appStatic.meta = { title: 'Uttarakhand Scheme Finder', subtitle: 'Uttarakhand enterprise, agriculture, tourism and livelihood schemes', verified: cutoff,
  counts: { sectors: sectors.length, schemes: schemeOrder.length, links: reviews.length } };
const reverseIndexes = Object.fromEntries([...claims, ...statuses, ...reviews].map(r => [r.id, r.sourceIds]));
const manifest = { schemaVersion: 'state-pack-1', stateId: 'STATE-IN-UK', slug: 'uttarakhand', name: 'Uttarakhand', researchCutoff: cutoff, schemeOrder,
  acceptedMethodFindingIds: [], methodTraceability: {}, reverseIndexes, defaultExclusions: seed.exclusions, appStatic,
  accepted: false, acceptance: { accepted: false, schemaVersion: 'state-pack-acceptance-1', runId: 'UK-ADD-STATE-2026-10-02', cutoff, limitations,
    counts: { stateSchemes: schemes.length, sharedImplementations: implementations.length, sectors: sectors.length, mappings: reviews.length, sources: sources.length, candidates: candidates.length, agencyInventoryChecks: agencyInventory.length },
    gateResults: { asOf: cutoff, passed: null, errorCount: null }, coverageComplete: false } };
for (const [name, body] of Object.entries({ manifest, schemes: { schemes: schemes.map(({ researchDefinition, ...s }) => s) }, implementations: { implementations }, sectors: { sectors },
  mappings: { reviews, compressedLinks, count: reviews.length }, sources: { sources, agencyInventory }, evidence: { claims, statuses }, coverage: { coverage }, candidates: { candidates },
  contacts: { contacts: seed.agencies.map(a => ({ name: sourceByCode.get(a.source).issuer, use: a.macros.map(m => appStatic.macros[m]).join('; '), url: sourceByCode.get(a.source).url, note: 'Official programme page. Confirm the current application channel and sanction conditions with the department.' })) },
  'component-norms': { norms: [] }, components: { components: [] }, legacy: { legacy: seed.legacy } })) write(path.join(out, `${name}.json`), { schemaVersion: 'state-pack-1', ...body });
const validation = await validateRepositoryState('uttarakhand');
manifest.acceptance.gateResults.passed = validation.ok; manifest.acceptance.gateResults.errorCount = validation.errors.length;
write(path.join(out, 'manifest.json'), manifest);
if (!validation.ok) throw new Error(JSON.stringify(validation.errors));
const before = read('research/uttarakhand/out-of-scope-before.json');
for (const [file, hash] of Object.entries(before)) if (crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== hash) throw new Error(`OUT_OF_SCOPE_CHANGE: ${file}`);
const records = [...schemes.map(({ researchDefinition, ...s }) => s), ...implementations, ...claims, ...statuses, ...reviews];
const beforeRecords = fs.existsSync('research/uttarakhand/records-before-expansion.json') ? read('research/uttarakhand/records-before-expansion.json') : [];
write('research/uttarakhand/change-report.json', diffRecords(beforeRecords, records));
write('research/uttarakhand/effective-history.json', { cutoff, previousCutoff: cutoff, previousSnapshot: 'records-before-expansion.json', revisions: diffRecords(beforeRecords, records).changes.filter(c=>c.before&&c.category!=='unchanged').map(c=>({id:c.id,category:c.category,previous:c.before,current:c.after,recordedAt:cutoff})) });
write('research/uttarakhand/qa.json', { cutoff, validation, outOfScopeHashGuard: 'passed', counts: manifest.acceptance.counts, limitations, coverageComplete: false });
console.log(JSON.stringify(manifest.acceptance.counts, null, 2));
