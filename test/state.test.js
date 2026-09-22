const test = require('node:test');
const assert = require('node:assert');
const S = require('../lib/state.js');

// Review Focus 2: primera ejecucion y archivo corrupto dan lo mismo.
test('parseState sobrevive a basura sin lanzar', () => {
  for (const entrada of ['', '   ', '{', 'null', '[]', '42', '"hola"', undefined]) {
    const st = S.parseState(entrada);
    assert.strictEqual(st.streak, 0, `entrada ${JSON.stringify(entrada)}`);
    assert.strictEqual(st.lastSolved, '');
    assert.deepStrictEqual(st.best, {});
    assert.strictEqual(st.inProgress, null);
  }
});

test('parseState completa campos faltantes', () => {
  const st = S.parseState('{"streak": 7}');
  assert.strictEqual(st.streak, 7);
  assert.strictEqual(st.lastSolved, '');
  assert.deepStrictEqual(st.best, {});
});

test('previousKey cruza meses y anios', () => {
  assert.strictEqual(S.previousKey('2026-09-22'), '2026-09-21');
  assert.strictEqual(S.previousKey('2026-09-01'), '2026-08-31');
  assert.strictEqual(S.previousKey('2026-01-01'), '2025-12-31');
  assert.strictEqual(S.previousKey('2024-03-01'), '2024-02-29');
});

test('recordSolve encadena dias consecutivos', () => {
  let st = S.parseState('');
  st = S.recordSolve(st, '2026-09-20', 90000, 8);
  assert.strictEqual(st.streak, 1);
  st = S.recordSolve(st, '2026-09-21', 80000, 8);
  assert.strictEqual(st.streak, 2);
  st = S.recordSolve(st, '2026-09-22', 70000, 8);
  assert.strictEqual(st.streak, 3);
});

test('recordSolve reinicia la racha tras un hueco', () => {
  let st = S.recordSolve(S.parseState(''), '2026-09-20', 90000, 8);
  st = S.recordSolve(st, '2026-09-22', 70000, 8);
  assert.strictEqual(st.streak, 1);
});

test('resolver dos veces el mismo dia no mueve la racha', () => {
  let st = S.recordSolve(S.parseState(''), '2026-09-22', 90000, 8);
  st = S.recordSolve(st, '2026-09-22', 50000, 8);
  assert.strictEqual(st.streak, 1);
  assert.strictEqual(st.best['8'], 50000, 'el mejor tiempo si debe mejorar');
});

test('best guarda el mejor tiempo por tamano', () => {
  let st = S.recordSolve(S.parseState(''), '2026-09-20', 60000, 8);
  st = S.recordSolve(st, '2026-09-21', 90000, 8);
  assert.strictEqual(st.best['8'], 60000, 'un tiempo peor no debe pisar el mejor');
  st = S.recordSolve(st, '2026-09-22', 40000, 9);
  assert.strictEqual(st.best['9'], 40000);
  assert.strictEqual(st.best['8'], 60000);
});

test('recordSolve no muta el estado recibido', () => {
  const antes = S.parseState('');
  const despues = S.recordSolve(antes, '2026-09-22', 1000, 8);
  assert.strictEqual(antes.streak, 0);
  assert.strictEqual(despues.streak, 1);
});

// Review Focus 4: reloj adelantado deja lastSolved en el futuro.
test('un lastSolved futuro reinicia la racha en vez de romperse', () => {
  let st = S.recordSolve(S.parseState(''), '2027-01-05', 1000, 8);
  st = S.recordSolve(st, '2026-09-22', 1000, 8);
  assert.strictEqual(st.streak, 1);
  assert.ok(Number.isFinite(st.streak));
});

// Review Focus 3: partida a medias de otra fecha o de otro tamano.
test('restoreInProgress solo devuelve una partida de hoy y del tamano actual', () => {
  const cells = new Array(64).fill(0);
  let st = S.saveInProgress(S.parseState(''), '2026-09-22', cells, 5000);

  assert.deepStrictEqual(S.restoreInProgress(st, '2026-09-22', 8), cells);
  assert.strictEqual(S.restoreInProgress(st, '2026-09-23', 8), null, 'otra fecha');
  assert.strictEqual(S.restoreInProgress(st, '2026-09-22', 9), null, 'otro tamano');
  assert.strictEqual(S.restoreInProgress(S.parseState(''), '2026-09-22', 8), null);
});

test('restoreInProgress descarta celdas con valores fuera de rango', () => {
  const cells = new Array(64).fill(0);
  cells[3] = 9;
  const st = S.saveInProgress(S.parseState(''), '2026-09-22', cells, 5000);
  assert.strictEqual(S.restoreInProgress(st, '2026-09-22', 8), null);
});

test('serializeState y parseState son un viaje de ida y vuelta', () => {
  const st = S.recordSolve(S.parseState(''), '2026-09-22', 12345, 8);
  assert.deepStrictEqual(S.parseState(S.serializeState(st)), st);
});

// Hallazgos 2/4/5 de la revision: barra y panel tienen que poder preguntar
// "¿ya esta resuelto hoy?" sin recalcularlo cada uno por su cuenta.
test('solvedOn reconoce el dia ya resuelto', () => {
  const st = S.recordSolve(S.parseState(''), '2026-09-22', 61000, 8);
  assert.strictEqual(S.solvedOn(st, '2026-09-22'), true);
  assert.strictEqual(S.solvedOn(st, '2026-09-23'), false);
  assert.strictEqual(S.solvedOn(S.parseState(''), '2026-09-22'), false);
});

test('recordSolve guarda el tiempo del ultimo resuelto, no solo el mejor', () => {
  let st = S.recordSolve(S.parseState(''), '2026-09-21', 40000, 8);
  st = S.recordSolve(st, '2026-09-22', 95000, 8);
  assert.strictEqual(st.best['8'], 40000, 'el mejor sigue siendo el mejor');
  assert.strictEqual(st.lastElapsedMs, 95000, 'el panel muestra el de hoy, no el record');
});

test('parseState recupera y valida lastElapsedMs', () => {
  assert.strictEqual(S.parseState('{"lastElapsedMs": 1234}').lastElapsedMs, 1234);
  assert.strictEqual(S.parseState('{"lastElapsedMs": -5}').lastElapsedMs, 0, 'negativo se descarta');
  assert.strictEqual(S.parseState('').lastElapsedMs, 0);
});
