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

test("mobile home uses a compact type scale and tighter route cards", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  await page.locator("#q").waitFor();

  const heroSize = Number.parseFloat(await page.locator(".home-hero h1").evaluate((element) => getComputedStyle(element).fontSize));
  const sectionSize = Number.parseFloat(await page.locator(".start-here > h2").evaluate((element) => getComputedStyle(element).fontSize));
  const routeTitleSize = Number.parseFloat(await page.locator(".route-copy strong").first().evaluate((element) => getComputedStyle(element).fontSize));
  const routeBox = await page.locator(".start-route").first().boundingBox();

  assert.ok(heroSize <= 38, `mobile hero title should be at most 38px; received ${heroSize}px`);
  assert.ok(sectionSize <= 24, `mobile section title should be at most 24px; received ${sectionSize}px`);
  assert.ok(routeTitleSize <= 17, `mobile route title should be at most 17px; received ${routeTitleSize}px`);
  assert.ok(routeBox && routeBox.height <= 104, `mobile route card should be at most 104px tall; received ${routeBox && routeBox.height}px`);

  await context.close();
});

test("mobile search is visually distinct with a light gradient", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  const search = page.locator("#q");
  await search.waitFor();

  const styles = await search.evaluate((input) => {
    const computed = getComputedStyle(input);
    return {
      backgroundImage: computed.backgroundImage,
      fontSize: Number.parseFloat(computed.fontSize),
      height: Number.parseFloat(computed.height)
    };
  });

  assert.match(styles.backgroundImage, /linear-gradient/, "search should use a light gradient surface");
  assert.ok(styles.fontSize >= 16, `search text should stay at least 16px to avoid mobile auto-zoom; received ${styles.fontSize}px`);
  assert.ok(styles.height <= 62, `mobile search should be no taller than 62px; received ${styles.height}px`);

  await context.close();
});

test("mobile search keeps the compact 16px scale when results appear", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  const search = page.locator("#q");
  await search.fill("apple orchard");
  await page.waitForTimeout(200);

  const styles = await search.evaluate((input) => {
    const computed = getComputedStyle(input);
    return { fontSize: Number.parseFloat(computed.fontSize), height: Number.parseFloat(computed.height) };
  });

  assert.equal(styles.fontSize, 16, `active mobile search should remain 16px; received ${styles.fontSize}px`);
  assert.ok(styles.height <= 60, `active mobile search should remain no taller than 60px; received ${styles.height}px`);

  await context.close();
});

test("mobile hero keeps the decorative SVG flourishes visible", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  const hero = page.locator(".home-hero");
  await hero.waitFor();

  const flourishes = await hero.evaluate((element) => ["::before", "::after"].map((pseudo) => {
    const computed = getComputedStyle(element, pseudo);
    return {
      display: computed.display,
      backgroundImage: computed.backgroundImage,
      opacity: Number.parseFloat(computed.opacity),
      width: Number.parseFloat(computed.width),
      left: Number.parseFloat(computed.left),
      right: Number.parseFloat(computed.right)
    };
  }));

  for (const flourish of flourishes) {
    assert.notEqual(flourish.display, "none", "decorative SVG flourish should render on mobile");
    assert.match(flourish.backgroundImage, /svg\+xml/, "mobile flourish should retain the SVG artwork");
    assert.ok(flourish.opacity >= 0.75, `mobile flourish should have clear contrast; received opacity ${flourish.opacity}`);
    assert.ok(flourish.width >= 96 && flourish.width <= 110, `mobile flourish should be compact enough to fit wholly on screen; received width ${flourish.width}px`);
    assert.ok(Math.min(flourish.left, flourish.right) >= 0, `mobile flourish should not be clipped by the viewport; received left ${flourish.left}px and right ${flourish.right}px`);
  }

  await context.close();
});

test("mobile search results retain the decorative SVG flourishes", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  await page.locator("#q").fill("apple orchard");
  await page.waitForTimeout(200);

  const flourishes = await page.locator(".home-hero").evaluate((element) => ["::before", "::after"].map((pseudo) => {
    const computed = getComputedStyle(element, pseudo);
    return {
      display: computed.display,
      opacity: Number.parseFloat(computed.opacity),
      width: Number.parseFloat(computed.width),
      left: Number.parseFloat(computed.left),
      right: Number.parseFloat(computed.right)
    };
  }));

  for (const flourish of flourishes) {
    assert.notEqual(flourish.display, "none", "decorative SVG flourish should remain visible with search results");
    assert.ok(flourish.opacity >= 0.6, `active-search flourish should have clear contrast; received opacity ${flourish.opacity}`);
    assert.ok(flourish.width >= 78 && flourish.width <= 90, `active-search flourish should be compact enough to fit wholly on screen; received width ${flourish.width}px`);
    assert.ok(Math.min(flourish.left, flourish.right) >= 0, `active-search flourish should not be clipped; received left ${flourish.left}px and right ${flourish.right}px`);
  }

  await context.close();
});

test("all starting routes stay compact without overflow at 320px", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 320, height: 800 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  await page.locator("#q").waitFor();

  const routeHeights = await page.locator(".start-route").evaluateAll((routes) => routes.map((route) => route.getBoundingClientRect().height));
  const viewport = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));

  assert.ok(routeHeights.length > 0, "starting routes should render");
  for (const height of routeHeights) {
    assert.ok(height <= 104, `every route card should be at most 104px tall at 320px; received ${height}px`);
  }
  assert.equal(viewport.scrollWidth, viewport.width, "mobile home should not overflow horizontally at 320px");

  await context.close();
});

test("a newly activated service worker refreshes the open app once", async () => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  await context.addInitScript(() => {
    let controllerChange;
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        addEventListener(type, listener) {
          if (type === "controllerchange") controllerChange = listener;
        },
        register() { return Promise.resolve(); }
      }
    });
    Object.defineProperty(window, "__emitControllerChange", {
      configurable: true,
      value: () => { if (controllerChange) controllerChange(); }
    });
    const loads = Number(sessionStorage.getItem("sw-refresh-loads") || 0) + 1;
    sessionStorage.setItem("sw-refresh-loads", String(loads));
  });

  const page = await context.newPage();
  page.setDefaultTimeout(3000);
  await page.goto(baseUrl);
  const initialLoads = Number(await page.evaluate(() => sessionStorage.getItem("sw-refresh-loads")));

  await page.evaluate(() => window.__emitControllerChange());
  await page.waitForTimeout(500);
  const refreshedLoads = Number(await page.evaluate(() => sessionStorage.getItem("sw-refresh-loads")));

  assert.equal(refreshedLoads, initialLoads + 1, "controller change should reload the page exactly once");

  await context.close();
});
