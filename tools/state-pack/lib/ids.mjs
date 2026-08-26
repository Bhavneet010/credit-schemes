export function normalizeAlias(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function resolveAlias(index, value) {
  return index.get(normalizeAlias(value)) ?? null;
}

export function familyId(value) {
  return `FAMILY-${normalizeAlias(value).replace(/ /g, "-") || "UNCLASSIFIED"}`;
}
