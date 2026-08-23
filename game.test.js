/**
 * Regeltests: node --test zehner-paare/
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POINTS, nextRound,
  createGame, canMatch, findPair, allPairs, applyMatch, refill, undo,
  valuesMatch, remaining, rowCount, serialize, deserialize, forwardNeighbours,
  neighboursOf, partnersOf, refreshStatus, rescue,
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

test('neighboursOf ist genau die Umkehrung von canMatch', () => {
  for (const [diagonal, wrap] of [[true, true], [true, false], [false, true], [false, false]]) {
    const s = createGame({ difficulty: 'mittel', seed: 5, diagonal, wrap });
    // ein paar Zellen leeren, damit auch das Durchsehen geprueft wird
    for (const i of [3, 4, 11, 20, 21, 22, 30]) s.cells[i].cleared = true;
    for (let i = 0; i < s.cells.length; i++) {
      if (s.cells[i].cleared) continue;
      const n = new Set(neighboursOf(s, i));
      for (let j = 0; j < s.cells.length; j++) {
        if (i === j || s.cells[j].cleared) continue;
        const reachable = n.has(j);
        const back = new Set(neighboursOf(s, j)).has(i);
        assert.equal(reachable, back, `Nachbarschaft ${i}/${j} muss symmetrisch sein`);
        if (reachable && valuesMatch(s.cells[i].v, s.cells[j].v)) {
          assert.ok(canMatch(s, i, j), `${i}/${j} sollte spielbar sein`);
        }
      }
    }
  }
});

test('partnersOf liefert genau die spielbaren Partner', () => {
  const s = createGame({ difficulty: 'leicht', seed: 11 });
  for (let i = 0; i < s.cells.length; i += 7) {
    const expected = [];
    for (let j = 0; j < s.cells.length; j++) if (canMatch(s, i, j)) expected.push(j);
    assert.deepEqual(partnersOf(s, i).sort((a, b) => a - b), expected.sort((a, b) => a - b));
  }
});

test('refreshStatus bewertet nach Regelwechsel neu', () => {
  // 3 und 7 liegen nur diagonal beieinander
  const s = createGame({ difficulty: 'leicht', seed: 3 });
  s.cells = [
    { id: 0, v: 3, cleared: false }, { id: 1, v: 1, cleared: false },
    { id: 2, v: 2, cleared: false }, { id: 3, v: 7, cleared: false },
  ];
  s.cols = 2; s.refillsLeft = 0; s.diagonal = false; s.wrap = false;
  refreshStatus(s);
  assert.equal(s.status, 'stuck');
  s.diagonal = true;
  refreshStatus(s);
  assert.equal(s.status, 'playing');
});

test('Kombofaktor laeuft bis zum Deckel und macht sauberes Spiel sichtbar', () => {
  const s = board([[3, 7, 4, 6, 2, 8, 1, 9, 5, 5, 3, 7, 4, 6, 2, 8, 1, 9, 6, 4, 2, 8]],
                  { diagonal: false, wrap: false });
  const faktoren = [];
  for (let i = 0; i < 11; i++) {
    const res = applyMatch(s, i * 2, i * 2 + 1);
    if (!res.ok) break;
    faktoren.push(res.multiplier);
  }
  assert.deepEqual(faktoren.slice(0, 10), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(faktoren[10], POINTS.maxCombo, 'danach bleibt es beim Deckel');
});

test('zwei Zeilen in einem Zug bringen einen Zuschlag', () => {
  // Ein Zug raeumt die letzten Zahlen zweier Zeilen gleichzeitig (senkrechtes Paar)
  const s = board([
    [0, 0, 3],
    [0, 0, 7],
  ], { cols: 3, diagonal: false, wrap: false });
  const res = applyMatch(s, 2, 5);
  assert.ok(res.ok);
  assert.equal(res.removedRows.length, 2);
  assert.equal(res.points, POINTS.pair * 1 + 2 * POINTS.row + POINTS.multiRow);
});

test('eine einzelne Zeile bekommt keinen Zuschlag', () => {
  const s = board([[3, 7], [1, 2]], { diagonal: false, wrap: false });
  const res = applyMatch(s, 0, 1);
  assert.equal(res.removedRows.length, 1);
  assert.equal(res.points, POINTS.pair + POINTS.row);
});

test('Endlos: ein leeres Feld beendet nichts, es beginnt eine Runde', () => {
  const s = createGame({ difficulty: 'endlos', seed: 3 });
  assert.equal(s.endless, true);
  assert.equal(s.round, 1);
  s.cells = [{ id: 0, v: 3, cleared: false }, { id: 1, v: 7, cleared: false }];
  s.cols = 2;
  s.refillsLeft = 1;
  const punkteVorher = s.score;

  const res = applyMatch(s, 0, 1);
  assert.equal(res.status, 'playing', 'der Lauf geht weiter');
  assert.ok(res.round, 'der Zug meldet die neue Runde');
  assert.equal(s.round, 2);
  assert.ok(s.cells.length > 0 && s.cells.every((c) => !c.cleared), 'frisches Feld');
  assert.equal(s.refillsLeft, 2, 'ein Auffüllen kommt zurück');
  assert.equal(s.score, punkteVorher + POINTS.pair + POINTS.row + POINTS.round);
});

test('Endlos: das Auffuell-Guthaben laeuft nicht ueber', () => {
  const s = createGame({ difficulty: 'endlos', seed: 4 });
  s.refillsLeft = s.refillMax;
  nextRound(s, 11);
  assert.equal(s.refillsLeft, s.refillMax);
});

test('Endlos: Zurueck holt die alte Runde wieder', () => {
  const s = createGame({ difficulty: 'endlos', seed: 7 });
  s.cells = [{ id: 0, v: 4, cleared: false }, { id: 1, v: 6, cleared: false }];
  s.cols = 2;
  applyMatch(s, 0, 1);
  assert.equal(s.round, 2);
  assert.ok(undo(s));
  assert.equal(s.round, 1);
  assert.deepEqual(s.cells.map((c) => c.v), [4, 6]);
});

test('nextRound greift nur im Endlos-Modus', () => {
  const s = createGame({ difficulty: 'leicht', seed: 2 });
  assert.equal(nextRound(s, 1), null);
});

test('Rettung greift nur in der Sackgasse und nur einmal', () => {
  const s = createGame({ difficulty: 'leicht', seed: 3 });
  assert.equal(rescue(s).ok, false, 'im laufenden Spiel gibt es keine Rettung');

  // Sackgasse herstellen: zwei Zahlen, die nicht zusammenpassen
  s.cells = [{ id: 0, v: 2, cleared: false }, { id: 1, v: 3, cleared: false },
             { id: 2, v: 4, cleared: false }, { id: 3, v: 6, cleared: false }];
  s.cols = 4;
  s.refillsLeft = 0;
  refreshStatus(s);
  assert.equal(s.status, 'playing', '4 und 6 liegen noch nebeneinander');
  applyMatch(s, 2, 3);
  assert.equal(s.status, 'stuck', 'jetzt geht nichts mehr');

  const res = rescue(s);
  assert.equal(res.ok, true);
  assert.equal(res.added, 2, 'die zwei Übriggebliebenen kommen erneut aufs Feld');
  assert.equal(s.status, 'playing', '2 und 2 sowie 3 und 3 sind jetzt zu haben');
  assert.equal(s.rescuesLeft, 0);
  assert.equal(s.rescuesUsed, 1);

  s.status = 'stuck';
  assert.equal(rescue(s).ok, false, 'eine Rettung pro Partie');
});

test('Zurueck dreht die Rettung sauber zurueck', () => {
  const s = createGame({ difficulty: 'leicht', seed: 3 });
  s.cells = [{ id: 0, v: 2, cleared: false }, { id: 1, v: 3, cleared: false }];
  s.cols = 2;
  s.refillsLeft = 0;
  refreshStatus(s);
  assert.equal(s.status, 'stuck');
  assert.equal(rescue(s).ok, true);
  assert.equal(s.cells.length, 4);

  assert.ok(undo(s));
  assert.equal(s.cells.length, 2, 'die angehängten Zahlen sind wieder weg');
  assert.equal(s.rescuesLeft, 1, 'und die Rettung steht wieder zur Verfügung');
  assert.equal(s.refillsLeft, 0, 'ohne dass ein Auffüllen dazukommt');
});

test('Endlos: jede Runde bringt eine neue Rettung', () => {
  const s = createGame({ difficulty: 'endlos', seed: 5 });
  s.rescuesLeft = 0;
  nextRound(s, 12);
  assert.equal(s.rescuesLeft, 1);
});

test('Rettung uebersteht Speichern und Laden', () => {
  const s = createGame({ difficulty: 'mittel', seed: 8 });
  s.rescuesLeft = 0; s.rescuesUsed = 1;
  const wieder = deserialize(serialize(s));
  assert.equal(wieder.rescuesLeft, 0);
  assert.equal(wieder.rescuesUsed, 1);
});
