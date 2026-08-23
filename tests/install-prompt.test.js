const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const playwrightPath = process.env.CODEX_PLAYWRIGHT_PATH || "playwright";
const { chromium } = require(playwrightPath);
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const appRoot = path.resolve(__dirname, "..", "app");
const mime = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json"
};

let browser;
let server;
let baseUrl;

before(async () => {
  server = http.createServer((request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
    const filePath = path.resolve(appRoot, relativePath);

    if (!filePath.startsWith(appRoot + path.sep) && filePath !== path.join(appRoot, "index.html")) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, contents) => {
      if (error) {
        response.writeHead(404).end("Not found");
        return;
      }
      response.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
      response.end(contents);
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath: chromePath, headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

// The banner slides in, so measurements have to wait for the entrance transition.
async function settled(locator) {
  await locator.waitFor({ state: "visible" });
  await locator.evaluate((el) => new Promise((resolve) => {
    if (getComputedStyle(el).transitionDuration === "0s") { resolve(); return; }
    el.addEventListener("transitionend", () => resolve(), { once: true });
    setTimeout(resolve, 1000);
  }));
}

// The browser only fires beforeinstallprompt for a real installable visit, so the
// tests dispatch their own event to exercise the native path.
const FAKE_PROMPT = `(() => {
  window.__installPromptCalls = 0;
  const event = new Event("beforeinstallprompt");
  event.prompt = () => { window.__installPromptCalls += 1; return Promise.resolve(); };
  event.userChoice = Promise.resolve({ outcome: window.__installOutcome || "accepted" });
  window.dispatchEvent(event);
})()`;

test("opening the app on a phone immediately offers the install banner", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);

  const banner = page.getByRole("dialog", { name: "Install HP Scheme Finder" });
  await settled(banner);
  assert.equal(await banner.getByRole("button", { name: "Install", exact: true }).count(), 1);
  assert.equal(await banner.getByRole("button", { name: "Not now", exact: true }).count(), 1);

  // Full-width sheet resting on the bottom edge, without swallowing the search field.
  const viewport = page.viewportSize();
  const box = await banner.boundingBox();
  assert.ok(box, "banner should be laid out");
  assert.ok(
    Math.abs(box.y + box.height - viewport.height) < 2,
    `banner should rest on the bottom edge; received y=${box.y} height=${box.height}`
  );
  assert.ok(Math.abs(box.width - viewport.width) < 2, "phone banner should span the viewport");
  await assert.doesNotReject(() => page.locator("#q").waitFor({ state: "visible" }));

  const search = await page.locator("#q").boundingBox();
  assert.ok(search && search.y + search.height <= box.y, "search field should stay clear of the banner");

  await context.close();
});

test("on a wide screen the offer is a corner card, not a full-width sheet", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);

  const banner = page.getByRole("dialog", { name: "Install HP Scheme Finder" });
  await settled(banner);

  const viewport = page.viewportSize();
  const box = await banner.boundingBox();
  assert.ok(box, "banner should be laid out");
  assert.ok(box.width < 460, `corner card should stay narrow; received width=${box.width}`);
  assert.ok(
    box.x + box.width < viewport.width && box.y + box.height < viewport.height,
    "corner card should sit inside the viewport, clear of both edges"
  );

  await context.close();
});

test("install fires the browser's own prompt when one is available", async () => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  await page.getByRole("dialog", { name: "Install HP Scheme Finder" }).waitFor({ state: "visible" });
  await page.evaluate(FAKE_PROMPT);

  await page.getByRole("button", { name: "Install", exact: true }).click();

  assert.equal(await page.evaluate(() => window.__installPromptCalls), 1);
  await page.getByRole("dialog", { name: "Install HP Scheme Finder" }).waitFor({ state: "detached" });

  await context.close();
});

test("without a native prompt the banner explains how to add the app by hand", async () => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  const banner = page.getByRole("dialog", { name: "Install HP Scheme Finder" });
  await banner.waitFor({ state: "visible" });

  await banner.getByRole("button", { name: "Install", exact: true }).click();

  await banner.locator(".install-steps").waitFor({ state: "visible" });
  assert.match(await banner.locator(".install-steps").innerText(), /install|Add to Home/i);
  assert.equal(await banner.getByRole("button", { name: "Got it", exact: true }).count(), 1);

  await context.close();
});

test("'Not now' clears the banner for the visit but it returns on the next one", async () => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  const banner = page.getByRole("dialog", { name: "Install HP Scheme Finder" });
  await banner.waitFor({ state: "visible" });
  await banner.getByRole("button", { name: "Not now", exact: true }).click();
  await banner.waitFor({ state: "detached" });

  // Same tab, so the dismissal holds across reloads and in-app navigation.
  await page.reload();
  await page.locator("#q").waitFor();
  assert.equal(await page.getByRole("dialog", { name: "Install HP Scheme Finder" }).count(), 0);

  // A fresh visit gets the offer again.
  const secondVisit = await browser.newContext({ serviceWorkers: "block" });
  const secondPage = await secondVisit.newPage();
  secondPage.setDefaultTimeout(3000);
  await secondPage.goto(baseUrl);
  await assert.doesNotReject(() =>
    secondPage.getByRole("dialog", { name: "Install HP Scheme Finder" }).waitFor({ state: "visible" })
  );

  await secondVisit.close();
  await context.close();
});

test("an installed app never shows the banner again", async () => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  await page.getByRole("dialog", { name: "Install HP Scheme Finder" }).waitFor({ state: "visible" });
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await page.getByRole("dialog", { name: "Install HP Scheme Finder" }).waitFor({ state: "detached" });

  const returning = await browser.newContext({ serviceWorkers: "block", storageState: await context.storageState() });
  const returningPage = await returning.newPage();
  returningPage.setDefaultTimeout(3000);
  await returningPage.goto(baseUrl);
  await returningPage.locator("#q").waitFor();
  assert.equal(await returningPage.getByRole("dialog", { name: "Install HP Scheme Finder" }).count(), 0);

  await returning.close();
  await context.close();
});
