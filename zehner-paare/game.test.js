/**
 * Regeltests: node --test zehner-paare/
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame, canMatch, findPair, allPairs, applyMatch, refill, undo,
  valuesMatch, remaining, rowCount, serialize, deserialize, forwardNeighbours,
} from './game.js';

/** Testfeld aus Zeilen bauen; 0 bedeutet "bereits gestrichen". */
function board(rows, opts = {}) {
  const cols = opts.cols ?? Math.max(...rows.map((r) => r.length));
  const flat = rows.flat();
  return {
    version: 1, difficulty: 'test', cols,
    diagonal: opts.diagonal ?? true,
    wrap: opts.wrap ?? true,
    seed: 1,
    cells: flat.map((v, i) => ({ id: i, v: v === 0 ? 1 : v, cleared: v === 0 })),
    nextId: flat.length,
    score: 0, moves: 0, matches: 0, combo: 0, bestCombo: 0,
    refillsLeft: opts.refills ?? 3, refillsUsed: 0, hintsUsed: 0, undosUsed: 0,
    elapsed: 0, status: 'playing', history: [],
  };
}

test('Werte passen bei Gleichheit und bei Summe 10', () => {
  assert.ok(valuesMatch(7, 7));
  assert.ok(valuesMatch(3, 7));
  assert.ok(valuesMatch(6, 4));
  assert.ok(valuesMatch(5, 5), '5+5 erfuellt beide Bedingungen');
  assert.ok(!valuesMatch(3, 4));
  assert.ok(!valuesMatch(9, 9) === false);
});

test('waagrecht direkt nebeneinander', () => {
  const s = board([[6, 4, 2]]);
  assert.ok(canMatch(s, 0, 1));
  assert.ok(!canMatch(s, 0, 2), '6 und 2 passen wertmaessig nicht');
});

test('waagrecht ueber gestrichene Felder hinweg', () => {
  const s = board([[3, 0, 0, 7, 1]]);
  assert.ok(canMatch(s, 0, 3), 'geleerte Felder blockieren nicht');
  const blocked = board([[3, 5, 7]]);
  assert.ok(!canMatch(blocked, 0, 2), 'eine stehende Zahl blockiert');
});

test('senkrecht, auch ueber Luecken', () => {
  const s = board([
    [8, 1, 1],
    [0, 1, 1],
    [2, 1, 1],
  ]);
  assert.ok(canMatch(s, 0, 6), '8 ueber 2 mit Luecke dazwischen');
  const blocked = board([
    [8, 1, 1],
    [9, 1, 1],
    [2, 1, 1],
  ]);
  assert.ok(!canMatch(blocked, 0, 6));
});

test('diagonal ist abschaltbar', () => {
  const withDiag = board([[3, 1], [1, 7]], { diagonal: true, wrap: false });
  assert.ok(canMatch(withDiag, 0, 3), '3 und 7 diagonal');
  const noDiag = board([[3, 1], [1, 7]], { diagonal: false, wrap: false });
  assert.ok(!canMatch(noDiag, 0, 3));
});

test('diagonal springt nicht ueber den Feldrand', () => {
  // 3 steht ganz rechts, 7 ganz links in der naechsten Zeile:
  // das ist KEINE Diagonale, sondern nur der Zeilenumbruch.
  const s = board([[1, 1, 3], [7, 1, 1]], { diagonal: true, wrap: false });
  assert.ok(!canMatch(s, 2, 3), 'kein Diagonalsprung ueber den Rand');
  const wrapping = board([[1, 1, 3], [7, 1, 1]], { diagonal: false, wrap: true });
  assert.ok(canMatch(wrapping, 2, 3), 'als Leserichtung dagegen erlaubt');
});

test('Zeilenumbruch ist abschaltbar', () => {
  const s = board([[1, 1, 4], [6, 1, 1]], { wrap: false, diagonal: false });
  assert.ok(!canMatch(s, 2, 3));
  const on = board([[1, 1, 4], [6, 1, 1]], { wrap: true, diagonal: false });
  assert.ok(canMatch(on, 2, 3));
});

test('Zeilenumbruch ueberspringt geleerte Zellen am Zeilenende', () => {
  const s = board([[1, 4, 0], [0, 6, 1]], { wrap: true, diagonal: false });
  assert.ok(canMatch(s, 1, 4), '4 und 6 sind in Leserichtung benachbart');
});

test('jede Richtung liefert hoechstens einen Nachbarn', () => {
  const s = board([
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ]);
  const n = forwardNeighbours(s, 0);
  assert.deepEqual(n.sort((a, b) => a - b), [1, 3, 4], 'rechts, unten, diagonal');
  assert.deepEqual(forwardNeighbours(s, 8), [], 'letzte Zelle hat keine Nachbarn nach vorn');
});

test('leergeraeumte Zeile verschwindet und der Rest rutscht nach', () => {
  const s = board([
    [3, 7],
    [1, 2],
  ], { diagonal: false, wrap: false });
  const res = applyMatch(s, 0, 1);
  assert.ok(res.ok);
  assert.deepEqual(res.removedRows, [0]);
  assert.equal(rowCount(s), 1);
  assert.deepEqual(s.cells.map((c) => c.v), [1, 2]);
});

test('nachrutschende Zeilen erzeugen neue Nachbarschaften', () => {
  const s = board([
    [1, 9],   // bleibt stehen
    [4, 6],   // wird geraeumt -> Zeile faellt weg
    [9, 1],
  ], { diagonal: false, wrap: false });
  assert.ok(!canMatch(s, 0, 4), 'vorher durch Zeile 2 getrennt');
  applyMatch(s, 2, 3);
  assert.equal(rowCount(s), 2);
  assert.ok(canMatch(s, 0, 2), '1 und 9 sind jetzt senkrecht benachbart');
});

test('Auffuellen haengt die Restzahlen in Leserichtung an', () => {
  const s = board([[3, 0, 5], [0, 8, 2]], { refills: 1 });
  const before = remaining(s);
  const res = refill(s);
  assert.ok(res.ok);
  assert.equal(res.added, before);
  assert.deepEqual(s.cells.slice(6).map((c) => c.v), [3, 5, 8, 2]);
  assert.equal(s.refillsLeft, 0);
  assert.equal(refill(s).ok, false, 'ohne Guthaben kein weiteres Auffuellen');
});

test('Auffuellen fuellt zuerst die angebrochene letzte Zeile', () => {
  const s = board([[1, 2, 3], [4, 5]], { cols: 3, refills: 1 });
  refill(s);
  assert.equal(s.cells.length, 10);
  assert.equal(rowCount(s), 4);
});

test('Sieg, wenn das Feld leer ist – inklusive Bonus', () => {
  const s = board([[3, 7]], { refills: 2, diagonal: false, wrap: false });
  const res = applyMatch(s, 0, 1);
  assert.equal(s.status, 'won');
  assert.ok(res.bonus > 0);
  assert.equal(remaining(s), 0);
});

test('Sackgasse wird erkannt, wenn kein Zug und kein Auffuellen mehr geht', () => {
  const s = board([[1, 2, 4]], { refills: 0, diagonal: false, wrap: false });
  // Zug ausloesen, damit der Status neu bewertet wird
  const stuck = board([[1, 2, 4, 3, 7]], { refills: 0, diagonal: false, wrap: false });
  applyMatch(stuck, 3, 4);
  assert.equal(stuck.status, 'stuck');
  assert.equal(findPair(s), null);
});

test('Kombo erhoeht die Punkte, Fehlversuch setzt sie zurueck', () => {
  const s = board([[3, 7, 4, 6, 2, 8]], { diagonal: false, wrap: false });
  const a = applyMatch(s, 0, 1);
  const b = applyMatch(s, 2, 3);
  assert.equal(a.multiplier, 1);
  assert.equal(b.multiplier, 2);
  assert.ok(b.points > a.points);
  const bad = applyMatch(s, 4, 4);
  assert.equal(bad.ok, false);
  assert.equal(s.combo, 0);
});

test('Rueckgaengig stellt Feld, Punkte und Guthaben wieder her', () => {
  const s = createGame({ difficulty: 'leicht', seed: 7 });
  const pair = findPair(s);
  const before = JSON.parse(serialize(s));
  applyMatch(s, pair[0], pair[1]);
  assert.notEqual(s.score, 0);
  assert.ok(undo(s));
  const after = JSON.parse(serialize(s));
  assert.deepEqual(after.cells, before.cells);
  assert.equal(after.score, before.score);
  assert.equal(after.refillsLeft, before.refillsLeft);
});

test('Speichern und Laden ergibt denselben Zustand', () => {
  const s = createGame({ difficulty: 'mittel', seed: 99 });
  const p = findPair(s);
  applyMatch(s, p[0], p[1]);
  const copy = deserialize(serialize(s));
  assert.deepEqual(copy.cells, s.cells);
  assert.equal(copy.score, s.score);
  assert.equal(deserialize('kaputt'), null);
});

test('klassisches Startfeld entspricht 1..19 ohne 10', () => {
  const s = createGame({ difficulty: 'klassisch', seed: 1 });
  assert.equal(s.cells.length, 27);
  assert.deepEqual(s.cells.slice(0, 9).map((c) => c.v), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(s.cells.slice(9, 13).map((c) => c.v), [1, 1, 1, 2]);
});

test('ausgewogene Felder sind wertmaessig vollstaendig paarbar', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const s = createGame({ difficulty: 'leicht', seed });
    const counts = new Array(10).fill(0);
    for (const c of s.cells) counts[c.v] += 1;
    const total = counts.reduce((a, b) => a + b, 0);
    assert.equal(total % 2, 0, `Seed ${seed}: gerade Anzahl Zahlen`);
    assert.ok(allPairs(s).length > 0, `Seed ${seed}: mindestens ein Zug moeglich`);
  }
});

test('jede Schwierigkeit startet spielbar', () => {
  for (const d of ['leicht', 'mittel', 'schwer', 'klassisch']) {
    for (let seed = 1; seed <= 25; seed++) {
      const s = createGame({ difficulty: d, seed });
      assert.ok(findPair(s), `${d}/${seed} hat einen Eroeffnungszug`);
    }
  }
});
