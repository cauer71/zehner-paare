/**
 * Zehner-Paare – reine Spiellogik.
 *
 * Bewusst DOM-frei gehalten, damit die Regeln in Node getestet werden koennen
 * (siehe game.test.js). Die Oberflaeche liegt in app.js.
 *
 * Regel: Zwei Zahlen duerfen weggestrichen werden, wenn sie
 *   (a) gleich sind ODER zusammen 10 ergeben, und
 *   (b) benachbart sind. Bereits gestrichene Felder zaehlen dabei nicht mehr,
 *       man "sieht durch sie hindurch".
 * Nachbarschaften: Leserichtung (waagrecht, optional ueber den Zeilenumbruch
 * hinweg), senkrecht und optional diagonal.
 */

// Kein Anzeigename hier: dieses Modul ist sprachfrei. Wie die Stufen heissen,
// steht in i18n.js unter diff.* - der Schluessel ist der Name.
export const DIFFICULTIES = {
  leicht:    { rows: 6,  cols: 9, mode: 'balanced', refills: 5 },
  mittel:    { rows: 8,  cols: 9, mode: 'balanced', refills: 4 },
  schwer:    { rows: 10, cols: 9, mode: 'random',   refills: 3 },
  klassisch: { rows: 3,  cols: 9, mode: 'classic',  refills: 5 },
  // Endlos: nach jedem leergeraeumten Feld kommt frischer Nachschub. Gemessen
  // haelt ein Lauf im Mittel 6 Runden, streut aber von 1 bis 26 - damit gibt es
  // endlich ein Ergebnis, das sich zu jagen lohnt.
  endlos: {
    rows: 6, cols: 9, mode: 'balanced', refills: 3,
    endless: true, newRows: 3, refillPerRound: 1,
  },
};

export const POINTS = {
  pair: 10,
  // Der Deckel entscheidet, wie stark sauberes Spiel durchschlaegt: bei x5 lag
  // ein fehlerfreier Lauf nur 42-54 % ueber einem schlampigen, bei x10 sind es
  // 105-136 % (gemessen ueber je 300 Partien pro Stufe).
  maxCombo: 10,
  row: 25,
  multiRow: 50,   // Zuschlag je zusaetzlicher Zeile im selben Zug
  win: 100,
  // Gemessen ueber je 800 Partien: wer gar nicht auffuellt, sammelt roh sogar
  // etwas weniger Punkte als wer sich durchfuellt (mehr Zahlen = mehr Zuege).
  // Mit 50 pro gespartem Auffuellen war sauberes Spiel gerade eben gleichauf,
  // mit 150 liegt es rund 18 % vorn – der Bestwert belohnt jetzt Koennen.
  refillLeft: 150,
  round: 200,     // Bonus je geschaffter Runde im Endlos-Modus
  // Eine selbst geholte Zahl wiegt anderthalb Mal so schwer wie eine
  // ausgeteilte, siehe wertFaktor(). Warum nicht einfach gleich schwer? Weil
  // der Kombo-Anlauf (1x, 2x, ... 10x) pro Partie einmal anfaellt: auf einem
  // aufgeblaehten Feld verteilt er sich auf hunderte Treffer statt auf 40 und
  // faellt kaum auf. Gemessen ueber je 300 Partien und vier Spielweisen lag
  // Schummeln bei Gewicht 1,0 noch 6-11 % vorn, bei 1,25 gleichauf, bei 1,5
  // klar hinten (77-84 % von sauberem Spiel). Sauberes Spiel selbst kostet
  // das 1-2 %, im Endlos-Modus 5 %.
  invitedWeight: 1.5,
};

/** Deterministischer PRNG (mulberry32) – macht Partien reproduzierbar. */
export function createRng(seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0) {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.seed = seed;
  return rng;
}

function shuffle(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/**
 * Erzeugt die Startzahlen.
 * - classic:  das Papier-Original – die Ziffernfolge der Zahlen 1..19 ohne 10.
 * - balanced: paarweise aufgebaut (x,x) oder (x,10-x), danach gemischt.
 *             Dadurch geht die Rechnung im Prinzip immer auf.
 * - random:   gleichverteilt 1..9.
 */
export function generateValues({ rows, cols, mode }, rng) {
  const count = rows * cols;
  if (mode === 'classic') {
    const out = [];
    for (let n = 1; n <= 19; n++) {
      if (n === 10) continue;
      for (const d of String(n)) out.push(Number(d));
    }
    return out;
  }
  if (mode === 'balanced') {
    const out = [];
    while (out.length + 1 < count) {
      const x = 1 + Math.floor(rng() * 9);
      if (rng() < 0.45) out.push(x, x);
      else out.push(x, 10 - x);
    }
    // Bei ungerader Feldgroesse bleibt zwangslaeufig eine Zahl ohne Partner.
    while (out.length < count) out.push(1 + Math.floor(rng() * 9));
    return shuffle(out, rng);
  }
  return Array.from({ length: count }, () => 1 + Math.floor(rng() * 9));
}

/**
 * Teilt eine FERTIGE Spiellage in die Schritte auf, in denen sie am
 * Bildschirm erscheint: je Schritt zwei Zahlen, die zusammenpassen – gleich
 * oder Summe zehn. `gruppen[i]` ist die Schrittnummer der Stelle i, beide
 * Haelften eines Paares tragen dieselbe.
 *
 * Zwei Dinge sind daran wichtig, und beide sind Absicht:
 *
 * 1. Der Partner wird unter ALLEN passenden ausgelost, nicht der naechste
 *    genommen. Sonst lägen die beiden Haelften meist nebeneinander und der
 *    Aufbau bliebe eine Sache von Nachbarn.
 * 2. Die Schrittfolge wird danach gemischt. Ohne das liefe die erste Haelfte
 *    jedes Paares brav in Leserichtung mit, und der Aufbau sähe zeilenweise
 *    aus – genau das, was er nicht sein soll. So springt er stattdessen über
 *    Zeilen UND Spalten: erste Zahl irgendwo oben, die naechste vier Zeilen
 *    tiefer, die naechste am anderen Rand.
 *
 * Der Sinn: rueckwaerts gelesen ist der Aufbau eine Loesung. Wer zusieht,
 * sieht Paare entstehen und kann das Feld hinterher in derselben Ordnung
 * abtragen – die Nachbarschaft muss er sich selbst dazu suchen.
 *
 * Gilt fuer jede Stufe. In "Schwer" und "Klassisch" sind die Zahlen nicht
 * paarweise ENTSTANDEN, aber auch dort liegen Paare im Feld – die werden
 * hier nachtraeglich gefunden. Die Spiellage selbst bleibt dabei unberuehrt:
 * "Klassisch" ist weiter die Ziffernfolge 1 bis 19.
 */
export function aufbauSchritte(werte, rng) {
  const offen = new Set(werte.keys());
  const schritte = [];
  for (let i = 0; i < werte.length; i++) {
    if (!offen.delete(i)) continue;
    const passend = [...offen].filter((j) => valuesMatch(werte[i], werte[j]));
    if (passend.length) {
      const j = passend[Math.floor(rng() * passend.length)];
      offen.delete(j);
      schritte.push([i, j]);
    } else {
      schritte.push([i]);          // ohne Partner – ein Schritt fuer sich
    }
  }
  shuffle(schritte, rng);
  const gruppen = new Array(werte.length);
  schritte.forEach((schritt, n) => { for (const i of schritt) gruppen[i] = n; });
  return gruppen;
}

export function createGame({
  difficulty = 'mittel',
  diagonal = true,
  wrap = true,
  seed,
} = {}) {
  const preset = DIFFICULTIES[difficulty] ?? DIFFICULTIES.mittel;
  const rng = createRng(seed);
  const values = generateValues(preset, rng);
  // Nach den Zahlen, mit demselben Generator: die Zahlen stehen da schon fest,
  // die weiteren Griffe aendern sie nicht mehr. Gleiche Saat, gleiches Feld,
  // gleicher Aufbau.
  const gruppen = aufbauSchritte(values, rng);
  return {
    version: 1,
    difficulty,
    cols: preset.cols,
    diagonal,
    wrap,
    seed: rng.seed,
    cells: values.map((v, i) => ({ id: i, v, cleared: false, paar: gruppen[i] })),
    nextId: values.length,
    seen: values.length,        // wie viele Zahlen insgesamt aufs Feld kamen
    // Aufgeteilt danach, WER die Zahlen aufs Feld gebracht hat: das Spiel
    // (Startfeld und neue Runden) oder der Spieler (Auffuellen, Rettung).
    // Darauf beruht die Verwaesserung, siehe wertFaktor().
    ausgeteilt: values.length,
    geholt: 0,
    clearedCount: 0,            // wie viele davon weg sind
    endless: !!preset.endless,
    newRows: preset.newRows ?? 0,
    refillPerRound: preset.refillPerRound ?? 0,
    refillMax: preset.refills,
    round: 1,
    score: 0,
    moves: 0,
    matches: 0,
    combo: 0,
    bestCombo: 0,
    refillsLeft: preset.refills,
    refillsUsed: 0,
    rescuesLeft: 1,             // eine Rettung pro Partie
    rescuesUsed: 0,
    hintsUsed: 0,
    undosUsed: 0,
    elapsed: 0,
    status: 'playing', // 'playing' | 'won' | 'stuck'
    history: [],
  };
}

export const rowCount = (state) => Math.ceil(state.cells.length / state.cols);
export const remaining = (state) => state.cells.reduce((n, c) => n + (c.cleared ? 0 : 1), 0);

function indexAt(state, r, c) {
  if (r < 0 || c < 0 || c >= state.cols) return -1;
  const k = r * state.cols + c;
  return k < state.cells.length ? k : -1;
}

/** Passen die Werte zusammen? (gleich oder Summe 10 – 5+5 erfuellt beides) */
export function valuesMatch(a, b) {
  return a === b || a + b === 10;
}

/**
 * Alle Nachbarn mit groesserem Index. Jede Richtung liefert hoechstens einen
 * Kandidaten: die erste nicht gestrichene Zelle auf dem Weg. Alles dahinter ist
 * durch sie verdeckt.
 */
export function forwardNeighbours(state, i) {
  const { cells, cols } = state;
  const out = [];
  const rows = rowCount(state);
  const r0 = Math.floor(i / cols);
  const c0 = i % cols;

  // 1. Leserichtung – enthaelt den waagrechten Fall; mit wrap auch ueber das
  //    Zeilenende hinweg zur naechsten Zeile.
  const limit = state.wrap ? cells.length : Math.min(cells.length, (r0 + 1) * cols);
  for (let k = i + 1; k < limit; k++) {
    if (cells[k].cleared) continue;
    out.push(k);
    break;
  }

  // 2. Senkrecht nach unten.
  for (let r = r0 + 1; r < rows; r++) {
    const k = indexAt(state, r, c0);
    if (k < 0 || cells[k].cleared) continue;
    out.push(k);
    break;
  }

  // 3. Beide Diagonalen nach unten.
  if (state.diagonal) {
    for (const dc of [1, -1]) {
      let r = r0 + 1;
      let c = c0 + dc;
      while (r < rows && c >= 0 && c < cols) {
        const k = indexAt(state, r, c);
        if (k >= 0 && !cells[k].cleared) { out.push(k); break; }
        r += 1;
        c += dc;
      }
    }
  }
  return out;
}

/**
 * Alle Nachbarn in beide Richtungen. Spiegelbild von forwardNeighbours:
 * dieselben Wege, nur rueckwaerts gelaufen.
 */
export function neighboursOf(state, i) {
  const { cells, cols } = state;
  const out = new Set(forwardNeighbours(state, i));
  const r0 = Math.floor(i / cols);
  const c0 = i % cols;

  const start = state.wrap ? 0 : r0 * cols;
  for (let k = i - 1; k >= start; k--) {
    if (cells[k].cleared) continue;
    out.add(k);
    break;
  }
  for (let r = r0 - 1; r >= 0; r--) {
    const k = indexAt(state, r, c0);
    if (k < 0 || cells[k].cleared) continue;
    out.add(k);
    break;
  }
  if (state.diagonal) {
    for (const dc of [1, -1]) {
      let r = r0 - 1;
      let c = c0 + dc;
      while (r >= 0 && c >= 0 && c < cols) {
        const k = indexAt(state, r, c);
        if (k >= 0 && !cells[k].cleared) { out.add(k); break; }
        r -= 1;
        c += dc;
      }
    }
  }
  return [...out];
}

/** Spielbare Partner der Zelle i. */
export function partnersOf(state, i) {
  const cell = state.cells[i];
  if (!cell || cell.cleared) return [];
  return neighboursOf(state, i).filter((j) => !state.cells[j].cleared && valuesMatch(cell.v, state.cells[j].v));
}

/** Duerfen die Zellen i und j gestrichen werden? */
export function canMatch(state, i, j) {
  if (i === j) return false;
  const a = state.cells[Math.min(i, j)];
  const b = state.cells[Math.max(i, j)];
  if (!a || !b || a.cleared || b.cleared) return false;
  if (!valuesMatch(a.v, b.v)) return false;
  return forwardNeighbours(state, Math.min(i, j)).includes(Math.max(i, j));
}

/**
 * Endlos-Modus: leeres Feld heisst nicht Sieg, sondern neue Runde.
 * Frische Zahlen, ein Auffuellen mehr im Guthaben, Rundenbonus – und weiter.
 */
export function nextRound(state, seed) {
  if (!state.endless) return null;
  const rng = createRng(seed);
  const values = generateValues(
    { rows: state.newRows, cols: state.cols, mode: 'balanced' }, rng);
  const gruppen = aufbauSchritte(values, rng);
  state.cells = values.map((v, i) =>
    ({ id: state.nextId + i, v, cleared: false, paar: gruppen[i] }));
  state.nextId += values.length;
  state.seen += values.length;
  state.ausgeteilt += values.length;
  state.round += 1;
  state.refillsLeft = Math.min(state.refillMax, state.refillsLeft + state.refillPerRound);
  state.rescuesLeft = 1;            // jede Runde bekommt ihre eigene Rettung
  state.score += POINTS.round;
  state.status = 'playing';
  return { round: state.round, added: values.length, bonus: POINTS.round };
}

/** Erstes spielbares Paar (fuer Tipp und Sackgassen-Erkennung) – oder null. */
export function findPair(state) {
  const { cells } = state;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].cleared) continue;
    for (const j of forwardNeighbours(state, i)) {
      if (valuesMatch(cells[i].v, cells[j].v)) return [i, j];
    }
  }
  return null;
}

/** Alle spielbaren Paare (fuer Tests und Statistik). */
export function allPairs(state) {
  const pairs = [];
  for (let i = 0; i < state.cells.length; i++) {
    if (state.cells[i].cleared) continue;
    for (const j of forwardNeighbours(state, i)) {
      if (valuesMatch(state.cells[i].v, state.cells[j].v)) pairs.push([i, j]);
    }
  }
  return pairs;
}

function snapshot(state) {
  return {
    cells: state.cells.map((c) => ({ ...c })),
    nextId: state.nextId,
    round: state.round,
    score: state.score,
    moves: state.moves,
    matches: state.matches,
    combo: state.combo,
    refillsLeft: state.refillsLeft,
    refillsUsed: state.refillsUsed,
    rescuesLeft: state.rescuesLeft,
    rescuesUsed: state.rescuesUsed,
    seen: state.seen,
    clearedCount: state.clearedCount,
    status: state.status,
  };
}

function pushHistory(state) {
  state.history.push(snapshot(state));
  if (state.history.length > 60) state.history.shift();
}

export function canUndo(state) {
  return state.history.length > 0;
}

export function undo(state) {
  const prev = state.history.pop();
  if (!prev) return false;
  Object.assign(state, prev, { cells: prev.cells, history: state.history });
  state.undosUsed += 1;
  return true;
}

/** Komplett geleerte Zeilen verschwinden; der Rest rutscht nach. */
function dropEmptyRows(state) {
  const { cols } = state;
  const rows = rowCount(state);
  const kept = [];
  const removed = [];
  for (let r = 0; r < rows; r++) {
    const row = state.cells.slice(r * cols, (r + 1) * cols);
    if (row.length > 0 && row.every((c) => c.cleared)) removed.push(r);
    else kept.push(...row);
  }
  state.cells = kept;
  return removed;
}

export function refreshStatus(state) {
  if (remaining(state) === 0) {
    state.status = 'won';
    return;
  }
  if (!findPair(state) && state.refillsLeft <= 0) state.status = 'stuck';
  else state.status = 'playing';
}

/**
 * Wieviel ist ein Treffer wert? Punkte gibt es je gestrichenes Paar, und
 * Auffuellen haengt die uebrigen Zahlen noch einmal an - beides zusammen war
 * eine Einladung zum Schummeln: fuenfmal Auffuellen VOR dem ersten Zug macht
 * aus 54 Zahlen 1728 (jedes Auffuellen verdoppelt das Feld) und aus 3.100
 * Punkten rund 53.000. Gemessen in der Oberflaeche, nicht geschaetzt.
 *
 * Deshalb zaehlen Punkte nicht absolut, sondern bezogen auf die Zahlen, die
 * man sich selbst geholt hat: doppelt so viele Zahlen sind halb so viel wert.
 * Wer sich zu Beginn das Feld auf 32-fach blaeht, bekommt pro Treffer ein
 * Zweiunddreissigstel - das Schummeln kostet damit genau so viel, wie es
 * bringt, und niemand muss es fuer einen Bestwert tun.
 *
 * Wichtig ist die Aufteilung: neue Runden im Endlos-Modus sind KEIN Holen -
 * sie sind der Lohn fuer ein leergeraeumtes Feld und zaehlen zu "ausgeteilt".
 * Wer weit kommt, wird nicht bestraft.
 *
 * Ein Auffuellen in der Sackgasse trifft das kaum: dann liegen nur noch ein
 * paar Zahlen da, und angehaengt wird nur dieser Rest. Gemessen kostet ein
 * spaetes Auffuellen wenige Prozent, ein fruehes fast alles - genau die
 * Rangfolge, die man von Koennen erwartet.
 */
export function wertFaktor(state) {
  const geholt = state.geholt ?? 0;
  const ausgeteilt = state.ausgeteilt ?? state.seen ?? 1;
  if (!geholt) return 1;
  return ausgeteilt / (ausgeteilt + POINTS.invitedWeight * geholt);
}

/**
 * Fuehrt einen Zug aus. Gibt einen Bericht fuer die Animation zurueck.
 */
export function applyMatch(state, i, j) {
  if (state.status !== 'playing' || !canMatch(state, i, j)) {
    state.combo = 0;
    return { ok: false };
  }
  pushHistory(state);

  state.cells[i].cleared = true;
  state.cells[j].cleared = true;
  state.clearedCount += 2;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.moves += 1;
  state.matches += 1;

  const multiplier = Math.min(state.combo, POINTS.maxCombo);
  let points = POINTS.pair * multiplier;

  const removedRows = dropEmptyRows(state);
  points += removedRows.length * POINTS.row;
  // Mehrere Zeilen in einem Zug muss man vorbereiten – das ist der einzige
  // rein strategische Hebel auf die Punktzahl (kommt 1,5-2x pro Partie vor).
  if (removedRows.length >= 2) points += (removedRows.length - 1) * POINTS.multiRow;
  // Selbst geholte Zahlen verwaessern den Wert eines Treffers, siehe
  // wertFaktor(). Mindestens ein Punkt, damit ein Zug nie umsonst ist.
  points = Math.max(1, Math.round(points * wertFaktor(state)));
  state.score += points;

  refreshStatus(state);
  let bonus = 0;
  let round = null;
  if (state.status === 'won' && state.endless) {
    round = nextRound(state);            // im Endlos-Modus geht es weiter
  } else if (state.status === 'won') {
    bonus = POINTS.win + state.refillsLeft * POINTS.refillLeft;
    state.score += bonus;
  }
  return { ok: true, points, bonus, multiplier, removedRows, round, status: state.status };
}

/**
 * Haengt alle verbliebenen Zahlen in Leserichtung hinten an.
 */
function anhaengen(state, werte) {
  const from = state.cells.length;
  for (const v of werte) state.cells.push({ id: state.nextId++, v, cleared: false });
  return from;
}

/**
 * Ordnet die Zahlen so, dass zusammenpassende nebeneinander liegen. Wird nur
 * als Rettungsleine gebraucht: wenn das schlichte Anhaengen ein totes Feld
 * ergaebe, waere das Auffuellen verschenkt - man bezahlt eines seiner
 * Guthaben und kann danach trotzdem nichts tun.
 */
function paarweise(werte) {
  const offen = [...werte];
  const out = [];
  while (offen.length) {
    const a = offen.shift();
    const j = offen.findIndex((b) => valuesMatch(a, b));
    if (j >= 0) { out.push(a, offen[j]); offen.splice(j, 1); }
    else out.push(a);
  }
  return out;
}

/**
 * Haengt alle verbliebenen Zahlen in Leserichtung hinten an - so wie im
 * Original. Man kann also vorausplanen, welche Zahl nach dem Auffuellen wo
 * liegt.
 *
 * Eine einzige Ausnahme: ergaebe das Anhaengen ein Feld ohne einen einzigen
 * Zug, werden die Zahlen paarweise angeordnet. Ein Auffuellen, das sofort in
 * die Sackgasse fuehrt, ist verlorenes Guthaben und fuehlt sich wie ein Fehler
 * des Spiels an.
 */
export function refill(state) {
  if (state.status === 'won' || state.refillsLeft <= 0) return { ok: false };
  const rest = state.cells.filter((c) => !c.cleared).map((c) => c.v);
  if (rest.length === 0) return { ok: false };

  pushHistory(state);
  let from = anhaengen(state, rest);
  if (!findPair(state)) {
    state.cells.length = from;
    state.nextId -= rest.length;
    from = anhaengen(state, paarweise(rest));
  }
  state.seen += rest.length;
  state.geholt += rest.length;
  state.refillsLeft -= 1;
  state.refillsUsed += 1;
  state.combo = 0;
  refreshStatus(state);
  return { ok: true, from, added: rest.length, status: state.status };
}

/**
 * Rettung: einmal pro Partie. Wer in der Sackgasse steckt und kein Auffuellen
 * mehr hat, bekommt die uebrigen Zahlen noch einmal angehaengt. Fast jede
 * verlorene Partie endet mit einer Handvoll Zahlen auf dem Feld – ohne diesen
 * Ausweg waere das reine Pechsache.
 */
export function rescue(state) {
  if (state.status !== 'stuck' || state.rescuesLeft <= 0) return { ok: false };
  const rest = state.cells.filter((c) => !c.cleared).map((c) => c.v);
  if (rest.length === 0) return { ok: false };

  pushHistory(state);
  let from = anhaengen(state, rest);
  if (!findPair(state)) {
    // Eine Rettung, die nichts rettet, waere ein Hohn.
    state.cells.length = from;
    state.nextId -= rest.length;
    from = anhaengen(state, paarweise(rest));
  }
  state.seen += rest.length;
  state.geholt += rest.length;
  state.rescuesLeft -= 1;
  state.rescuesUsed += 1;
  state.combo = 0;
  refreshStatus(state);
  return { ok: true, from, added: rest.length, status: state.status };
}

export function hint(state) {
  const pair = findPair(state);
  if (pair) state.hintsUsed += 1;
  return pair;
}

/** Ein fehlgeschlagener Versuch bricht die Kombo. */
export function breakCombo(state) {
  state.combo = 0;
}

export function serialize(state) {
  const { history, ...rest } = state;
  return JSON.stringify(rest);
}

export function deserialize(text) {
  try {
    const data = JSON.parse(text);
    if (!data || data.version !== 1 || !Array.isArray(data.cells)) return null;
    const seen = data.seen ?? data.cells.length;
    // Aeltere Spielstaende kennen die Aufteilung nicht. Aus refillsUsed laesst
    // sie sich nicht rekonstruieren; im Zweifel gilt "nichts geholt", damit
    // eine laufende Partie nicht mitten im Spiel entwertet wird.
    const ausgeteilt = data.ausgeteilt ?? seen;
    const geholt = data.geholt ?? 0;
    const clearedCount = data.clearedCount ?? data.cells.filter((c) => c.cleared).length;
    // Spielstaende aus aelteren Fassungen kennen die Endlos-Felder nicht –
    // aus dem Schwierigkeitsgrad nachtragen, sonst zaehlt der Modus falsch.
    const preset = DIFFICULTIES[data.difficulty] ?? {};
    return {
      ...data,
      seen,
      ausgeteilt,
      geholt,
      clearedCount,
      endless: data.endless ?? !!preset.endless,
      newRows: data.newRows ?? preset.newRows ?? 0,
      refillPerRound: data.refillPerRound ?? preset.refillPerRound ?? 0,
      refillMax: data.refillMax ?? preset.refills ?? data.refillsLeft ?? 0,
      round: data.round ?? 1,
      rescuesLeft: data.rescuesLeft ?? 1,
      rescuesUsed: data.rescuesUsed ?? 0,
      history: [],
    };
  } catch {
    return null;
  }
}

/** Anteil der bereits gestrichenen Zahlen (0..1). */
export function progress(state) {
  return state.seen > 0 ? state.clearedCount / state.seen : 0;
}
