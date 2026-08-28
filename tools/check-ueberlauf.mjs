/**
 * Die Abnahmepruefung fuer "der Text verlaesst sein Feld nie".
 *
 * Sechs Fragen je Zustand, alle ohne Auslegungsspielraum:
 *   1. Scrollt die Seite waagrecht? Dann ist irgendwo etwas zu breit. Diese
 *      Frage ist die wichtigste: bei 1fr-Rasterspalten und flex:1 waechst
 *      nicht der Knopf ueber seinen Rand, sondern die Spur - und damit die
 *      Leiste und die Seite. Der Knopf allein meldet dann nie einen Ueberlauf.
 *   2. Ist bei einem begrenzten Feld (Knopf, Chip, Karte, Plakette, Kachel)
 *      der Inhalt breiter als das Feld? scrollWidth > clientWidth sagt das
 *      auch dann, wenn overflow auf visible steht - das Feld klippt nicht,
 *      der Text steht dann einfach darueber hinaus.
 *   3. Braucht eine Beschriftung mehr Zeilen als vorgesehen? Exakt gezaehlt
 *      ueber Range.getClientRects(), nicht ueber die Zeilenhoehe - line-height
 *      ist mal 'normal' und mal eine Zahl, damit rechnet man sich falsch.
 *   4. Verlaesst eine Einblendung den Meldungsstreifen ueber dem Brett? Dass
 *      sie das nicht tut, war eine Beschwerde aus dem Spiel.
 *   5. Ist ein Knopf, der ueber einem scrollenden Bereich schwebt, wirklich
 *      dicht? Das Schliessen-Kreuz im Blatt war durchsichtig, und beim
 *      Scrollen schob sich der Pfeil einer aufgeklappten Gruppe darunter -
 *      zwei Symbole uebereinander, die wie ein doppeltes Kreuz aussahen.
 *      Auch das eine Beschwerde aus dem Spiel, mit Bild.
 *   6. Liegt eine Kachel ausserhalb des Bretts? Nach mehrmaligem Auffuellen
 *      lagen die angehaengten Zeilen unter der Flaeche des Bretts - auch das
 *      eine Beschwerde aus dem Spiel, mit Bild.
 *
 * Gepruefte Zustaende: Sprachen x Bildschirmbreiten x Stile x sieben
 * Spiellagen (Start, Sackgasse, Kombo, Meldung, Einstellungen, Regeln, Ende).
 *
 * Aufruf:  node tools/check-ueberlauf.mjs [de] [it] [en]
 * Braucht: npm i -D playwright-core  und einen Chromium (PLAYWRIGHT_BROWSERS_PATH)
 */
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
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
await new Promise((r) => server.listen(4223, r));
// Ohne executablePath nimmt Playwright den Browser aus PLAYWRIGHT_BROWSERS_PATH.
const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

const SPRACHEN = process.argv.slice(2).length ? process.argv.slice(2) : ['de'];
const BREITEN = [[320, 568], [360, 640], [390, 844], [430, 932]];
const STILE = ['classic', 'm3', 'arcade', 'papier'];
// Felder mit begrenzter Breite. Je Eintrag: Selektor und wie viele Zeilen
// die Beschriftung darin hoechstens brauchen darf.
const FELDER = [
  ['.bottom-app-bar .icon-button', 1],
  ['.fab', 1],
  ['.stat-card', 2],
  ['.combo-badge', 1],
  ['.snackbar', 3],
  ['.chips .chip', 1],
  ['.segmented button', 1],
  ['.cell', 1],
  ['.button', 1],
  ['.end-stats div', 2],
  ['.record-ribbon', 1],
  ['.top-app-bar__title', 1],
  ['.demo__cell', 1],
  ['.switch-row', 3],
  ['.best-list li', 2],
  ['.initials', 2],
  ['.initials__input', 1],
  ['.field__title', 1],
  ['.sheet__headline', 2],
  ['.dialog__headline', 2],
  ['.combo-pop', 1],
];

const PRUEFEN = (felder) => {
  const wo = (el) => {
    const t = [];
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (e.id) { t.unshift('#' + e.id); break; }
      const c = typeof e.className === 'string' && e.className ? '.' + e.className.split(/\s+/)[0] : e.tagName.toLowerCase();
      t.unshift(c);
    }
    return t.join(' ');
  };
  const funde = [];
  const doc = document.documentElement;
  const seitlich = doc.scrollWidth - doc.clientWidth;
  if (seitlich > 1) funde.push({ art: 'seite-scrollt', um: seitlich, wo: 'html', text: '' });

  for (const [sel, maxZeilen] of felder) {
    for (const el of document.querySelectorAll(sel)) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      const zuBreit = el.scrollWidth - el.clientWidth;
      if (zuBreit > 1) funde.push({ art: 'inhalt-zu-breit', um: zuBreit, wo: wo(el), text, sel });
      // Zu hoch nur messen, wenn nichts laeuft: eine Zoom-Animation macht den
      // Inhalt vorruebergehend groesser als seinen Kasten, das ist kein Fehler.
      const laeuft = typeof el.getAnimations === 'function'
        && el.getAnimations({ subtree: true }).some((a) => a.playState === 'running');
      // Zeilenzahl exakt: jede Zeile eines Textknotens ist ein eigenes
      // Rechteck. Ueber die Zeilenhoehe zu rechnen ging schief, weil
      // line-height mal 'normal' ist und mal eine Zahl.
      let zeilen = 0;
      if (text) {
        const gehe = (knoten) => {
          for (const k of knoten.childNodes) {
            if (k.nodeType === 3 && k.textContent.trim()) {
              const rg = document.createRange();
              rg.selectNodeContents(k);
              zeilen = Math.max(zeilen, rg.getClientRects().length);
            } else if (k.nodeType === 1 && getComputedStyle(k).display !== 'none') {
              gehe(k);
            }
          }
        };
        gehe(el);
      }
      if (zeilen > maxZeilen && !laeuft)
        funde.push({ art: 'zu-viele-zeilen', um: zeilen, wo: wo(el), text, sel, erlaubt: maxZeilen });

      // Zu hoch: hier zaehlt die FARBE, nicht die Zeilenschachtel. Bei
      // line-height:1 ist die Schachtel kleiner als der Schriftkasten (Nunito
      // braucht 1,37 em), also ragt der Kasten fast immer ein paar Pixel ueber
      // den Innenraum - das ist aber leerer Raum ueber und unter der Schrift.
      // Gemessen wird darum die Farbausdehnung: actualBoundingBoxAscent und
      // -Descent aus der Kanvas-Metrik geben genau das, und die Zeilenzahl von
      // oben sagt, wie oft sie zaehlt.
      if (el.scrollHeight - el.clientHeight > 1 && !laeuft && zeilen) {
        const k = document.createElement('canvas').getContext('2d');
        k.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const m = k.measureText(text);
        const farbe = (m.actualBoundingBoxAscent ?? 0) + (m.actualBoundingBoxDescent ?? 0);
        const zh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) || 0;
        const gebraucht = Math.ceil(farbe + (zeilen - 1) * zh);
        if (gebraucht - el.clientHeight > 1)
          funde.push({ art: 'farbe-zu-hoch', um: gebraucht - el.clientHeight,
                       wo: wo(el), text, sel });
      }
    }
  }
  // Die drei Einblendungen gehoeren in den Meldungsstreifen. Wenn eine davon
  // darueber hinausragt, liegt sie auf dem Brett - genau die Beschwerde, die
  // zur Meldungszeile gefuehrt hat.
  const streifen = document.querySelector('#ticker')?.getBoundingClientRect();
  if (streifen) {
    for (const sel of ['#combo', '#combo-pop', '#toast']) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const raus = Math.max(0, Math.round(r.bottom - streifen.bottom),
                               Math.round(streifen.top - r.top));
      if (raus > 1) funde.push({ art: 'verlaesst-den-streifen', um: raus, wo: sel,
                                 text: (el.textContent || '').trim(), sel });
    }
  }
  // Ein Knopf, der ueber einem scrollenden Bereich schwebt, muss DICHT sein.
  // Das Schliessen-Kreuz im Blatt war durchsichtig, und beim Scrollen schob
  // sich der Pfeil einer aufgeklappten Gruppe genau darunter: zwei Symbole
  // uebereinander, die wie ein doppelt gezeichnetes Kreuz aussahen. Gemessen
  // wird die Deckkraft und nicht die Ueberschneidung selbst - die tritt nur
  // bei einem bestimmten Scrollstand auf, die Durchsichtigkeit dagegen immer.
  for (const sel of ['.sheet__close']) {
    for (const el of document.querySelectorAll(sel)) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      // Nur wenn wirklich etwas darunter scrollen kann.
      const drunter = el.parentElement?.querySelector('.sheet__body');
      if (!drunter || getComputedStyle(drunter).overflowY !== 'auto') continue;
      const a = cs.backgroundColor.match(/[\d.]+/g);
      const dicht = a && (a.length < 4 || parseFloat(a[3]) >= 1);
      if (!dicht) {
        funde.push({ art: 'schwebt-durchsichtig', um: 1, wo: sel, sel,
                     text: `${cs.backgroundColor} - was darunter scrollt, scheint durch` });
      }
    }
  }

  // Liegt eine Kachel ausserhalb des Bretts? Mit align-items:stretch bekam das
  // Feld genau die sichtbare Hoehe, und jede Zeile, die durch Auffuellen
  // dazukam, lag unter seiner Flaeche: Kacheln ohne Brett darunter, die
  // abgerundete Unterkante mitten im Bild. Gemessen wird die Geometrie und
  // nicht scrollHeight - das zaehlt im Arcade-Stil die Polsterung mit und
  // meldete dann auch ein Brett, an dem nichts falsch ist.
  const feld = document.querySelector('#board');
  const letzte = feld?.lastElementChild;
  if (feld && letzte) {
    const raus = Math.round(letzte.getBoundingClientRect().bottom
                          - feld.getBoundingClientRect().bottom);
    if (raus > 1) funde.push({ art: 'kachel-ausserhalb-des-bretts', um: raus,
                               wo: '#board', text: '' });
  }
  return funde;
};

const problemeAlle = [];
let geprueft = 0;
for (const sprache of SPRACHEN) {
  for (const [w, h] of BREITEN) {
    for (const skin of STILE) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h },
        deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'de-DE' });
      const page = await ctx.newPage();
      const fehler = [];
      page.on('pageerror', (e) => fehler.push(e.message));
      await page.goto('http://localhost:4223/');
      await page.evaluate((s) => { localStorage.setItem('zp.seen.v1', 'true');
        localStorage.setItem('zp.settings.v1', JSON.stringify(
          { skin: s.skin, difficulty: 'endlos', sound: false, lang: s.lang, partners: true,
            kuerzel: 'WWW' }));
        // Auch die Weltliste soll mit dem breitesten Fall gemessen werden:
        // Kuerzel und sechsstellige Zahl in jeder Zeile.
        localStorage.setItem('zp.welt.v1', JSON.stringify({
          gelesenAm: Date.now(), spiele: 888888, siege: 777777,
          rekorde: { leicht: 999999, mittel: 999999, schwer: 999999,
                     klassisch: 999999, endlos: 999999 },
          wer: { leicht: 'WWW', mittel: 'WWW', schwer: 'WWW',
                 klassisch: 'WWW', endlos: 'WWW' },
        })); },
        { skin, lang: sprache });
      await page.reload(); await page.waitForTimeout(700);

      const marke = `${sprache}/${w}/${skin}`;
      const sammle = async (lage) => {
        geprueft++;
        const funde = await page.evaluate(PRUEFEN, FELDER);
        for (const f of funde) problemeAlle.push({ ...f, marke, lage });
      };

      await sammle('start');
      // Rettung: der Auffuellen-Knopf traegt dann das laengste Wort
      await page.evaluate(() => { window.__zp.state.refillsLeft = 0; window.__zp.state.status = 'stuck';
        window.__zp.renderBoard(); });
      await page.waitForTimeout(200); await sammle('rettung');
      await page.evaluate(() => { window.__zp.state.status = 'playing'; window.__zp.state.refillsLeft = 3;
        window.__zp.renderBoard(); });
      // Kombo-Plakette und Meldung
      await page.evaluate(async () => { const zp = window.__zp;
        for (let i = 0; i < 6; i++) { const p = zp.findPair(zp.state); if (!p) break;
          zp.onCellActivate(p[0]); zp.onCellActivate(p[1]);
          await new Promise((r) => setTimeout(r, 200)); } });
      await page.waitForTimeout(250); await sammle('kombo');
      await page.evaluate(() => window.__zp.doRefill()); await page.waitForTimeout(300);
      await sammle('meldung');
      // Blaetter
      await page.tap('#btn-settings'); await page.waitForTimeout(500);
      await page.evaluate(() => document.querySelectorAll('#dlg-settings details')
        .forEach((d) => { d.open = true; }));
      await page.waitForTimeout(200); await sammle('einstellungen');
      await page.keyboard.press('Escape'); await page.waitForTimeout(340);
      await page.tap('#btn-rules'); await page.waitForTimeout(500);
      await sammle('regeln');
      await page.keyboard.press('Escape'); await page.waitForTimeout(340);
      // Enddialog mit Bestwert
      await page.evaluate(() => { const zp = window.__zp, s = zp.state;
        s.cells = [{ id: 950, v: 4, cleared: false }, { id: 951, v: 6, cleared: false }];
        s.cols = 2; s.score = 98765; zp.renderBoard(); zp.onCellActivate(0); zp.onCellActivate(1); });
      await page.waitForTimeout(1800); await sammle('ende');
      for (const f of fehler) problemeAlle.push({ art: 'seitenfehler', wo: marke, text: f, marke, lage: '-' });
      await ctx.close();
    }
  }
}
await browser.close(); server.close();

console.log(`${geprueft} Lagen geprueft (${SPRACHEN.join('/')} x ${BREITEN.length} Breiten x ${STILE.length} Stile)`);
if (!problemeAlle.length) { console.log('kein Ueberlauf'); process.exit(0); }
// Gleiche Fundstelle nur einmal, mit der Liste der betroffenen Marken
const zusammen = new Map();
for (const p of problemeAlle) {
  const k = `${p.art}|${p.wo}|${p.text}`;
  const e = zusammen.get(k) ?? { ...p, marken: new Set(), lagen: new Set(), maxUm: 0 };
  e.marken.add(p.marke); e.lagen.add(p.lage); e.maxUm = Math.max(e.maxUm, p.um ?? 0);
  zusammen.set(k, e);
}
const sortiert = [...zusammen.values()].sort((a, b) => b.maxUm - a.maxUm);
console.log(`\n${sortiert.length} verschiedene Fundstellen:`);
for (const e of sortiert.slice(0, 40))
  console.log(`  ${e.art} +${e.maxUm}  ${e.wo}\n      ${JSON.stringify((e.text || '').slice(0, 60))}`
    + `\n      ${[...e.marken].slice(0, 6).join(' ')}${e.marken.size > 6 ? ` (+${e.marken.size - 6})` : ''}`
    + `  Lagen: ${[...e.lagen].join(',')}`);
process.exit(1);
