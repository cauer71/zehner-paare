#!/usr/bin/env python3
"""
Erzeugt fonts/zp-hand.woff2 - die Bleistiftziffern des Stils "Papier".

Nur Ziffern und ein paar Rechenzeichen: mehr braucht das Spiel an dieser
Stelle nicht, und eine ganze Handschrift zu zeichnen waere ein eigenes
Projekt. Buchstaben faellt der Browser auf Nunito zurueck; deshalb wird die
Schrift in papier.css ausschliesslich dort gesetzt, wo nur Zahlen stehen.

Der Weg vom Strich zur Kontur:

  1. Jede Ziffer ist eine Handvoll Stuetzpunkte auf einem Raster
     0..100 (x nach rechts, y nach oben, Grundlinie y=0, Ziffernhoehe 100).
  2. Catmull-Rom legt eine glatte Kurve DURCH diese Punkte - so muss man
     keine Bezier-Griffe von Hand suchen, sondern nur sagen, wo der Stift
     langfaehrt.
  3. Die Kurve wird gleichmaessig abgetastet, leicht gewellt (ein Mensch
     zieht keine Zirkellinie) und nach rechts geneigt.
  4. Aus dem Streckenzug wird die Strichkontur: je Teilstueck ein Rechteck,
     an Enden und scharfen Knicken ein Kreis. Alle Umrisse laufen im
     gleichen Drehsinn, deshalb verschmelzen die Ueberlappungen unter der
     Nonzero-Regel von TrueType zu einer einzigen Flaeche.

Von Hand getippte Bezier-Kurven waeren hier genauso ein Ratespiel wie
handgetippte Icon-Pfade - darum diese Datei.

Aufruf:  python3 tools/gen-handfont.py
Braucht: pip install fonttools brotli
"""

import math
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

UPM = 1000
ZIFFER = 700          # Ziffernhoehe in Fonteinheiten (Rasterhoehe 100)
EINHEIT = ZIFFER / 100
STRICH = 70           # Strichstaerke des Bleistifts (weicher Bleistift,
                      # auf dem Handy deutlich besser lesbar als ein harter)
NEIGUNG = 0.10        # Rechtsneigung, gemessen um die halbe Ziffernhoehe
WELLE = 5.0           # Amplitude der Handzitterei in Fonteinheiten
ABTAST = 26           # Ziellaenge eines Teilstuecks in Fonteinheiten
ECKE = math.radians(22)   # ab diesem Knick kommt ein runder Gelenkpunkt

# Laufweiten im Raster: Ziffern gleich breit, damit Punktestaende nicht
# beim Hochzaehlen wackeln.
W_ZIFFER = 70
W_SCHMAL = 34
W_ZEICHEN = 64


# --------------------------------------------------------------- Strichzuege
#
# ('o', punkte)  offener Zug     ('z', punkte)  geschlossener Zug
# ('.', (x, y))  Punkt (Tupfer)
#
# Die Punkte sind bewusst wenige: jeder zusaetzliche macht die Linie
# steifer, nicht schoener.

Z = {}

Z['0'] = (W_ZIFFER, [
    ('z', [(34, 100), (11, 74), (11, 28), (34, 1), (57, 28), (57, 74)]),
])

Z['1'] = (W_ZIFFER, [
    ('o', [(11, 74), (24, 88), (32, 99), (31, 62), (31, 1)]),
])

Z['2'] = (W_ZIFFER, [
    ('o', [(10, 76), (20, 96), (42, 100), (53, 82), (45, 60),
           (26, 38), (9, 12), (12, 5), (56, 8)]),
])

Z['3'] = (W_ZIFFER, [
    ('o', [(11, 82), (26, 99), (48, 93), (49, 73), (32, 58),
           (52, 50), (55, 24), (36, 2), (12, 9)]),
])

Z['4'] = (W_ZIFFER, [
    ('o', [(43, 99), (8, 31), (60, 31)]),
    ('o', [(46, 66), (41, 1)]),
])

Z['5'] = (W_ZIFFER, [
    ('o', [(53, 97), (17, 95), (13, 58), (33, 64), (52, 53),
           (52, 24), (33, 3), (10, 12)]),
])

Z['6'] = (W_ZIFFER, [
    ('o', [(50, 96), (26, 79), (12, 47), (13, 18), (34, 2),
           (53, 18), (46, 42), (22, 46), (13, 33)]),
])

Z['7'] = (W_ZIFFER, [
    ('o', [(9, 95), (56, 97), (43, 58), (27, 1)]),
    ('o', [(19, 50), (49, 55)]),
])

Z['8'] = (W_ZIFFER, [
    ('z', [(35, 100), (13, 83), (34, 57), (55, 33), (33, 2),
           (11, 27), (35, 57), (56, 80)]),
])

Z['9'] = (W_ZIFFER, [
    ('o', [(52, 74), (39, 96), (18, 92), (14, 71), (33, 62),
           (51, 72), (49, 38), (36, 12), (16, 2)]),
])

Z[':'] = (W_SCHMAL, [('.', (17, 66)), ('.', (16, 17))])
Z['.'] = (W_SCHMAL, [('.', (17, 8))])
Z[','] = (W_SCHMAL, [('o', [(20, 14), (16, 1), (7, -12)])])
Z[' '] = (W_SCHMAL, [])
Z['/'] = (W_ZEICHEN, [('o', [(10, 0), (28, 48), (48, 98)])])
Z['+'] = (W_ZEICHEN, [('o', [(9, 47), (52, 50)]), ('o', [(29, 27), (31, 70)])])
Z['-'] = (W_ZEICHEN, [('o', [(9, 47), (52, 50)])])
Z['×'] = (W_ZEICHEN, [   # das Malzeichen der Kombo
    ('o', [(11, 70), (50, 26)]),
    ('o', [(11, 26), (50, 70)]),
])
Z['–'] = Z['-']

# Bindestrich-Minus, Halbgeviertstrich und das ASCII-x sollen dieselbe Form
# bekommen wie ihre typografischen Geschwister.
ALIAS = {'−': '-', 'x': '×'}


# --------------------------------------------------------------- Geometrie

def catmull_rom(punkte, geschlossen, pro_span=24):
    """Glatte Kurve durch alle Stuetzpunkte, gleichmaessig abgetastet."""
    n = len(punkte)
    if n < 2:
        return list(punkte)
    if geschlossen:
        erweitert = [punkte[-1]] + list(punkte) + [punkte[0], punkte[1]]
        spans = n
    else:
        # Enden verlaengern, damit auch das erste und letzte Stueck eine
        # Tangente hat; sonst knickt die Linie am Anfang.
        erst = (2 * punkte[0][0] - punkte[1][0], 2 * punkte[0][1] - punkte[1][1])
        letzt = (2 * punkte[-1][0] - punkte[-2][0], 2 * punkte[-1][1] - punkte[-2][1])
        erweitert = [erst] + list(punkte) + [letzt]
        spans = n - 1

    raus = []
    for i in range(spans):
        p0, p1, p2, p3 = erweitert[i], erweitert[i + 1], erweitert[i + 2], erweitert[i + 3]
        letzter = (i == spans - 1) and not geschlossen
        for k in range(pro_span + (1 if letzter else 0)):
            t = k / pro_span
            t2, t3 = t * t, t * t * t
            x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t
                       + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
                       + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t
                       + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
                       + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            raus.append((x, y))
    return raus


def ausduennen(pfad, mindest):
    """Punkte zusammenfassen, bis jedes Teilstueck mindestens so lang ist."""
    raus = [pfad[0]]
    for p in pfad[1:-1]:
        if math.dist(p, raus[-1]) >= mindest:
            raus.append(p)
    raus.append(pfad[-1])
    return raus


def wellen(pfad, phase, geschlossen):
    """Leichtes Zittern quer zur Laufrichtung - kein Lineal, ein Mensch."""
    laenge = 0.0
    laengen = [0.0]
    for a, b in zip(pfad, pfad[1:]):
        laenge += math.dist(a, b)
        laengen.append(laenge)
    if laenge == 0:
        return pfad
    raus = []
    for i, (x, y) in enumerate(pfad):
        vor = pfad[max(i - 1, 0)]
        nach = pfad[min(i + 1, len(pfad) - 1)]
        dx, dy = nach[0] - vor[0], nach[1] - vor[1]
        n = math.hypot(dx, dy) or 1.0
        nx, ny = -dy / n, dx / n
        t = laengen[i] / laenge
        # Zwei Frequenzen ueberlagert, damit es nicht nach Sinuskurve aussieht.
        s = (math.sin(2 * math.pi * (1.7 * t) + phase)
             + 0.45 * math.sin(2 * math.pi * (4.3 * t) + phase * 1.7))
        # An offenen Enden auslaufen lassen, sonst wandern die Strichenden.
        rand = 1.0 if geschlossen else min(1.0, 4 * t, 4 * (1 - t))
        raus.append((x + nx * WELLE * s * rand * 0.7, y + ny * WELLE * s * rand * 0.7))
    return raus


def kreis(cx, cy, r, ecken=16):
    """Regelmaessiges Vieleck im Uhrzeigersinn. Bei r=31 liegt der groesste
    Fehler bei 0,6 Einheiten von 1000 - das sieht kein Bildschirm."""
    return [(cx + r * math.cos(-2 * math.pi * k / ecken),
             cy + r * math.sin(-2 * math.pi * k / ecken)) for k in range(ecken)]


def strich_kontur(pfad, r, geschlossen):
    """Streckenzug -> Liste von Umrissen, alle im Uhrzeigersinn."""
    umrisse = []
    paare = list(zip(pfad, pfad[1:]))
    if geschlossen:
        paare.append((pfad[-1], pfad[0]))
    for a, b in paare:
        dx, dy = b[0] - a[0], b[1] - a[1]
        n = math.hypot(dx, dy)
        if n < 1e-9:
            continue
        nx, ny = -dy / n * r, dx / n * r
        umrisse.append([(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny),
                        (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)])

    # Gelenke: nur wo es wirklich knickt. Bei einer sanften Kurve ist die
    # Kerbe zwischen zwei Rechtecken kleiner als ein Zehntel Einheit.
    innen = range(len(pfad)) if geschlossen else range(1, len(pfad) - 1)
    for i in innen:
        vor = pfad[i - 1]
        nach = pfad[(i + 1) % len(pfad)]
        hier = pfad[i]
        a1 = math.atan2(hier[1] - vor[1], hier[0] - vor[0])
        a2 = math.atan2(nach[1] - hier[1], nach[0] - hier[0])
        knick = abs((a2 - a1 + math.pi) % (2 * math.pi) - math.pi)
        if knick > ECKE:
            umrisse.append(kreis(hier[0], hier[1], r))
    if not geschlossen:
        umrisse.append(kreis(pfad[0][0], pfad[0][1], r))
        umrisse.append(kreis(pfad[-1][0], pfad[-1][1], r))
    return umrisse


def neigen(punkte):
    mitte = ZIFFER / 2
    return [(x + (y - mitte) * NEIGUNG, y) for x, y in punkte]


def glyph_umrisse(zuege, phase):
    umrisse = []
    r = STRICH / 2
    for art, daten in zuege:
        if art == '.':
            x, y = daten
            umrisse.append(kreis(x * EINHEIT, y * EINHEIT, r * 1.05))
            continue
        geschlossen = art == 'z'
        roh = [(x * EINHEIT, y * EINHEIT) for x, y in daten]
        pfad = catmull_rom(roh, geschlossen)
        pfad = ausduennen(pfad, ABTAST)
        pfad = wellen(pfad, phase, geschlossen)
        umrisse.extend(strich_kontur(pfad, r, geschlossen))
    return [neigen(u) for u in umrisse]


def glyph_name(ch):
    return f'u{ord(ch):04X}'


def main():
    order = ['.notdef'] + [glyph_name(c) for c in Z]
    glyphs = {}
    metrics = {}

    pen = TTGlyphPen(None)
    for kasten in [[(60, 0), (60, ZIFFER), (100, ZIFFER), (100, 0)],
                   [(360, 0), (360, ZIFFER), (400, ZIFFER), (400, 0)],
                   [(60, 0), (60, 40), (400, 40), (400, 0)],
                   [(60, ZIFFER - 40), (60, ZIFFER), (400, ZIFFER), (400, ZIFFER - 40)]]:
        pen.moveTo(kasten[0])
        for p in kasten[1:]:
            pen.lineTo(p)
        pen.closePath()
    glyphs['.notdef'] = pen.glyph()
    metrics['.notdef'] = (int(W_ZIFFER * EINHEIT), 0)

    punkte_gesamt = 0
    for nr, (ch, (breite, zuege)) in enumerate(Z.items()):
        # Feste, aber je Zeichen andere Phase: die 3 in "33" zittert gleich,
        # das faellt weniger auf als eine 3, die neben der 8 gerade steht.
        phase = (nr * 2.399963) % (2 * math.pi)
        umrisse = glyph_umrisse(zuege, phase)
        # Die Zeichnung mittig in die Laufweite ruecken. Auf Karopapier steht
        # jede Ziffer mitten im Kaestchen, nicht am linken Rand - und im
        # Punktestand rutscht so keine Stelle nach der Neigung aus der Spur.
        vorschub = breite * EINHEIT
        if umrisse:
            xs = [x for u in umrisse for x, _ in u]
            schub = vorschub / 2 - (min(xs) + max(xs)) / 2
            umrisse = [[(x + schub, y) for x, y in u] for u in umrisse]
        pen = TTGlyphPen(None)
        for umriss in umrisse:
            pen.moveTo((round(umriss[0][0]), round(umriss[0][1])))
            for x, y in umriss[1:]:
                pen.lineTo((round(x), round(y)))
            pen.closePath()
            punkte_gesamt += len(umriss)
        name = glyph_name(ch)
        glyphs[name] = pen.glyph()
        metrics[name] = (int(round(vorschub)), 0)

    cmap = {ord(c): glyph_name(c) for c in Z}
    for quelle, ziel in ALIAS.items():
        cmap[ord(quelle)] = glyph_name(ziel)

    ascent, descent = 800, -200
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=ascent, descent=descent, lineGap=0)
    fb.setupNameTable({
        'familyName': 'ZP Hand',
        'styleName': 'Regular',
        'uniqueFontIdentifier': 'ZPHand-Regular-1.0',
        'fullName': 'ZP Hand Regular',
        'psName': 'ZPHand-Regular',
        'version': 'Version 1.000',
        'copyright': 'Public Domain / CC0 - eigens fuer Zehner-Paare gezeichnet',
        'licenseDescription': 'Gemeinfrei (CC0 1.0). Frei verwendbar.',
    })
    fb.setupOS2(
        sTypoAscender=ascent, sTypoDescender=descent, sTypoLineGap=0,
        usWinAscent=ascent, usWinDescent=-descent,
        sxHeight=ZIFFER, sCapHeight=ZIFFER,
        achVendID='ZPHD',
    )
    fb.setupPost()

    out = Path(__file__).resolve().parent.parent / 'fonts' / 'zp-hand.woff2'
    fb.font.flavor = 'woff2'
    fb.save(str(out))
    print(f'{out.name}: {len(Z)} Zeichen, {len(cmap)} Zuordnungen, '
          f'{punkte_gesamt} Punkte, {out.stat().st_size} Bytes')


if __name__ == '__main__':
    main()
