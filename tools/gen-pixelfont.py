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

import re
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

G['«'] = ['.....', '..#.#', '.#.#.', '#.#..', '.#.#.', '..#.#', '.....']
G['»'] = ['.....', '#.#..', '.#.#.', '..#.#', '.#.#.', '#.#..', '.....']

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
# Anfuehrungszeichen: auf 2x5 Pixeln kann man den Punkt am Ende des Striches
# nicht zeichnen, unterscheidbar sind nur Hoehe und Neigung. Die schliessenden
# Zeichen neigen sich wie das Komma nach links unten, die oeffnenden nach
# rechts unten - so bilden auf und zu ein Paar.
#
# Wichtig ist das vor allem fuer ' (U+2019): im Italienischen ist es der
# Apostroph und steht in fast jedem Satz (ALL'ALTRO, UN'ALTRA). Vorher waren
# die beiden Paare vertauscht, dadurch sah der Apostroph aus wie ein Gravis.
G['“'] = ['.#.#.', '..#.#', '.....', '.....', '.....', '.....', '.....']   # “ oeffnend
G['”'] = ['.#.#.', '#.#..', '.....', '.....', '.....', '.....', '.....']   # ” schliessend
G['„'] = ['.....', '.....', '.....', '.....', '.#.#.', '#.#..', '.....']   # „ tief, oeffnend
G['‘'] = ['..#..', '...#.', '.....', '.....', '.....', '.....', '.....']   # ‘ oeffnend
G['’'] = ['..#..', '.#...', '.....', '.....', '.....', '.....', '.....']   # ’ schliessend, Apostroph
G['…'] = ['.....', '.....', '.....', '.....', '.....', '#.#.#', '.....']   # …
G['★'] = ['..#..', '.###.', '#####', '.###.', '.###.', '#...#', '.....']   # ★
G['◀'] = ['....#', '..###', '#####', '#####', '..###', '....#', '.....']   # ◀ Menuecursor
G['▶'] = ['#....', '###..', '#####', '#####', '###..', '#....', '.....']   # ▶
G['▸'] = ['.....', '.#...', '.###.', '.####', '.###.', '.#...', '.....']   # ▸
G['✓'] = ['.....', '....#', '...#.', '..#..', '#.#..', '.#...', '.....']   # ✓
G['ß'] = ['.##..', '#..#.', '#..#.', '###..', '#..#.', '#..#.', '###..']   # ß
G['°'] = ['.##..', '#..#.', '.##..', '.....', '.....', '.....', '.....']   # °

# Umlaute: dasselbe Zeichen, zwei Punkte darueber (Zeile 0-1, Spalte 1 und 3)
# Zeichen ueber dem Buchstaben: zwei Rasterzeilen (0 und 1), 5 Spalten breit.
# Frueher gab es hier nur die Umlautpunkte. Mit dem Italienischen kamen Gravis
# und Akut dazu - deshalb steht das jetzt als Tabelle da und nicht als
# Wahrheitswert "dots".
AKZENTE = {
    'punkte': ('.#.#.', '.#.#.'),
    'gravis': ('.#...', '..#..'),
    'akut':   ('...#.', '..#..'),
}

# Buchstabe mit Zeichen darueber -> (Grundform, Akzent)
BETONT = {
    'Ä': ('A', 'punkte'), 'Ö': ('O', 'punkte'), 'Ü': ('U', 'punkte'),
    'À': ('A', 'gravis'), 'È': ('E', 'gravis'), 'Ì': ('I', 'gravis'),
    'Ò': ('O', 'gravis'), 'Ù': ('U', 'gravis'),
    'É': ('E', 'akut'),
}

# Kleinbuchstaben und betonte Kleinbuchstaben zeigen auf die Grossform: die
# Schrift ist eine reine Versalienschrift, wie es die Automaten auch waren.
ALIAS = {chr(c): chr(c - 32) for c in range(ord('a'), ord('z') + 1)}
ALIAS.update({'ä': 'Ä', 'ö': 'Ö', 'ü': 'Ü',
              'à': 'À', 'è': 'È', 'é': 'É', 'ì': 'Ì', 'ò': 'Ò', 'ù': 'Ù'})


# ------------------------------------------------------------------ Umrisse

def rects_for(rows, akzent=None):
    """Bitmuster -> Liste von Rechtecken (x, y, w, h) in Fonteinheiten."""
    boxes = []
    lines = []
    if akzent:
        # Das Zeichen ueber dem Buchstaben in Rasterzeile 0 und 1
        oben, unten = AKZENTE[akzent]
        lines.append((0, oben))
        lines.append((1, unten))
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
    for ch, (base, _) in BETONT.items():
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
        draw(pen, rects_for(rows, akzent=BETONT.get(ch, (None, None))[1]))
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
    pruefe_abdeckung(cmap)


def pruefe_abdeckung(cmap):
    """Deckt die Schrift jeden Buchstaben ab, den das Spiel schreibt?

    Der Arcade-Stil setzt AUSSCHLIESSLICH diese Schrift. Was sie nicht kennt,
    erscheint als leerer Rahmen (.notdef) - und zwar still, ohne Fehler
    irgendwo. Genau das war beim Italienischen passiert: à è é ì ù und die
    Anfuehrungszeichen fehlten, an 15 sichtbaren Stellen.

    Darum liest der Erzeuger die Woerterbuecher und bricht ab, wenn ein
    Zeichen fehlt. Eine neue Sprache kann so nicht mehr unbemerkt Loecher
    reissen: entweder man zeichnet das Zeichen dazu oder formuliert um.
    """
    i18n = Path(__file__).resolve().parent.parent / 'i18n.js'
    if not i18n.exists():
        print('   (i18n.js nicht gefunden, Abdeckung nicht geprueft)')
        return
    # Nur die Werte der Woerterbucheintraege, nicht die Kommentare drumherum.
    text = i18n.read_text(encoding='utf-8')
    saetze = re.findall(r"^\s*'[\w.]+':\s*(.+?)(?:,\s*)?$", text, re.M)
    fortsetzung = re.findall(r"^\s*\+\s*('.*?'|\".*?\")\s*,?$", text, re.M)
    gebraucht = set()
    for stueck in saetze + fortsetzung:
        for wort in re.findall(r"'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\"", stueck):
            gebraucht |= set(wort[0] or wort[1])
    fehlen = sorted(c for c in gebraucht
                    if c not in ('\\',) and ord(c) not in cmap)
    if fehlen:
        liste = ' '.join(f'{c!r} U+{ord(c):04X}' for c in fehlen)
        raise SystemExit(f'FEHLER: die Woerterbuecher brauchen Zeichen, die diese '
                         f'Schrift nicht hat:\n   {liste}\n'
                         f'   Entweder in G[] dazuzeichnen oder den Text umformulieren.')
    # Und der Text, der FEST im Markup steht. Der geht nicht durch das
    # Woerterbuch und waere hier sonst blind - genau so ein Fall ist der
    # Name des Zaehlerdienstes in den Einstellungen.
    im_markup = markup_zeichen()
    fehlen_markup = sorted(c for c in im_markup if ord(c) not in cmap)
    if fehlen_markup:
        liste = ' '.join(f'{c!r} U+{ord(c):04X}' for c in fehlen_markup)
        raise SystemExit(f'FEHLER: fest im Markup stehender Text braucht Zeichen, '
                         f'die diese Schrift nicht hat:\n   {liste}\n'
                         f'   Entweder in G[] dazuzeichnen oder den Text umformulieren.')
    print(f'   Abdeckung geprueft: alle {len(gebraucht)} Zeichen der '
          f'Woerterbuecher und {len(im_markup)} aus index.html sind vorhanden')


def markup_zeichen():
    """Sichtbarer Text aus index.html - nur die Textknoten.

    Vorsicht mit dieser Pruefung: index.html enthaelt ein Kopfskript und
    SVG-Pfade. Wer die mitliest, meldet {, }, = und Ziffernsalat als fehlend
    und alarmiert falsch. Eine Pruefung, die falsch alarmiert, ist keine
    Pruefung - nur eine, die man ignoriert. Darum fliegen Skript, Stil, SVG
    und Kommentare vorher heraus, und Attribute werden gar nicht betrachtet.
    """
    seite = Path(__file__).resolve().parent.parent / 'index.html'
    if not seite.exists():
        return set()
    roh = seite.read_text(encoding='utf-8')
    roh = re.sub(r'(?is)<!--.*?-->', ' ', roh)
    roh = re.sub(r'(?is)<(script|style|svg)\b.*?</\1\s*>', ' ', roh)
    # Was zwischen den Marken steht, ist Text; Marken selbst samt Attributen
    # bleiben draussen.
    stuecke = re.findall(r'>([^<]+)<', roh)
    zeichen = set()
    for stueck in stuecke:
        # Benannte Entitaeten wie &nbsp; sind kein sichtbarer Buchstabe.
        stueck = re.sub(r'&[#\w]+;', ' ', stueck)
        zeichen |= set(stueck.strip())
    return zeichen - {' '}


if __name__ == '__main__':
    main()
