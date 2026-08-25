/**
 * Empirischer Platzmesser: setzt Text in ein Feld und schaut, ob es anschlaegt.
 *
 * Damit bekommt man das Budget als Zahl, statt es aus Polstern und
 * Rasterspalten zusammenzurechnen - dabei hatte ich mich um mehr als das
 * Doppelte vertan, weil bei 1fr-Spalten die Spur waechst und nicht der Knopf.
 *
 * Zwei Betriebsarten:
 *   node tools/check-platz.mjs                 -> groesste Breite je Feld
 *   node tools/check-platz.mjs kandidaten.json -> konkrete Beschriftungen pruefen
 *
 * Braucht: npm i -D playwright-core  und einen Chromium.
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml',
            '.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  try { const f = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, '')); const b = await readFile(f);
    res.writeHead(200, { 'content-type': T[extname(f)] ?? 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end('x'); }
});
await new Promise((r) => server.listen(4224, r));
// Ohne executablePath nimmt Playwright den Browser aus PLAYWRIGHT_BROWSERS_PATH.
const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

// Feld = das begrenzte Kaestchen, Ziel = wohin der Text geschrieben wird.
const FELDER = [
  ['bar.undo',   '#btn-undo',   '#btn-undo .action-label'],
  ['bar.hint',   '#btn-hint',   '#btn-hint .action-label'],
  ['bar.new',    '#btn-new',    '#btn-new .action-label'],
  ['bar.refill', '#btn-refill', '#btn-refill .fab__label'],
  ['hud.score',  '#card-score', '#card-score .stat-card__label'],
  ['hud.time',   '.hud .stat-card:nth-child(3)', '#label-time'],
  ['combo.badge', '#ticker',    '#combo'],
];

// Wie lang darf es werden? Ein wachsender Text aus einem mittleren
// Buchstaben, damit die Messung nicht von einzelnen Zeichenbreiten abhaengt.
const SUCHE = (felder) => {
  const raus = {};
  // Wichtig: bei 1fr-Rasterspalten und flex:1 waechst nicht der Knopf ueber
  // seinen Rand, sondern die Spur - und damit die ganze Leiste und die Seite.
  // Der Knopf allein meldet dann nie einen Ueberlauf. Also drei Fragen.
  const doc = document.documentElement;
  const laeuftAus = (feld, ziel) => feld.scrollWidth - feld.clientWidth > 1
                                 || ziel.scrollWidth - ziel.clientWidth > 1
                                 || doc.scrollWidth - doc.clientWidth > 1;
  for (const [name, feldSel, zielSel] of felder) {
    const feld = document.querySelector(feldSel);
    const ziel = document.querySelector(zielSel);
    if (!feld || !ziel) continue;
    const vorher = ziel.textContent;
    const hoeheVorher = feld.getBoundingClientRect().height;
    let letzteGute = '';
    for (let n = 1; n <= 40; n++) {
      ziel.textContent = 'n'.repeat(n);
      const gewachsen = feld.getBoundingClientRect().height > hoeheVorher + 1;
      if (laeuftAus(feld, ziel) || gewachsen) break;
      letzteGute = ziel.textContent;
    }
    // Breite der letzten passenden Fassung messen
    ziel.textContent = letzteGute;
    const cs = getComputedStyle(ziel);
    const s = document.createElement('span');
    s.style.position = 'absolute'; s.style.visibility = 'hidden'; s.style.whiteSpace = 'nowrap';
    for (const k of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
                     'fontVariantNumeric', 'letterSpacing', 'wordSpacing', 'textTransform'])
      s.style[k] = cs[k];
    s.textContent = letzteGute; document.body.appendChild(s);
    const px = Math.floor(s.getBoundingClientRect().width); s.remove();
    ziel.textContent = vorher;
    raus[name] = { nZeichen: letzteGute.length, px, schrift: cs.fontSize, umbruch: cs.whiteSpace };
  }
  return raus;
};

// Konkrete Kandidaten pruefen
const PRUEFE = (auftrag) => {
  const raus = [];
  for (const [name, feldSel, zielSel, kandidaten] of auftrag) {
    const feld = document.querySelector(feldSel);
    const ziel = document.querySelector(zielSel);
    if (!feld || !ziel) continue;
    const vorher = ziel.textContent;
    const hoehe = feld.getBoundingClientRect().height;
    for (const wort of kandidaten) {
      ziel.textContent = wort;
      const doc = document.documentElement;
      const zuBreit = Math.max(feld.scrollWidth - feld.clientWidth,
                               ziel.scrollWidth - ziel.clientWidth,
                               doc.scrollWidth - doc.clientWidth);
      const gewachsen = Math.round(feld.getBoundingClientRect().height - hoehe);
      raus.push({ name, wort, zuBreit: Math.max(0, zuBreit), gewachsen: Math.max(0, gewachsen) });
    }
    ziel.textContent = vorher;
  }
  return raus;
};

const auftragDatei = process.argv[2];
const kandidaten = auftragDatei ? JSON.parse(await readFile(auftragDatei, 'utf8')) : null;

const ergebnis = {};
for (const [w, h] of [[320, 568], [360, 640], [390, 844]]) {
  for (const skin of ['classic', 'm3', 'arcade', 'papier']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h },
      deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-DE' });
    const page = await ctx.newPage();
    await page.goto('http://localhost:4224/');
    await page.evaluate((s) => { localStorage.setItem('zp.seen.v1', 'true');
      localStorage.setItem('zp.settings.v1', JSON.stringify({ skin: s, difficulty: 'mittel', sound: false })); }, skin);
    await page.reload(); await page.waitForTimeout(600);
    // Kombo-Plakette sichtbar machen, sonst hat sie keine Breite
    await page.evaluate(() => { const c = document.querySelector('#combo');
      c.classList.add('show'); c.textContent = 'x'; });
    const marke = `${w}/${skin}`;
    if (kandidaten) {
      const auftrag = FELDER.filter(([n]) => kandidaten[n])
        .map(([n, f, z]) => [n, f, z, kandidaten[n]]);
      ergebnis[marke] = await page.evaluate(PRUEFE, auftrag);
    } else {
      ergebnis[marke] = await page.evaluate(SUCHE, FELDER);
    }
    await ctx.close();
  }
}
await browser.close(); server.close();

if (kandidaten) {
  // Je Kandidat der schlimmste Fall
  const schlimm = new Map();
  for (const [marke, liste] of Object.entries(ergebnis))
    for (const e of liste) {
      const k = e.name + '|' + e.wort;
      const v = schlimm.get(k) ?? { ...e, zuBreit: 0, gewachsen: 0, wo: '' };
      if (e.zuBreit > v.zuBreit || e.gewachsen > v.gewachsen) v.wo = marke;
      v.zuBreit = Math.max(v.zuBreit, e.zuBreit);
      v.gewachsen = Math.max(v.gewachsen, e.gewachsen);
      schlimm.set(k, v);
    }
  let schlecht = 0;
  for (const v of schlimm.values()) {
    const ok = !v.zuBreit && !v.gewachsen;
    if (!ok) schlecht++;
    console.log(`${ok ? 'ja  ' : 'NEIN'} ${v.name.padEnd(12)} ${JSON.stringify(v.wort).padEnd(18)}`
      + (ok ? '' : `  zu breit ${v.zuBreit} px, hoeher ${v.gewachsen} px  (${v.wo})`));
  }
  console.log(schlecht ? `\n${schlecht} Kandidaten passen nicht` : '\nalle Kandidaten passen');
  process.exit(schlecht ? 1 : 0);
} else {
  const eng = {};
  for (const [marke, d] of Object.entries(ergebnis))
    for (const [name, v] of Object.entries(d)) {
      const p = eng[name];
      if (!p || v.nZeichen < p.nZeichen) eng[name] = { ...v, wo: marke };
    }
  console.log('Groesstes Budget je Feld (engster Fall aus 320/360/390 px x 4 Stile)\n');
  console.log('Feld          Zeichen    px  Schrift   Umbruch   engster Fall');
  for (const [name, v] of Object.entries(eng))
    console.log(`${name.padEnd(13)} ${String(v.nZeichen).padStart(7)} ${String(v.px).padStart(5)}`
      + `  ${v.schrift.padEnd(8)} ${v.umbruch.padEnd(9)} ${v.wo}`);
  const ZIEL = join(ROOT, 'tools', 'budget.json');
  await writeFile(ZIEL, JSON.stringify(eng, null, 1));
}
