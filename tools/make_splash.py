"""Build the iOS launch images from tools/artwork/splash-source.png.

iOS shows a blank screen while an installed web app boots unless the shell
offers an apple-touch-startup-image matching that exact device, so every
supported size gets its own file. Each is a centred cover-crop of the source
artwork: the composition is never stretched, only trimmed. They are written as
palette PNGs, which holds a full-screen image to roughly a tenth of its raw size.

Android needs none of this — it composes its splash from the manifest's
background_color and icon.

Run:  python tools/make_splash.py
"""
import os

import pngkit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "tools", "artwork", "splash-source.png")
OUT = os.path.join(ROOT, "app", "splash")

# (css width, css height, pixel ratio) for the devices Apple matches exactly.
DEVICES = [
    (430, 932, 3), (393, 852, 3), (428, 926, 3), (390, 844, 3),
    (375, 812, 3), (414, 896, 3), (414, 896, 2), (375, 667, 2),
    (414, 736, 3),
    (1024, 1366, 2), (834, 1194, 2), (834, 1112, 2), (820, 1180, 2),
    (768, 1024, 2), (744, 1133, 2),
]


def links():
    """The <link> tags to paste into index.html."""
    out = []
    for cw, ch, ratio in DEVICES:
        media = ("(device-width: %dpx) and (device-height: %dpx) and "
                 "(-webkit-device-pixel-ratio: %d) and (orientation: portrait)" % (cw, ch, ratio))
        out.append('<link rel="apple-touch-startup-image" media="%s" href="splash/%dx%d.png">'
                   % (media, cw * ratio, ch * ratio))
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    src = pngkit.load(SOURCE)
    width, height = src[0], src[1]

    total = 0
    for cw, ch, ratio in DEVICES:
        out_w, out_h = cw * ratio, ch * ratio
        box = pngkit.cover_box(width, height, out_w, out_h)
        pixels = pngkit.resize(src, box, out_w, out_h)
        path = os.path.join(OUT, "%dx%d.png" % (out_w, out_h))
        total += pngkit.save_indexed(path, out_w, out_h, src[2], pixels)
        print("wrote", os.path.basename(path))
    print("total", round(total / 1024.0), "KiB")


if __name__ == "__main__":
    main()
