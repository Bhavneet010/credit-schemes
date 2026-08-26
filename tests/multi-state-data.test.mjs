import test from "node:test";
import assert from "node:assert/strict";
import { compileAllStates } from "../tools/state-pack/lib/app-compiler.mjs";
import { readFile } from "node:fs/promises";

test("state index points to every generated state dataset", async () => {
  const build = await compileAllStates();
  assert.equal(build.index.defaultState, "himachal-pradesh");
  assert.deepEqual(build.index.states.map((state) => state.slug), ["himachal-pradesh"]);
  assert.equal(build.datasets.get("himachal-pradesh").meta.stateId, "STATE-IN-HP");
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
