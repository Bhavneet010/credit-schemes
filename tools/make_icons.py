"""Generate the PWA PNG icons without any image library.

Draws a rounded (or full-bleed, for maskable) pine-green square with a white
magnifier glyph, and writes it as a PNG.

Run:  python tools/make_icons.py
"""
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "app", "icons")

BG = (15, 76, 58)
FG = (255, 255, 255)


def blend(bg, fg, a):
    return tuple(round(bg[i] + (fg[i] - bg[i]) * a) for i in range(3))


def coverage(x, y, inside, samples=3):
    """Box-filtered coverage of `inside` over one pixel, for cheap anti-aliasing."""
    hits = 0
    step = 1.0 / samples
    for sy in range(samples):
        for sx in range(samples):
            if inside(x + (sx + 0.5) * step, y + (sy + 0.5) * step):
                hits += 1
    return hits / float(samples * samples)


def make(size, maskable):
    pad = size * 0.0 if maskable else size * 0.0
    r = size * 0.22                      # corner radius of the tile
    inset = size * 0.16 if maskable else 0.0   # keep the glyph in the safe zone

    cx = cy = size / 2.0
    ring_r = size * (0.20 if maskable else 0.235)
    ring_w = size * (0.055 if maskable else 0.065)
    ring_cx = cx - size * 0.045
    ring_cy = cy - size * 0.045

    # handle: a thick segment from the ring edge outwards at 45 degrees
    h_w = ring_w
    h_from = ring_r - ring_w * 0.2
    h_to = ring_r + size * (0.14 if maskable else 0.165)
    d = 0.70710678

    def in_tile(x, y):
        if maskable:
            return True
        # rounded square
        lx = min(max(x, r), size - r)
        ly = min(max(y, r), size - r)
        if lx == x and ly == y:
            return True
        return (x - lx) ** 2 + (y - ly) ** 2 <= r * r

    def in_glyph(x, y):
        dx, dy = x - ring_cx, y - ring_cy
        dist = (dx * dx + dy * dy) ** 0.5
        if abs(dist - ring_r) <= ring_w / 2.0:
            return True
        # handle as a rotated capsule along the 45 degree axis
        t = (dx * d + dy * d)
        if h_from <= t <= h_to:
            perp = abs(-dx * d + dy * d)
            if perp <= h_w / 2.0:
                return True
        cap = ((dx - h_to * d) ** 2 + (dy - h_to * d) ** 2) ** 0.5
        return cap <= h_w / 2.0

    rows = []
    for y in range(size):
        row = bytearray([0])  # PNG filter byte 0 (None)
        for x in range(size):
            tile = coverage(x, y, in_tile)
            glyph = coverage(x, y, in_glyph)
            colour = blend(BG, FG, glyph)
            row += bytes(colour)
            row += bytes([round(255 * tile)])
        rows.append(bytes(row))
    return b"".join(rows)


def png(size, raw):
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(raw, 9))
            + chunk(b"IEND", b""))


os.makedirs(OUT, exist_ok=True)
for name, size, maskable in [("icon-192.png", 192, False),
                             ("icon-512.png", 512, False),
                             ("maskable-512.png", 512, True)]:
    path = os.path.join(OUT, name)
    with open(path, "wb") as f:
        f.write(png(size, make(size, maskable)))
    print("wrote", path, os.path.getsize(path), "bytes")
