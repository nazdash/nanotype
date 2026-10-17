#!/usr/bin/env python3
"""Regenerate every favicon and app icon in public/ from assets/icon.png.

    python3 scripts/make-icons.py

Uses only the Python standard library and macOS `sips`. The whole source image is
used: nothing is cut off and nothing is stretched.

Icon files have to be square, so a source that is not square is placed in the
middle of a square. For the browser tab the rest of that square is TRANSPARENT,
so the icon keeps the shape of the source (a 1024x768 image shows as a 4:3 card).
Home-screen and app icons are filled with the image's background colour instead,
because phones paint transparent areas black.

The tab also gets favicon.svg, drawn from the same measurements: a frame in the
shape of the image with the mark inside it.
"""
import os
import struct
import subprocess
import tempfile
import zlib

# Empty space left on each side of the browser-tab icon, as a share of the icon's
# width: 0.05 means the image takes the middle 90% of the slot.
TAB_MARGIN = 0.05

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, 'assets', 'icon.png')
PUBLIC = os.path.join(ROOT, 'public')


def read_png(path):
    """Return (width, height, bytes per pixel, colour type, rows) of an 8-bit RGB(A) PNG."""
    data = open(path, 'rb').read()
    pos, idat = 8, b''
    while pos < len(data):
        length, = struct.unpack('>I', data[pos:pos + 4])
        kind, body = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + length]
        if kind == b'IHDR':
            width, height, depth, colour, _, _, interlace = struct.unpack('>IIBBBBB', body)
        if kind == b'IDAT':
            idat += body
        pos += 12 + length
    assert depth == 8 and colour in (2, 6) and interlace == 0, 'expected an 8-bit RGB or RGBA PNG'
    bpp = 4 if colour == 6 else 3
    raw, stride = zlib.decompress(idat), width * bpp
    rows, prev, i = [], bytearray(stride), 0
    for _ in range(height):
        kind, line = raw[i], bytearray(raw[i + 1:i + 1 + stride])
        i += 1 + stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if kind == 1:
                line[x] = (line[x] + a) & 255
            elif kind == 2:
                line[x] = (line[x] + b) & 255
            elif kind == 3:
                line[x] = (line[x] + (a + b) // 2) & 255
            elif kind == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line)
        prev = line
    return width, height, bpp, colour, rows


def write_png(path, side, bpp, colour, rows):
    def chunk(kind, body):
        return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body) & 0xffffffff)

    raw = b''.join(b'\x00' + bytes(row) for row in rows)
    open(path, 'wb').write(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', side, side, 8, colour, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw, 9))
        + chunk(b'IEND', b'')
    )


def shrink(rows, side, size, bpp=4):
    """Scale a square RGBA image down with a box filter on premultiplied alpha.

    `sips` leaves dark fringes where a picture meets transparency; averaging the
    colours weighted by their alpha does not.
    """
    scale = side / size
    result = []
    for ty in range(size):
        y0, y1 = int(ty * scale), max(int(ty * scale) + 1, int((ty + 1) * scale))
        row = bytearray()
        for tx in range(size):
            x0, x1 = int(tx * scale), max(int(tx * scale) + 1, int((tx + 1) * scale))
            r = g = b = a = 0
            for y in range(y0, y1):
                line = rows[y]
                for x in range(x0, x1):
                    alpha = line[x * 4 + 3]
                    r += line[x * 4] * alpha
                    g += line[x * 4 + 1] * alpha
                    b += line[x * 4 + 2] * alpha
                    a += alpha
            count = (y1 - y0) * (x1 - x0)
            if a:
                row += bytes((round(r / a), round(g / a), round(b / a), round(a / count)))
            else:
                row += b'\x00\x00\x00\x00'
        result.append(row)
    return result


def resize(source, size, target):
    subprocess.run(['sips', '-z', str(size), str(size), source, '--out', target], check=True, capture_output=True)


def main():
    width, height, bpp, colour, rows = read_png(SOURCE)
    side = max(width, height)
    background = bytes(rows[0][:bpp])

    assert bpp == 4, 'the source needs an alpha channel (RGBA) so the tab icon can be transparent around it'

    # The shapes in the picture: one box per flat colour that is not the background.
    # Colours that cover only a few pixels are the soft edges between shapes and are ignored.
    boxes = {}
    for y in range(height):
        row = rows[y]
        for x in range(width):
            pixel = bytes(row[x * bpp:x * bpp + bpp])
            if pixel != background:
                box = boxes.get(pixel)
                if box is None:
                    boxes[pixel] = [x, y, x, y, 1]
                else:
                    box[0] = min(box[0], x)
                    box[2] = max(box[2], x)
                    box[3] = y
                    box[4] += 1
    shapes = [(pixel, box) for pixel, box in boxes.items() if box[4] >= width * height // 500]
    shapes.sort(key=lambda shape: shape[1][0])

    # Centre the whole image in a square: once on its background colour, once on transparency
    left, top = (side - width) // 2, (side - height) // 2

    def pad(fill):
        blank = bytearray(fill * side)
        result = []
        for y in range(side):
            row = bytearray(blank)
            if top <= y < top + height:
                row[left * bpp:(left + width) * bpp] = rows[y - top]
            result.append(row)
        return result

    rows = pad(background)

    # The tab icon: the same square on a slightly larger transparent canvas
    margin = round(side * TAB_MARGIN / (1 - 2 * TAB_MARGIN))
    tab_side = side + 2 * margin
    clear_rows = [bytearray(b'\x00\x00\x00\x00' * tab_side) for _ in range(margin)]
    for row in pad(b'\x00\x00\x00\x00'):
        clear_rows.append(bytearray(b'\x00\x00\x00\x00' * margin) + row + bytearray(b'\x00\x00\x00\x00' * margin))
    clear_rows += [bytearray(b'\x00\x00\x00\x00' * tab_side) for _ in range(margin)]

    with tempfile.TemporaryDirectory() as tmp:
        square = os.path.join(tmp, 'square.png')
        write_png(square, side, bpp, colour, rows)

        for size, name in [(16, 'favicon-16x16.png'), (32, 'favicon-32x32.png')]:
            write_png(os.path.join(PUBLIC, name), size, bpp, colour, shrink(clear_rows, tab_side, size))

        for size, name in [
            (180, 'apple-touch-icon.png'), (192, 'android-chrome-192x192.png'),
            (256, 'android-chrome-256x256.png'), (512, 'android-chrome-512x512.png'),
        ]:
            resize(square, size, os.path.join(PUBLIC, name))

        # favicon.ico holding PNG images; every current browser reads PNG-in-ICO
        images = []
        for size in (16, 32, 48):
            path = os.path.join(tmp, f'ico-{size}.png')
            write_png(path, size, bpp, colour, shrink(clear_rows, tab_side, size))
            images.append((size, open(path, 'rb').read()))
        header = struct.pack('<HHH', 0, 1, len(images))
        offset, body = 6 + 16 * len(images), b''
        for size, data in images:
            header += struct.pack('<BBBBHHII', size, size, 0, 0, 1, 32, len(data), offset)
            offset += len(data)
            body += data
        open(os.path.join(PUBLIC, 'favicon.ico'), 'wb').write(header + body)

    # Vector versions, drawn from the shapes found above. They sit `left`/`top` into the square.
    hexa = lambda pixel: '#%02x%02x%02x' % tuple(pixel[:3])
    rects = [(left + x0, top + y0, x1 - x0 + 1, y1 - y0 + 1, hexa(pixel)) for pixel, (x0, y0, x1, y1, _) in shapes]

    # Browser tab: the image's own frame with its shapes, transparent around it,
    # with the same margin as the PNG tab icons
    open(os.path.join(PUBLIC, 'favicon.svg'), 'w').write(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-margin} {-margin} {tab_side} {tab_side}">\n'
        f'  <rect x="{left}" y="{top}" width="{width}" height="{height}" fill="{hexa(background)}"/>\n'
        + ''.join(f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{colour_}"/>\n' for x, y, w, h, colour_ in rects)
        + '</svg>\n'
    )
    print(f'source {width}x{height} in a {side} square; background {hexa(background)}; shapes:', ', '.join(f'{c} {w}x{h} at {x},{y}' for x, y, w, h, c in rects))


if __name__ == '__main__':
    main()
