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
  assert.match(page.url(), /#\/state\/himachal-pradesh\/saved$/);

  await context.close();
});

test("app loads the default State Pack and uses stable activity routes", async () => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);
  await page.goto(baseUrl);
  await page.locator("#q").fill("apple orchard");
  await page.waitForTimeout(200);
  const href = await page.locator('a[href*="/s/SEC-"]').first().getAttribute("href");
  assert.match(href, /^#\/state\/himachal-pradesh\/s\/SEC-/);
  assert.equal(await page.getByRole("combobox", { name: "Select state" }).inputValue(), "himachal-pradesh");
  assert.equal(await page.evaluate(() => localStorage.getItem("scheme-finder-selected-state-v1")), "himachal-pradesh");
  await context.close();
});

test("state selector switches datasets without a page reload", async () => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);
  const hp = JSON.parse(fs.readFileSync(path.join(appRoot, "data", "himachal-pradesh.json"), "utf8"));
  const fixture = {
    ...hp,
    meta: { ...hp.meta, stateId: "STATE-IN-TS", stateSlug: "test-state", stateName: "Test State", counts: { sectors: 2, schemes: 1, links: 0 } },
    sectors: hp.sectors.slice(0, 2).map((sector, index) => ({ ...sector, id: `SEC-TS-${index + 1}`, a: `Test activity ${index + 1}`, n: 0 })),
    schemes: [{ ...hp.schemes[0], id: "SCH-TS-ONE", name: "Test State Enterprise Scheme", reach: 0 }],
    links: { "0": [], "1": [] }
  };
  await page.route("**/data/states.json", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({
    defaultState: "himachal-pradesh",
    states: [
      { id: "STATE-IN-HP", slug: "himachal-pradesh", name: "Himachal Pradesh", data: "data/himachal-pradesh.json" },
      { id: "STATE-IN-TS", slug: "test-state", name: "Test State", data: "data/test-state.json" }
    ]
  }) }));
  await page.route("**/data/test-state.json", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify(fixture) }));
  await page.goto(`${baseUrl}#/state/himachal-pradesh/k/${encodeURIComponent(hp.schemes[0].id)}`);
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("combobox", { name: "Select state" }).selectOption("test-state");
  await page.getByText("2 business activities · 1 schemes", { exact: true }).waitFor();
  assert.match(page.url(), /#\/state\/test-state$/);
  assert.equal(await page.evaluate(() => localStorage.getItem("scheme-finder-selected-state-v1")), "test-state");
  await page.locator("#q").fill("Test State Enterprise Scheme");
  await page.waitForTimeout(200);
  await page.locator('a[href*="/k/SCH-TS-ONE"]').click();
  await page.getByRole("button", { name: "Save" }).click();
  const stateIds = await page.evaluate(() => JSON.parse(localStorage.getItem("scheme-finder-saved-v2")).map((item) => item.stateId).sort());
  assert.deepEqual(stateIds, ["STATE-IN-HP", "STATE-IN-TS"]);
  await context.close();
});

test("scheme scope toggle separates state and joint routes from central routes", async () => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(`${baseUrl}#/state/punjab/schemes`);
  await page.getByRole("heading", { name: "Schemes" }).waitFor();

  await page.getByRole("button", { name: "State" }).click();
  assert.match(page.url(), /#\/state\/punjab\/schemes\/state$/);
  await page.getByText("62 routes", { exact: true }).waitFor();
  assert.equal(await page.locator('[data-scheme-origin="state"]').count(), 62);
  assert.equal(await page.locator('[data-scheme-origin="central"]').count(), 0);
  assert.equal(await page.getByText("PMKSY – Per Drop More Crop (micro-irrigation)", { exact: true }).count(), 1);
  assert.equal(await page.getByText("Prime Minister's Employment Generation Programme (PMEGP)", { exact: true }).count(), 0);

  await page.getByRole("button", { name: "Central" }).click();
  assert.match(page.url(), /#\/state\/punjab\/schemes\/central$/);
  await page.getByText("94 routes", { exact: true }).waitFor();
  assert.equal(await page.locator('[data-scheme-origin="central"]').count(), 94);
  assert.equal(await page.locator('[data-scheme-origin="state"]').count(), 0);

  await page.getByRole("button", { name: "All" }).first().click();
  assert.match(page.url(), /#\/state\/punjab\/schemes\/all$/);
  await page.getByText("156 routes", { exact: true }).waitFor();

  await context.close();
});

test("scheme scope changes preserve a family filter when the destination contains it", async () => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(`${baseUrl}#/state/punjab/schemes`);
  await page.getByRole("button", { name: "Establishment and capital investment", exact: true }).click();
  await page.getByRole("button", { name: "State", exact: true }).click();

  assert.match(page.url(), /#\/state\/punjab\/schemes\/state\/Establishment%20and%20capital%20investment$/);
  assert.equal(await page.locator(".chip.on").innerText(), "Establishment and capital investment");
  assert.ok(await page.locator('[data-scheme-origin="state"]').count() > 0);

  await context.close();
});

test("legacy HP bookmarks migrate once to state-qualified stable IDs", async () => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("saved", JSON.stringify(["s0", "k0"])));
  await page.goto(baseUrl);
  await page.locator("#q").waitFor();
  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem("scheme-finder-saved-v2")));
  assert.equal(migrated.length, 2);
  assert.ok(migrated.every((item) => item.stateId === "STATE-IN-HP" && /^(SEC|SCH)-/.test(item.id)));
  await page.reload();
  await page.locator("#q").waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("scheme-finder-saved-v2")).length), 2);
  await context.close();
});

test("scheme detail separates existence, intake, budget, and evidence", async () => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);
  await page.goto(baseUrl);
  await page.locator("#q").fill("Mukhya Mantri Swavalamban Yojana");
  await page.waitForTimeout(200);
  await page.locator('a[href*="/k/SCH-"]').first().click();
  await page.getByRole("heading", { name: "Scheme status" }).waitFor();
  await page.getByText("Existence", { exact: true }).waitFor();
  await page.getByText("Intake", { exact: true }).waitFor();
  await page.getByText("Budget", { exact: true }).waitFor();
  await page.getByRole("heading", { name: "Evidence" }).waitFor();
  await context.close();
});

test("research view shows cutoff, candidate dispositions, coverage, and limitations", async () => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);
  await page.goto(`${baseUrl}#/state/himachal-pradesh/research`);
  await page.getByRole("heading", { name: "Research and coverage" }).waitFor();
  await page.getByText("Research cutoff", { exact: true }).waitFor();
  await page.getByRole("heading", { name: "Candidate disposition" }).waitFor();
  await page.getByRole("heading", { name: "Coverage outcomes" }).waitFor();
  await page.getByText("Material limitations", { exact: true }).waitFor();
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

test("mobile hero keeps the selected single-line headline and two-line brand lockup", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  await page.locator("#q").waitFor();

  const headlineMetrics = await page.locator(".home-hero h1").evaluate((heading) => {
    const computed = getComputedStyle(heading);
    return {
      height: heading.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(computed.lineHeight)
    };
  });
  const brandMetrics = await page.locator(".brand span").evaluate((label) => {
    const computed = getComputedStyle(label);
    return {
      height: label.getBoundingClientRect().height,
      lineHeight: Number.parseFloat(computed.lineHeight)
    };
  });

  assert.ok(headlineMetrics.height <= headlineMetrics.lineHeight * 1.15, "mobile hero headline should remain on one line");
  assert.ok(brandMetrics.height >= brandMetrics.lineHeight * 1.8, "mobile brand label should wrap to two compact lines");

  await context.close();
});

test("mobile header keeps Scheme Finder and a readable full state selector at 320px", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 320, height: 800 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  await page.locator("#q").waitFor();

  const brand = page.locator(".brand span");
  const selector = page.getByRole("combobox", { name: "Select state" });
  const settings = page.getByRole("button", { name: "Open settings" });
  const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  const selectorBox = await selector.boundingBox();
  const settingsBox = await settings.boundingBox();

  assert.ok(await brand.isVisible(), "Scheme Finder should remain visible on narrow mobile screens");
  assert.equal(await selector.inputValue(), "himachal-pradesh");
  assert.ok(selectorBox && selectorBox.width >= 138, `state selector should show the full state name; received ${selectorBox && selectorBox.width}px`);
  assert.ok(settingsBox && settingsBox.width <= 34, `settings button should be compact; received ${settingsBox && settingsBox.width}px`);
  assert.equal(metrics.scrollWidth, metrics.width, "mobile header should not overflow horizontally");

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

test("mobile home shows the selected alpine crest above the headline", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  await page.locator("#q").waitFor();

  const crest = page.locator(".hero-crest");
  assert.equal(await crest.count(), 1, "the selected alpine crest should be rendered once");

  const crestBox = await crest.boundingBox();
  const headingBox = await page.locator(".home-hero h1").boundingBox();
  assert.ok(crestBox && headingBox, "the crest and hero headline should be visible");
  assert.ok(crestBox.width >= 96 && crestBox.width <= 128, `crest should stay compact on mobile; received ${crestBox.width}px`);
  assert.ok(Math.abs((crestBox.x + crestBox.width / 2) - 195) < 2, "crest should be centered above the headline");
  assert.ok(crestBox.y + crestBox.height < headingBox.y, "crest should not overlap the headline");

  const edgeFlourishes = await page.locator(".home-hero").evaluate((element) => ["::before", "::after"].map((pseudo) => {
    return getComputedStyle(element, pseudo).display;
  }));
  assert.deepEqual(edgeFlourishes, ["none", "none"], "the old edge wave decorations should be removed");

  await context.close();
});

test("mobile home carries the crest palette through a soft page background", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  await page.locator("#q").waitFor();

  const background = await page.locator(".app").evaluate((element) => getComputedStyle(element).backgroundImage);
  assert.match(background, /radial-gradient/, "the page should use soft colored background washes");
  assert.match(background, /rgba?\(255, 180, 37/, "the background should echo the crest's sunlight yellow");
  assert.match(background, /rgba?\(39, 108, 245/, "the background should echo the crest's blue");
  assert.match(background, /rgba?\(22, 167, 125/, "the background should echo the crest's mint");

  const cardBackgrounds = await page.locator(".start-route").evaluateAll((cards) => {
    return cards.map((card) => getComputedStyle(card).backgroundColor);
  });
  assert.deepEqual(cardBackgrounds, ["rgb(255, 255, 255)", "rgb(255, 255, 255)"], "route cards should remain white over the tinted canvas");

  await context.close();
});

test("mobile search has a stronger edge and layered elevation than the page", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  const search = page.locator("#q");
  await search.waitFor();

  const styles = await search.evaluate((input) => {
    const computed = getComputedStyle(input);
    return {
      borderColor: computed.borderTopColor,
      boxShadow: computed.boxShadow,
      backgroundImage: computed.backgroundImage
    };
  });
  const pageBackground = await page.locator(".app").evaluate((element) => getComputedStyle(element).backgroundImage);
  const borderChannels = styles.borderColor.match(/\d+/g).map(Number).slice(0, 3);
  const distanceFromWhite = borderChannels.reduce((total, channel) => total + Math.abs(255 - channel), 0);
  const shadowLayers = styles.boxShadow.split(/,\s*(?=rgba?\()/).length;

  assert.ok(distanceFromWhite >= 240, `search border should visibly separate from the pale page; received ${styles.borderColor}`);
  assert.ok(shadowLayers >= 2, `search should combine a soft halo and elevation shadow; received ${styles.boxShadow}`);
  assert.notEqual(styles.backgroundImage, pageBackground, "search gradient should remain distinct from the page washes");

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

test("mobile search results retain the selected alpine crest", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 360, height: 800 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  await page.locator("#q").fill("apple orchard");
  await page.waitForTimeout(200);

  const crest = page.locator(".hero-crest");
  const crestBox = await crest.boundingBox();
  assert.ok(await crest.isVisible(), "selected crest should remain visible when search results appear");
  assert.ok(crestBox && crestBox.width >= 78 && crestBox.width <= 90, `active-search crest should remain compact; received ${crestBox && crestBox.width}px`);
  assert.ok(Math.abs((crestBox.x + crestBox.width / 2) - 180) < 2, "active-search crest should remain centered");

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

test("typing never rebuilds the search input, so the mobile keyboard keeps focus", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  const search = page.locator("#q");
  await search.waitFor();

  // Tag the live node; a full re-render would replace it and drop the keyboard.
  await page.evaluate(() => { document.getElementById("q").dataset.probe = "original"; });

  await search.click();
  await search.pressSequentially("apple orchard loan", { delay: 20 });
  await page.waitForTimeout(120);

  const state = await page.evaluate(() => {
    const input = document.getElementById("q");
    return {
      probe: input.dataset.probe,
      focused: document.activeElement === input,
      value: input.value,
      caret: input.selectionStart
    };
  });

  assert.equal(state.probe, "original", "the search input should survive typing instead of being re-created");
  assert.ok(state.focused, "the search input should keep focus while typing");
  assert.equal(state.value, "apple orchard loan", "no keystroke should be dropped");
  assert.equal(state.caret, "apple orchard loan".length, "the caret should stay at the end of the typed text");

  await context.close();
});

test("schemes are listed above business activities in search results", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  await page.locator("#q").fill("apple orchard");
  await page.locator(".home-main .section").first().waitFor();

  const headings = await page.locator(".home-main .section > h2").allTextContents();
  assert.ok(headings.length >= 2, `expected both result groups; received ${JSON.stringify(headings)}`);
  assert.match(headings[0], /^Schemes/, "schemes should be the first result group");
  assert.match(headings[1], /^Business activities/, "activities should follow the schemes");

  await context.close();
});

test("each typed word counts as its own keyword instead of narrowing to nothing", async () => {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3000);

  await page.goto(baseUrl);
  const search = page.locator("#q");

  const countFor = async (text) => {
    await search.fill(text);
    await page.waitForTimeout(120);
    const heading = await page.locator(".home-main .section > h2").first().textContent();
    return Number(heading.split("·").pop().trim());
  };

  const single = await countFor("apple");
  const multi = await countFor("apple orchard loan");

  assert.ok(single > 0, "a single keyword should match schemes");
  assert.ok(multi >= single, "extra keywords should widen the pool, not empty it");
  assert.equal(await page.locator(".empty").count(), 0, "a multi-word query should not fall through to the empty state");

  // The record matching every keyword still ranks first.
  await search.fill("apple");
  await page.waitForTimeout(120);
  const topForApple = await page.locator(".home-main .list .row strong").first().textContent();
  assert.match(topForApple, /apple/i, "the closest match should stay at the top of the ranking");

  await context.close();
});
