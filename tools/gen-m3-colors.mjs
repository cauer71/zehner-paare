/**
 * Erzeugt m3-colors.css – das Farbschema nach Material 3.
 *
 * Die Tokens werden nicht von Hand gepflegt, sondern aus einem Quellton
 * berechnet, genau wie es Material You tut. Neu erzeugen:
 *
 *   npm i @material/material-color-utilities esbuild
 *   npx esbuild --bundle tools/gen-m3-colors.mjs --platform=node --format=esm \
 *     --outfile=/tmp/gen.mjs && node /tmp/gen.mjs > m3-colors.css
 *
 * (Der Umweg über esbuild ist nötig, weil das Paket ESM-Importe ohne
 * Dateiendung ausliefert, die Node nicht auflösen kann.)
 */
import {
  argbFromHex, hexFromArgb, Hct, SchemeVibrant, MaterialDynamicColors,
} from '@material/material-color-utilities';

const SEED = '#EF7D31';     // Markenton des Spiels
const VARIANT = 'Vibrant';  // Schema-Variante nach M3
const source = Hct.fromInt(argbFromHex(SEED));

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

function tokens(dark) {
  const scheme = new SchemeVibrant(source, dark, 0);
  const out = [];
  for (const key of Object.getOwnPropertyNames(MaterialDynamicColors)) {
    const dc = MaterialDynamicColors[key];
    if (!dc || typeof dc.getArgb !== 'function') continue;
    if (/PaletteKeyColor$/.test(key)) continue;
    out.push([`--md-sys-color-${kebab(key)}`, hexFromArgb(dc.getArgb(scheme))]);
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

const fmt = (list, indent) => list.map(([k, v]) => `${indent}${k}: ${v};`).join('\n');
const light = tokens(false);
const dark = tokens(true);

console.log(`/* Material-3-Farbschema, erzeugt aus dem Quellton ${SEED} (Schema ${VARIANT},
   Kontraststufe 0). Nicht von Hand ändern – siehe tools/gen-m3-colors.mjs. */

:root {
${fmt(light, '  ')}
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${fmt(dark, '    ')}
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
${fmt(dark, '  ')}
  color-scheme: dark;
}`);
