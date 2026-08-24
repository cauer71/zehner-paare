/**
 * Zehner-Paare – weltweite Zaehler.
 *
 * Was hier passiert: gespielte und gewonnene Partien werden weltweit gezaehlt,
 * und je Stufe steht ein Weltrekord online – mit dem dreistelligen Kuerzel
 * dessen, der ihn haelt. Ohne Anmeldung, ohne Kennung, ohne Geraetemerkmal; das
 * Kuerzel setzt der Spieler selbst, und nur ein WELTREKORD traegt es hinaus. Wer
 * den Schalter in den Einstellungen ausmacht, schickt gar nichts.
 *
 * Der Dienst: abacus.jasoncameron.dev, ein oeffentlicher Zaehlerdienst, der
 * ohne Schluessel und mit offenem CORS antwortet. Vier Pruefdurchgaenge auf
 * einem GitHub-Laeufer haben ergeben (die Entwicklungsumgebung selbst kommt
 * nur an Paketregister und GitHub):
 *
 *   GET /hit/:raum/:name       -> {"value":n}   erhoeht um 1, legt bei Bedarf an
 *   GET /get/:raum/:name       -> {"value":n}   404 {"error":...} wenn es fehlt
 *   GET /info/:raum/:name      -> 200 {"value":n,"exists":true|false,...}
 *                                 auch fuer Unbekanntes, darum wird gelesen
 *   GET /create/:raum/:name?initializer=n
 *                              -> 201 {...,"value":n}   oder 409, wenn es
 *                                 den Namen schon gibt (der Wert bleibt dann
 *                                 unberuehrt – darauf beruht das Verfahren)
 *   /set /reset /update /delete brauchen den Verwalterschluessel und kommen
 *   hier deshalb nicht vor.
 *
 * Grenzen, ebenfalls gemessen:
 *   - 30 Anfragen je 10 Sekunden je Adresse, danach 429. Deshalb die
 *     Warteschlange weiter unten.
 *   - Ein Schluessel lebt 6 Monate ab dem Anlegen. Ein Zugriff verlaengert das
 *     NICHT (die Doku behauptet das Gegenteil; gemessen ist es nicht so).
 *     Darum heilt das Verfahren sich selbst, siehe rekordLesen().
 *   - Namen und Raum: 3 bis 64 Zeichen aus [A-Za-z0-9_-.]
 *
 * Was das Verfahren NICHT kann und auch nicht koennen wird:
 *   - Ein Zaehler kennt nur "plus eins". Einen genauen Punktestand ablegen
 *     geht nur beim ANLEGEN eines neuen Namens (initializer). Deshalb zeigt
 *     ein Zaehler auf die laufende Nummer des Rekords, und jede Nummer ist ein
 *     eigener Name mit dem Punktestand als Startwert.
 *   - Ein Zaehler haelt nur Zahlen, keine Buchstaben. Das Kuerzel liegt darum
 *     als Zahl daneben: drei Zeichen zur Basis 37 (siehe alsZahl). Mehr als
 *     drei Zeichen und mehr als A-Z 0-9 traegt dieses Verfahren nicht - und
 *     mehr braucht es auch nicht, die Pixelschrift des Arcade-Stils kennt
 *     genau das.
 *   - Wer schreibt, wird nicht geprueft. Ein geuebter Besucher kann also
 *     einen erfundenen Rekord unter einem beliebigen Kuerzel eintragen. Gegen
 *     Spass unter Bekannten reicht das; als Wettkampfliste taugt es nicht, und
 *     das steht auch so in der Oberflaeche.
 *   - Der Dienst ist ein Einzelstueck ohne Zusage. Faellt er aus, bleibt das
 *     Spiel unveraendert spielbar; die Weltwerte fehlen dann einfach.
 */

const HOST = 'https://abacus.jasoncameron.dev';

// Der Raum steht offen im Quelltext – er ist keine Sperre, sondern nur dafuer
// da, dass niemand aus dem Spielnamen auf die Zaehler raten kann.
const RAUM = 'zehner-paare-8fz3';

const SPEICHER = 'zp.welt.v1';

/** So lange gelten gelesene Weltwerte als frisch (5 Minuten). */
const FRISCH = 5 * 60 * 1000;

/**
 * Nach einer 429 eine Weile gar nichts schicken.
 *
 * Bewusst in Kauf genommen: Partien, die in dieses Fenster fallen, zaehlen
 * weltweit nicht mit. Nachtragen waere eine Warteschlange auf der Platte, die
 * ueber Programmstarts hinweg lebt - viel Maschinerie fuer einen Zaehler, den
 * ohnehin niemand nachrechnen kann. Der EIGENE Zaehler in app.js ist davon
 * nicht betroffen, der stimmt immer.
 *
 * Die Grenze des Dienstes gilt je Adresse, nicht je Geraet: zwei Leute im
 * selben WLAN teilen sie sich. Darum die eigene Bremse deutlich darunter.
 */
const STRAFPAUSE = 30 * 1000;

/** Eigene Bremse: hoechstens so viele Anfragen je Fenster (Dienst: 30/10 s). */
const BREMSE = { anfragen: 18, fenster: 10 * 1000, abstand: 120 };

/** Nach so vielen Millisekunden gilt eine Anfrage als verloren. */
const GEDULD = 4000;

let erlaubt = true;          // Schalter aus den Einstellungen
let sperreBis = 0;           // Strafpause nach 429
const verlauf = [];          // Zeitpunkte der letzten Anfragen
let schlange = Promise.resolve();

const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------- kleiner Speicher */

/**
 * EIN Merkzettel im Speicher, den alle hier veraendern.
 *
 * Vorher holte sich jede Aufgabe ihre eigene Abschrift aus localStorage und
 * schrieb sie nach mehreren Netzrufen zurueck. Das ist Lesen-Aendern-
 * Schreiben ueber Wartezeiten hinweg: wer zuletzt schreibt, loescht die Arbeit
 * des anderen. Genau das passiert regelmaessig, weil ein Partieende und ein
 * Aufschlagen der Bestwerte gleichzeitig laufen koennen.
 */
let merkzettel = null;

function zettel() {
  if (merkzettel) return merkzettel;
  let roh = null;
  try { roh = JSON.parse(localStorage.getItem(SPEICHER) ?? 'null'); }
  catch { /* kaputter Eintrag ist kein Grund zum Absturz */ }
  merkzettel = {
    // Wann zuletzt wirklich GELESEN wurde. Ausdruecklich nicht "wann zuletzt
    // etwas geschrieben wurde": ein erhoehter Zaehler sagt nichts darueber,
    // ob die Rekorde noch stimmen. Wer das vermischt, liest nie wieder nach,
    // solange gespielt wird - und schreibt daneben "vor 1 Min. geholt".
    gelesenAm: Number(roh?.gelesenAm) || 0,
    spiele: typeof roh?.spiele === 'number' ? roh.spiele : null,
    siege: typeof roh?.siege === 'number' ? roh.siege : null,
    rekorde: roh?.rekorde && typeof roh.rekorde === 'object' ? { ...roh.rekorde } : {},
    // Wer den Rekord haelt, je Stufe. Steht neben den Punkten und nicht in
    // ihnen: ein Rekord aus der Zeit vor dem Kuerzel hat eben keines.
    wer: roh?.wer && typeof roh.wer === 'object' ? { ...roh.wer } : {},
  };
  return merkzettel;
}

function sichern() {
  try { localStorage.setItem(SPEICHER, JSON.stringify(zettel())); }
  catch { /* voller oder gesperrter Speicher: dann eben ohne */ }
}

/**
 * Wie alt sind die gelesenen Werte? Infinity heisst "noch nie gelesen".
 *
 * Negative Werte gibt es nicht: eine zurueckgestellte Geraeteuhr wuerde
 * sonst dazu fuehren, dass tagelang nicht mehr nachgelesen wird.
 */
function alter() {
  const wann = zettel().gelesenAm;
  if (!wann) return Infinity;
  const her = Date.now() - wann;
  return her < 0 ? Infinity : her;
}

/**
 * Ein Weltrekord kann nur steigen. Darum wird ein bekannter Wert nie durch
 * einen kleineren ersetzt - auch dann nicht, wenn der Dienst gerade einen
 * kleineren liefert. Das kommt naemlich vor: der Zeiger auf die laufende
 * Nummer verfaellt nach sechs Monaten fuer sich allein (er wird einmal
 * angelegt und danach nur erhoeht, und Erhoehen verlaengert die Frist nicht),
 * waehrend die spaeter angelegten Staende noch leben. Dann liest sich der
 * Rekord kurzzeitig zu klein, bis die naechsten Partien den Zeiger
 * nachgeholt haben. Ohne diese Regel stuende in der Anzeige zwischendurch
 * eine Zahl, die kleiner ist als der Rekord, den derselbe Browser vorher
 * schon gezeigt hat.
 */
function hoechster(stufe, wert, kuerzel = '') {
  const z = zettel();
  const alt = z.rekorde[stufe] ?? 0;
  z.rekorde[stufe] = Math.max(alt, wert);
  // Das Kuerzel gehoert zum hoeheren Wert. Bei Gleichstand wird ein bekanntes
  // nicht durch ein leeres ersetzt: dass eine Anfrage ausgeblieben ist, heisst
  // nicht, dass der Rekord seinen Namen verloren hat.
  if (wert > alt) z.wer[stufe] = kuerzel;
  else if (wert === alt && kuerzel && !z.wer[stufe]) z.wer[stufe] = kuerzel;
  return z.rekorde[stufe];
}

/* --------------------------------------------------------- Warteschlange */

/**
 * Eine Anfrage, hinten angestellt. Alles hier verschluckt Fehler: ein Zaehler
 * darf das Spiel nie aufhalten und nie mit einer Meldung stoeren.
 */
function anstellen(pfad) {
  const lauf = schlange.then(() => durchfuehren(pfad));
  // Die Schlange selbst darf nie in einen Fehler laufen, sonst reisst sie.
  schlange = lauf.catch(() => null);
  return schlange;
}

async function durchfuehren(pfad) {
  if (!erlaubt) return null;
  if (Date.now() < sperreBis) return null;

  // Eigene Bremse: warten, bis im Fenster wieder Platz ist.
  const jetzt = Date.now();
  while (verlauf.length && jetzt - verlauf[0] > BREMSE.fenster) verlauf.shift();
  if (verlauf.length >= BREMSE.anfragen) {
    await schlaf(BREMSE.fenster - (jetzt - verlauf[0]) + 50);
  }
  if (verlauf.length) await schlaf(BREMSE.abstand);
  // Noch einmal nachsehen: zwischen der ersten Pruefung und hier liegen bis
  // zu zehn Sekunden Bremspause. Wer in dieser Zeit den Schalter ausmacht,
  // will nicht, dass danach noch etwas hinausgeht.
  if (!erlaubt || Date.now() < sperreBis) return null;
  verlauf.push(Date.now());

  const stop = new AbortController();
  const uhr = setTimeout(() => stop.abort(), GEDULD);
  try {
    const antwort = await fetch(HOST + pfad, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: stop.signal,
    });
    if (antwort.status === 429) { sperreBis = Date.now() + STRAFPAUSE; return null; }
    // 404 und 409 sind keine Stoerungen, sondern Antworten – der Aufrufer
    // unterscheidet sie am Feld status.
    let text = null;
    try { text = await antwort.json(); } catch { text = null; }
    return { status: antwort.status, daten: text };
  } catch {
    return null;                     // Netz weg, abgebrochen, Dienst still
  } finally {
    clearTimeout(uhr);
  }
}

/* ------------------------------------------------------- die drei Befehle */

/**
 * Liest einen Zaehler. null heisst "keine Antwort", 0 heisst "gibt es nicht".
 *
 * Gefragt wird /info und nicht /get, obwohl beide dasselbe sagen: /get
 * antwortet auf einen unbekannten Namen mit 404, /info mit 200 und
 * "exists": false. Beim ersten Start gibt es nichts, also waeren das sieben
 * rote 404-Zeilen in der Browserkonsole - harmlos, aber sie sehen nach einem
 * Fehler aus, und eine Abnahmepruefung, die "keine Konsolenfehler" verlangt,
 * muesste sie einzeln ausnehmen. Lieber gar keine erzeugen: dann darf die
 * Pruefung streng bleiben.
 *
 * Die 404-Behandlung bleibt trotzdem stehen - falls der Dienst /info einmal
 * anders beantwortet, ist ein fehlender Name weiter ein fehlender Name.
 */
async function holen(name) {
  const a = await anstellen(`/info/${RAUM}/${name}`);
  if (!a) return null;
  if (a.status === 404) return 0;
  if (a.status !== 200 || typeof a.daten?.value !== 'number') return null;
  if (a.daten.exists === false) return 0;
  return a.daten.value;
}

/** Erhoeht einen Zaehler um eins und legt ihn bei Bedarf an. */
async function hoch(name) {
  const a = await anstellen(`/hit/${RAUM}/${name}`);
  if (!a || a.status !== 200) return null;
  return typeof a.daten?.value === 'number' ? a.daten.value : null;
}

/** Legt einen Zaehler mit genau diesem Wert an. 'neu' | 'schon-da' | null */
async function anlegen(name, wert) {
  const a = await anstellen(`/create/${RAUM}/${name}?initializer=${wert}`);
  if (!a) return null;
  if (a.status === 201) return 'neu';
  if (a.status === 409) return 'schon-da';
  return null;
}

/* ------------------------------------------------------------- Rekorde */

/**
 * So viele Nummern sucht das Lesen rueckwaerts. Mehr als noetig kostet nichts
 * (die erste Nummer trifft im Normalfall sofort), aber jeder Schritt mehr
 * verzeiht einen Zeiger, der dem hoechsten Stand vorausgelaufen ist.
 */
const RUECKWAERTS = 4;

const zeiger = (stufe) => `best-${stufe}-gen`;
const stand = (stufe, nr) => `best-${stufe}-v${nr}`;
/**
 * Das Kuerzel zum Stand derselben Nummer. Ein eigener Name und nicht in den
 * Punktestand hineingerechnet: dort stehen Werte aus der Zeit vor dem Kuerzel,
 * und eine Zahl allein sagt nicht, nach welcher Regel sie zu lesen ist. Wer
 * die Regel wechselt, liest alte Rekorde falsch - so bleiben sie gueltig und
 * haben eben kein Kuerzel.
 */
const wessen = (stufe, nr) => `best-${stufe}-k${nr}`;

/**
 * Drei Zeichen als eine Zahl, zur Basis 37: 0 heisst "kein Zeichen", 1-10 sind
 * die Ziffern, 11-36 die Buchstaben. Die 0 muss frei bleiben, weil ein
 * fehlender Zaehler beim Lesen als 0 zurueckkommt - "kein Kuerzel" und "AAA"
 * duerfen nicht dasselbe sein. Groesster Wert: 36*37² + 36*37 + 36 = 50652.
 */
const ZEICHEN = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Ausdruecklich exportiert, obwohl nur hier gebraucht: die zwei Umrechner
 * beschreiben, was auf der Leitung liegt, und was auf der Leitung liegt,
 * gehoert in einen Test (online.test.js). Von aussen ruft sie niemand.
 */
export function alsZahl(kuerzel) {
  const k = String(kuerzel ?? '').toUpperCase().slice(0, 3);
  let n = 0;
  for (let i = 0; i < 3; i++) {
    // Die leere Stelle ausdruecklich abfangen: indexOf('') gibt 0 und nicht
    // -1, ein fehlendes Zeichen waere sonst eine '0' geworden - und aus dem
    // leeren Kuerzel die Zahl 1407.
    const zeichen = k[i];
    const pos = zeichen ? ZEICHEN.indexOf(zeichen) : -1;
    n = n * 37 + (pos < 0 ? 0 : pos + 1);
  }
  return n;
}

export function alsKuerzel(zahl) {
  if (!Number.isFinite(zahl) || zahl <= 0) return '';
  let n = Math.floor(zahl);
  const zeichen = [];
  for (let i = 0; i < 3; i++) { zeichen.unshift(n % 37); n = Math.floor(n / 37); }
  // Ein Wert von aussen kann alles sein; was nicht in die drei Stellen passt,
  // gilt als kein Kuerzel.
  if (n !== 0) return '';
  return zeichen.map((z) => (z > 0 ? ZEICHEN[z - 1] : '')).join('');
}

/**
 * Liest den Weltrekord einer Stufe: erst den Zeiger auf die laufende Nummer,
 * dann den Stand dieser Nummer.
 *
 * Warum bis zu drei Nummern zurueck? Zwei Faelle, in denen der Zeiger weiter
 * ist als der hoechste vorhandene Stand:
 *   - Ein Browser hat den Stand angelegt und ist vor dem Nachziehen des
 *     Zeigers weggeschaltet worden (oder umgekehrt).
 *   - Ein Stand ist nach sechs Monaten verfallen, der Zeiger aber noch da.
 * In beiden Faellen findet die Schleife den naechstbesten Wert; findet sie gar
 * nichts, gilt "noch kein Rekord" und der naechste Spieler tragt seinen ein.
 * Damit heilt sich der Eintrag von selbst, ohne dass jemand eingreifen muss.
 */
async function rekordLesen(stufe) {
  const nr = await holen(zeiger(stufe));
  if (nr === null) return null;                  // keine Antwort
  for (let n = nr; n > Math.max(0, nr - RUECKWAERTS); n--) {
    const wert = await holen(stand(stufe, n));
    if (wert === null) return null;
    if (wert > 0) {
      // Das Kuerzel kostet eine Anfrage je Stufe und ist der Kuer, nicht die
      // Pflicht: bleibt sie aus (kein Netz mehr, Strafpause, alter Rekord ohne
      // Kuerzel), gilt der Rekord trotzdem und steht eben ohne Namen da.
      const wer = await holen(wessen(stufe, n));
      return { nr: n, wert, kuerzel: wer === null ? '' : alsKuerzel(wer) };
    }
  }
  return { nr, wert: 0, kuerzel: '' };
}

/**
 * Traegt einen neuen Weltrekord ein, wenn er einer ist. Gibt den Wert zurueck,
 * der danach weltweit gilt (oder null, wenn nichts zu erfahren war).
 *
 * Zwei Browser gleichzeitig: beide legen dieselbe Nummer an, einer bekommt
 * 409 und laesst es dabei. Sein Ergebnis geht nicht verloren – beim naechsten
 * Partieende versucht er es wieder, dann mit der neuen Nummer.
 */
async function rekordMelden(stufe, punkte, kuerzel = '') {
  const stehend = (d) => ({ wert: d.wert, kuerzel: d.kuerzel ?? '' });
  let da = await rekordLesen(stufe);
  if (!da) return null;
  for (let versuch = 0; versuch < 3; versuch++) {
    if (punkte <= da.wert) return stehend(da);
    const wie = await anlegen(stand(stufe, da.nr + 1), punkte);
    if (wie === 'neu') {
      // Das Kuerzel gehoert zum Stand und wird VOR dem Zeiger angelegt: wer
      // den Rekord ueber den Zeiger findet, findet den Namen dazu schon
      // vorliegen. Geht dieser Ruf verloren, ist das kein Grund, den Rekord
      // fallen zu lassen - er steht dann eben ohne Kuerzel da.
      const code = alsZahl(kuerzel);
      if (code > 0) await anlegen(wessen(stufe, da.nr + 1), code);
      // Der Stand liegt - aber gefunden wird er erst ueber den Zeiger. Geht
      // dieser Ruf verloren, NICHT Erfolg melden: sonst merkt sich der
      // Aufrufer den Rekord als erledigt und versucht es nie wieder, und der
      // Stand bleibt Waise, bis irgendein anderer Browser einen Rekord
      // eintraegt. So versucht es dasselbe Geraet beim naechsten Partieende
      // noch einmal und holt den Zeiger dabei nach (der 409-Zweig unten).
      if (await hoch(zeiger(stufe)) === null) return stehend(da);
      return { wert: punkte, kuerzel: alsKuerzel(code) };
    }
    if (wie !== 'schon-da') return stehend(da);  // keine Antwort, spaeter wieder
    // Die Nummer ist belegt. Zwei Moeglichkeiten, und beide muessen weiter
    // gehen koennen: ein anderer Browser war schneller - oder wir selbst haben
    // sie beim letzten Mal angelegt und danach den Zeiger nicht mehr
    // nachziehen koennen (Netz weg im falschen Augenblick). Wer hier aufgibt,
    // klemmt fuer immer: der Zeiger zeigt auf den alten Stand, und jeder
    // weitere Versuch prallt an derselben 409 ab.
    const dort = await holen(stand(stufe, da.nr + 1));
    if (dort === null) return stehend(da);
    // Nachziehen NUR, wenn der Zeiger wirklich noch hinterherhaengt. Sonst
    // laeuft er weg: hat der Gewinner des Wettlaufs ihn schon hochgesetzt und
    // wir erhoehen ein zweites Mal, zeigt er auf eine Nummer, die es nicht
    // gibt. Dieser Abstand heilt nicht von selbst - ein gewoehnlicher
    // Rekordlauf legt hoechster+1 an und schiebt den Zeiger um genau eins
    // weiter, der Abstand bleibt also und waechst mit jedem weiteren
    // Zusammenstoss. Ab RUECKWAERTS Schritten findet rekordLesen nichts mehr,
    // und dann gilt jede beliebige Punktzahl als neuer Weltrekord.
    const jetzt = await holen(zeiger(stufe));
    if (jetzt !== null && jetzt <= da.nr) await hoch(zeiger(stufe));
    // Gewinnt der fremde Stand, gehoert auch sein Kuerzel dazu - sonst stuende
    // ein fremder Rekord unter dem Namen, den wir zuletzt kannten. Nur dann
    // gefragt: verliert er, aendert sich am Angezeigten nichts.
    let wer = da.kuerzel ?? '';
    if (dort > da.wert) {
      const fremd = await holen(wessen(stufe, da.nr + 1));
      wer = fremd === null ? '' : alsKuerzel(fremd);
    }
    da = { nr: da.nr + 1, wert: Math.max(da.wert, dort), kuerzel: wer };
  }
  return stehend(da);
}

/* -------------------------------------------------------------- nach aussen */

export const welt = {
  /** Schalter aus den Einstellungen. Aus heisst: keine einzige Anfrage. */
  schalten(an) { erlaubt = !!an; },

  /** Der letzte bekannte Stand – sofort da, auch ohne Netz. */
  zwischenstand() {
    const z = zettel();
    return { spiele: z.spiele, siege: z.siege, rekorde: { ...z.rekorde },
             wer: { ...z.wer }, alter: alter() };
  },

  /** Ob es sich lohnt, neu zu lesen. */
  veraltet() { return alter() > FRISCH; },

  /**
   * Eine Partie ist zu Ende. Zaehlt sie weltweit mit und traegt einen Rekord
   * ein, falls es einer ist. Laeuft nebenher; der Aufrufer wartet nicht.
   *
   * Gibt zurueck, ob die Partie weltweit wirklich gezaehlt wurde. Der
   * Aufrufer merkt sich das an der Partie: geht der Ruf verloren (Netz weg,
   * Strafpause nach einer 429), wird beim naechsten Ende derselben Partie
   * nachgezaehlt statt gar nicht.
   */
  async partieBeendet({ stufe, punkte, gewonnen, zaehlt, kuerzel = '', neuePartie = true }) {
    if (!erlaubt) return { gezaehlt: false };
    const z = zettel();
    let gezaehlt = false;
    if (neuePartie) {
      const spiele = await hoch('spiele');
      if (spiele !== null) { z.spiele = spiele; gezaehlt = true; }
    }
    if (gewonnen) {
      const siege = await hoch('siege');
      if (siege !== null) z.siege = siege;
    }
    // Nur anklopfen, wenn der Punktestand ueberhaupt in Frage kommt. Das
    // spart bei fast jeder Partie zwei Anfragen.
    if (zaehlt && punkte > (z.rekorde[stufe] ?? 0)) {
      const neu = await rekordMelden(stufe, punkte, kuerzel);
      if (neu !== null) hoechster(stufe, neu.wert, neu.kuerzel);
    }
    // gelesenAm bleibt unberuehrt: hier wurde geschrieben, nicht gelesen.
    sichern();
    return { gezaehlt };
  },

  /**
   * Liest Weltzahlen und Rekorde. `stufen` bestimmt, welche Rekorde geholt
   * werden – jede Stufe kostet zwei Anfragen.
   *
   * Der Lesezeitpunkt wird nur gesetzt, wenn ALLES angekommen ist. Sonst
   * gaelte ein halber Stand fuenf Minuten lang als frisch, und die Anzeige
   * behauptete "gerade geholt" fuer Zahlen, die nie kamen.
   */
  async lesen(stufen) {
    if (!erlaubt) return null;
    const z = zettel();
    const spiele = await holen('spiele');
    if (spiele === null) return null;            // kein Netz: alter Stand bleibt
    z.spiele = spiele;
    let heil = true;
    const siege = await holen('siege');
    if (siege === null) heil = false; else z.siege = siege;
    for (const stufe of stufen) {
      const r = await rekordLesen(stufe);
      if (!r) { heil = false; continue; }
      hoechster(stufe, r.wert, r.kuerzel);
    }
    if (heil) z.gelesenAm = Date.now();
    sichern();
    return this.zwischenstand();
  },
};
