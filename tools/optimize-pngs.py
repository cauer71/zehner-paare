#!/usr/bin/env python3
"""
Verkleinert die erzeugten PNGs auf eine 256-Farben-Palette.

    python3 tools/optimize-pngs.py

Ohne Dithering: der einfarbige Hintergrund der Startbilder bleibt exakt flach,
das spart den Grossteil der Dateigroesse. Braucht Pillow (pip install pillow).
Nach tools/make-icons.mjs ausfuehren.
"""
from PIL import Image
import glob, os, sys

total_before = total_after = 0
for path in sorted(glob.glob(os.path.join(os.path.dirname(__file__), '..', 'icons', '*.png'))):
    before = os.path.getsize(path)
    im = Image.open(path).convert('RGBA')
    transparent = im.getchannel('A').getextrema()[0] < 255
    if transparent:
        out = im.quantize(colors=256, method=Image.FASTOCTREE)
    else:
        out = im.convert('RGB').quantize(colors=256, method=Image.MEDIANCUT, dither=Image.NONE)
    out.save(path, optimize=True)
    after = os.path.getsize(path)
    total_before += before
    total_after += after
    print(f"{os.path.basename(path):32} {before/1024:7.1f} -> {after/1024:6.1f} kB")

print(f"\nGesamt: {total_before/1024:.0f} kB -> {total_after/1024:.0f} kB")
