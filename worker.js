/**
 * Zehner-Paare: die Weltrangliste auf Cloudflare Workers und D1.
 *
 * Vorher lag sie in einem oeffentlichen Zaehlerdienst, der nur "plus eins"
 * kann. Was das gekostet hat, steht in migrations/0001_schema.sql: der
 * Punktestand als Startwert eines eigens angelegten Zaehlernamens, ein zweiter
 * Zaehler als Zeiger darauf, das Kuerzel als Zahl zur Basis 37 daneben, dazu
 * eine Rueckwaertssuche ueber vier Nummern, weil Schluessel verfallen. Und
 * trotzdem blieb ein Loch: "lies den Hoechststand, vergleiche, schreib nur
 * wenn groesser" ging dort nur als selbstgebautes Compare-and-Set ueber 409er.
 *
 * Hier ist es EIN SQL-Satz (siehe rekordEintragen). Das ist der ganze Grund
 * fuer den Umzug.
 *
 * Zwei Adressen, mehr braucht das Spiel nicht:
 *
 *   GET  /api/welt     Weltrekord je Stufe samt Kuerzel, die Bestenliste je
 *                      Stufe und die Zaehler.
 *   POST /api/partie   Eine beendete Partie: zaehlt mit und traegt einen
 *                      Rekord ein, wenn es einer ist. Antwortet mit demselben
 *                      Stand wie /api/welt - so braucht das Spiel nach einer
 *                      Partie keinen zweiten Ruf.
 *
 * Alles andere geht an die statischen Dateien (env.ASSETS).
 */

/** Die Stufen des Spiels. Was nicht hier steht, kommt nicht in die Tabelle. */
const STUFEN = ['leicht', 'mittel', 'schwer', 'klassisch', 'endlos'];

/**
 * Obergrenze fuer einen Punktestand.
 *
 * Das ist KEIN Schutz gegen Betrug - ohne Anmeldung kann jeder eintragen, was
 * er will, und das steht auch so in der Oberflaeche. Es ist eine Schranke
 * gegen Unsinn: eine Zahl jenseits davon ist kein Spielergebnis mehr, sondern
 * ein Tippfehler oder jemand, der die Liste unbrauchbar machen will. Der
 * hoechste je erreichte Stand lag bei 12503 (Endlos).
 */
const PUNKTE_MAX = 1000000;

/** Drei Zeichen aus A-Z und 0-9, oder gar keines. */
const KUERZEL = /^[A-Z0-9]{0,3}$/;

const json = (daten, status = 200) => new Response(JSON.stringify(daten), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    // Offen wie der alte Dienst: das Spiel liegt auch auf GitHub Pages und
    // ruft von dort dieselbe Adresse. Zu holen gibt es hier nichts, was nicht
    // ohnehin jeder sehen soll.
    'access-control-allow-origin': '*',
    // Der Stand aendert sich mit jeder Partie - nichts zwischenspeichern.
    'cache-control': 'no-store',
  },
});

/** So viele Namen stehen je Stufe in der Bestenliste. */
const BESTENLISTE = 10;

/**
 * Der Weltstand: hoechster Punktestand je Stufe samt Kuerzel, die Bestenliste
 * je Stufe, dazu die Zaehler.
 *
 * Alles in EINEM Ruf, obwohl die Bestenliste nur zu sehen ist, wer die
 * Einstellungen aufschlaegt. Sie kostet knapp zwei Kilobyte, und dafuer steht
 * sie sofort da - auch beim Umschalten der Stufe und auch ohne Netz, weil das
 * Spiel den ganzen Stand auf dem Merkzettel behaelt. Ein zweiter Ruf beim
 * Aufschlagen waere teurer als die zwei Kilobyte.
 */
async function weltstand(db) {
  const [rekorde, beste, zaehler] = await db.batch([
    // Der Verbund statt eines blossen MAX(): mit MAX() allein bekaeme man die
    // Punktzahl, aber nicht das Kuerzel der Zeile, in der sie steht. SQLite
    // wuerde das hier zwar richtig raten, aber darauf soll sich niemand
    // verlassen muessen.
    db.prepare(`
      SELECT r.stufe, r.punkte, r.kuerzel
        FROM rekorde r
        JOIN (SELECT stufe, MAX(punkte) AS hoch FROM rekorde GROUP BY stufe) b
          ON b.stufe = r.stufe AND b.hoch = r.punkte
       GROUP BY r.stufe`),
    // Die Bestenliste zeigt NUR Eintraege mit Kuerzel: sie ist eine Liste von
    // Namen, und eine Zeile ohne Namen sagt darin nichts. Das kann dazu
    // fuehren, dass der Weltrekord einer Stufe NICHT in ihrer Bestenliste
    // steht - Mittel steht auf 4169 aus der Zeit vor den Kuerzeln. Das ist
    // gewollt: die Zeile darueber nennt weiter den wahren Rekord.
    //
    // Der zweite Sortierschluessel id macht die Reihenfolge eindeutig. Ohne
    // ihn duerfte die Datenbank bei gleichem Punktestand jedes Mal anders
    // ziehen, und die Liste haette sich bei jedem Laden umsortiert.
    db.prepare(`
      SELECT stufe, punkte, kuerzel FROM (
        SELECT stufe, punkte, kuerzel,
               ROW_NUMBER() OVER (PARTITION BY stufe ORDER BY punkte DESC, id) AS rang
          FROM rekorde
         WHERE kuerzel <> ''
      ) WHERE rang <= ?1
      ORDER BY stufe, punkte DESC`).bind(BESTENLISTE),
    db.prepare('SELECT name, wert FROM zaehler'),
  ]);

  const stand = { spiele: 0, siege: 0, rekorde: {}, beste: {} };
  for (const z of zaehler.results) stand[z.name] = z.wert;
  for (const r of rekorde.results) {
    stand.rekorde[r.stufe] = { punkte: r.punkte, kuerzel: r.kuerzel ?? '' };
  }
  for (const b of beste.results) {
    (stand.beste[b.stufe] ??= []).push({ punkte: b.punkte, kuerzel: b.kuerzel });
  }
  return stand;
}

/**
 * Traegt einen Rekord ein - aber nur, wenn er einer ist.
 *
 * Das WHERE macht daraus einen einzigen Satz, und das ist der Punkt: lesen,
 * vergleichen und schreiben passieren in derselben Anweisung. Zwei Spieler,
 * die im selben Augenblick fertig werden, koennen sich hier nicht gegenseitig
 * ueberschreiben - genau das war mit einem Schluessel-Wert-Speicher nicht zu
 * haben und der Grund, warum es eine Datenbank geworden ist.
 */
function rekordEintragen(db, stufe, punkte, kuerzel) {
  return db.prepare(`
    INSERT INTO rekorde (stufe, punkte, kuerzel, wann, herkunft)
    SELECT ?1, ?2, ?3, ?4, 'spiel'
     WHERE ?2 > COALESCE((SELECT MAX(punkte) FROM rekorde WHERE stufe = ?1), 0)
  `).bind(stufe, punkte, kuerzel, Date.now());
}

/**
 * Prueft, was hereinkommt, und gibt es sauber zurueck.
 *
 * Eigene Funktion und ausdruecklich exportiert, damit sie sich in Node pruefen
 * laesst: hier ist die einzige Stelle, an der Fremdes in die Datenbank
 * uebergeht, und was hier durchrutscht, steht anschliessend in der Weltliste.
 *
 * Gibt { ok: true, ... } oder { ok: false, fehler } zurueck - nie eine
 * Ausnahme: eine kaputte Anfrage ist ein 400 und kein Serverfehler.
 */
export function pruefePartie(koerper) {
  // Auf dem Typ bestehen und nicht umrechnen: String(['mittel']) waere
  // 'mittel', ein Array haette also als Stufe durchgesehen. Harmlos in der
  // Wirkung, aber eine Pruefung, die so etwas durchlaesst, prueft nicht.
  const stufe = typeof koerper?.stufe === 'string' ? koerper.stufe : '';
  if (!STUFEN.includes(stufe)) return { ok: false, fehler: 'unbekannte Stufe' };

  // Number('') ist 0 und Number(null) auch - beides waere ein gueltiger
  // Punktestand. Darum ausdruecklich auf eine Zahl bestehen.
  const punkte = typeof koerper?.punkte === 'number' ? koerper.punkte : NaN;
  if (!Number.isInteger(punkte) || punkte < 0 || punkte > PUNKTE_MAX) {
    return { ok: false, fehler: 'unglaubwuerdiger Punktestand' };
  }

  // Grossbuchstaben wie im Spiel; was uebrig bleibt, muss der Form genuegen.
  const roh = typeof koerper?.kuerzel === 'string' ? koerper.kuerzel : '';
  const kuerzel = roh.toUpperCase().slice(0, 3);
  if (!KUERZEL.test(kuerzel)) return { ok: false, fehler: 'unbrauchbares Kuerzel' };

  return {
    ok: true, stufe, punkte, kuerzel,
    neuePartie: !!koerper?.neuePartie,
    gewonnen: !!koerper?.gewonnen,
    zaehlt: !!koerper?.zaehlt,
  };
}

async function partieBeendet(db, koerper) {
  const p = pruefePartie(koerper);
  if (!p.ok) return json({ fehler: p.fehler }, 400);
  const { stufe, punkte, kuerzel } = p;

  const anweisungen = [];
  // neuePartie und gewonnen kommen getrennt: eine Partie kann mehrfach enden
  // (Rettung, Zurueck aus dem Enddialog), und das Spiel merkt sich selbst, was
  // davon schon hinausgegangen ist.
  if (p.neuePartie) anweisungen.push(zaehlerHoch(db, 'spiele'));
  if (p.gewonnen) anweisungen.push(zaehlerHoch(db, 'siege'));
  // zaehlt: nur ein gewonnenes oder ein Endlos-Spiel bringt einen Rekord.
  if (p.zaehlt) anweisungen.push(rekordEintragen(db, stufe, punkte, kuerzel));

  if (anweisungen.length) await db.batch(anweisungen);
  return json(await weltstand(db));
}

/** Plus eins, und legt den Zaehler beim ersten Mal an. */
function zaehlerHoch(db, name) {
  return db.prepare(`
    INSERT INTO zaehler (name, wert) VALUES (?1, 1)
    ON CONFLICT(name) DO UPDATE SET wert = wert + 1
  `).bind(name);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Alles, was keine Schnittstelle ist, sind die Dateien des Spiels.
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400',
        },
      });
    }

    try {
      if (url.pathname === '/api/welt' && request.method === 'GET') {
        return json(await weltstand(env.DB));
      }
      if (url.pathname === '/api/partie' && request.method === 'POST') {
        let koerper = null;
        try { koerper = await request.json(); } catch { /* bleibt null */ }
        return await partieBeendet(env.DB, koerper);
      }
      return json({ fehler: 'nicht gefunden' }, 404);
    } catch (e) {
      // Faellt die Datenbank aus, bleibt das Spiel spielbar - es fehlen dann
      // eben die Weltwerte. Genau das gilt schon fuer den alten Dienst, und
      // das Spiel kommt damit zurecht (siehe online.js).
      return json({ fehler: 'Datenbank nicht erreichbar', grund: String(e?.message ?? e) }, 503);
    }
  },
};
