import { loadStatePack } from "./validation.mjs";
import { readdir } from "node:fs/promises";

function withoutMigration(record) {
  if (!record || typeof record !== "object") return record;
  const { migrationSource, ...rest } = record;
  return rest;
}

function schemeOrigin(scheme) {
  if (scheme.issuerType === "state" || scheme.issuerType === "joint") return "state";
  if (scheme.issuerType === "central" || scheme.issuerType === "institutional") return "central";
  throw new Error(`UNSUPPORTED_SCHEME_ISSUER_TYPE: ${scheme.id} (${scheme.issuerType ?? "missing"})`);
}

export function compileStateForLegacyApp(pack) {
  const manifest = pack.manifest;
  const implementations = pack.implementations?.implementations ?? [];
  const implementationByScheme = new Map(implementations.map((item) => [item.schemeId, item]));
  const sharedSchemes = (pack.common?.schemes?.schemes ?? []).filter((scheme) => implementationByScheme.has(scheme.id));
  const stateSchemes = pack.schemes?.schemes ?? [];
  const schemes = [...sharedSchemes, ...stateSchemes];
  const originByScheme = new Map(schemes.map((scheme) => [scheme.id, schemeOrigin(scheme)]));
  const byId = new Map(schemes.map((scheme) => {
    const implementation = implementationByScheme.get(scheme.id);
    if (implementation?.legacyProjection) return [scheme.id, implementation.legacyProjection];
    if (scheme.legacy) return [scheme.id, scheme.legacy];
    const overrides = implementation?.overrides ?? {};
    return [scheme.id, {
      ...(scheme.legacyCore ?? {}), id: scheme.id, name: scheme.name,
      agency: overrides.agency ?? "", access: overrides.access ?? "", status: overrides.status ?? "",
      caution: overrides.stateCaution ?? ""
    }];
  }));
  const orderedSchemes = manifest.schemeOrder.map((id) => {
    const scheme = byId.get(id);
    if (!scheme) throw new Error(`UNRESOLVED_SCHEME_ORDER: ${id}`);
    return scheme;
  });
  const statusBySubject = new Map((pack.evidence?.statuses ?? []).map((status) => [status.subjectId, status]));
  const sources = [...(pack.common?.sources?.sources ?? []), ...(pack.sources?.sources ?? [])];
  const sourcesById = new Map(sources.map((source) => [source.id, source]));
  const claimsBySubject = new Map();
  for (const claim of pack.evidence?.claims ?? []) {
    const list = claimsBySubject.get(claim.subjectId) ?? [];
    list.push(claim);
    claimsBySubject.set(claim.subjectId, list);
  }
  const enrichedSchemes = orderedSchemes.map((scheme) => {
    const claims = claimsBySubject.get(scheme.id) ?? [];
    const sourceIds = [...new Set(claims.flatMap((claim) => claim.sourceIds ?? []))];
    const status = statusBySubject.get(scheme.id);
    return {
      ...scheme,
      origin: originByScheme.get(scheme.id),
      statusDetail: status ? {
        existence: status.existence,
        intake: status.intake,
        budget: status.budget,
        verifiedAt: status.verifiedAt,
        nextCheckAt: status.nextCheckAt,
        confidence: status.confidence
      } : null,
      evidenceLinks: sourceIds.map((id) => sourcesById.get(id)).filter(Boolean).slice(0, 8).map((source) => ({ id: source.id, title: source.title, url: source.url, retrievedAt: source.retrievedAt }))
    };
  });
  const candidateDispositions = {};
  for (const candidate of pack.candidates?.candidates ?? []) candidateDispositions[candidate.disposition] = (candidateDispositions[candidate.disposition] ?? 0) + 1;
  const coverageOutcomes = {};
  for (const cell of pack.coverage?.coverage ?? []) coverageOutcomes[cell.outcome] = (coverageOutcomes[cell.outcome] ?? 0) + 1;
  const output = {
    ...manifest.appStatic,
    meta: {
      ...manifest.appStatic.meta,
      stateId: manifest.stateId,
      stateSlug: manifest.slug,
      stateName: manifest.name,
      research: {
        cutoff: manifest.researchCutoff,
        candidateDispositions,
        coverageOutcomes,
        limitations: manifest.acceptance?.limitations ?? []
      }
    },
    sectors: (pack.sectors?.sectors ?? []).map(withoutMigration),
    schemes: enrichedSchemes,
    links: pack.mappings.compressedLinks,
    norms: (pack["component-norms"]?.norms ?? []).map(withoutMigration),
    contacts: (pack.contacts?.contacts ?? []).map(withoutMigration),
    legacy: (pack.legacy?.legacy ?? []).map(withoutMigration)
  };
  if (output.sectors.length !== output.meta.counts.sectors || output.schemes.length !== output.meta.counts.schemes) {
    throw new Error("APP_COUNT_MISMATCH");
  }
  const linkCount = Object.values(output.links).reduce((sum, rows) => sum + rows.length, 0);
  if (linkCount !== output.meta.counts.links) throw new Error(`APP_LINK_COUNT_MISMATCH: ${linkCount}`);
  return output;
}

export async function compileRepositoryState(stateSlug, root = "scheme-data") {
  return compileStateForLegacyApp(await loadStatePack(stateSlug, root));
}

export async function compileAllStates(root = "scheme-data") {
  const entries = (await readdir(`${root}/states`, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const datasets = new Map();
  const states = [];
  for (const slug of entries) {
    const pack = await loadStatePack(slug, root);
    const dataset = compileStateForLegacyApp(pack);
    datasets.set(slug, dataset);
    states.push({
      id: pack.manifest.stateId,
      slug,
      name: pack.manifest.name,
      data: `data/${slug}.json`,
      verified: pack.manifest.researchCutoff,
      counts: dataset.meta.counts,
      limitations: pack.manifest.acceptance?.limitations ?? []
    });
  }
  const defaultState = states.some((state) => state.slug === "himachal-pradesh") ? "himachal-pradesh" : states[0]?.slug ?? null;
  return { index: { schemaVersion: "state-index-1", defaultState, states }, datasets };
}
