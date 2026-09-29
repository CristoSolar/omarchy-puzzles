const test = require('node:test');
const assert = require('node:assert');
const T = require('../games/tetris/logic.js');
const R = require('../lib/rng.js');

const I = 0, O = 1, T_ = 2;

// Tablero con cola fija para que cada test sepa que pieza viene.
function tablero(queue) {
  return { w: 10, h: 20, goal: 20, queue: queue };
}

function correr(b, run, dx) {
  for (let k = 0; k < Math.abs(dx); k++) run = T.move(b, run, Math.sign(dx));
  return run;
}

function xs(run) {
  return T.blocksOf(run.piece).map((b) => b[0]).sort((a, b) => a - b);
}

test('meta cumple el contrato', () => {
  assert.strictEqual(T.meta.id, 'tetris');
  assert.deepStrictEqual(T.meta.sizes, [10]);
  assert.strictEqual(T.meta.defaultSize, 10);
  assert.ok(T.meta.name && T.meta.icon && T.meta.blurb);
});

test('cada bolsa de 7 trae las siete piezas', () => {
  const board = T.generate(R.mulberry32(3), 10);
  assert.ok(board.queue.length >= 600);
  for (let b = 0; b + 7 <= board.queue.length; b += 7) {
    assert.deepStrictEqual(board.queue.slice(b, b + 7).sort(), [0, 1, 2, 3, 4, 5, 6], `bolsa ${b / 7}`);
  }
});

test('la misma semilla da la misma cola', () => {
  assert.deepStrictEqual(T.generate(R.mulberry32(8), 10), T.generate(R.mulberry32(8), 10));
});

test('generate rechaza tamanos que no sean 10', () => {
  for (const malo of [9, '10', undefined]) {
    assert.throws(() => T.generate(R.mulberry32(1), malo), /tamano/i);
  }
});

test('la pieza aparece centrada arriba', () => {
  const run = T.newRun(tablero([I, O]));
  assert.deepStrictEqual(xs(run), [3, 4, 5, 6]);
  assert.strictEqual(T.nextKind(tablero([I, O]), run), O);
});

test('las paredes frenan el movimiento', () => {
  const b = tablero([O]);
  let run = T.newRun(b);
  for (let k = 0; k < 20; k++) run = T.move(b, run, -1);
  assert.deepStrictEqual(xs(run), [0, 0, 1, 1]);
  for (let k = 0; k < 20; k++) run = T.move(b, run, 1);
  assert.deepStrictEqual(xs(run), [8, 8, 9, 9]);
});

test('move no muta el run anterior', () => {
  const b = tablero([O]);
  const run = T.newRun(b);
  const antes = JSON.stringify(run);
  T.move(b, run, 1);
  T.hardDrop(b, run);
  assert.strictEqual(JSON.stringify(run), antes);
});

test('hardDrop fija la pieza en el piso y saca la siguiente', () => {
  const b = tablero([O, T_]);
  const run = T.hardDrop(b, T.newRun(b));
  assert.strictEqual(run.field[19 * 10 + 4], O + 1);
  assert.strictEqual(run.field[18 * 10 + 5], O + 1);
  assert.strictEqual(run.piece.kind, T_);
  assert.strictEqual(run.index, 1);
});

test('softDrop baja una fila y fija al tocar fondo', () => {
  const b = tablero([O, O]);
  let run = T.softDrop(b, T.newRun(b));
  assert.strictEqual(run.piece.y, 1);
  for (let k = 0; k < 30; k++) run = T.softDrop(b, run);
  assert.ok(run.field.some((v) => v !== 0), 'algo quedo fijo');
});

// Review Focus 4: limpiar varias filas a la vez debe bajar lo de arriba sin
// dejar huecos ni duplicar filas.
test('limpiar una y varias filas', () => {
  const b = tablero([O, O, O, O, O, I]);
  let run = T.newRun(b);
  // La O aparece en columnas 4-5; cinco O en 0-1, 2-3, 4-5, 6-7 y 8-9 llenan
  // las dos filas de abajo.
  for (const dx of [-4, -2, 0, 2, 4]) run = T.hardDrop(b, correr(b, run, dx));
  assert.strictEqual(run.lines, 2);
  assert.ok(run.field.every((v) => v === 0), 'el campo queda vacio');
});

test('rotar pegado a la pared corre la pieza', () => {
  const b = tablero([I]);
  let run = T.rotate(b, T.newRun(b));           // I vertical
  for (let k = 0; k < 10; k++) run = T.move(b, run, 1);
  assert.deepStrictEqual(xs(run), [9, 9, 9, 9]);
  run = T.rotate(b, run);                        // horizontal: no entra sin correrse
  assert.deepStrictEqual(xs(run), [6, 7, 8, 9]);
});

test('la corrida termina cuando la pieza nueva no entra', () => {
  const b = tablero([O]);
  let run = T.newRun(b);
  for (let k = 0; k < 15 && !run.over; k++) run = T.hardDrop(b, run);
  assert.strictEqual(run.over, true);
  const quieto = T.move(b, run, 1);
  assert.strictEqual(quieto, run, 'terminada no se mueve');
});

test('la cola da la vuelta al acabarse', () => {
  const b = tablero([O, T_]);
  let run = T.hardDrop(b, T.hardDrop(b, T.newRun(b)));
  assert.strictEqual(run.index, 0);
  assert.strictEqual(run.piece.kind, O);
});

test('el contrato de grilla es vacio', () => {
  const board = T.generate(R.mulberry32(1), 10);
  assert.deepStrictEqual(T.emptyCells(board), []);
  assert.deepStrictEqual(T.solvedCells(board), []);
  assert.strictEqual(T.isSolved(board, []), false);
  assert.strictEqual(T.maxCellValue(board), 0);
});
