import { loadStatePack } from "./validation.mjs";

function withoutMigration(record) {
  if (!record || typeof record !== "object") return record;
  const { migrationSource, ...rest } = record;
  return rest;
}

export function compileStateForLegacyApp(pack) {
  const manifest = pack.manifest;
  const schemes = [...(pack.common?.schemes?.schemes ?? []), ...(pack.schemes?.schemes ?? [])];
  const byId = new Map(schemes.map((scheme) => [scheme.id, scheme.legacy]));
  const orderedSchemes = manifest.schemeOrder.map((id) => {
    const scheme = byId.get(id);
    if (!scheme) throw new Error(`UNRESOLVED_SCHEME_ORDER: ${id}`);
    return scheme;
  });
  const output = {
    ...manifest.appStatic,
    sectors: (pack.sectors?.sectors ?? []).map(withoutMigration),
    schemes: orderedSchemes,
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
