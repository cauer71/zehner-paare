#!/usr/bin/env python3
"""
Erzeugt fonts/zp-pixel.woff2 - die Pixelschrift des Arcade-Stils.

Selbst entworfen, damit die App keine fremde Schrift nachladen muss und
lizenzfrei bleibt. Jedes Zeichen ist ein Bitmuster auf einem 5x7-Raster
(Grossbuchstaben, Ziffern, Satzzeichen), gesetzt in eine 6x10 Zelle:

  Zeile 0-1   Platz fuer Umlautpunkte
  Zeile 2-8   die 7 Zeilen des Zeichens, Grundlinie unter Zeile 8
  Zeile 9     Unterlaengen (Komma, Semikolon)

Ein Pixel ist 64 Einheiten, das Em-Quadrat also 640 hoch (10 Zeilen) und
die Laufweite 384 breit (6 Spalten) - eine echte Festbreitenschrift.
Waagerechte Pixelreihen werden zu einem Rechteck zusammengefasst, damit die
Umrisse nicht unnoetig aufblaehen.

Aufruf:  python3 tools/gen-pixelfont.py
Braucht: pip install fonttools brotli
"""

from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

PIXEL = 64
COLS = 6          # 5 Pixel Zeichen + 1 Pixel Abstand
ROWS = 10         # 2 Zeilen Umlautpunkte + 7 Zeilen Zeichen + 1 Zeile Unterlaenge
# Das Em-Quadrat umfasst bewusst nur 8 Pixelzeilen, nicht die volle Zellhoehe:
# so ist ein Pixel genau ein Achtel der Schriftgroesse und bei 8, 16, 24 oder
# 32 px sitzt jedes Pixel scharf auf dem Bildschirmraster.
EM_ROWS = 8
UPM = EM_ROWS * PIXEL         # 512
ADVANCE = COLS * PIXEL        # 384
BASELINE_ROW = 9              # Zeile 9 liegt unter der Grundlinie

# --------------------------------------------------------------- Bitmuster

# 5 Spalten, 7 Zeilen; eine achte Zeile ist die Unterlaenge.
G = {}

G[' '] = []
G['!'] = ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..']
G['"'] = ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....']
G['#'] = ['.#.#.', '#####', '.#.#.', '.#.#.', '.#.#.', '#####', '.#.#.']
G['$'] = ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..']
G['%'] = ['##..#', '##.#.', '...#.', '..#..', '.#...', '.#.##', '#..##']
G['&'] = ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#']
G["'"] = ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....']
G['('] = ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.']
G[')'] = ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...']
G['*'] = ['.....', '..#..', '#.#.#', '.###.', '#.#.#', '..#..', '.....']
G['+'] = ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....']
G[','] = ['.....', '.....', '.....', '.....', '.....', '..##.', '..##.', '.##..']
G['-'] = ['.....', '.....', '.....', '.###.', '.....', '.....', '.....']
G['.'] = ['.....', '.....', '.....', '.....', '.....', '..##.', '..##.']
G['/'] = ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....']

G['0'] = ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.']
G['1'] = ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.']
G['2'] = ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####']
G['3'] = ['####.', '....#', '....#', '.###.', '....#', '....#', '####.']
G['4'] = ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.']
G['5'] = ['#####', '#....', '#....', '####.', '....#', '#...#', '.###.']
G['6'] = ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.']
G['7'] = ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..']
G['8'] = ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.']
G['9'] = ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..']

G[':'] = ['.....', '..##.', '..##.', '.....', '..##.', '..##.', '.....']
G[';'] = ['.....', '..##.', '..##.', '.....', '.....', '..##.', '..##.', '.##..']
G['<'] = ['....#', '...#.', '..#..', '.#...', '..#..', '...#.', '....#']
G['='] = ['.....', '.....', '#####', '.....', '#####', '.....', '.....']
G['>'] = ['#....', '.#...', '..#..', '...#.', '..#..', '.#...', '#....']
G['?'] = ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..']
G['@'] = ['.###.', '#...#', '#.###', '#.#.#', '#.###', '#....', '.###.']

G['A'] = ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#']
G['B'] = ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.']
G['C'] = ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.']
G['D'] = ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.']
G['E'] = ['#####', '#....', '#....', '####.', '#....', '#....', '#####']
G['F'] = ['#####', '#....', '#....', '####.', '#....', '#....', '#....']
G['G'] = ['.###.', '#...#', '#....', '#..##', '#...#', '#...#', '.###.']
G['H'] = ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#']
G['I'] = ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####']
G['J'] = ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..']
G['K'] = ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#']
G['L'] = ['#....', '#....', '#....', '#....', '#....', '#....', '#####']
G['M'] = ['#...#', '##.##', '#.#.#', '#...#', '#...#', '#...#', '#...#']
G['N'] = ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#']
G['O'] = ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.']
G['P'] = ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....']
G['Q'] = ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#']
G['R'] = ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#']
G['S'] = ['.####', '#....', '#....', '.###.', '....#', '....#', '####.']
G['T'] = ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..']
G['U'] = ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.']
G['V'] = ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..']
G['W'] = ['#...#', '#...#', '#...#', '#...#', '#.#.#', '##.##', '#...#']
G['X'] = ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#']
G['Y'] = ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..']
G['Z'] = ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####']

G['['] = ['..###', '..#..', '..#..', '..#..', '..#..', '..#..', '..###']
G['\\'] = ['#....', '#....', '.#...', '..#..', '...#.', '....#', '....#']
G[']'] = ['###..', '..#..', '..#..', '..#..', '..#..', '..#..', '###..']
G['^'] = ['..#..', '.#.#.', '#...#', '.....', '.....', '.....', '.....']
G['_'] = ['.....', '.....', '.....', '.....', '.....', '.....', '#####']
G['`'] = ['.#...', '..#..', '.....', '.....', '.....', '.....', '.....']
G['{'] = ['...##', '..#..', '..#..', '.##..', '..#..', '..#..', '...##']
G['|'] = ['..#..', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..']
G['}'] = ['##...', '..#..', '..#..', '..##.', '..#..', '..#..', '##...']
G['~'] = ['.....', '.....', '.#..#', '#.#.#', '#..#.', '.....', '.....']

# Sonderzeichen, die die Oberflaeche wirklich braucht
G['·'] = ['.....', '.....', '..##.', '..##.', '.....', '.....', '.....']   # ·
G['×'] = ['.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '.....']   # ×
G['–'] = ['.....', '.....', '.....', '#####', '.....', '.....', '.....']   # –
G['—'] = ['.....', '.....', '.....', '#####', '.....', '.....', '.....']   # —
G['“'] = ['.#.#.', '#.#..', '.....', '.....', '.....', '.....', '.....']   # “
G['”'] = ['.#.#.', '..#.#', '.....', '.....', '.....', '.....', '.....']   # ”
G['„'] = ['.....', '.....', '.....', '.....', '.#.#.', '#.#..', '.....']   # „
G['‘'] = ['..#..', '.#...', '.....', '.....', '.....', '.....', '.....']   # ‘
G['’'] = ['..#..', '...#.', '.....', '.....', '.....', '.....', '.....']   # ’
G['…'] = ['.....', '.....', '.....', '.....', '.....', '#.#.#', '.....']   # …
G['★'] = ['..#..', '.###.', '#####', '.###.', '.###.', '#...#', '.....']   # ★
G['◀'] = ['....#', '..###', '#####', '#####', '..###', '....#', '.....']   # ◀ Menuecursor
G['▶'] = ['#....', '###..', '#####', '#####', '###..', '#....', '.....']   # ▶
G['▸'] = ['.....', '.#...', '.###.', '.####', '.###.', '.#...', '.....']   # ▸
G['✓'] = ['.....', '....#', '...#.', '..#..', '#.#..', '.#...', '.....']   # ✓
G['ß'] = ['.##..', '#..#.', '#..#.', '###..', '#..#.', '#..#.', '###..']   # ß
G['°'] = ['.##..', '#..#.', '.##..', '.....', '.....', '.....', '.....']   # °

# Umlaute: dasselbe Zeichen, zwei Punkte darueber (Zeile 0-1, Spalte 1 und 3)
UMLAUT = {'Ä': 'A', 'Ö': 'O', 'Ü': 'U'}

# Kleinbuchstaben und Kleinumlaute zeigen auf die Grossform: die Schrift ist
# eine reine Versalienschrift, wie es die Automaten auch waren.
ALIAS = {chr(c): chr(c - 32) for c in range(ord('a'), ord('z') + 1)}
ALIAS.update({'ä': 'Ä', 'ö': 'Ö', 'ü': 'Ü'})


# ------------------------------------------------------------------ Umrisse

def rects_for(rows, dots=False):
    """Bitmuster -> Liste von Rechtecken (x, y, w, h) in Fonteinheiten."""
    boxes = []
    lines = []
    if dots:
        # Umlautpunkte in Rasterzeile 0 und 1
        lines.append((0, '.#.#.'))
        lines.append((1, '.#.#.'))
    for i, pattern in enumerate(rows):
        lines.append((i + 2, pattern))          # Zeichen beginnt in Rasterzeile 2

    for grid_row, pattern in lines:
        # waagerechte Laeufe zusammenfassen
        col = 0
        while col < len(pattern):
            if pattern[col] != '#':
                col += 1
                continue
            start = col
            while col < len(pattern) and pattern[col] == '#':
                col += 1
            x = start * PIXEL
            w = (col - start) * PIXEL
            y = (BASELINE_ROW - 1 - grid_row) * PIXEL
            boxes.append((x, y, w, PIXEL))
    return boxes


def draw(pen, boxes):
    for x, y, w, h in boxes:
        pen.moveTo((x, y))
        pen.lineTo((x + w, y))
        pen.lineTo((x + w, y + h))
        pen.lineTo((x, y + h))
        pen.closePath()


def glyph_name(ch):
    return f'u{ord(ch):04X}'


def main():
    chars = dict(G)
    for ch, base in UMLAUT.items():
        chars[ch] = G[base]

    order = ['.notdef'] + [glyph_name(c) for c in chars]
    pen_glyphs = {}
    metrics = {}

    # .notdef: leerer Rahmen, damit fehlende Zeichen auffallen
    pen = TTGlyphPen(None)
    draw(pen, rects_for(['#####', '#...#', '#...#', '#...#', '#...#', '#...#', '#####']))
    pen_glyphs['.notdef'] = pen.glyph()
    metrics['.notdef'] = (ADVANCE, 0)

    for ch, rows in chars.items():
        pen = TTGlyphPen(None)
        draw(pen, rects_for(rows, dots=ch in UMLAUT))
        name = glyph_name(ch)
        pen_glyphs[name] = pen.glyph()
        metrics[name] = (ADVANCE, 0)

    cmap = {ord(c): glyph_name(c) for c in chars}
    for src, dst in ALIAS.items():
        if dst in chars:
            cmap[ord(src)] = glyph_name(dst)          # Kleinbuchstabe zeigt auf Versal

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(pen_glyphs)
    fb.setupHorizontalMetrics(metrics)
    # Oberkante der Rasterzeile 0 liegt BASELINE_ROW Pixel ueber der Grundlinie,
    # die Unterlaenge ein Pixel darunter: 576 und -64, zusammen das Em von 640.
    ascent = BASELINE_ROW * PIXEL      # 576
    descent = -PIXEL                   # -64
    fb.setupHorizontalHeader(ascent=ascent, descent=descent, lineGap=0)
    fb.setupNameTable({
        'familyName': 'ZP Pixel',
        'styleName': 'Regular',
        'uniqueFontIdentifier': 'ZPPixel-Regular-1.0',
        'fullName': 'ZP Pixel Regular',
        'psName': 'ZPPixel-Regular',
        'version': 'Version 1.000',
        'copyright': 'Public Domain / CC0 - eigens fuer Zehner-Paare gezeichnet',
        'licenseDescription': 'Gemeinfrei (CC0 1.0). Frei verwendbar.',
    })
    fb.setupOS2(
        sTypoAscender=ascent, sTypoDescender=descent, sTypoLineGap=0,
        usWinAscent=ascent, usWinDescent=-descent,
        sxHeight=7 * PIXEL, sCapHeight=7 * PIXEL,
        achVendID='ZPXL',
    )
    fb.setupPost(isFixedPitch=1)
    fb.font['head'].lowestRecPPEM = 8

    out = Path(__file__).resolve().parent.parent / 'fonts' / 'zp-pixel.woff2'
    fb.font.flavor = 'woff2'
    fb.save(str(out))
    print(f'{out.name}: {len(chars)} Zeichen, {len(cmap)} Zuordnungen, {out.stat().st_size} Bytes')


if __name__ == '__main__':
    main()
