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

export function createGame({
  difficulty = 'mittel',
  diagonal = true,
  wrap = true,
  seed,
} = {}) {
  const preset = DIFFICULTIES[difficulty] ?? DIFFICULTIES.mittel;
  const rng = createRng(seed);
  const values = generateValues(preset, rng);
  return {
    version: 1,
    difficulty,
    cols: preset.cols,
    diagonal,
    wrap,
    seed: rng.seed,
    cells: values.map((v, i) => ({ id: i, v, cleared: false })),
    nextId: values.length,
    seen: values.length,        // wie viele Zahlen insgesamt aufs Feld kamen
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
  const values = generateValues(
    { rows: state.newRows, cols: state.cols, mode: 'balanced' },
    createRng(seed),
  );
  state.cells = values.map((v, i) => ({ id: state.nextId + i, v, cleared: false }));
  state.nextId += values.length;
  state.seen += values.length;
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
    const clearedCount = data.clearedCount ?? data.cells.filter((c) => c.cleared).length;
    // Spielstaende aus aelteren Fassungen kennen die Endlos-Felder nicht –
    // aus dem Schwierigkeitsgrad nachtragen, sonst zaehlt der Modus falsch.
    const preset = DIFFICULTIES[data.difficulty] ?? {};
    return {
      ...data,
      seen,
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
