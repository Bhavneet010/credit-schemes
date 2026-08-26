const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadServiceWorker(caches, fetchImpl = () => Promise.reject(new Error("network unavailable in unit test"))) {
  const listeners = {};
  const source = fs.readFileSync(path.resolve(__dirname, "..", "app", "sw.js"), "utf8");
  const self = {
    addEventListener(type, listener) { listeners[type] = listener; },
    skipWaiting() { return Promise.resolve(); },
    clients: { claim() { return Promise.resolve(); } }
  };

  vm.runInNewContext(source, {
    URL,
    caches,
    fetch: fetchImpl,
    location: { origin: "http://127.0.0.1:5757" },
    self
  });

  return listeners;
}

test("install precaches the state index, default state, and approved visual shell", async () => {
  let cachedShell = [];
  const caches = {
    open: async () => ({
      addAll: async (files) => { cachedShell = files; }
    })
  };
  const listeners = loadServiceWorker(caches);
  let installWork;

  listeners.install({ waitUntil(promise) { installWork = promise; } });
  await installWork;

  assert.ok(cachedShell.includes("./theme.css"), "offline shell should include the active theme stylesheet");
  assert.ok(cachedShell.includes("./svg-v5.css"), "offline shell should include the versioned mobile SVG override");
  assert.ok(cachedShell.includes("./visual-v7.css"), "offline shell should include the approved versioned visual treatment");
  assert.ok(cachedShell.includes("./assets/hero-alpine-crest.png"), "offline shell should include the selected alpine crest asset");
  assert.ok(cachedShell.includes("./data/states.json"), "offline shell should include the state index");
  assert.ok(cachedShell.includes("./data/himachal-pradesh.json"), "offline shell should include the default state dataset");
  assert.ok(!cachedShell.includes("./data.json"), "offline shell should not use the legacy monolithic dataset");
});

test("successfully loaded additional state data is cached for offline reuse", async () => {
  let cachedRequest;
  const response = { ok: true, clone() { return this; } };
  const caches = {
    match: async () => null,
    open: async () => ({ put: async (request) => { cachedRequest = request.url; } })
  };
  const listeners = loadServiceWorker(caches, async () => response);
  let responseWork;
  const request = { method: "GET", mode: "cors", url: "http://127.0.0.1:5757/data/punjab.json" };
  listeners.fetch({ request, respondWith(promise) { responseWork = promise; } });
  assert.equal(await responseWork, response);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cachedRequest, request.url);
});

test("activation removes earlier app caches so clients receive the multi-state release", async () => {
  const deleted = [];
  const caches = {
    keys: async () => ["hpsf-v1", "other-app-cache", "hpsf-v8", "scheme-finder-v9"],
    delete: async (key) => { deleted.push(key); }
  };
  const listeners = loadServiceWorker(caches);
  let activationWork;

  listeners.activate({ waitUntil(promise) { activationWork = promise; } });
  await activationWork;

  assert.deepEqual(deleted, ["hpsf-v1", "hpsf-v8"]);
});
