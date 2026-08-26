import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

test("staged HP v2 app data reconciles with accepted verified additions", async () => {
  const [data, acceptance, candidates] = await Promise.all([
    readJson("outputs/himachal-pradesh/data.json"),
    readJson("research/hp-v2/acceptance.json"),
    readJson("research/hp-v2/candidates.json")
  ]);
  const additions = candidates.candidates.filter((candidate) => candidate.publishable);
  assert.equal(data.schemes.length, 182 + additions.length);
  assert.equal(data.meta.counts.schemes, data.schemes.length);
  assert.equal(data.meta.counts.links, Object.values(data.links).reduce((sum, entries) => sum + entries.length, 0));
  assert.equal(acceptance.counts.addedVerifiedSchemes, additions.length);
  assert.ok(additions.every((candidate) => data.schemes.some((scheme) => scheme.id === candidate.schemeId)));
});

test("acceptance preserves transparent evidence limitations", async () => {
  const acceptance = await readJson("research/hp-v2/acceptance.json");
  assert.equal(acceptance.accepted, true);
  assert.ok(acceptance.counts.indicativeClaims > 0);
  assert.ok(acceptance.limitations.some((limitation) => /indicative-only/i.test(limitation)));
  assert.equal(acceptance.gateResults.errorCount, 0);
});

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
}
