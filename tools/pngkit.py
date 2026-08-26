"""Minimal PNG decoding, resampling and palette encoding.

Enough to turn the source artwork into the shipped icons and launch images
without pulling in an image library.
"""
import struct
import zlib


def load(path):
    """Decode an 8-bit RGB or RGBA PNG into (width, height, channels, bytearray)."""
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("%s is not a PNG" % path)

    offset, header, idat = 8, None, []
    while offset < len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        tag = data[offset + 4:offset + 8]
        chunk = data[offset + 8:offset + 8 + length]
        if tag == b"IHDR":
            width, height = struct.unpack(">II", chunk[:8])
            header = (width, height, chunk[8], chunk[9])
        elif tag == b"IDAT":
            idat.append(chunk)
        offset += 12 + length

    width, height, depth, colour = header
    if depth != 8 or colour not in (2, 6):
        raise ValueError("%s must be 8-bit RGB or RGBA" % path)

    channels = 3 if colour == 2 else 4
    raw = zlib.decompress(b"".join(idat))
    stride = width * channels
    out = bytearray(height * stride)

    for y in range(height):
        filter_type = raw[y * (stride + 1)]
        line = raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)]
        base = y * stride
        prior = base - stride
        for i in range(stride):
            a = out[base + i - channels] if i >= channels else 0
            b = out[prior + i] if y else 0
            c = out[prior + i - channels] if (i >= channels and y) else 0
            value = line[i]
            if filter_type == 1:
                value += a
            elif filter_type == 2:
                value += b
            elif filter_type == 3:
                value += (a + b) >> 1
            elif filter_type == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                value += a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
            out[base + i] = value & 0xFF
    return width, height, channels, out


def resample(src, box, out_w, out_h):
    """Area-average `box` (x0, y0, x1, y1) of `src` into an out_w x out_h image.

    Averaging over the source footprint keeps big downscales clean; for upscales
    the footprint collapses to a single texel, which is a nearest-neighbour read.
    """
    width, height, channels, pixels = src
    x0, y0, x1, y1 = box
    span_x = (x1 - x0) / float(out_w)
    span_y = (y1 - y0) / float(out_h)
    out = bytearray(out_w * out_h * channels)

    for oy in range(out_h):
        sy0 = y0 + oy * span_y
        sy1 = sy0 + span_y
        ry0 = max(0, min(height - 1, int(sy0)))
        ry1 = max(ry0 + 1, min(height, int(sy1 + 0.999999)))
        for ox in range(out_w):
            sx0 = x0 + ox * span_x
            sx1 = sx0 + span_x
            rx0 = max(0, min(width - 1, int(sx0)))
            rx1 = max(rx0 + 1, min(width, int(sx1 + 0.999999)))

            totals = [0] * channels
            count = 0
            for sy in range(ry0, ry1):
                row = sy * width * channels
                for sx in range(rx0, rx1):
                    at = row + sx * channels
                    for c in range(channels):
                        totals[c] += pixels[at + c]
                    count += 1
            at = (oy * out_w + ox) * channels
            for c in range(channels):
                out[at + c] = totals[c] // count
    return out


def _clamp(value, low, high):
    return low if value < low else (high if value > high else value)


def cover_box(src_w, src_h, out_w, out_h):
    """Largest centred crop of the source that has the output's aspect ratio.

    Scaling to cover and cropping keeps the artwork undistorted; what it trims
    is the empty sky at the top and the outer wash at the bottom.
    """
    if out_w * src_h > out_h * src_w:          # target is relatively wider
        keep_h = src_w * out_h / float(out_w)
        margin = (src_h - keep_h) / 2.0
        return (0.0, margin, float(src_w), src_h - margin)
    keep_w = src_h * out_w / float(out_h)
    margin = (src_w - keep_w) / 2.0
    return (margin, 0.0, src_w - margin, float(src_h))


def resize(src, box, out_w, out_h):
    """Bilinear resample of `box` into out_w x out_h.

    Rows are resampled horizontally once and cached, then blended vertically —
    the source has far fewer rows than the phone screens it is stretched over.
    """
    width, height, channels, pixels = src
    x0, y0, x1, y1 = box
    span_x = (x1 - x0) / float(out_w)
    span_y = (y1 - y0) / float(out_h)

    columns = []
    for ox in range(out_w):
        sx = _clamp(x0 + (ox + 0.5) * span_x - 0.5, 0.0, width - 1.0)
        left = int(sx)
        columns.append((left * channels, min(left + 1, width - 1) * channels, sx - left))

    cache = {}

    def horizontal(sy):
        row = cache.get(sy)
        if row is not None:
            return row
        base = sy * width * channels
        row = bytearray(out_w * channels)
        at = 0
        for left, right, fraction in columns:
            if fraction == 0.0:
                row[at:at + channels] = pixels[base + left:base + left + channels]
            else:
                for c in range(channels):
                    a = pixels[base + left + c]
                    row[at + c] = int(a + (pixels[base + right + c] - a) * fraction + 0.5)
            at += channels
        cache[sy] = row
        return row

    stride = out_w * channels
    out = bytearray(out_h * stride)
    for oy in range(out_h):
        sy = _clamp(y0 + (oy + 0.5) * span_y - 0.5, 0.0, height - 1.0)
        top = int(sy)
        fraction = sy - top
        upper = horizontal(top)
        dst = oy * stride
        if fraction == 0.0 or top + 1 > height - 1:
            out[dst:dst + stride] = upper
            continue
        lower = horizontal(top + 1)
        for i in range(stride):
            a = upper[i]
            out[dst + i] = int(a + (lower[i] - a) * fraction + 0.5)
    return out


def _median_cut(colours, limit):
    """Split the colour cloud along its widest axis until `limit` boxes remain."""
    boxes = [colours]
    while len(boxes) < limit:
        widest, target, axis = -1, None, 0
        for box in boxes:
            if len(box) < 2:
                continue
            for c in range(len(box[0][0])):
                values = [entry[0][c] for entry in box]
                spread = max(values) - min(values)
                if spread > widest:
                    widest, target, axis = spread, box, c
        if target is None or widest <= 0:
            break
        target.sort(key=lambda entry: entry[0][axis])
        half = len(target) // 2
        boxes.remove(target)
        boxes.append(target[:half])
        boxes.append(target[half:])
    return boxes


def save_indexed(path, width, height, channels, pixels, limit=256, bits=6):
    """Write a palette PNG. Smooth artwork carries far more distinct values than
    a screen can show, and indexing them cuts the file several times over."""
    shift = 8 - bits
    step = 1 << shift

    # Bin first: it collapses the source's grain, which no filter compresses.
    binned = bytearray(len(pixels))
    for i in range(len(pixels)):
        value = (pixels[i] >> shift) * step
        binned[i] = value | (value >> bits) if value else 0
    if channels == 4:
        for i in range(3, len(binned), 4):
            binned[i] = 255 if pixels[i] > 127 else 0      # keep edges crisp

    counts = {}
    for i in range(0, len(binned), channels):
        key = bytes(binned[i:i + channels])
        counts[key] = counts.get(key, 0) + 1

    entries = [(list(key), n) for key, n in counts.items()]
    palette = []
    for box in _median_cut(entries, limit):
        if not box:
            continue
        weight = sum(n for _, n in box)
        palette.append([int(round(sum(c[i] * n for c, n in box) / weight)) for i in range(channels)])
    if not palette:
        palette = [[0] * channels]
    if channels == 4:
        # Transparent entries first, so tRNS can stop before the opaque tail.
        palette.sort(key=lambda entry: entry[3])

    lookup = {}
    for key in counts:
        best, chosen = None, 0
        for index, entry in enumerate(palette):
            distance = sum((key[i] - entry[i]) ** 2 for i in range(channels))
            if best is None or distance < best:
                best, chosen = distance, index
        lookup[key] = chosen

    indices = bytearray(width * height)
    at = 0
    for i in range(0, len(binned), channels):
        indices[at] = lookup[bytes(binned[i:i + channels])]
        at += 1

    raw = bytearray()
    for y in range(height):
        raw.append(0)                                     # indices do not filter well
        raw += indices[y * width:(y + 1) * width]

    def chunk(tag, payload):
        body = tag + payload
        return (struct.pack(">I", len(payload)) + body
                + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF))

    plte = b"".join(bytes(entry[:3]) for entry in palette)
    blob = (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 3, 0, 0, 0))
            + chunk(b"PLTE", plte))
    # Only carry tRNS when something is actually transparent; an all-opaque
    # table is legal but some readers treat it as a cut-out.
    alphas = [entry[3] for entry in palette] if channels == 4 else []
    while alphas and alphas[-1] == 255:
        alphas.pop()
    if alphas:
        blob += chunk(b"tRNS", bytes(alphas))
    blob += chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")

    open(path, "wb").write(blob)
    return len(blob)
