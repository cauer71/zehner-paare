/**
 * Zehner-Paare – Oberflaeche.
 * Bindet die Spiellogik aus game.js an DOM, Animationen, Ton und Speicher.
 */
import {
  DIFFICULTIES, createGame, canMatch, applyMatch, refill, hint, undo, canUndo,
  breakCombo, remaining, serialize, deserialize, valuesMatch, findPair, progress,
  partnersOf, refreshStatus,
} from './game.js';

/* ---------------------------------------------------------------- Speicher */

const KEY = { save: 'zp.save.v1', settings: 'zp.settings.v1', best: 'zp.best.v1', seen: 'zp.seen.v1' };

const store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* privater Modus */ }
  },
  raw(key, fallback = null) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  },
  setRaw(key, value) {
    try { localStorage.setItem(key, value); } catch { /* egal */ }
  },
};

const DEFAULT_SETTINGS = {
  difficulty: 'mittel',
  diagonal: true,
  wrap: true,
  sound: true,
  vibrate: true,
  partners: true,
  theme: 'auto',
};

let settings = { ...DEFAULT_SETTINGS, ...(store.get(KEY.settings) ?? {}) };
let best = store.get(KEY.best) ?? {};

/* ------------------------------------------------------------------- DOM */

const $ = (sel) => document.querySelector(sel);
const board = $('#board');
const boardWrap = $('#board-wrap');
const fx = $('#fx');
const live = $('#live');
const toastEl = $('#toast');
const elScore = $('#stat-score');
const elLeft = $('#stat-left');
const elTime = $('#stat-time');
const elCombo = $('#combo');
const btnUndo = $('#btn-undo');
const btnHint = $('#btn-hint');
const btnRefill = $('#btn-refill');
const btnNew = $('#btn-new');
const refillCount = $('#refill-count');
const dlgRules = $('#dlg-rules');
const dlgSettings = $('#dlg-settings');
const dlgEnd = $('#dlg-end');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ------------------------------------------------------------- Spielstand */

let state = null;
let cellEls = new Map();   // cell.id -> Element
let selected = null;       // Index der ausgewaehlten Zelle
let locked = false;        // waehrend struktureller Animationen
let focusIndex = 0;        // fuer Tastaturbedienung
let tipsShown = 0;
let timerId = null;
let tickBase = 0;

/* ----------------------------------------------------------------- Helfer */

const cellAtIndex = (i) => state.cells[i];
const elAt = (i) => cellEls.get(state.cells[i]?.id);
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function announce(text) { live.textContent = text; }

let toastTimer = null;
function toast(text, ms = 2400) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => { toastEl.hidden = true; }, 220);
  }, ms);
}

function buzz(pattern) {
  if (!settings.vibrate) return;
  try { navigator.vibrate?.(pattern); } catch { /* nicht unterstuetzt */ }
}

/* -------------------------------------------------------------------- Ton */

let actx = null;
function audio() {
  if (!settings.sound) return null;
  if (!actx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    actx = new Ctx();
  }
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}

function tone({ freq = 440, dur = 0.12, type = 'sine', gain = 0.05, delay = 0, slideTo = null }) {
  const ctx = audio();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.014);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

const sfx = {
  select: () => tone({ freq: 620, dur: 0.05, gain: 0.028, type: 'triangle' }),
  match: (combo = 1) => {
    const base = 540 * Math.pow(2, Math.min(combo - 1, 7) / 12);
    tone({ freq: base, dur: 0.1, type: 'triangle', gain: 0.05, slideTo: base * 1.5 });
  },
  error: () => tone({ freq: 165, dur: 0.16, type: 'square', gain: 0.035, slideTo: 120 }),
  row: () => [0, 1, 2].forEach((i) => tone({ freq: 520 + i * 180, dur: 0.11, delay: i * 0.06, gain: 0.045 })),
  refill: () => tone({ freq: 380, dur: 0.22, type: 'sawtooth', gain: 0.03, slideTo: 240 }),
  win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, dur: 0.28, delay: i * 0.1, gain: 0.05 })),
  lose: () => [400, 320, 240].forEach((f, i) => tone({ freq: f, dur: 0.24, delay: i * 0.12, gain: 0.04, type: 'triangle' })),
};

/* ------------------------------------------------------------- Darstellung */

function applyTheme() {
  const root = document.documentElement;
  if (settings.theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', settings.theme);
}

function createCellEl() {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'cell';
  el.tabIndex = -1;
  return el;
}

function labelFor(i) {
  const cols = state.cols;
  const r = Math.floor(i / cols) + 1;
  const c = (i % cols) + 1;
  const cell = state.cells[i];
  return cell.cleared
    ? `Zeile ${r}, Spalte ${c}, leer`
    : `Zeile ${r}, Spalte ${c}, Zahl ${cell.v}`;
}

/**
 * Bringt das DOM mit dem Zustand in Deckung.
 * Verschobene Zellen werden per FLIP animiert, neue koennen einfliegen.
 */
function normalizeFocus() {
  if (!state.cells.length) { focusIndex = 0; return; }
  if (focusIndex >= state.cells.length) focusIndex = state.cells.length - 1;
  if (!state.cells[focusIndex]?.cleared) return;
  const free = state.cells.findIndex((c) => !c.cleared);
  focusIndex = free >= 0 ? free : 0;
}

function renderBoard({ enterFrom = -1 } = {}) {
  board.style.setProperty('--cols', state.cols);
  // Lag der Fokus im Feld? Nach dem Entfernen von Zellen faellt er sonst auf <body>.
  const hadFocus = board.contains(document.activeElement);
  normalizeFocus();

  const before = new Map();
  if (!reduceMotion.matches) {
    for (const [id, el] of cellEls) before.set(id, el.getBoundingClientRect());
  }

  const liveIds = new Set(state.cells.map((c) => c.id));
  for (const [id, el] of [...cellEls]) {
    if (!liveIds.has(id)) { el.remove(); cellEls.delete(id); }
  }

  state.cells.forEach((cell, i) => {
    let el = cellEls.get(cell.id);
    if (!el) {
      el = createCellEl();
      cellEls.set(cell.id, el);
      if (enterFrom >= 0 && i >= enterFrom) {
        el.classList.add('enter');
        el.style.animationDelay = `${Math.min((i - enterFrom) * 18, 420)}ms`;
        el.addEventListener('animationend', () => {
          el.classList.remove('enter');
          el.style.animationDelay = '';
        }, { once: true });
      }
    }
    el.dataset.i = String(i);
    el.textContent = cell.cleared ? '' : String(cell.v);
    // Reste abgelaufener Animationen entfernen – sonst haelt "forwards" die
    // Zelle unsichtbar, statt sie als Luecke zu zeigen.
    el.classList.remove('clearing', 'bad', 'rowout');
    el.classList.toggle('empty', cell.cleared);
    el.disabled = cell.cleared;
    el.setAttribute('aria-label', labelFor(i));
    el.tabIndex = i === focusIndex ? 0 : -1;
    if (board.children[i] !== el) board.insertBefore(el, board.children[i] ?? null);
  });

  // Kantenverlauf nur zeigen, wenn das Feld tatsaechlich ueberlaeuft
  boardWrap.classList.toggle('scrollable', board.scrollHeight > boardWrap.clientHeight + 2);

  if (hadFocus && !document.querySelector('dialog[open]')) {
    const el = elAt(focusIndex);
    if (el && !board.contains(document.activeElement)) el.focus({ preventScroll: true });
  }

  if (!reduceMotion.matches) {
    for (const [id, el] of cellEls) {
      const b = before.get(id);
      if (!b) continue;
      const a = el.getBoundingClientRect();
      const dx = b.left - a.left;
      const dy = b.top - a.top;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
          { duration: 280, easing: 'cubic-bezier(.2,.9,.3,1)' },
        );
      }
    }
  }
}

function updateStats({ bumpScore = false } = {}) {
  elScore.textContent = String(state.score);
  elLeft.textContent = String(remaining(state));
  refillCount.textContent = String(state.refillsLeft);
  btnRefill.disabled = state.refillsLeft <= 0 || state.status !== 'playing';
  btnUndo.disabled = !canUndo(state) || state.status !== 'playing';
  btnHint.disabled = state.status !== 'playing';
  if (bumpScore) {
    elScore.classList.remove('bump');
    void elScore.offsetWidth;
    elScore.classList.add('bump');
  }
  const pf = document.getElementById('progress-fill');
  if (pf) pf.style.width = `${Math.round(progress(state) * 100)}%`;
  if (state.combo >= 2) {
    elCombo.textContent = `Kombo ×${Math.min(state.combo, 5)}`;
    elCombo.classList.add('show');
  } else {
    elCombo.classList.remove('show');
  }
}

/* ---------------------------------------------------------------- Effekte */

function centerOf(el) {
  const r = el.getBoundingClientRect();
  const w = boardWrap.getBoundingClientRect();
  return {
    x: r.left - w.left + boardWrap.scrollLeft + r.width / 2,
    y: r.top - w.top + boardWrap.scrollTop + r.height / 2,
  };
}

function burstAt(el) {
  if (reduceMotion.matches) return;
  const { x, y } = centerOf(el);
  const ring = document.createElement('span');
  ring.className = 'burst';
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  fx.appendChild(ring);
  ring.addEventListener('animationend', () => ring.remove(), { once: true });

  for (let k = 0; k < 6; k++) {
    const s = document.createElement('span');
    const angle = (Math.PI * 2 * k) / 6 + Math.random();
    const dist = 22 + Math.random() * 20;
    s.className = 'spark';
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
    fx.appendChild(s);
    s.addEventListener('animationend', () => s.remove(), { once: true });
  }
}

function floaterAt(el, text) {
  if (reduceMotion.matches) return;
  const { x, y } = centerOf(el);
  const f = document.createElement('span');
  f.className = 'floater';
  f.textContent = text;
  f.style.left = `${x}px`;
  f.style.top = `${y}px`;
  fx.appendChild(f);
  f.addEventListener('animationend', () => f.remove(), { once: true });
}

function confetti() {
  if (reduceMotion.matches) return;
  const wrap = document.createElement('div');
  wrap.className = 'confetti';
  const colors = ['#ef7d31', '#f5c451', '#16a37b', '#2b8fd6'];
  for (let i = 0; i < 46; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}vw`;
    p.style.background = colors[i % colors.length];
    p.style.animationDuration = `${1.1 + Math.random() * 1.1}s`;
    p.style.animationDelay = `${Math.random() * 0.35}s`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap);
  try {
    if (typeof wrap.showPopover === 'function') { wrap.popover = 'manual'; wrap.showPopover(); }
  } catch { /* aeltere Browser zeigen es einfach darunter */ }
  setTimeout(() => wrap.remove(), 2800);
}

/* ------------------------------------------------------------ Spielablauf */

function clearSelection() {
  selected = null;
  // Ueber die Elemente statt ueber Indizes: nach einer entfernten Zeile zeigen
  // alte Indizes auf fremde Zellen.
  for (const el of cellEls.values()) el.classList.remove('sel', 'partner');
}

function select(i) {
  clearSelection();
  selected = i;
  const el = elAt(i);
  el?.classList.add('sel');
  if (settings.partners) {
    for (const j of partnersOf(state, i)) elAt(j)?.classList.add('partner');
  }
  sfx.select();
  buzz(8);
  announce(`${state.cells[i].v} ausgewählt`);
}

function flash(el, cls, ms) {
  if (!el) return;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

function rejectPair(i, j) {
  const a = state.cells[i];
  const b = state.cells[j];
  flash(elAt(i), 'bad', 360);
  flash(elAt(j), 'bad', 360);
  breakCombo(state);
  sfx.error();
  buzz([12, 40, 12]);
  if (tipsShown < 3) {
    tipsShown += 1;
    toast(valuesMatch(a.v, b.v)
      ? `${a.v} und ${b.v} passen – aber sie sind nicht benachbart.`
      : `${a.v} und ${b.v} sind weder gleich noch zusammen 10.`);
  }
  clearSelection();
  updateStats();
}

function doMatch(i, j) {
  const elI = elAt(i);
  const elJ = elAt(j);
  const values = [state.cells[i].v, state.cells[j].v];
  const res = applyMatch(state, i, j);
  if (!res.ok) return;

  clearSelection();
  elI?.classList.add('clearing');
  elJ?.classList.add('clearing');
  burstAt(elI);
  burstAt(elJ);
  floaterAt(elJ, `+${res.points}`);
  sfx.match(res.multiplier);
  buzz(14);
  announce(`${values[0]} und ${values[1]} gestrichen, ${res.points} Punkte`);
  updateStats({ bumpScore: true });

  const structural = res.removedRows.length > 0;
  if (structural) {
    locked = true;
    sfx.row();
    floaterAt(elI, res.removedRows.length > 1 ? `${res.removedRows.length} Zeilen!` : 'Zeile frei!');
  }

  const liveIds = new Set(state.cells.map((c) => c.id));
  const orphans = [...cellEls].filter(([id]) => !liveIds.has(id)).map(([, el]) => el);

  const finish = () => {
    renderBoard();
    locked = false;
    updateStats();
    afterMove();
  };

  const delay = reduceMotion.matches ? 0 : 320;
  setTimeout(() => {
    for (const el of orphans) if (!el.classList.contains('clearing')) el.classList.add('rowout');
    if (orphans.length && !reduceMotion.matches) setTimeout(finish, 240);
    else finish();
  }, delay);
}

function afterMove() {
  save();
  if (state.status === 'won') { endGame(true); return; }
  if (state.status === 'stuck') { endGame(false); return; }
  if (!findPair(state)) {
    btnRefill.classList.add('urge');
    toast('Kein Zug mehr möglich – füll das Feld auf.', 3200);
  } else {
    btnRefill.classList.remove('urge');
  }
}

function onCellActivate(i) {
  if (locked || !state || state.status !== 'playing') return;
  const cell = state.cells[i];
  if (!cell || cell.cleared) return;
  focusIndex = i;
  if (selected === null) { select(i); return; }
  if (selected === i) { clearSelection(); return; }
  if (canMatch(state, selected, i)) doMatch(selected, i);
  else rejectPair(selected, i);
}

/* ---------------------------------------------------------------- Aktionen */

function doHint() {
  if (locked || state.status !== 'playing') return;
  const pair = hint(state);
  if (!pair) {
    toast(state.refillsLeft > 0 ? 'Kein Zug mehr – bitte auffüllen.' : 'Kein Zug mehr möglich.');
    return;
  }
  clearSelection();
  for (const i of pair) {
    const el = elAt(i);
    if (!el) continue;
    el.classList.remove('hinted');
    void el.offsetWidth;
    el.classList.add('hinted');
    setTimeout(() => el.classList.remove('hinted'), 3400);
  }
  const el = elAt(pair[0]);
  el?.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  tone({ freq: 880, dur: 0.09, gain: 0.03 });
  announce(`Tipp: ${state.cells[pair[0]].v} und ${state.cells[pair[1]].v}`);
  save();
}

function doRefill() {
  if (locked || state.status !== 'playing') return;
  const res = refill(state);
  if (!res.ok) { toast('Kein Auffüllen mehr übrig.'); return; }
  clearSelection();
  btnRefill.classList.remove('urge');
  renderBoard({ enterFrom: res.from });
  updateStats();
  sfx.refill();
  buzz(20);
  announce(`${res.added} Zahlen angehängt`);
  toast(`${res.added} Zahlen angehängt · noch ${state.refillsLeft}×`);
  elAt(res.from)?.scrollIntoView({ block: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  save();
  if (state.status === 'stuck') endGame(false);
}

function doUndo() {
  if (locked || !canUndo(state)) return;
  clearSelection();
  undo(state);
  state.status = 'playing';
  renderBoard();
  updateStats();
  btnRefill.classList.remove('urge');
  tone({ freq: 300, dur: 0.1, gain: 0.03, type: 'triangle' });
  announce('Zug zurückgenommen');
  save();
}

function newGame(difficulty = settings.difficulty) {
  settings.difficulty = difficulty;
  store.set(KEY.settings, settings);
  state = createGame({ difficulty, diagonal: settings.diagonal, wrap: settings.wrap });
  cellEls.forEach((el) => el.remove());
  cellEls = new Map();
  selected = null;
  focusIndex = 0;
  tipsShown = 0;
  locked = false;
  btnRefill.classList.remove('urge');
  renderBoard();
  updateStats();
  startTimer(true);
  save();
  announce(`Neues Spiel: ${DIFFICULTIES[difficulty].label}`);
}

/* ------------------------------------------------------------------- Ende */

function endGame(won) {
  stopTimer();
  const label = DIFFICULTIES[state.difficulty]?.label ?? state.difficulty;
  const key = state.difficulty;
  const previous = best[key];
  const isRecord = won && (!previous || state.score > previous.score);
  if (won) {
    if (isRecord) best[key] = { score: state.score, time: Math.round(state.elapsed), at: Date.now() };
    store.set(KEY.best, best);
  }

  $('#end-badge').textContent = won ? '★' : '☹';
  $('#end-badge').classList.toggle('sad', !won);
  $('#end-title').textContent = won ? 'Feld leer geräumt!' : 'Keine Züge mehr';
  $('#end-text').textContent = won
    ? (isRecord ? `Neuer Bestwert bei ${label}!` : `Sauber gespielt bei ${label}.`)
    : 'Kein Paar mehr übrig und kein Auffüllen mehr. Nimm einen Zug zurück oder starte neu.';
  $('#end-stats').innerHTML = [
    ['Punkte', state.score],
    ['Zeit', fmtTime(state.elapsed)],
    ['Züge', state.matches],
    ['Beste Kombo', `×${Math.min(state.bestCombo, 5)}`],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('#btn-end-undo').hidden = won || !canUndo(state);

  if (won) { confetti(); sfx.win(); buzz([20, 60, 20, 60, 40]); }
  else { sfx.lose(); buzz([40, 80, 40]); }
  setTimeout(() => openSheet(dlgEnd), won && !reduceMotion.matches ? 620 : 0);
  save();
  renderBest();
}

/* ------------------------------------------------------------------ Timer */

function startTimer(reset = false) {
  stopTimer();
  if (reset) state.elapsed = 0;
  tickBase = Date.now();
  timerId = setInterval(() => {
    if (document.hidden || state.status !== 'playing') return;
    state.elapsed += (Date.now() - tickBase) / 1000;
    tickBase = Date.now();
    elTime.textContent = fmtTime(state.elapsed);
  }, 500);
  elTime.textContent = fmtTime(state.elapsed);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

document.addEventListener('visibilitychange', () => {
  tickBase = Date.now();
  if (document.hidden) save();
});

/* -------------------------------------------------------------- Speichern */

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => store.setRaw(KEY.save, serialize(state)), 220);
}

function load() {
  const restored = deserialize(store.raw(KEY.save));
  if (!restored || restored.status === 'won') return false;
  state = restored;
  state.diagonal = settings.diagonal;
  state.wrap = settings.wrap;
  settings.difficulty = state.difficulty in DIFFICULTIES ? state.difficulty : settings.difficulty;
  return true;
}

/* ----------------------------------------------------------------- Dialoge */

function openSheet(dlg) {
  if (dlg.open) return;
  dlg.showModal();
  // Ohne das landet der Fokus auf dem Schliessen-Kreuz und malt dort einen Ring.
  dlg.focus({ preventScroll: true });
  dlg.querySelector('.sheet-body')?.scrollTo({ top: 0 });
}

function closeSheet(dlg) {
  if (!dlg.open) return;
  if (reduceMotion.matches) { dlg.close(); return; }
  dlg.classList.add('closing');
  setTimeout(() => { dlg.classList.remove('closing'); dlg.close(); }, 190);
}

for (const dlg of [dlgRules, dlgSettings, dlgEnd]) {
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) closeSheet(dlg);          // Klick auf den Hintergrund
    if (e.target.closest('[data-close]')) closeSheet(dlg);
  });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeSheet(dlg); });
}

/* ----------------------------------------------------------- Einstellungen */

function renderSettings() {
  for (const btn of document.querySelectorAll('#seg-difficulty button')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.value === settings.difficulty));
  }
  for (const btn of document.querySelectorAll('#seg-theme button')) {
    btn.setAttribute('aria-pressed', String(btn.dataset.value === settings.theme));
  }
  $('#opt-diagonal').checked = settings.diagonal;
  $('#opt-wrap').checked = settings.wrap;
  $('#opt-partners').checked = settings.partners;
  $('#opt-sound').checked = settings.sound;
  $('#opt-vibrate').checked = settings.vibrate;
  const d = DIFFICULTIES[settings.difficulty];
  $('#difficulty-note').textContent =
    `${d.rows} × ${d.cols} Felder · ${d.refills}× Auffüllen` +
    (settings.difficulty === 'klassisch' ? ' · Startfeld wie beim Papier-Original (1–19 ohne 10)' : '');
  renderBest();
}

function renderBest() {
  $('#best-list').innerHTML = Object.entries(DIFFICULTIES).map(([key, d]) => {
    const b = best[key];
    return `<li><span>${d.label}</span><b>${b ? `${b.score} · ${fmtTime(b.time)}` : '–'}</b></li>`;
  }).join('');
}

function saveSettings() {
  store.set(KEY.settings, settings);
}

$('#seg-difficulty').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const value = btn.dataset.value;
  if (value === settings.difficulty && state.moves === 0) return;
  if (state.moves > 0 && state.status === 'playing' &&
      !confirm('Neues Spiel starten? Die laufende Partie geht verloren.')) return;
  newGame(value);
  renderSettings();
});

$('#seg-theme').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  settings.theme = btn.dataset.value;
  applyTheme();
  saveSettings();
  renderSettings();
});

/** Nach einer Regelaenderung kann aus einer Sackgasse wieder ein Spiel werden – und umgekehrt. */
function applyRuleChange(message) {
  clearSelection();
  const before = state.status;
  if (state.status !== 'won') refreshStatus(state);
  saveSettings();
  updateStats();
  save();
  toast(message);
  if (before !== 'playing' && state.status === 'playing') {
    btnRefill.classList.remove('urge');
    startTimer();
  } else if (state.status === 'stuck' && before === 'playing') {
    btnRefill.classList.add('urge');
    stopTimer();
  }
}

$('#opt-diagonal').addEventListener('change', (e) => {
  settings.diagonal = e.target.checked;
  state.diagonal = settings.diagonal;
  applyRuleChange(settings.diagonal ? 'Diagonale Paare erlaubt.' : 'Diagonale Paare aus.');
});

$('#opt-wrap').addEventListener('change', (e) => {
  settings.wrap = e.target.checked;
  state.wrap = settings.wrap;
  applyRuleChange(settings.wrap ? 'Zeilenumbruch zählt als Nachbarschaft.' : 'Zeilenumbruch aus.');
});

$('#opt-partners').addEventListener('change', (e) => {
  settings.partners = e.target.checked;
  saveSettings();
  if (selected !== null) select(selected);
});

$('#opt-sound').addEventListener('change', (e) => {
  settings.sound = e.target.checked;
  saveSettings();
  if (settings.sound) sfx.select();
});

$('#opt-vibrate').addEventListener('change', (e) => {
  settings.vibrate = e.target.checked;
  saveSettings();
  buzz(20);
});

/* ------------------------------------------------------------- Bedienung */

board.addEventListener('click', (e) => {
  const el = e.target.closest('.cell');
  if (!el) return;
  onCellActivate(Number(el.dataset.i));
});

board.addEventListener('keydown', (e) => {
  const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -state.cols, ArrowDown: state.cols };
  if (!(e.key in steps)) return;
  e.preventDefault();
  const step = steps[e.key];
  let next = focusIndex;
  // Bis zum naechsten spielbaren Feld weitergehen, leere ueberspringen.
  // Links/rechts folgen der Leserichtung, also auch ueber das Zeilenende hinaus.
  for (let guard = 0; guard < state.cells.length; guard++) {
    next += step;
    if (next < 0 || next >= state.cells.length) return;
    if (!state.cells[next].cleared) break;
  }
  if (state.cells[next]?.cleared) return;
  focusIndex = next;
  for (const c of cellEls.values()) c.tabIndex = -1;
  const el = elAt(focusIndex);
  if (el) { el.tabIndex = 0; el.focus(); }
});

btnUndo.addEventListener('click', doUndo);
btnHint.addEventListener('click', doHint);
btnRefill.addEventListener('click', doRefill);
btnNew.addEventListener('click', () => {
  if (state.moves > 0 && state.status === 'playing' &&
      !confirm('Neues Spiel starten? Die laufende Partie geht verloren.')) return;
  newGame();
});

$('#btn-rules').addEventListener('click', () => openSheet(dlgRules));
$('#btn-rules-2').addEventListener('click', () => { closeSheet(dlgSettings); setTimeout(() => openSheet(dlgRules), 210); });
$('#btn-settings').addEventListener('click', () => { renderSettings(); openSheet(dlgSettings); });
$('#btn-end-new').addEventListener('click', () => { closeSheet(dlgEnd); newGame(); });
$('#btn-end-undo').addEventListener('click', () => { closeSheet(dlgEnd); doUndo(); startTimer(); });

document.addEventListener('keydown', (e) => {
  if (e.target.closest('dialog') || e.target.matches('input, textarea')) return;
  if (e.key === 'h') doHint();
  if (e.key === 'u' || (e.key === 'z' && (e.metaKey || e.ctrlKey))) doUndo();
  if (e.key === 'Escape') clearSelection();
});

// Ton erst nach der ersten Nutzergeste anlegen (Autoplay-Regeln der Browser).
window.addEventListener('pointerdown', () => audio(), { once: true });

/* ------------------------------------------------------------------ Start */

applyTheme();
if (!load()) {
  state = createGame({
    difficulty: settings.difficulty,
    diagonal: settings.diagonal,
    wrap: settings.wrap,
  });
}
renderBoard();
updateStats();
renderSettings();
startTimer();

if (state.status === 'stuck') {
  btnRefill.classList.add('urge');
  toast('Kein Zug mehr möglich – nimm einen Zug zurück oder starte neu.', 4000);
} else if (state.status === 'playing' && !findPair(state)) {
  btnRefill.classList.add('urge');
}

if (!store.get(KEY.seen)) {
  store.set(KEY.seen, true);
  openSheet(dlgRules);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline optional */ });
  });
}

// Fuer Tests aus dem Browser heraus
window.__zp = {
  get state() { return state; },
  onCellActivate, doHint, doRefill, doUndo, newGame,
  findPair, canMatch, remaining,
};
