"""Build the PWA icons from the source artwork in tools/artwork/icon-source.png.

The source is a flat RGB export whose rounded corners are painted black, so the
corner shape is recovered by flooding the black in from the four corners and
turning it into transparency. Everything else is resampling, and the result is
written as a palette PNG — the artwork's grain carries far more colours than a
launcher can show, and indexing them cuts the files roughly six times over.

Run:  python tools/make_icons.py
"""
import os
from collections import deque

import pngkit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "tools", "artwork", "icon-source.png")
OUT = os.path.join(ROOT, "app", "icons")

DARK = 600          # sum(rgb) below this is corner paint or its soft rim
PROBE = 6           # pixels past the rim to read the tile's true edge colour
SAFE_SCALE = 0.72   # keeps the artwork inside the maskable inner-80% circle


def cut_corners(src):
    """Return the artwork as RGBA, with the painted corners made transparent."""
    width, height, channels, pixels = src
    inside = bytearray(b"\x01" * (width * height))
    queue = deque()

    for x, y in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)):
        queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        at = y * width + x
        if not inside[at]:
            continue
        px = at * channels
        if pixels[px] + pixels[px + 1] + pixels[px + 2] >= DARK:
            continue        # hit the tile: stop before eating into the artwork
        inside[at] = 0
        if x:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))

    # Repaint the cleared corners in the tile's own edge colour. They are fully
    # transparent, but averaging them during downscale would otherwise drag a
    # dark fringe around the rounded edge.
    out = bytearray(width * height * 4)
    for y in range(height):
        row = y * width
        # Read the fill colour a few pixels past the boundary: the pixel right on
        # it is a half-blended rim, and replicating that paints a grey halo.
        edge = None
        for x in range(width):
            if inside[row + x]:
                edge = (row + min(x + PROBE, width - 1)) * channels
                break
        for x in range(width):
            at = row + x
            src_at = at * channels if inside[at] else (edge if edge is not None else at * channels)
            dst = at * 4
            out[dst] = pixels[src_at]
            out[dst + 1] = pixels[src_at + 1]
            out[dst + 2] = pixels[src_at + 2]
            out[dst + 3] = 255 if inside[at] else 0
    return width, height, 4, out


def maskable(tile, size):
    """Full-bleed icon: the artwork shrunk into the circle Android may crop to,
    with its own edge pixels replicated outwards to fill the rest.

    Replicating the edge rather than painting a matching background is what
    keeps the join invisible — the artwork's gradient runs corner to corner, so
    any ramp reconstructed from one edge leaves a ghost of the tile's outline.
    """
    inner = int(size * SAFE_SCALE)
    off = (size - inner) // 2
    scaled = pngkit.resample(tile, (0, 0, tile[0], tile[1]), inner, inner)

    out = bytearray(size * size * 4)
    for y in range(size):
        sy = min(max(y - off, 0), inner - 1)
        for x in range(size):
            sx = min(max(x - off, 0), inner - 1)
            src = (sy * inner + sx) * 4
            dst = (y * size + x) * 4
            out[dst:dst + 3] = scaled[src:src + 3]
            out[dst + 3] = 255              # maskable icons must not be cut out
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    tile = cut_corners(pngkit.load(SOURCE))

    for name, size in [("icon-192.png", 192), ("icon-512.png", 512)]:
        pixels = pngkit.resample(tile, (0, 0, tile[0], tile[1]), size, size)
        written = pngkit.save_indexed(os.path.join(OUT, name), size, size, 4, pixels)
        print("wrote", name, written, "bytes")

    written = pngkit.save_indexed(os.path.join(OUT, "maskable-512.png"), 512, 512, 4, maskable(tile, 512))
    print("wrote maskable-512.png", written, "bytes")


if __name__ == "__main__":
    main()
