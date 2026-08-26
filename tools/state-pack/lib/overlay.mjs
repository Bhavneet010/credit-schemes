const ALLOWED = new Set(["agency", "access", "status", "stateContribution", "stateNorms", "stateCaution"]);

export function overlayScheme(commonScheme, implementation) {
  if (!implementation || implementation.schemeId !== commonScheme.id) {
    throw new Error("IMPLEMENTATION_SCHEME_MISMATCH");
  }
  const overrides = implementation.overrides ?? {};
  for (const key of Object.keys(overrides)) {
    if (!ALLOWED.has(key)) throw new Error(`ILLEGAL_OVERLAY_FIELD: ${key}`);
  }
  return {
    ...commonScheme,
    ...overrides,
    claimIds: [...new Set([...(commonScheme.claimIds ?? []), ...(implementation.claimIds ?? [])])],
    implementationId: implementation.id,
    stateId: implementation.stateId
  };
}
