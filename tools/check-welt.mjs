/**
 * Abnahmepruefung fuer die Weltzaehler (online.js).
 *
 * Der echte Dienst laesst sich hier nicht befragen - die Entwicklungsumgebung
 * kommt nur an Paketregister und GitHub. Also wird er im Browser nachgebaut,
 * und zwar mit genau der Semantik, die vier Pruefdurchgaenge auf einem
 * GitHub-Laeufer am echten Dienst ergeben haben. Damit ist pruefbar, was am
 * echten Dienst gar nicht pruefbar waere: Gleichstand, verfallene Schluessel,
 * Ratenbegrenzung, Netzausfall, abgeschalteter Schalter - und das Kuerzel in
 * der Weltliste, samt der Faelle "alter Rekord ohne Kuerzel" und
 * "unbrauchbarer Wert vom Dienst".
 *
 * Aufruf:  node tools/check-welt.mjs
 * Braucht: npm i -D playwright-core  und einen Chromium (PLAYWRIGHT_BROWSERS_PATH)
 */
// Der Zaehlerdienst, im Browser nachgebaut - mit genau der Semantik, die die
// vier Pruefdurchgaenge auf dem GitHub-Laeufer ergeben haben:
//
//   /hit/:raum/:name                 200 {value}  +1, legt bei Bedarf an
//   /get/:raum/:name                 200 {value} | 404 {"error":"Key not found"}
//   /create/:raum/:name?initializer  201 {value} | 409 {"error":"Key already..."}
//
// Damit laesst sich pruefen, was am echten Dienst nicht pruefbar ist: das
// Zusammenspiel bei Rekorden, Gleichstand, verfallenen Schluesseln, 429 und
// abgeschaltetem Netz.
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
await new Promise((r) => server.listen(4245, r));
// Ohne executablePath nimmt Playwright den Browser aus PLAYWRIGHT_BROWSERS_PATH.
const browser = await chromium.launch(
  process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});

const probleme = [];
/** Der Enddialog liegt ueber allem - vor jedem Tipp daneben wegraeumen. */
/** Wartet, bis eine Sekunde lang keine Anfrage mehr hinausging. */
async function ruhe(maxMs = 12000) {
  const bis = Date.now() + maxMs;
  let stand = -1;
  while (Date.now() < bis) {
    const jetzt = D.protokoll.length;
    if (jetzt === stand) return;
    stand = jetzt;
    await page.waitForTimeout(1000);
  }
}

/**
 * Serverzustand von Hand stellen und mit frischem Blatt weitermachen.
 *
 * Das Neuladen ist nicht Zierrat: online.js haelt den Merkzettel IM MODUL
 * (damit ein Partieende und ein Lesen sich nicht gegenseitig ueberschreiben).
 * localStorage zu loeschen genuegt darum nicht mehr - ohne Neuladen kennt der
 * Browser weiter seinen alten Rekord und versucht gar nichts. Nebenbei setzt
 * das Neuladen die Strafpause nach einer 429 zurueck.
 */
async function stelleEin(paare = [], { merkzettel = 'leeren' } = {}) {
  for (const [name, wert] of paare) D.werte.set(`${raum}/${name}`, wert);
  await page.evaluate((was) => {
    const s = JSON.parse(localStorage.getItem('zp.settings.v1') ?? '{}');
    s.world = true;
    localStorage.setItem('zp.settings.v1', JSON.stringify(s));
    // Meist soll der Browser wirklich nachfragen, darum weg damit. Wer
    // pruefen will, was OHNE Netz angezeigt wird, braucht ihn dagegen.
    if (was === 'leeren') localStorage.removeItem('zp.welt.v1');
  }, merkzettel);
  await page.reload();
  await page.waitForTimeout(700);
  await ruhe();
}

async function zuDialog() {
  await page.evaluate(() => {
    const d = document.querySelector('#dlg-end');
    if (d?.open) (document.querySelector('#btn-end-new') ?? d).click();
  }).catch(() => {});
  await page.waitForTimeout(400);
}
const pruefe = (bedingung, text) => { if (!bedingung) probleme.push(text); };

// ---- der nachgebaute Dienst
function dienst() {
  const werte = new Map();
  const protokoll = [];
  let modus = 'normal';                 // normal | ratelimit | offline
  return {
    werte, protokoll,
    setModus(m) { modus = m; },
    // Laesst die naechste Anfrage auf diesen Pfadanfang genau einmal
    // scheitern - damit ist "Netz weg im falschen Augenblick" pruefbar.
    einmalScheitern: null,
    async route(r) {
      const url = new URL(r.request().url());
      protokoll.push(url.pathname + (url.search || ''));
      if (this.einmalScheitern && url.pathname.startsWith(this.einmalScheitern)) {
        this.einmalScheitern = null;
        return r.abort('connectionrefused');
      }
      if (modus === 'offline') return r.abort('connectionrefused');
      if (modus === 'ratelimit') {
        return r.fulfill({ status: 429, contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({ error: 'Too many requests. Try again in 7.9s' }) });
      }
      const teile = url.pathname.split('/').filter(Boolean);   // befehl, raum, name
      const [befehl, raum, name] = teile;
      const schluessel = `${raum}/${name}`;
      const json = (status, body) => r.fulfill({ status, contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
      if (befehl === 'hit') {
        werte.set(schluessel, (werte.get(schluessel) ?? 0) + 1);
        return json(200, { value: werte.get(schluessel) });
      }
      if (befehl === 'get') {
        if (!werte.has(schluessel)) return json(404, { error: 'Key not found' });
        return json(200, { value: werte.get(schluessel) });
      }
      if (befehl === 'info') {
        // Gemessen: auch fuer Unbekanntes 200, mit exists false und value -1.
        if (!werte.has(schluessel))
          return json(200, { exists: false, value: -1, is_genuine: true,
                             expires_in: -2e-9, full_key: `K:${raum}:${name}` });
        return json(200, { exists: true, value: werte.get(schluessel),
                           is_genuine: false, expires_in: 14515200,
                           full_key: `K:${raum}:${name}` });
      }
      if (befehl === 'create') {
        if (werte.has(schluessel))
          return json(409, { error: 'Key already exists, please use a different key.' });
        const start = Number(url.searchParams.get('initializer') ?? 0);
        if (!Number.isFinite(start)) return json(400, { error: 'initializer must be a number' });
        werte.set(schluessel, start);
        return json(201, { admin_key: 'x', key: name, namespace: raum, value: start });
      }
      return json(308, {});
    },
  };
}

const D = dienst();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await ctx.route('https://abacus.jasoncameron.dev/**', (r) => D.route(r));
const page = await ctx.newPage();
const fehler = [];
page.on('pageerror', (e) => fehler.push(String(e)));
await page.goto('http://localhost:4245/');
await page.evaluate(() => { localStorage.setItem('zp.seen.v1', 'true');
  localStorage.setItem('zp.settings.v1', JSON.stringify(
    { difficulty: 'mittel', sound: false, lang: 'de' })); });
await page.reload(); await page.waitForTimeout(700);

/**
 * Eine Partie im Browser zu Ende spielen. Wichtig: zwischen den Zuegen warten.
 * Das Spiel sperrt sich waehrend der Animationen (locked), synchron
 * hintereinander gerufene Zuege wuerden also einfach verschluckt.
 */
/** Spielt, bis eine Partie gewonnen ist (hoechstens `versuche` Anlaeufe). */
async function gewonnenePartie(versuche = 6) {
  for (let i = 0; i < versuche; i++) {
    // ZUERST eine neue Partie. Ohne das steht der Zustand noch auf "won" von
    // der letzten Partie, partie() bricht am offenen Enddialog sofort ab und
    // die Pruefung meldet einen Sieg, der schon vorbei war.
    await zuDialog();
    const laeuft = await page.evaluate(() => window.__zp.state.status === 'playing');
    if (!laeuft) await page.evaluate(() => window.__zp.newGame());
    await page.waitForTimeout(400);
    await partie();
    if (await page.evaluate(() => window.__zp.state.status === 'won')) return true;
  }
  return false;
}

async function partie() {
  for (let i = 0; i < 500; i++) {
    const st = await page.evaluate(() => ({
      status: window.__zp.state.status,
      paar: !!window.__zp.findPair(window.__zp.state),
      refills: window.__zp.state.refillsLeft,
      dialog: document.querySelector('#dlg-end').open,
    }));
    if (st.dialog || st.status !== 'playing') break;
    if (st.paar) {
      await page.evaluate(() => { const zp = window.__zp; const p = zp.findPair(zp.state);
        zp.onCellActivate(p[0]); zp.onCellActivate(p[1]); });
      await page.waitForTimeout(70);
    } else if (st.refills > 0) {
      await page.evaluate(() => window.__zp.doRefill());
      await page.waitForTimeout(320);
    } else break;
  }
  await page.waitForTimeout(600);
  await ruhe();                            // bis alle Rufe durch sind
}

console.log('=== 1. Erste Partie: Zaehler und erster Rekord ===');
pruefe(await gewonnenePartie(), 'es muesste eine Partie zu gewinnen sein');
const nach1 = Object.fromEntries(D.werte);
console.log(nach1);
const raum = [...D.werte.keys()][0]?.split('/')[0];
pruefe(D.werte.get(`${raum}/spiele`) >= 1, 'spiele muesste mindestens 1 sein');
pruefe(D.werte.get(`${raum}/best-mittel-gen`) === 1, 'der Zeiger muesste auf 1 stehen');
const rekord1 = D.werte.get(`${raum}/best-mittel-v1`);
const punkte1 = await page.evaluate(() => window.__zp.state.score);
pruefe(rekord1 === punkte1, `v1 (${rekord1}) muesste dem Punktestand (${punkte1}) entsprechen`);

console.log('\n=== 2. Anzeige in den Einstellungen ===');
await page.evaluate(() => document.querySelector('#btn-end-new')?.click());
await page.waitForTimeout(400);
await zuDialog(); await page.tap('#btn-settings'); await page.waitForTimeout(300);
await page.evaluate(() => { const g = document.getElementById('grp-best'); if (!g.open) g.querySelector('summary').click(); });
await page.waitForTimeout(1800);
const anzeige = await page.evaluate(() => ({
  welt: [...document.querySelectorAll('#world-list li')].map((l) => l.textContent.trim()),
  weltZahl: document.querySelector('#world-count').textContent,
  schalter: document.querySelector('#opt-world').checked,
}));
console.log(anzeige);
pruefe(anzeige.welt.some((z) => z.includes(String(rekord1))),
  'der Weltrekord muesste in der Liste stehen');
pruefe(/\d/.test(anzeige.weltZahl), 'die Weltzahl muesste eine Zahl zeigen');

console.log('\n=== 3. Bessere Partie: neue Nummer, Zeiger nachgezogen ===');
await page.evaluate(() => document.querySelector('#dlg-settings [data-close]').click());
await page.waitForTimeout(300);
// Nicht mit einem hochgesetzten Punktestand arbeiten: eine neue Partie
// verwirft ihn wieder, und die Punktzahl einer gewonnenen Partie streut um
// etwa ein Zehntel - ein Rekord waere also Glueckssache. Statt dessen den
// Weltwert kleinhalten, dann ist jede gewonnene Partie sicher ein Rekord.
await stelleEin([['best-mittel-v1', 100]]);
pruefe(await gewonnenePartie(), 'Abschnitt 3: keine gewonnene Partie');
await ruhe();
console.log(Object.fromEntries(D.werte));
const v2 = D.werte.get(`${raum}/best-mittel-v2`);
pruefe(v2 > 100, `v2 muesste den neuen Rekord tragen (ist ${v2})`);
pruefe(D.werte.get(`${raum}/best-mittel-gen`) === 2,
  `der Zeiger muesste auf 2 stehen (steht auf ${D.werte.get(`${raum}/best-mittel-gen`)})`);
pruefe(D.werte.get(`${raum}/spiele`) >= 2, 'spiele muesste gewachsen sein');

console.log('\n=== 4. Schwaechere Partie: nichts Neues ===');
// Der Weltwert wird kuenstlich hoch gesetzt, statt zu hoffen, dass die
// naechste Partie schlechter ausfaellt: die Punktzahl streut um etwa ein
// Zehntel, damit waere die Pruefung Glueckssache. Der Merkzettel wird dabei
// geleert, damit der Browser wirklich nachfragt und nicht schon aus dem
// eigenen Gedaechtnis abwinkt - so wird auch geprueft, dass er den fremden
// hoeheren Wert akzeptiert.
const zeigerVor = D.werte.get(`${raum}/best-mittel-gen`);
await stelleEin([['best-mittel-v2', 999999]]);
const marke4 = D.protokoll.length;
pruefe(await gewonnenePartie(), 'Abschnitt 4: keine gewonnene Partie');
await ruhe();
console.log('   hinaus:', D.protokoll.slice(marke4).join(' ') || '(nichts)');
pruefe(D.werte.get(`${raum}/best-mittel-v3`) === undefined,
  `es darf keine v3 geben (ist ${D.werte.get(`${raum}/best-mittel-v3`)})`);
pruefe(D.werte.get(`${raum}/best-mittel-gen`) === zeigerVor,
  `der Zeiger darf sich nicht bewegen (${zeigerVor} -> ${D.werte.get(`${raum}/best-mittel-gen`)})`);
pruefe(D.werte.get(`${raum}/spiele`) >= 3, 'spiele muesste weiter gewachsen sein');
// Und der fremde, hoehere Wert muss in der Anzeige ankommen.
await zuDialog();
await page.tap('#btn-settings'); await page.waitForTimeout(400);
await page.evaluate(() => { const g = document.getElementById('grp-best');
  if (!g.open) g.querySelector('summary').click(); });
await ruhe();
const gezeigt = await page.evaluate(() =>
  [...document.querySelectorAll('#world-list li')].map((l) => l.textContent.trim()));
console.log('Anzeige:', gezeigt.join(' | '));
pruefe(gezeigt.some((z) => z.includes('999999')),
  'der fremde Rekord 999999 muesste angezeigt werden');
await page.evaluate(() => document.querySelector('#dlg-settings [data-close]')?.click());
await page.waitForTimeout(300);

console.log('\n=== 5. Verfallener Schluessel: heilt sich das? ===');
const marke5 = D.protokoll.length;
D.werte.delete(`${raum}/best-mittel-v1`);      // nach sechs Monaten verfallen
D.werte.delete(`${raum}/best-mittel-v2`);      // (angelegt wurden beide vorher)
await page.evaluate(() => { localStorage.removeItem('zp.welt.v1'); });   // frischer Browser
await page.reload(); await page.waitForTimeout(700);
pruefe(await gewonnenePartie(), 'Abschnitt 5: keine gewonnene Partie');
await page.waitForTimeout(1500);
console.log(Object.fromEntries(D.werte));
console.log('Rufe in Abschnitt 5:', D.protokoll.slice(marke5).join(' '));
console.log('Punktestand am Ende:', await page.evaluate(() => window.__zp.state.score));
console.log('Merkzettel:', await page.evaluate(() => localStorage.getItem('zp.welt.v1')));
const wieder = [1, 2, 3, 4].map((n) => D.werte.get(`${raum}/best-mittel-v${n}`))
  .find((v) => v !== undefined);
pruefe(wieder !== undefined && wieder > 0,
  'nach dem Verfall muesste der naechste Rekord wieder eingetragen werden');
pruefe(D.werte.get(`${raum}/best-mittel-gen`) === 3,
  `der Zeiger muesste auf 3 stehen (steht auf ${D.werte.get(`${raum}/best-mittel-gen`)})`);

console.log('\n=== 6. Dienst antwortet mit 429 ===');
D.setModus('ratelimit');
const vorher = D.protokoll.length;
await page.evaluate(() => document.querySelector('#btn-end-new')?.click());
await page.waitForTimeout(400);
await partie();
await page.waitForTimeout(1500);
console.log(`Anfragen waehrend der Strafpause: ${D.protokoll.length - vorher}`);
pruefe(D.protokoll.length - vorher <= 2,
  'nach einer 429 darf nicht weiter angefragt werden');
pruefe(fehler.length === 0, 'keine Seitenfehler bei 429');

console.log('\n=== 7. Netz weg ===');
// Frisches Blatt: sonst gilt noch die Strafpause aus Abschnitt 6, es geht
// ohnehin nichts hinaus, und der Abschnitt bestaetigt sich selbst. Der
// Merkzettel bleibt hier ausdruecklich stehen - genau er soll ohne Netz
// angezeigt werden.
await stelleEin([], { merkzettel: 'behalten' });
D.setModus('offline');
await page.evaluate(() => document.querySelector('#btn-end-new')?.click());
await page.waitForTimeout(400);
await partie();
await zuDialog(); await page.tap('#btn-settings'); await page.waitForTimeout(1200);
const ohneNetz = await page.evaluate(() => ({
  welt: [...document.querySelectorAll('#world-list li')].map((l) => l.textContent.trim()),
  note: document.querySelector('#world-count').textContent,
  spielbar: window.__zp.state.status,
}));
console.log(ohneNetz);
pruefe(fehler.length === 0, `keine Seitenfehler ohne Netz: ${fehler.join(' | ')}`);

console.log('\n=== 8. Schalter aus: kein einziger Ruf mehr ===');
// Auch hier: ohne frisches Blatt waere "nichts ging hinaus" schon durch die
// Strafpause erfuellt, und der Schalter bliebe ungeprueft.
D.setModus('normal');
await stelleEin();
await page.evaluate(() => { const s = document.querySelector('#opt-world'); s.checked = false;
  s.dispatchEvent(new Event('change', { bubbles: true })); });
await page.waitForTimeout(500);
const vorAus = D.protokoll.length;
await page.evaluate(() => document.querySelector('#dlg-settings [data-close]').click());
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector('#btn-end-new')?.click());
await page.waitForTimeout(300);
await partie();
await page.waitForTimeout(1500);
await zuDialog(); await page.tap('#btn-settings'); await page.waitForTimeout(1000);
const ausText = await page.evaluate(() => document.querySelector('#world-count').textContent);
console.log(`Anfragen mit ausgeschaltetem Schalter: ${D.protokoll.length - vorAus} · Hinweis: ${ausText}`);
pruefe(D.protokoll.length - vorAus === 0, 'ausgeschaltet darf gar nichts hinausgehen');

console.log('\n=== 9. Was ging insgesamt hinaus? ===');
console.log(D.protokoll.slice(0, 30).join('\n'));
console.log(`... insgesamt ${D.protokoll.length} Anfragen`);

console.log('\n=== 9b. Zeiger nicht nachgezogen: klemmt es? ===');
// Der gefaehrlichste Fall im Verfahren: ein Browser legt den neuen Stand an
// und verliert das Netz, bevor er den Zeiger nachzieht. Dann zeigt der Zeiger
// auf den alten Stand, und der naechste Versuch trifft auf eine belegte
// Nummer. Wer dort aufgibt, kommt nie wieder durch.
//
// Gearbeitet wird hier NICHT mit einem kuenstlich hochgesetzten Punktestand -
// der geht verloren, sobald eine Partie neu angefangen werden muss. Statt
// dessen wird der Weltwert kleingehalten, dann ist jede gewonnene Partie ein
// Rekord.
//
// WICHTIG: mit einem frisch geladenen Blatt anfangen. online.js haelt zwei
// Dinge im Modul, die kein Schalter zurueckstellt: die Strafpause nach einer
// 429 (eine halbe Minute) und die Warteschlange. Aus Abschnitt 6 kommt genau
// so eine Strafpause - ohne Neuladen prueft dieser Abschnitt also nur, dass
// gesperrt gesperrt bleibt, und meldet das faelschlich als Klemmer.
D.setModus('normal');
await zuDialog();

// Erstens: der Zeiger hinkt schon hinterher (zeigt auf 8, es gibt aber v9).
// Das Lesen schaut nur zurueck, findet also nichts - der Eintrag muss
// trotzdem durchkommen.
await stelleEin([['best-mittel-gen', 8], ['best-mittel-v9', 100]]);
let marke = D.protokoll.length;
pruefe(await gewonnenePartie(), 'Abschnitt 9b: keine gewonnene Partie');
await ruhe();
console.log('   hinaus:', D.protokoll.slice(marke).join(' ') || '(nichts)');
const v10 = D.werte.get(`${raum}/best-mittel-v10`);
console.log(`hinkender Zeiger: v10 ${v10} · Zeiger ${D.werte.get(`${raum}/best-mittel-gen`)}`);
pruefe(v10 > 100, `der neue Stand muesste als v10 stehen (ist ${v10})`);
pruefe(D.werte.get(`${raum}/best-mittel-gen`) === 10,
  `der Zeiger muesste auf 10 stehen (steht auf ${D.werte.get(`${raum}/best-mittel-gen`)})`);

// Zweitens: das Nachziehen des Zeigers geht verloren. Danach steht ein Stand
// da, den niemand findet.
await stelleEin([['best-mittel-gen', 10], ['best-mittel-v10', 50]]);
D.einmalScheitern = `/hit/${raum}/best-mittel-gen`;
marke = D.protokoll.length;
pruefe(await gewonnenePartie(), 'Abschnitt 9b: keine zweite gewonnene Partie');
await ruhe();
console.log('   hinaus:', D.protokoll.slice(marke).join(' ') || '(nichts)');
const v11 = D.werte.get(`${raum}/best-mittel-v11`);
const zeigerDanach = D.werte.get(`${raum}/best-mittel-gen`);
console.log(`verlorener Zeigerruf: v11 ${v11} · Zeiger ${zeigerDanach}`);
pruefe(v11 > 50, `v11 muesste angelegt sein (ist ${v11})`);
pruefe(zeigerDanach === 10, `der Zeiger muesste zurueckhaengen (steht auf ${zeigerDanach})`);

// Drittens - der entscheidende Teil: die naechste Partie muss den Zeiger
// nachholen, statt fuer immer an der belegten Nummer 11 abzuprallen.
await stelleEin();
marke = D.protokoll.length;
pruefe(await gewonnenePartie(), 'Abschnitt 9b: keine dritte gewonnene Partie');
await ruhe();
console.log('   hinaus:', D.protokoll.slice(marke).join(' ') || '(nichts)');
const geheilt = D.werte.get(`${raum}/best-mittel-gen`);
console.log(`nach der naechsten Partie: Zeiger ${geheilt}`
  + ` · v11 ${D.werte.get(`${raum}/best-mittel-v11`)}`
  + ` · v12 ${D.werte.get(`${raum}/best-mittel-v12`)}`);
pruefe(geheilt >= 11,
  `der Zeiger muesste nachgeholt sein, sonst klemmt es fuer immer (steht auf ${geheilt})`);
// Und der verwaiste Stand ist damit wieder sichtbar.
await stelleEin();
await zuDialog();
await page.tap('#btn-settings'); await page.waitForTimeout(500);
await page.evaluate(() => { const g = document.getElementById('grp-best');
  if (!g.open) g.querySelector('summary').click(); });
await ruhe();
const sichtbar = await page.evaluate(() =>
  [...document.querySelectorAll('#world-list li')].map((l) => l.textContent.trim()));
console.log('Anzeige danach:', sichtbar.join(' | '));
pruefe(sichtbar.some((z) => /\d{3,}/.test(z)), 'der Rekord muesste wieder angezeigt werden');
await page.evaluate(() => document.querySelector('#dlg-settings [data-close]')?.click());
await page.waitForTimeout(300);

console.log('\n=== 10. Eine Partie mit Rettung zaehlt einmal ===');
// endGame laeuft fuer dieselbe Partie mehrfach: erst die Sackgasse, dann -
// wenn man die Rettung nimmt - noch einmal. Der Zaehler darf davon nur einmal
// hochgehen.
//
// Die Sackgasse wird hier von Hand gestellt und nicht abgewartet: in einem
// Lauf kamen 15 Partien ohne eine einzige Rettung vor, damit prueft der
// Abschnitt nichts. Das Feld ist so gebaut, dass genau ein Zug moeglich ist
// und danach 1 und 2 uebrig bleiben - die passen zu nichts (weder gleich noch
// zusammen 10), und Auffuellen gibt es nicht mehr.
D.setModus('normal');
await zuDialog();
await ruhe();

const vorZaehler = D.werte.get(`${raum}/spiele`) ?? 0;
const vorEigen = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('zp.count.v1') ?? '{"gespielt":0}').gespielt);
const marke10 = D.protokoll.length;

await page.evaluate(() => {
  window.__zp.newGame();                      // frischer Zustand ohne Merker
  const s = window.__zp.state;
  s.cells = [3, 7, 1, 2].map((v, i) => ({ id: i, v, cleared: false }));
  s.nextId = 4;
  s.refillsLeft = 0;
  s.rescuesLeft = 1;
  s.score = 0;
  s.combo = 0;
  s.status = 'playing';
  window.__zp.renderBoard();
});
await page.waitForTimeout(400);
// Der einzige moegliche Zug: 3 und 7 nebeneinander.
await page.evaluate(() => { window.__zp.onCellActivate(0); window.__zp.onCellActivate(1); });
await page.waitForTimeout(1200);
const sackgasse = await page.evaluate(() => ({
  status: window.__zp.state.status,
  dialog: document.querySelector('#dlg-end').open,
  rettungDa: !document.querySelector('#btn-end-rescue').hidden,
}));
console.log('Sackgasse:', sackgasse);
pruefe(sackgasse.status === 'stuck', 'das Feld muesste in der Sackgasse enden');
pruefe(sackgasse.rettungDa, 'die Rettung muesste angeboten werden');

// Rettung nehmen - damit endet dieselbe Partie ein zweites Mal.
await page.evaluate(() => document.querySelector('#btn-end-rescue').click());
await page.waitForTimeout(1500);
await ruhe();
const nachher = await page.evaluate(() => ({
  eigen: JSON.parse(localStorage.getItem('zp.count.v1') ?? '{}').gespielt,
  rettungen: window.__zp.state.rescuesUsed,
}));
const zuwachs = (D.werte.get(`${raum}/spiele`) ?? 0) - vorZaehler;
console.log(`Rettungen ${nachher.rettungen} · Weltzaehler +${zuwachs}`
  + ` · eigener Zaehler ${vorEigen} -> ${nachher.eigen}`);
console.log('   hinaus:', D.protokoll.slice(marke10).join(' ') || '(nichts)');
pruefe(nachher.rettungen === 1, 'die Rettung muesste genommen worden sein');
pruefe(zuwachs === 1, `der Weltzaehler muesste um genau 1 steigen, nicht um ${zuwachs}`);
pruefe(nachher.eigen === vorEigen + 1,
  `der eigene Zaehler muesste um genau 1 steigen (${vorEigen} -> ${nachher.eigen})`);

console.log('\n=== 11. Das Kuerzel in der Weltliste ===');
// Der Dienst haelt nur Zahlen. Das Kuerzel geht darum als Zahl zur Basis 37
// hinaus (siehe online.js), unter einem eigenen Namen neben dem Punktestand.
// Geprueft wird der ganze Weg: eintippen, hinausgehen, zurueckkommen,
// angezeigt werden - und was passiert, wenn es fehlt oder unbrauchbar ist.
D.setModus('normal');
await zuDialog();

// Erstens: mit Kuerzel gewinnen. Es muss als Zahl neben dem Stand liegen.
await stelleEin([['best-mittel-gen', 20], ['best-mittel-v20', 100]]);
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('zp.settings.v1') ?? '{}');
  s.kuerzel = 'CAU';
  localStorage.setItem('zp.settings.v1', JSON.stringify(s));
});
await page.reload(); await page.waitForTimeout(700);
let marke11 = D.protokoll.length;
pruefe(await gewonnenePartie(), 'Abschnitt 11: keine gewonnene Partie');
await ruhe();
console.log('   hinaus:', D.protokoll.slice(marke11).join(' ') || '(nichts)');
const k21 = D.werte.get(`${raum}/best-mittel-k21`);
const v21 = D.werte.get(`${raum}/best-mittel-v21`);
// 'CAU' = (12+1)*37^2 + (10+1)*37 + (30+1) = 18235
console.log(`v21 ${v21} · k21 ${k21}`);
pruefe(k21 === 18235, `k21 muesste 18235 sein ("CAU"), ist ${k21}`);
pruefe(v21 > 100, `v21 muesste den Rekord tragen (ist ${v21})`);
// Der Merkzettel muss das Kuerzel gleich mitbekommen, ohne noch einmal zu
// lesen: sonst stuende nach dem eigenen Weltrekord bis zum naechsten Lesen
// der alte Name daneben.
const gemerkt = await page.evaluate(() => JSON.parse(localStorage.getItem('zp.welt.v1') ?? '{}'));
console.log('Merkzettel:', JSON.stringify({ rekorde: gemerkt.rekorde, wer: gemerkt.wer }));
pruefe(gemerkt.wer?.mittel === 'CAU',
  `der Merkzettel muesste CAU tragen (ist ${JSON.stringify(gemerkt.wer)})`);

// Und in der Anzeige steht der Name neben der Zahl.
await stelleEin();
await zuDialog(); await page.tap('#btn-settings'); await page.waitForTimeout(300);
await page.evaluate(() => { const g = document.getElementById('grp-best');
  if (!g.open) g.querySelector('summary').click(); });
await ruhe();
const weltliste = () => page.evaluate(() =>
  [...document.querySelectorAll('#world-list li')].map((l) => ({
    text: l.textContent.trim(), wer: l.querySelector('.best-list__who')?.textContent })));
const mitKuerzel = await weltliste();
console.log('Weltliste:', JSON.stringify(mitKuerzel));
pruefe(mitKuerzel.some((z) => z.wer === 'CAU'),
  'in der Weltliste muesste CAU neben dem Rekord stehen');
await page.evaluate(() => document.querySelector('#dlg-settings [data-close]')?.click());
await page.waitForTimeout(300);

// Zweitens: ein Rekord aus der Zeit vor dem Kuerzel. Der Stand steht da, der
// Name fehlt - angezeigt wird der Rekord trotzdem, nur ohne Namen.
await stelleEin([['best-schwer-gen', 3], ['best-schwer-v3', 4321]]);
await zuDialog(); await page.tap('#btn-settings'); await page.waitForTimeout(300);
await page.evaluate(() => { const g = document.getElementById('grp-best');
  if (!g.open) g.querySelector('summary').click(); });
await ruhe();
const ohneKuerzel = await weltliste();
console.log('alter Rekord ohne Kuerzel:', JSON.stringify(ohneKuerzel));
pruefe(ohneKuerzel.some((z) => z.text.includes('4321') && !z.wer),
  'ein Rekord ohne Kuerzel muesste ohne Namen angezeigt werden');
await page.evaluate(() => document.querySelector('#dlg-settings [data-close]')?.click());
await page.waitForTimeout(300);

// Drittens: ohne eigenes Kuerzel geht auch keines hinaus - kein Ruf, kein
// leerer Name, nichts.
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('zp.settings.v1') ?? '{}');
  s.kuerzel = '';
  localStorage.setItem('zp.settings.v1', JSON.stringify(s));
});
await stelleEin([['best-mittel-gen', 30], ['best-mittel-v30', 100]]);
marke11 = D.protokoll.length;
pruefe(await gewonnenePartie(), 'Abschnitt 11: keine dritte gewonnene Partie');
await ruhe();
const rufe = D.protokoll.slice(marke11);
console.log('   hinaus:', rufe.join(' ') || '(nichts)');
pruefe(!rufe.some((r) => r.includes('-k31')),
  'ohne Kuerzel darf kein Kuerzel-Zaehler angelegt werden');
pruefe(D.werte.get(`${raum}/best-mittel-v31`) > 100,
  'der Rekord selbst muesste trotzdem stehen');

// Viertens: ein unbrauchbarer Wert vom Dienst darf keine erfundenen Zeichen
// ergeben - 50653 passt nicht mehr in drei Stellen.
await stelleEin([['best-leicht-gen', 5], ['best-leicht-v5', 7777], ['best-leicht-k5', 50653]]);
await zuDialog(); await page.tap('#btn-settings'); await page.waitForTimeout(300);
await page.evaluate(() => { const g = document.getElementById('grp-best');
  if (!g.open) g.querySelector('summary').click(); });
await ruhe();
const kaputt = await weltliste();
console.log('unbrauchbarer Wert:', JSON.stringify(kaputt));
pruefe(kaputt.some((z) => z.text.includes('7777') && !z.wer),
  'ein unbrauchbarer Kuerzelwert muesste als kein Name gelten');
pruefe(fehler.length === 0, `keine Seitenfehler im Kuerzel-Abschnitt: ${fehler.join(' | ')}`);

await browser.close(); server.close();
console.log('\n=== Probleme ===');
console.log(probleme.length ? probleme.join('\n') : 'keine');
console.log('Seitenfehler:', fehler.length ? fehler.join(' | ') : 'keine');
process.exit(probleme.length || fehler.length ? 1 : 0);
