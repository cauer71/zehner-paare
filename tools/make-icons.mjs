/**
 * Erzeugt das komplette Icon-Set und die iOS-Startbilder aus einer Quelle.
 *
 *   node tools/make-icons.mjs
 *
 * Braucht playwright-core und ein Chromium (Pfad über CHROMIUM_PATH oder den
 * Standardpfad unten). Die Ziffern werden mit der Spielschrift Nunito gesetzt,
 * damit Icon und Spielfeld dieselbe Handschrift haben.
 */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FONT = readFileSync(join(ROOT, 'fonts/nunito-latin-var.woff2')).toString('base64');

const BRAND_A = '#f8b64c';
const BRAND_B = '#e0673a';
const INK = '#2b1103';

/** Das Motiv: zwei Spielsteine 3 und 7, darunter „= 10". */
function motif(size, { bleed = false } = {}) {
  const s = (n) => (n * size) / 512;
  // Ohne Rand (maskable) sitzt das Motiv kleiner, damit es im Kreis bleibt.
  const k = bleed ? 0.74 : 1;
  const tile = s(168 * k);
  const gap = s(26 * k);
  const radius = s(44 * k);
  const top = size / 2 - s(bleed ? 150 : 176) * k;
  const left = (size - (tile * 2 + gap)) / 2;
  const fs = tile * 0.62;
  const eqY = top + tile + s(112 * k);
  return `
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${BRAND_A}"/><stop offset="1" stop-color="${BRAND_B}"/>
      </linearGradient>
      <radialGradient id="glow" cx="26%" cy="14%" r="70%">
        <stop offset="0" stop-color="#fff" stop-opacity=".34"/>
        <stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </radialGradient>
      <filter id="drop" x="-30%" y="-30%" width="160%" height="180%">
        <feDropShadow dx="0" dy="${s(6)}" stdDeviation="${s(9)}" flood-color="#7a2f00" flood-opacity=".28"/>
      </filter>
    </defs>
    <rect width="${size}" height="${size}" rx="${bleed ? 0 : s(114)}" fill="url(#bg)"/>
    <rect width="${size}" height="${size}" rx="${bleed ? 0 : s(114)}" fill="url(#glow)"/>
    <g filter="url(#drop)">
      <rect x="${left}" y="${top}" width="${tile}" height="${tile}" rx="${radius}" fill="#fffaf5"/>
      <rect x="${left + tile + gap}" y="${top}" width="${tile}" height="${tile}" rx="${radius}" fill="#fffaf5"/>
    </g>
    <g font-family="Nunito" font-weight="800" text-anchor="middle" fill="${INK}" font-size="${fs}">
      <text x="${left + tile / 2}" y="${top + tile / 2 + fs * 0.35}">3</text>
      <text x="${left + tile * 1.5 + gap}" y="${top + tile / 2 + fs * 0.35}">7</text>
    </g>
    <text x="${size / 2}" y="${eqY}" font-family="Nunito" font-weight="800" font-size="${s(112 * k)}"
          text-anchor="middle" fill="#fff" letter-spacing="${s(2)}">= 10</text>`;
}

function page(size, opts) {
  return `<style>
    @font-face { font-family: 'Nunito'; src: url(data:font/woff2;base64,${FONT}) format('woff2'); font-weight: 100 900; }
    html,body { margin:0; padding:0; width:${size}px; height:${size}px; overflow:hidden; }
  </style>
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${motif(size, opts)}</svg>`;
}

function splash(w, h, dark) {
  const bg = dark ? '#10131c' : '#f4f1ea';
  const logo = Math.round(Math.min(w, h) * 0.32);
  return `<style>
    @font-face { font-family: 'Nunito'; src: url(data:font/woff2;base64,${FONT}) format('woff2'); font-weight: 100 900; }
    html,body { margin:0; padding:0; width:${w}px; height:${h}px; background:${bg};
      display:flex; align-items:center; justify-content:center; overflow:hidden; }
  </style>
  <svg xmlns="http://www.w3.org/2000/svg" width="${logo}" height="${logo}" viewBox="0 0 512 512">${motif(512)}</svg>`;
}

const browser = await chromium.launch({ executablePath: CHROME });

async function shot(html, w, h, out, omitBackground = false) {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.setContent(html);
  await p.evaluate(() => document.fonts.ready);
  mkdirSync(dirname(join(ROOT, out)), { recursive: true });
  await p.screenshot({ path: join(ROOT, out), omitBackground });
  await p.close();
  console.log('->', out);
}

// App-Icons
for (const size of [512, 192, 32]) {
  await shot(page(size), size, size, `icons/icon-${size}.png`, true);
}
for (const size of [512, 192]) {
  await shot(page(size, { bleed: true }), size, size, `icons/icon-maskable-${size}.png`);
}
await shot(page(180, { bleed: true }), 180, 180, 'icons/apple-touch-icon.png');

// iOS-Startbilder, hell und dunkel
const SPLASHES = [
  [1290, 2796], [1284, 2778], [1179, 2556], [1170, 2532],
  [1125, 2436], [1242, 2688], [828, 1792], [750, 1334], [640, 1136],
];
for (const [w, h] of SPLASHES) {
  for (const dark of [false, true]) {
    await shot(splash(w, h, dark), w, h, `icons/splash-${w}x${h}${dark ? '-dark' : ''}.png`);
  }
}

// Quelldatei als SVG (Schrift dort über den System-Stack, nur als Favicon genutzt)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="Zehner-Paare">
${motif(512).replace(/font-family="Nunito"/g, 'font-family="Nunito, ui-rounded, system-ui, sans-serif"')}
</svg>`;
writeFileSync(join(ROOT, 'icons/icon.svg'), svg);
console.log('-> icons/icon.svg');

await browser.close();
