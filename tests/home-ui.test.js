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

test("settings menu replaces the bottom navigation and opens Saved and More", async () => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  await page.locator("#q").waitFor();

  assert.equal(await page.locator(".tabbar").count(), 0);

  const settings = page.getByRole("button", { name: "Open settings" });
  await settings.click();

  const menu = page.getByRole("menu", { name: "Settings" });
  await assert.doesNotReject(() => menu.waitFor({ state: "visible" }));
  assert.equal(await menu.getByRole("menuitem", { name: "Saved" }).count(), 1);
  assert.equal(await menu.getByRole("menuitem", { name: "More" }).count(), 1);

  await menu.getByRole("menuitem", { name: "Saved" }).click();
  await page.getByRole("heading", { name: "Saved" }).waitFor();
  assert.match(page.url(), /#\/saved$/);

  await context.close();
});

test("home keeps search central and offers only the two requested starting routes", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  await page.locator("#q").waitFor();

  await page.getByRole("heading", { level: 1, name: "Find the right scheme" }).waitFor();
  assert.equal(await page.getByText("Browse by sector", { exact: true }).count(), 0);
  assert.equal(await page.getByText("How to use this app", { exact: true }).count(), 0);

  const startHere = page.locator(".start-here");
  assert.equal(await startHere.getByRole("link").count(), 2);
  assert.equal(await startHere.getByRole("link", { name: /All schemes and routes/ }).count(), 1);
  assert.equal(await startHere.getByRole("link", { name: /Departments and portals/ }).count(), 1);

  const searchBox = await page.locator("#q").boundingBox();
  const startHereBox = await startHere.boundingBox();
  assert.ok(searchBox, "search input should be visible");
  assert.ok(startHereBox, "start-here routes should be visible");
  assert.ok(Math.abs((searchBox.x + searchBox.width / 2) - 720) < 2, "search should be horizontally centered");
  assert.ok(
    Math.abs((startHereBox.x + startHereBox.width / 2) - 720) < 2,
    "start-here routes should be centered beneath search"
  );
  assert.ok(
    searchBox.y > 300 && searchBox.y < 500,
    `search should sit near the vertical center of the first viewport; received y=${searchBox.y}`
  );

  await context.close();
});

test("home header keeps the brand left and settings at the far right", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  await page.locator("#q").waitFor();

  const brand = await page.locator(".brand").boundingBox();
  const settings = await page.locator(".settings-toggle").boundingBox();
  assert.ok(brand && brand.x < 120, `brand should sit at the left edge; received x=${brand && brand.x}`);
  assert.ok(settings && settings.x > 1300, `settings should sit at the right edge; received x=${settings && settings.x}`);

  await context.close();
});

test("search uses only the app clear control instead of the browser cancel button", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  const search = page.locator("#q");
  await search.fill("apple orchard");
  await page.waitForTimeout(200);

  const searchAppearance = await search.evaluate((input) => getComputedStyle(input).appearance);
  assert.equal(searchAppearance, "none");
  assert.equal(await page.getByRole("button", { name: "Clear" }).count(), 1);

  await context.close();
});
