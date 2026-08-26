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

test("install precaches multi-state data, install prompt, and approved visual shell", async () => {
  let cachedShell = [];
  const caches = { open: async () => ({ addAll: async (files) => { cachedShell = files; } }) };
  const listeners = loadServiceWorker(caches);
  let installWork;

  listeners.install({ waitUntil(promise) { installWork = promise; } });
  await installWork;

  assert.ok(cachedShell.includes("./theme.css"));
  assert.ok(cachedShell.includes("./svg-v5.css"));
  assert.ok(cachedShell.includes("./visual-v7.css"));
  assert.ok(cachedShell.includes("./assets/hero-alpine-crest.png"));
  assert.ok(cachedShell.includes("./install.css"));
  assert.ok(cachedShell.includes("./install.js"));
  assert.ok(cachedShell.includes("./data/states.json"));
  assert.ok(cachedShell.includes("./data/himachal-pradesh.json"));
  assert.ok(!cachedShell.includes("./data.json"));
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

test("activation removes all earlier Scheme Finder caches", async () => {
  const deleted = [];
  const caches = {
    keys: async () => ["hpsf-v1", "hpsf-v8", "hpsf-v12", "scheme-finder-v9", "scheme-finder-v13", "other-app-cache"],
    delete: async (key) => { deleted.push(key); }
  };
  const listeners = loadServiceWorker(caches);
  let activationWork;

  listeners.activate({ waitUntil(promise) { activationWork = promise; } });
  await activationWork;

  assert.deepEqual(deleted, ["hpsf-v1", "hpsf-v8", "hpsf-v12", "scheme-finder-v9"]);
});
