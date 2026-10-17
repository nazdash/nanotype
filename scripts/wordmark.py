#!/usr/bin/env python3
"""Redraw the pixel wordmark: python3 scripts/wordmark.py Nanotype

Writes the <symbol id="wordmark"> in public/index.html and its size in the SCSS.
The glyphs below are on a 3-by-6 pixel grid.
"""
import re
import sys
import pathlib

NAME = sys.argv[1]
ROOT = pathlib.Path(__file__).resolve().parent.parent

# Lowercase pixel letters: 3 cells wide, x-height of 4 rows,
# one row above for ascenders (row 0) and one below for descenders (row 5).
# '#' is a filled cell; each glyph lists rows 0 to 5.
GLYPHS = {
    'a': ['...', '###', '..#', '###', '#.#', '...'],
    'b': ['#..', '###', '#.#', '#.#', '###', '...'],
    'c': ['...', '###', '#..', '#..', '###', '...'],
    'd': ['..#', '###', '#.#', '#.#', '###', '...'],
    'e': ['...', '###', '#.#', '#..', '###', '...'],
    'h': ['#..', '###', '#.#', '#.#', '#.#', '...'],
    'i': ['#..', '...', '#..', '#..', '#..', '...'],
    'k': ['#..', '#.#', '##.', '#.#', '#.#', '...'],
    'l': ['#..', '#..', '#..', '#..', '#..', '...'],
    'm': ['...', '###', '###', '#.#', '#.#', '...'],
    'n': ['...', '##.', '#.#', '#.#', '#.#', '...'],
    'o': ['...', '###', '#.#', '#.#', '###', '...'],
    'p': ['...', '###', '#.#', '###', '#..', '#..'],
    'r': ['...', '###', '#..', '#..', '#..', '...'],
    's': ['...', '###', '#..', '..#', '###', '...'],
    't': ['#..', '###', '#..', '#.#', '###', '...'],
    'u': ['...', '#.#', '#.#', '#.#', '###', '...'],
    'x': ['...', '#.#', '.#.', '.#.', '#.#', '...'],
    'y': ['...', '#.#', '#.#', '#.#', '###', '..#'],
    'z': ['...', '###', '..#', '#..', '###', '...'],
}
ROWS = 6
CELL = 6   # px per cell on screen

def wordmark(word):
    paths, x = [], 0
    for letter in word.lower():
        rows = GLYPHS[letter]
        parts = []
        for y, row in enumerate(rows):
            for m in re.finditer(r'#+', row):
                parts.append(f'M{x + m.start()} {y}h{len(m.group())}v1h-{len(m.group())}z')
        paths.append(f'<path d="{"".join(parts)}"/>')
        # a narrow letter (i, l) takes only its own width, plus the one-cell gap
        x += max(len(row.rstrip('.')) for row in rows) + 1
    width = x - 1
    return width, '\n'.join(paths)

def sub(path, pattern, repl, count=0):
    p = ROOT / path
    s = p.read_text()
    s2, n = re.subn(pattern, repl, s, count=count, flags=re.S)
    assert n, (path, pattern)
    p.write_text(s2)

width, paths = wordmark(NAME)
lower = NAME.lower()

# the wordmark symbol: viewBox and paths
sub('public/index.html', r'<symbol id="wordmark" viewBox="0 0 \d+ \d+">.*?</symbol>',
    f'<symbol id="wordmark" viewBox="0 0 {width} {ROWS}">\n\t\t\t\t{paths.replace(chr(10), chr(10) + chr(9) * 4)}\n\t\t\t</symbol>', count=1)
# the wordmark's size keeps 8px per cell
sub('src/scss/_common.scss', r'(\.wordmark \{\n\tdisplay: block;\n\twidth: )\d+px;\n\theight: \d+px', rf'\g<1>{width * CELL}px;\n\theight: {ROWS * CELL}px')
sub('src/scss/_common.scss', r'// The "\w+" wordmark', f'// The "{lower}" wordmark')
