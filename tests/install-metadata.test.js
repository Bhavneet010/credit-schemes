const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const appRoot = path.resolve(__dirname, "..", "app");
const html = fs.readFileSync(path.join(appRoot, "index.html"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(appRoot, "manifest.webmanifest"), "utf8"));

const RETIRED_GREEN = [15, 76, 58];   // the pine brand the redesign dropped
const BLUE_RING = [26, 102, 230];     // magnifier ring
const TEAL = [22, 150, 132];          // massif
const AMBER = [247, 180, 40];         // sun
const CREAM = [254, 247, 232];        // artwork background, and the splash's

// Minimal PNG reader: enough to check dimensions and sample pixels.
function decode(file) {
  const buf = fs.readFileSync(file);
  assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${file} should be a PNG`);

  let offset = 8;
  let header = null;
  let plte = null;
  let trns = null;
  const idat = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const tag = buf.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (tag === "IHDR") {
      header = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), depth: data[8], colour: data[9] };
    } else if (tag === "PLTE") {
      plte = data;
    } else if (tag === "tRNS") {
      trns = data;
    } else if (tag === "IDAT") {
      idat.push(data);
    }
    offset += 12 + length;
  }
  assert.ok(header, `${file} should carry an IHDR chunk`);
  assert.equal(header.depth, 8, "icons are written at 8 bits per channel");

  // 0 grey, 2 RGB, 3 palette, 6 RGBA — the builder emits palette or RGBA.
  const channels = header.colour === 6 ? 4 : header.colour === 3 ? 1 : 3;
  assert.ok([2, 3, 6].includes(header.colour), `unexpected colour type ${header.colour}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = header.width * channels;
  const out = Buffer.alloc(header.height * stride);

  // Undo the per-row PNG filters so pixels can be sampled directly.
  for (let y = 0; y < header.height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? out[y * stride + i - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + i] : 0;
      const c = i >= channels && y > 0 ? out[(y - 1) * stride + i - channels] : 0;
      let value = line[i];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += Math.floor((a + b) / 2);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + i] = value & 0xff;
    }
  }

  // Normalise everything to RGBA so callers need not care how it was stored.
  const rgba = Buffer.alloc(header.width * header.height * 4);
  for (let i = 0; i < header.width * header.height; i += 1) {
    if (header.colour === 3) {
      const index = out[i];
      rgba[i * 4] = plte[index * 3];
      rgba[i * 4 + 1] = plte[index * 3 + 1];
      rgba[i * 4 + 2] = plte[index * 3 + 2];
      rgba[i * 4 + 3] = trns && index < trns.length ? trns[index] : 255;
    } else {
      rgba[i * 4] = out[i * channels];
      rgba[i * 4 + 1] = out[i * channels + 1];
      rgba[i * 4 + 2] = out[i * channels + 2];
      rgba[i * 4 + 3] = channels === 4 ? out[i * channels + 3] : 255;
    }
  }

  return {
    ...header,
    indexed: header.colour === 3,
    pixel(x, y) {
      const at = (y * header.width + x) * 4;
      return [rgba[at], rgba[at + 1], rgba[at + 2], rgba[at + 3]];
    },
    has(colour, tolerance = 6) {
      for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i + 3] === 0) continue;
        if (Math.abs(rgba[i] - colour[0]) <= tolerance &&
            Math.abs(rgba[i + 1] - colour[1]) <= tolerance &&
            Math.abs(rgba[i + 2] - colour[2]) <= tolerance) return true;
      }
      return false;
    }
  };
}

function near(actual, expected, tolerance, label) {
  const ok = expected.every((value, i) => Math.abs(actual[i] - value) <= tolerance);
  assert.ok(ok, `${label}: expected ~[${expected}], received [${actual.slice(0, 3)}]`);
}

test("the app icons carry the artwork palette, with painted corners cut to transparency", () => {
  for (const name of ["icon-192.png", "icon-512.png"]) {
    const icon = decode(path.join(appRoot, "icons", name));
    assert.equal(icon.width, icon.height, `${name} should be square`);
    assert.ok(icon.indexed, `${name} should ship as a palette PNG to stay small`);

    assert.equal(icon.pixel(1, 1)[3], 0, `${name} corner should be transparent, not painted`);
    const top = icon.pixel(Math.round(icon.width / 2), Math.round(icon.height * 0.04));
    assert.equal(top[3], 255, `${name} should be opaque between the corners`);
    near(top, CREAM, 12, `${name} tile background`);

    for (const colour of [[BLUE_RING, "blue ring"], [TEAL, "massif"], [AMBER, "sun"]]) {
      assert.ok(icon.has(colour[0], 26), `${name} should contain the ${colour[1]}`);
    }
    assert.ok(!icon.has(RETIRED_GREEN, 12), `${name} should not reuse the retired pine green`);

    // The source paints its corners black. If the flood fill missed any of it,
    // a dark crust survives along the edge.
    for (let i = 0; i < icon.width; i += 1) {
      for (const [x, y] of [[i, 0], [i, icon.height - 1], [0, i], [icon.width - 1, i]]) {
        const [r, g, b, a] = icon.pixel(x, y);
        assert.ok(a === 0 || r + g + b > 150, `corner paint survived at ${x},${y}`);
      }
    }
  }
});

test("the maskable icon is full-bleed and keeps the artwork inside the safe circle", () => {
  const icon = decode(path.join(appRoot, "icons", "maskable-512.png"));
  const centre = icon.width / 2;
  const safe = icon.width * 0.4;

  for (const [x, y] of [[0, 0], [icon.width - 1, 0], [0, icon.height - 1], [icon.width - 1, icon.height - 1]]) {
    assert.equal(icon.pixel(x, y)[3], 255, `maskable icon must bleed to ${x},${y} — a mask crops the corners`);
  }

  // Only the neutral background may sit outside the circle Android may crop to.
  for (let y = 0; y < icon.height; y += 2) {
    for (let x = 0; x < icon.width; x += 2) {
      const [r, g, b] = icon.pixel(x, y);
      if (Math.max(r, g, b) - Math.min(r, g, b) <= 45) continue;   // background, not artwork
      const distance = Math.hypot(x - centre, y - centre);
      assert.ok(distance <= safe,
        `artwork at ${x},${y} sits ${Math.round(distance)}px out, past the ${Math.round(safe)}px safe radius`);
    }
  }
});

test("the manifest splash colour matches the launch artwork", () => {
  // Android builds its splash from background_color, so it has to match the top
  // of the iOS artwork or the two platforms launch to different colours.
  const hex = manifest.background_color.replace("#", "");
  const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  near(rgb, CREAM, 6, "manifest background_color should match the artwork");
  assert.equal(manifest.theme_color, "#ffffff", "the running app's header is white");
});

test("every iOS startup image exists at exactly the size its media query claims", () => {
  const pattern = /<link rel="apple-touch-startup-image" media="([^"]+)" href="([^"]+)">/g;
  const links = [...html.matchAll(pattern)];
  assert.ok(links.length >= 10, `expected a broad device set; found ${links.length}`);

  const seen = new Set();
  for (const [, media, href] of links) {
    const width = Number(/device-width: (\d+)px/.exec(media)[1]);
    const height = Number(/device-height: (\d+)px/.exec(media)[1]);
    const ratio = Number(/-webkit-device-pixel-ratio: (\d+)/.exec(media)[1]);

    assert.ok(!seen.has(media), `duplicate media query would shadow an image: ${media}`);
    seen.add(media);
    assert.match(media, /orientation: portrait/, "the manifest locks the app to portrait");

    const file = path.join(appRoot, href);
    assert.ok(fs.existsSync(file), `${href} is referenced but missing — iOS would launch blank`);

    const image = decode(file);
    assert.equal(image.width, width * ratio, `${href} width should match ${width}x${ratio}`);
    assert.equal(image.height, height * ratio, `${href} height should match ${height}x${ratio}`);
    near(image.pixel(4, 4), CREAM, 10, `${href} should open on the artwork's cream`);
  }
});

test("the launch assets stay small enough for a data-conscious install", () => {
  // Guards the palette encoding: the raw artwork exports are several times
  // larger, and the icons ride in the service worker's precache.
  for (const name of ["icon-192.png", "icon-512.png", "maskable-512.png"]) {
    const bytes = fs.statSync(path.join(appRoot, "icons", name)).size;
    assert.ok(bytes < 40 * 1024, `${name} is ${Math.round(bytes / 1024)}KiB — precached, so keep it small`);
  }

  const splash = fs.readdirSync(path.join(appRoot, "splash"));
  for (const name of splash) {
    const bytes = fs.statSync(path.join(appRoot, "splash", name)).size;
    assert.ok(bytes < 260 * 1024, `splash/${name} is ${Math.round(bytes / 1024)}KiB`);
  }
});
