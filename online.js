/**
 * Zehner-Paare – die Weltrangliste.
 *
 * Was hier passiert: gespielte und gewonnene Partien werden weltweit gezaehlt,
 * und je Stufe steht ein Weltrekord online – mit dem dreistelligen Kuerzel
 * dessen, der ihn haelt. Ohne Anmeldung, ohne Kennung, ohne Geraetemerkmal;
 * das Kuerzel setzt der Spieler selbst, und nur ein WELTREKORD traegt es
 * hinaus. Wer den Schalter in den Einstellungen ausmacht, schickt gar nichts.
 *
 * Dahinter liegt seit Fassung 1.21 die eigene Schnittstelle (worker.js) mit
 * einer D1-Datenbank. Davor war es ein oeffentlicher Zaehlerdienst, der nur
 * "plus eins" kann, und diese Datei war dreimal so lang: der Punktestand als
 * Startwert eines eigens angelegten Zaehlernamens, ein zweiter Zaehler als
 * Zeiger darauf, das Kuerzel als Zahl zur Basis 37 daneben, Rueckwaertssuche
 * ueber vier Nummern gegen verfallene Schluessel, eine eigene Bremse gegen die
 * Drosselung des Dienstes, und ein selbstgebautes Compare-and-Set aus 409ern,
 * damit zwei gleichzeitige Rekorde sich nicht gegenseitig ueberschreiben.
 *
 * Davon bleibt nichts. Zwei Rufe, mehr gibt es nicht:
 *
 *   GET  /api/welt     holt den ganzen Stand (vorher: 17 Anfragen)
 *   POST /api/partie   meldet eine beendete Partie und bekommt den neuen
 *                      Stand gleich zurueck - kein zweiter Ruf noetig
 *
 * Was NICHT verschwunden ist: dass jeder eintragen kann, was er will. Ohne
 * Anmeldung geht das nicht anders, und es steht so in der Oberflaeche.
 */

/*
 * Gerufen wird RELATIV - dort, wo die Seite liegt, liegt auch die
 * Schnittstelle: auf 10.auer.page, auf der workers.dev-Adresse und beim
 * Entwickeln unter "wrangler dev". Das spart CORS und den Vorflug-OPTIONS vor
 * jedem POST.
 *
 * Die eine Ausnahme ist GitHub Pages: dort liegen nur die Dateien, ohne
 * Schnittstelle daneben. Von dort geht der Ruf an die feste Adresse, und die
 * antwortet mit offenem CORS.
 *
 * Herum und nicht andersherum, aus einem konkreten Grund: mit "immer die feste
 * Adresse, ausser zu Hause" haette jeder lokale Server in die ECHTE Datenbank
 * geschrieben, sobald man eine Partie zu Ende spielt. Ein Probelauf darf keine
 * Weltrekorde erzeugen. So laeuft der Ruf beim Entwickeln ins Leere, wenn
 * keine Schnittstelle daneben liegt - und das ist der harmlose Fall, mit dem
 * diese Datei ohnehin umgehen kann.
 */
const AUSWAERTS = 'https://10.auer.page';
const HOST = typeof location !== 'undefined' && location.hostname.endsWith('github.io')
  ? AUSWAERTS : '';

const SPEICHER = 'zp.welt.v1';

/** So lange gelten gelesene Weltwerte als frisch (5 Minuten). */
const FRISCH = 5 * 60 * 1000;

/** Nach so vielen Millisekunden gilt eine Anfrage als verloren. */
const GEDULD = 6000;

let erlaubt = true;          // Schalter aus den Einstellungen

/* ------------------------------------------------------- kleiner Speicher */

/**
 * EIN Merkzettel im Speicher, den alle hier veraendern.
 *
 * Vorher holte sich jede Aufgabe ihre eigene Abschrift aus localStorage und
 * schrieb sie nach mehreren Netzrufen zurueck. Das ist Lesen-Aendern-
 * Schreiben ueber Wartezeiten hinweg: wer zuletzt schreibt, loescht die Arbeit
 * des anderen. Mit nur noch einem Ruf je Aufgabe waere das heute kaum noch ein
 * Problem - der Merkzettel bleibt trotzdem, er kostet nichts und die Regel
 * "einer, den alle anfassen" ist einfacher als "jeder seine Kopie".
 *
 * Das Format ist dasselbe wie vor dem Umzug. Wer die Seite mit einem alten
 * Zwischenstand oeffnet, sieht darum weiter seine Rekorde, bis der erste Ruf
 * durch ist.
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
    // ob die Rekorde noch stimmen.
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
 * Ein Weltrekord kann nur steigen - ein bekannter Wert wird nie durch einen
 * kleineren ersetzt.
 *
 * Beim alten Zaehlerdienst war das lebenswichtig: der Zeiger auf die laufende
 * Nummer verfiel nach sechs Monaten fuer sich allein, und dann las sich der
 * Rekord kurzzeitig zu klein. Die Datenbank kennt dieses Loch nicht mehr.
 *
 * Die Regel bleibt trotzdem, aus einem einfacheren Grund: eine halb
 * angekommene Antwort, ein Ruf, der ins Leere lief, ein Stand aus einem
 * anderen Reiter - in all diesen Faellen soll in der Anzeige nie eine Zahl
 * stehen, die kleiner ist als die, die derselbe Browser vorher schon gezeigt
 * hat. Ausdruecklich exportiert, damit die Regel geprueft werden kann.
 */
export function hoechster(zettelchen, stufe, wert, kuerzel = '') {
  const alt = zettelchen.rekorde[stufe] ?? 0;
  zettelchen.rekorde[stufe] = Math.max(alt, wert);
  // Das Kuerzel gehoert zum hoeheren Wert. Bei Gleichstand wird ein bekanntes
  // nicht durch ein leeres ersetzt: dass eine Antwort ohne Kuerzel kam, heisst
  // nicht, dass der Rekord seinen Namen verloren hat.
  if (wert > alt) zettelchen.wer[stufe] = kuerzel;
  else if (wert === alt && kuerzel && !zettelchen.wer[stufe]) zettelchen.wer[stufe] = kuerzel;
  return zettelchen.rekorde[stufe];
}

/**
 * Traegt einen ganzen Stand aus der Schnittstelle in den Merkzettel ein.
 *
 * Auch ausdruecklich exportiert und geprueft: hier laeuft zusammen, was von
 * aussen kommt, und was hier falsch ist, steht anschliessend im Bild.
 */
export function uebernehmen(zettelchen, stand) {
  if (!stand || typeof stand !== 'object') return false;
  if (typeof stand.spiele === 'number') zettelchen.spiele = stand.spiele;
  if (typeof stand.siege === 'number') zettelchen.siege = stand.siege;
  const rekorde = stand.rekorde && typeof stand.rekorde === 'object' ? stand.rekorde : {};
  for (const [stufe, r] of Object.entries(rekorde)) {
    const wert = Number(r?.punkte);
    if (!Number.isFinite(wert) || wert <= 0) continue;
    hoechster(zettelchen, stufe, wert, typeof r?.kuerzel === 'string' ? r.kuerzel : '');
  }
  return true;
}

/* ------------------------------------------------------------- die Rufe */

/**
 * Eine Anfrage. Alles hier verschluckt Fehler: die Weltrangliste darf das
 * Spiel nie aufhalten und nie mit einer Meldung stoeren. Faellt sie aus,
 * bleibt das Spiel unveraendert spielbar, die Weltwerte fehlen dann einfach.
 */
async function ruf(pfad, koerper = null) {
  if (!erlaubt) return null;
  const stop = new AbortController();
  const uhr = setTimeout(() => stop.abort(), GEDULD);
  try {
    const antwort = await fetch(HOST + pfad, {
      method: koerper ? 'POST' : 'GET',
      headers: koerper ? { 'content-type': 'application/json' } : undefined,
      body: koerper ? JSON.stringify(koerper) : undefined,
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: stop.signal,
    });
    if (!antwort.ok) return null;
    return await antwort.json();
  } catch {
    return null;                     // Netz weg, abgebrochen, Dienst still
  } finally {
    clearTimeout(uhr);
  }
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
   * ein, falls es einer ist – beides in einem Ruf.
   *
   * Ob es ein Rekord ist, entscheidet die DATENBANK und nicht dieser Browser:
   * der Vergleich steht im WHERE derselben Anweisung, die einfuegt (siehe
   * worker.js). Zwei Spieler, die im selben Augenblick fertig werden, koennen
   * sich damit nicht mehr gegenseitig ueberschreiben.
   *
   * Gibt zurueck, ob die Partie weltweit wirklich gezaehlt wurde. Der
   * Aufrufer merkt sich das an der Partie: geht der Ruf verloren (Netz weg),
   * wird beim naechsten Ende derselben Partie nachgezaehlt statt gar nicht.
   */
  async partieBeendet({ stufe, punkte, gewonnen, zaehlt, kuerzel = '', neuePartie = true }) {
    if (!erlaubt) return { gezaehlt: false };
    const stand = await ruf('/api/partie', {
      stufe, punkte, kuerzel, zaehlt: !!zaehlt,
      gewonnen: !!gewonnen, neuePartie: !!neuePartie,
    });
    if (!stand) return { gezaehlt: false };

    const z = zettel();
    uebernehmen(z, stand);
    // gelesenAm bleibt unberuehrt: hier wurde geschrieben, nicht gelesen - der
    // zurueckgegebene Stand ist zwar frisch, aber die naechste Anzeige soll
    // trotzdem nicht "gerade geholt" behaupten.
    sichern();
    return { gezaehlt: !!neuePartie };
  },

  /**
   * Liest den ganzen Weltstand. Ein Ruf, alle Stufen.
   *
   * Der Lesezeitpunkt wird nur gesetzt, wenn wirklich etwas angekommen ist.
   * Sonst gaelte ein leerer Stand fuenf Minuten lang als frisch, und die
   * Anzeige behauptete "gerade geholt" fuer Zahlen, die nie kamen.
   */
  async lesen() {
    if (!erlaubt) return null;
    const stand = await ruf('/api/welt');
    if (!stand) return null;
    const z = zettel();
    uebernehmen(z, stand);
    z.gelesenAm = Date.now();
    sichern();
    return this.zwischenstand();
  },
};
