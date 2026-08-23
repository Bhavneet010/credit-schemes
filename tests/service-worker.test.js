const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadServiceWorker(caches) {
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
    fetch: () => Promise.reject(new Error("network unavailable in unit test")),
    location: { origin: "http://127.0.0.1:5757" },
    self
  });

  return listeners;
}

test("install precaches the approved v7 visual shell and alpine crest for offline use", async () => {
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
});

test("activation removes v1 through v6 shells so cached clients receive the v7 release", async () => {
  const deleted = [];
  const caches = {
    keys: async () => ["hpsf-v1", "other-app-cache", "hpsf-v2", "hpsf-v3", "hpsf-v4", "hpsf-v5", "hpsf-v6", "hpsf-v7"],
    delete: async (key) => { deleted.push(key); }
  };
  const listeners = loadServiceWorker(caches);
  let activationWork;

  listeners.activate({ waitUntil(promise) { activationWork = promise; } });
  await activationWork;

  assert.deepEqual(deleted, ["hpsf-v1", "hpsf-v2", "hpsf-v3", "hpsf-v4", "hpsf-v5", "hpsf-v6"]);
});
