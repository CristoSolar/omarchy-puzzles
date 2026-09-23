const test = require('node:test');
const assert = require('node:assert');
const S = require('../lib/state.js');

test('parseState sobrevive a basura sin lanzar', () => {
  for (const entrada of ['', '   ', '{', 'null', '[]', '42', '"hola"', undefined]) {
    const st = S.parseState(entrada);
    assert.strictEqual(st.version, 2, `entrada ${JSON.stringify(entrada)}`);
    assert.strictEqual(st.streak, 0);
    assert.strictEqual(st.lastSolvedDay, '');
    assert.deepStrictEqual(st.games, {});
  }
});

test('previousKey cruza meses y anios', () => {
  assert.strictEqual(S.previousKey('2026-09-22'), '2026-09-21');
  assert.strictEqual(S.previousKey('2026-09-01'), '2026-08-31');
  assert.strictEqual(S.previousKey('2026-01-01'), '2025-12-31');
  assert.strictEqual(S.previousKey('2024-03-01'), '2024-02-29');
});

test('migra un state.json v1 de Queens conservando racha y record', () => {
  const v1 = JSON.stringify({
    lastSolved: '2026-09-22', streak: 5, lastElapsedMs: 61000,
    best: { '8': 55000 }, inProgress: null,
  });
  const st = S.parseState(v1);
  assert.strictEqual(st.version, 2);
  assert.strictEqual(st.streak, 5, 'la racha se conserva');
  assert.strictEqual(st.lastSolvedDay, '2026-09-22');
  assert.strictEqual(st.games.queens.lastSolved, '2026-09-22');
  assert.strictEqual(st.games.queens.lastElapsedMs, 61000);
  assert.strictEqual(st.games.queens.best['8'], 55000);
});

test('migra un v1 con partida en curso', () => {
  const v1 = JSON.stringify({
    lastSolved: '', streak: 0, best: {},
    inProgress: { date: '2026-09-22', cells: [0, 1, 2, 0], elapsedMs: 9000 },
  });
  const st = S.parseState(v1);
  assert.deepStrictEqual(S.restoreInProgress(st, 'queens', '2026-09-22', 4, 2), [0, 1, 2, 0]);
});

// Review Focus 1: v1 corrupto no debe propagar basura a games.queens.
test('un v1 corrupto da estado v2 por defecto, no un games.queens roto', () => {
  const st = S.parseState('{"lastSolved": "2026-09-22", "streak":');
  assert.strictEqual(st.version, 2);
  assert.strictEqual(st.streak, 0);
  assert.deepStrictEqual(st.games, {});
});

test('un archivo v2 se lee tal cual, sin volver a migrar', () => {
  const v2 = JSON.stringify({
    version: 2, streak: 3, lastSolvedDay: '2026-09-20',
    games: { tango: { lastSolved: '2026-09-20', lastElapsedMs: 1000, best: {}, inProgress: null } },
  });
  const st = S.parseState(v2);
  assert.strictEqual(st.streak, 3);
  assert.strictEqual(st.games.tango.lastSolved, '2026-09-20');
  assert.strictEqual(st.games.queens, undefined, 'no inventa juegos');
});

test('gameState da valores por defecto para un juego sin historia', () => {
  const g = S.gameState(S.parseState(''), 'zip');
  assert.strictEqual(g.lastSolved, '');
  assert.strictEqual(g.lastElapsedMs, 0);
  assert.deepStrictEqual(g.best, {});
  assert.strictEqual(g.inProgress, null);
});

test('recordSolve encadena la racha global por dia', () => {
  let st = S.parseState('');
  st = S.recordSolve(st, 'queens', '2026-09-20', 90000, 8);
  assert.strictEqual(st.streak, 1);
  st = S.recordSolve(st, 'queens', '2026-09-21', 80000, 8);
  assert.strictEqual(st.streak, 2);
});

// Review Focus 4: la racha es global, una vez por dia.
test('resolver un segundo juego el mismo dia no mueve la racha', () => {
  let st = S.recordSolve(S.parseState(''), 'queens', '2026-09-22', 90000, 8);
  assert.strictEqual(st.streak, 1);
  st = S.recordSolve(st, 'tango', '2026-09-22', 30000, 6);
  assert.strictEqual(st.streak, 1, 'sigue siendo un dia');
  assert.strictEqual(st.games.tango.lastSolved, '2026-09-22', 'pero tango queda resuelto');
  assert.strictEqual(st.games.queens.lastSolved, '2026-09-22');
});

test('la racha se reinicia tras un hueco y con un dia futuro', () => {
  let st = S.recordSolve(S.parseState(''), 'queens', '2026-09-20', 1000, 8);
  st = S.recordSolve(st, 'queens', '2026-09-22', 1000, 8);
  assert.strictEqual(st.streak, 1, 'hueco');

  let futuro = S.recordSolve(S.parseState(''), 'queens', '2027-01-05', 1000, 8);
  futuro = S.recordSolve(futuro, 'queens', '2026-09-22', 1000, 8);
  assert.strictEqual(futuro.streak, 1);
  assert.ok(Number.isFinite(futuro.streak));
});

test('best es por juego y por tamano, y solo mejora', () => {
  let st = S.recordSolve(S.parseState(''), 'queens', '2026-09-20', 60000, 8);
  st = S.recordSolve(st, 'queens', '2026-09-21', 90000, 8);
  assert.strictEqual(st.games.queens.best['8'], 60000);
  st = S.recordSolve(st, 'queens', '2026-09-22', 40000, 9);
  assert.strictEqual(st.games.queens.best['9'], 40000);
  assert.strictEqual(st.games.queens.best['8'], 60000);
});

test('recordSolve no muta el estado recibido', () => {
  const antes = S.parseState('');
  const despues = S.recordSolve(antes, 'queens', '2026-09-22', 1000, 8);
  assert.strictEqual(antes.streak, 0);
  assert.strictEqual(despues.streak, 1);
});

test('solvedOn distingue por juego y por dia', () => {
  const st = S.recordSolve(S.parseState(''), 'queens', '2026-09-22', 1000, 8);
  assert.strictEqual(S.solvedOn(st, 'queens', '2026-09-22'), true);
  assert.strictEqual(S.solvedOn(st, 'queens', '2026-09-23'), false);
  assert.strictEqual(S.solvedOn(st, 'tango', '2026-09-22'), false);
});

test('pendingToday lista los juegos sin resolver hoy', () => {
  const st = S.recordSolve(S.parseState(''), 'queens', '2026-09-22', 1000, 8);
  const ids = ['queens', 'tango', 'sudoku', 'zip'];
  assert.deepStrictEqual(S.pendingToday(st, ids, '2026-09-22'), ['tango', 'sudoku', 'zip']);
  assert.deepStrictEqual(S.pendingToday(st, ids, '2026-09-23'), ids);
});

test('inProgress es por juego y no se mezcla', () => {
  let st = S.saveInProgress(S.parseState(''), 'queens', '2026-09-22', [2, 0, 0, 0], 5000);
  st = S.saveInProgress(st, 'tango', '2026-09-22', [1, 1, 0, 0], 7000);
  assert.deepStrictEqual(S.restoreInProgress(st, 'queens', '2026-09-22', 4, 2), [2, 0, 0, 0]);
  assert.deepStrictEqual(S.restoreInProgress(st, 'tango', '2026-09-22', 4, 2), [1, 1, 0, 0]);
});

test('restoreInProgress descarta otra fecha, otro largo y valores fuera del maximo', () => {
  const st = S.saveInProgress(S.parseState(''), 'queens', '2026-09-22', [0, 1, 2, 0], 5000);
  assert.deepStrictEqual(S.restoreInProgress(st, 'queens', '2026-09-22', 4, 2), [0, 1, 2, 0]);
  assert.strictEqual(S.restoreInProgress(st, 'queens', '2026-09-23', 4, 2), null, 'otra fecha');
  assert.strictEqual(S.restoreInProgress(st, 'queens', '2026-09-22', 9, 2), null, 'otro largo');

  const raro = S.saveInProgress(S.parseState(''), 'queens', '2026-09-22', [0, 1, 9, 0], 5000);
  assert.strictEqual(S.restoreInProgress(raro, 'queens', '2026-09-22', 4, 2), null, 'valor invalido');
});

// Review Focus 1: con el tope fijo de 8, una partida de Zip se perdia al reabrir.
test('el maximo es por juego: un camino largo de Zip sobrevive', () => {
  const camino = [0, 5, 12, 36, 21, 3];
  const st = S.saveInProgress(S.parseState(''), 'zip', '2026-09-22', camino, 1000);

  assert.deepStrictEqual(S.restoreInProgress(st, 'zip', '2026-09-22', 6, 36), camino,
    'con maximo 36 el camino vuelve entero');
  assert.strictEqual(S.restoreInProgress(st, 'zip', '2026-09-22', 6, 8), null,
    'con un maximo chico se descarta, como debe ser para otro juego');
});

test('recordSolve limpia la partida en curso de ese juego, no la de los demas', () => {
  let st = S.saveInProgress(S.parseState(''), 'tango', '2026-09-22', [1, 0, 0, 0], 1000);
  st = S.saveInProgress(st, 'queens', '2026-09-22', [2, 0, 0, 0], 1000);
  st = S.recordSolve(st, 'queens', '2026-09-22', 5000, 8);
  assert.strictEqual(st.games.queens.inProgress, null);
  assert.notStrictEqual(st.games.tango.inProgress, null, 'tango sigue a medias');
});

test('serializeState y parseState son un viaje de ida y vuelta', () => {
  const st = S.recordSolve(S.parseState(''), 'queens', '2026-09-22', 12345, 8);
  assert.deepStrictEqual(S.parseState(S.serializeState(st)), st);
});
