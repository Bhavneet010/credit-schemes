import test from "node:test";
import assert from "node:assert/strict";
import { compileAllStates } from "../tools/state-pack/lib/app-compiler.mjs";
import { readFile } from "node:fs/promises";

test("state index points to every generated state dataset", async () => {
  const build = await compileAllStates();
  const punjabPack = JSON.parse(await readFile("scheme-data/states/punjab/manifest.json", "utf8"));
  const punjabEvidence = JSON.parse(await readFile("scheme-data/states/punjab/evidence.json", "utf8"));
  const punjabCoverage = JSON.parse(await readFile("scheme-data/states/punjab/coverage.json", "utf8"));
  assert.equal(build.index.defaultState, "himachal-pradesh");
  assert.deepEqual(build.index.states.map((state) => state.slug), ["himachal-pradesh", "punjab", "uttarakhand"]);
  assert.equal(build.datasets.get("himachal-pradesh").meta.stateId, "STATE-IN-HP");
  assert.equal(build.datasets.get("punjab").meta.stateId, "STATE-IN-PB");
  assert.ok(build.datasets.get("punjab").schemes.some((scheme) => scheme.id === "SCH-PB-IBDP26-CAPITAL"));
  assert.doesNotMatch(JSON.stringify(build.datasets.get("punjab").schemes), /Himachal|agriculture\.hp\.gov|himachal\.nic/i);
  assert.doesNotMatch(JSON.stringify({ pools: build.datasets.get("punjab").pools, sectors: build.datasets.get("punjab").sectors }), /Himachal|Baddi|mountain logistics|chilling hours|agriculture\.hp\.gov|himachal\.nic/i);
  assert.ok(punjabCoverage.coverage.some((cell) => cell.outcome === "verified-applicable"));
  assert.ok(punjabCoverage.coverage.some((cell) => cell.outcome === "not-relevant"));
  assert.ok(punjabCoverage.coverage.some((cell) => cell.outcome === "candidate-pending"));
  assert.ok(Object.keys(punjabPack.reverseIndexes).length >= punjabEvidence.claims.length + punjabEvidence.statuses.length);
  assert.ok(punjabEvidence.claims.every((claim) => punjabPack.schemeOrder.includes(claim.subjectId)));
  assert.ok(punjabEvidence.statuses.every((status) => punjabPack.schemeOrder.includes(status.subjectId)));
  assert.doesNotMatch(JSON.stringify(punjabEvidence), /PRADHAN-MANTRI-FASAL-BIMA|PMFBY/i);
});

test("product metadata is state-neutral and shortcuts are state-aware", async () => {
  const html = await readFile("app/index.html", "utf8");
  const manifest = JSON.parse(await readFile("app/manifest.webmanifest", "utf8"));
  assert.match(html, /<title>Scheme Finder<\/title>/);
  assert.equal(manifest.name, "Scheme Finder");
  assert.match(manifest.description, /Indian state and central government schemes/);
  assert.ok(manifest.shortcuts.every((shortcut) => shortcut.url.includes("#/state/")));
});

test("compiled records expose stable IDs and separated status evidence", async () => {
  const hp = (await compileAllStates()).datasets.get("himachal-pradesh");
  assert.ok(hp.sectors.every((record) => /^SEC(TOR)?-/.test(record.id)));
  assert.ok(hp.schemes.every((record) => /^(SCH|SCHEME|COMPONENT)-/.test(record.id)));
  assert.ok(hp.schemes.every((record) => record.statusDetail?.existence && record.statusDetail?.intake && record.statusDetail?.verifiedAt));
  assert.equal(hp.meta.counts.schemes, 188);
  assert.equal(hp.meta.counts.links, 8700);
});

test("compiled schemes classify joint routes as state and national routes as central", async () => {
  const punjab = (await compileAllStates()).datasets.get("punjab");
  const originById = new Map(punjab.schemes.map((scheme) => [scheme.id, scheme.origin]));

  assert.equal(originById.get("SCH-PB-IBDP26-CAPITAL"), "state");
  assert.equal(originById.get("SCH-PMKSY-PER-DROP-MORE-CROP-MICRO-IRRIGATION-8D174C"), "state");
  assert.equal(originById.get("SCH-PRIME-MINISTER-S-EMPLOYMENT-GENERATION-PRO-D1FEA0"), "central");
  assert.equal(originById.get("SCH-TREDS-INVOICE-DISCOUNTING-B2B9D2"), "central");
  assert.ok(punjab.schemes.every((scheme) => scheme.origin === "state" || scheme.origin === "central"));
});
