/**
 * Abnahmepruefung fuer die Weltrangliste (worker.js + D1 + online.js).
 *
 * Startet eine lokale D1-Datenbank samt "wrangler dev", spielt die Faelle
 * durch und raeumt hinterher auf. Nichts davon beruehrt die echte Datenbank.
 *
 *   node tools/check-welt.mjs
 *
 * Braucht: npm i -D playwright-core, einen Chromium (PLAYWRIGHT_BROWSERS_PATH
 * oder CHROMIUM=/pfad/zum/chrome) und npx.
 *
 * Die Vorgaengerfassung war 591 Zeilen lang und hat zu neun Elfteln Probleme
 * geprueft, die es nicht mehr gibt: verfallende Schluessel, die Drosselung des
 * fremden Dienstes, ein Zeiger, der seinem Stand vorauslaeuft, und ein
 * selbstgebautes Compare-and-Set aus 409ern. Das ist alles mit dem Umzug
 * weggefallen. Geblieben sind die Fragen, die wirklich zaehlen - allen voran
 * die eine, wegen der es eine Datenbank geworden ist: was passiert, wenn zwei
 * Spieler im selben Augenblick fertig werden?
 */
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8799;
const BASIS = `http://127.0.0.1:${PORT}`;

let probleme = 0;
function pruefe(bedingung, was) {
  console.log(`${bedingung ? '  ok  ' : '  FEHLT'} ${was}`);
  if (!bedingung) probleme++;
}
const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));

/** npx-Aufruf, der wartet, bis er fertig ist. */
function lauf(args) {
  return new Promise((fertig, schief) => {
    const p = spawn('npx', ['--yes', 'wrangler@latest', ...args],
      { cwd: ROOT, stdio: 'inherit' });
    p.on('exit', (c) => (c === 0 ? fertig() : schief(new Error(`wrangler ${args[0]}: ${c}`))));
  });
}

const hole = async (pfad, koerper) => {
  const a = await fetch(BASIS + pfad, koerper
    ? { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(koerper) }
    : {});
  return { status: a.status, daten: await a.json().catch(() => null) };
};

/* -------------------------------------------------------------- aufbauen */

console.log('=== Vorbereitung: frische lokale Datenbank ===');
await rm(join(ROOT, '.wrangler/state/v3/d1'), { recursive: true, force: true });
await lauf(['d1', 'migrations', 'apply', 'zehner-paare', '--local']);
await lauf(['deploy', '--dry-run']);          // baut nichts, prueft aber die Konfiguration

// detached: npx startet wrangler als eigenes Kind, und ein kill auf npx
// laesst dieses Kind am Leben - es haelt dann den Port, und der naechste Lauf
// bekommt keinen Server mehr. Mit einer eigenen Prozessgruppe (-pid) geht
// beides zusammen weg.
const server = spawn('npx', ['--yes', 'wrangler@latest', 'dev',
  '--port', String(PORT), '--ip', '127.0.0.1'],
  { cwd: ROOT, stdio: 'ignore', detached: true });
let lebt = true;
server.on('exit', () => { lebt = false; });
const abraeumen = () => { try { process.kill(-server.pid, 'SIGTERM'); } catch { /* schon weg */ } };
process.on('exit', abraeumen);

let bereit = false;
for (let i = 0; i < 180 && lebt && !bereit; i++) {
  await schlaf(1000);
  try { bereit = (await fetch(`${BASIS}/api/welt`)).ok; } catch { /* noch nicht da */ }
}
if (!bereit) {
  // Ohne Server sagt jede folgende Pruefung nur, dass kein Server da ist.
  // Das ist keine Aussage ueber die Weltrangliste - also hier abbrechen.
  abraeumen();
  console.error(`\nwrangler dev kam auf ${BASIS} nicht hoch${lebt ? '' : ' (Prozess beendet)'}.`);
  process.exit(2);
}

try {
  /* ------------------------------------------------ 1. die Uebernahme */

  console.log('\n=== 1. Der uebernommene Bestand steht da ===');
  const anfang = await hole('/api/welt');
  pruefe(anfang.status === 200, 'GET /api/welt antwortet mit 200');
  pruefe(anfang.daten.spiele === 115 && anfang.daten.siege === 75,
    `Zaehler 115/75 (ist ${anfang.daten.spiele}/${anfang.daten.siege})`);
  for (const [stufe, punkte, kuerzel] of [
    ['leicht', 3077, 'TAB'], ['mittel', 4169, ''], ['schwer', 4862, 'SES'],
    ['klassisch', 1634, 'SES'], ['endlos', 12503, 'SES'],
  ]) {
    const r = anfang.daten.rekorde[stufe];
    pruefe(r?.punkte === punkte && r?.kuerzel === kuerzel,
      `${stufe}: ${punkte}${kuerzel ? '/' + kuerzel : ' ohne Kuerzel'} (ist ${r?.punkte}/${r?.kuerzel})`);
  }

  console.log('\n=== 1b. Die Bestenliste zeigt nur Namen ===');
  const b = anfang.daten.beste;
  pruefe(b?.leicht?.length === 3 && b.leicht[0].punkte === 3077 && b.leicht[0].kuerzel === 'TAB',
    `leicht: 3 Namen, oben 3077/TAB (ist ${JSON.stringify(b?.leicht?.[0])})`);
  pruefe(b?.leicht?.every((e) => e.kuerzel),
    'kein Eintrag ohne Kuerzel');
  // Mittel hat vier Zeilen, aber nur eine mit Kuerzel - und der Rekord der
  // Stufe (4169) ist NICHT dabei. Genau das ist gewollt.
  pruefe(b?.mittel?.length === 1 && b.mittel[0].punkte === 4155,
    `mittel: nur 4155/CHR, der namenlose Rekord 4169 fehlt (ist ${JSON.stringify(b?.mittel)})`);
  pruefe(anfang.daten.rekorde.mittel.punkte === 4169,
    'der wahre Rekord steht trotzdem weiter da');
  const fallend = (l) => l.every((e, i) => i === 0 || l[i - 1].punkte >= e.punkte);
  pruefe(Object.values(b).every(fallend), 'jede Liste faellt von oben nach unten');

  /* ---------------------------------------------- 2. zaehlen und melden */

  console.log('\n=== 2. Eine schwache Partie zaehlt mit, aendert aber nichts ===');
  const schwach = await hole('/api/partie', { stufe: 'mittel', punkte: 10,
    kuerzel: 'ABC', zaehlt: true, gewonnen: true, neuePartie: true });
  pruefe(schwach.daten.spiele === 116 && schwach.daten.siege === 76, 'Zaehler stehen auf 116/76');
  pruefe(schwach.daten.rekorde.mittel.punkte === 4169, 'der Rekord bleibt bei 4169');

  console.log('\n=== 3. Ein echter Rekord geht ein, das Kuerzel kommt mit ===');
  const stark = await hole('/api/partie', { stufe: 'mittel', punkte: 5000,
    kuerzel: 'abc', zaehlt: true, gewonnen: true, neuePartie: true });
  pruefe(stark.daten.rekorde.mittel.punkte === 5000, 'Mittel steht auf 5000');
  pruefe(stark.daten.rekorde.mittel.kuerzel === 'ABC', 'das Kuerzel wurde gross geschrieben');
  pruefe(stark.daten.beste.mittel[0].kuerzel === 'ABC' && stark.daten.beste.mittel.length === 2,
    `und steht sofort oben in der Bestenliste (ist ${JSON.stringify(stark.daten.beste.mittel)})`);

  /* ------------------------------------------- 4. der eigentliche Grund */

  console.log('\n=== 4. Zwei Spieler im selben Augenblick ===');
  // Genau hier war der alte Dienst nicht sicher zu bekommen: lesen,
  // vergleichen und schreiben waren drei Rufe, zwischen denen alles passieren
  // konnte. Jetzt ist es ein SQL-Satz.
  const gleichzeitig = await Promise.all([
    hole('/api/partie', { stufe: 'schwer', punkte: 6000, kuerzel: 'AAA', zaehlt: true, neuePartie: true }),
    hole('/api/partie', { stufe: 'schwer', punkte: 7000, kuerzel: 'BBB', zaehlt: true, neuePartie: true }),
    hole('/api/partie', { stufe: 'schwer', punkte: 6500, kuerzel: 'CCC', zaehlt: true, neuePartie: true }),
  ]);
  pruefe(gleichzeitig.every((g) => g.status === 200), 'alle drei kommen durch');
  const nachher = await hole('/api/welt');
  pruefe(nachher.daten.rekorde.schwer.punkte === 7000,
    `der hoechste gewinnt: 7000 (ist ${nachher.daten.rekorde.schwer.punkte})`);
  pruefe(nachher.daten.rekorde.schwer.kuerzel === 'BBB',
    `und traegt seinen Namen: BBB (ist ${nachher.daten.rekorde.schwer.kuerzel})`);
  // 115 uebernommen + 1 + 1 + 3 = 120.
  pruefe(nachher.daten.spiele === 120, `alle drei Partien sind gezaehlt (ist ${nachher.daten.spiele})`);

  console.log('\n=== 5. Derselbe Wert noch einmal aendert nichts ===');
  const gleich = await hole('/api/partie', { stufe: 'schwer', punkte: 7000,
    kuerzel: 'ZZZ', zaehlt: true, neuePartie: false });
  pruefe(gleich.daten.rekorde.schwer.kuerzel === 'BBB',
    'ein Gleichstand stiehlt den Namen nicht');

  /* -------------------------------------------------- 6. was abgelehnt wird */

  console.log('\n=== 6. Unsinn kommt nicht in die Liste ===');
  for (const [was, koerper] of [
    ['erfundene Stufe', { stufe: 'experte', punkte: 10 }],
    ['Punkte als Text', { stufe: 'mittel', punkte: '9999' }],
    ['Punkte jenseits von Gut und Boese', { stufe: 'mittel', punkte: 99999999 }],
    ['Kuerzel mit Markup', { stufe: 'mittel', punkte: 10, kuerzel: '<b>' }],
    ['gar nichts', {}],
  ]) {
    const a = await hole('/api/partie', koerper);
    pruefe(a.status === 400, `${was} wird mit 400 abgelehnt (ist ${a.status})`);
  }
  const unberuehrt = await hole('/api/welt');
  pruefe(unberuehrt.daten.rekorde.mittel.punkte === 5000 && unberuehrt.daten.spiele === 120,
    'und hat weder Rekord noch Zaehler angefasst');

  console.log('\n=== 7. Unbekannte Adressen ===');
  pruefe((await hole('/api/gibtsnicht')).status === 404, '/api/gibtsnicht ist ein 404');
  const seite = await fetch(`${BASIS}/`);
  pruefe(seite.ok && (await seite.text()).includes('Zehner'), 'die Seite selbst kommt weiter');
  pruefe((await fetch(`${BASIS}/worker.js`)).status === 404, 'der Servercode wird nicht ausgeliefert');

  /* ----------------------------------------------------- 8. im Browser */

  console.log('\n=== 8. Das Spiel selbst ===');
  const pw = await import(join(ROOT, 'node_modules/playwright-core/index.js'));
  const browser = await pw.default.chromium.launch({ executablePath: process.env.CHROMIUM });
  const seiteAuf = async (welt) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'de-DE' });
    const p = await ctx.newPage();
    const rufe = [];
    p.on('request', (r) => { if (r.url().includes('/api/')) rufe.push(r.method()); });
    await p.addInitScript(`
      localStorage.setItem('zp.seen.v1','true');
      localStorage.setItem('zp.settings.v1', JSON.stringify({skin:'classic',difficulty:'mittel',
        sound:false,vibrate:false,theme:'light',lang:'de',world:${welt},kuerzel:'NEU'}));`);
    await p.goto(BASIS + '/');
    await p.evaluate(() => window.__zp.aufbauBeenden());
    await p.waitForTimeout(2500);
    return { ctx, p, rufe };
  };

  const an = await seiteAuf(true);
  pruefe(an.rufe.length === 1 && an.rufe[0] === 'GET',
    `beim Start genau EIN Ruf (war ${an.rufe.join(',') || 'keiner'})`);
  pruefe((await an.p.evaluate(() => document.getElementById('stat-world').textContent))
    .includes('5000'), 'der Weltrekord steht im Spielfeld');

  const oben = await an.p.evaluate(() => {
    document.getElementById('btn-settings')?.click();
    const g = document.getElementById('grp-best');
    if (g && !g.open) g.querySelector('summary').click();
    return new Promise((f) => setTimeout(() => f({
      titel: document.getElementById('top-title')?.textContent ?? '',
      versteckt: document.getElementById('top-title')?.hidden,
      zeilen: [...document.querySelectorAll('#top-list li')].map((l) => l.textContent.trim()),
    }), 500));
  });
  // Die Einstellung steht auf "mittel", die Liste muss die von Mittel sein.
  pruefe(!oben.versteckt && oben.titel.includes('Mittel'),
    `die Ueberschrift nennt die eingestellte Stufe (ist ${JSON.stringify(oben.titel)})`);
  // Zwei Namen, weil Abschnitt 3 selbst 5000/ABC eingetragen hat - der muss
  // ueber dem uebernommenen 4155/CHR stehen. Der namenlose 4169 fehlt auch
  // hier, obwohl er einmal Rekord war.
  pruefe(oben.zeilen.length === 2
      && oben.zeilen[0].includes('ABC') && oben.zeilen[0].includes('5000')
      && oben.zeilen[1].includes('CHR'),
    `und darunter stehen beide Namen in der richtigen Reihenfolge (ist ${JSON.stringify(oben.zeilen)})`);
  await an.ctx.close();

  const aus = await seiteAuf(false);
  pruefe(aus.rufe.length === 0, `Schalter aus: kein einziger Ruf (waren ${aus.rufe.length})`);
  pruefe((await aus.p.evaluate(() => document.querySelectorAll('.cell').length)) > 0,
    'und gespielt werden kann trotzdem');

  // Der leere Fall, ohne ihn herbeizufuehren: mit ausgeschaltetem Schalter
  // wurde nie gelesen, also kennt das Spiel keine Bestenliste. Genau so sieht
  // es beim allerersten Start aus.
  const ohne = await aus.p.evaluate(() => {
    document.getElementById('btn-settings')?.click();
    const g = document.getElementById('grp-best');
    if (g && !g.open) g.querySelector('summary').click();
    return new Promise((f) => setTimeout(() => f({
      zeilen: document.querySelectorAll('#top-list li').length,
      notiz: document.getElementById('top-none')?.hidden === false
        ? document.getElementById('top-none').textContent.trim() : '',
    }), 500));
  });
  pruefe(ohne.zeilen === 0, `ohne Weltwerte bleibt die Liste leer (sind ${ohne.zeilen} Zeilen)`);
  pruefe(ohne.notiz.length > 10, `und ein Satz erklaert warum (ist ${JSON.stringify(ohne.notiz)})`);
  await aus.ctx.close();

  /* ------------------------------------- 9. der Servicearbeiter und /api/ */

  // Seit die Rangliste in der eigenen Datenbank liegt, kommt /api/ vom selben
  // Host wie das Spiel - und faellt damit in den Zustaendigkeitsbereich des
  // Servicearbeiters. Legte der die Antwort ab, staende offline ein alter
  // Rekord da; als Ausweichantwort gaebe es index.html auf eine Frage nach
  // Zahlen. Beides genau einmal geprueft, damit es keiner wieder einbaut.
  console.log('\n=== 9. Der Servicearbeiter laesst die Rangliste in Ruhe ===');
  const sw = await seiteAuf(true);
  const aktiv = await sw.p.evaluate(() =>
    navigator.serviceWorker.ready.then((r) => !!r.active).catch(() => false));
  pruefe(aktiv, 'der Servicearbeiter ist aktiv');
  // Merkzettel weg und neu laden: jetzt geht ein Leseruf durch den Arbeiter.
  await sw.p.evaluate(() => localStorage.removeItem('zp.welt.v1'));
  await sw.p.reload();
  await sw.p.evaluate(() => window.__zp.aufbauBeenden());
  await sw.p.waitForTimeout(2500);
  const abgelegt = await sw.p.evaluate(async () => {
    const treffer = [];
    for (const name of await caches.keys()) {
      const c = await caches.open(name);
      for (const anfrage of await c.keys()) {
        if (anfrage.url.includes('/api/')) treffer.push(anfrage.url);
      }
    }
    return treffer;
  });
  pruefe(abgelegt.length === 0,
    `nichts von /api/ liegt im Offline-Speicher (${abgelegt.join(', ') || 'nichts'})`);
  pruefe((await sw.p.evaluate(() => document.getElementById('stat-world').textContent))
    .includes('5000'), 'und der Weltrekord steht trotzdem im Spielfeld');
  await sw.ctx.close();

  // Dienst weg: das Spiel muss unveraendert spielbar bleiben.
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'de-DE' });
  await ctx.route('**/api/**', (r) => r.abort());
  const p = await ctx.newPage();
  const fehler = [];
  p.on('pageerror', (e) => fehler.push(e.message));
  await p.addInitScript(`localStorage.setItem('zp.seen.v1','true');`);
  await p.goto(BASIS + '/');
  await p.evaluate(() => window.__zp.aufbauBeenden());
  await p.waitForTimeout(2500);
  pruefe((await p.evaluate(() => document.querySelectorAll('.cell').length)) > 0,
    'Schnittstelle tot: das Feld liegt trotzdem da');
  pruefe(fehler.length === 0, `und nichts stuerzt ab (${fehler.join('; ') || 'nichts'})`);
  await browser.close();
} finally {
  abraeumen();
}

console.log(probleme ? `\n${probleme} Problem(e)` : '\nalles in Ordnung');
process.exit(probleme ? 1 : 0);
