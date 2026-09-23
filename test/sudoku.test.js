const test = require('node:test');
const assert = require('node:assert');
const S = require('../games/sudoku/logic.js');

const N = 6;

function grilla() { return new Array(N * N).fill(0); }
function tablero(extra) {
  return Object.assign({ n: N, givens: grilla(), solution: grilla() }, extra || {});
}

test('meta cumple el contrato', () => {
  assert.strictEqual(S.meta.id, 'sudoku');
  assert.deepStrictEqual(S.meta.sizes, [6]);
  assert.strictEqual(S.meta.defaultSize, 6);
  assert.ok(S.meta.name && S.meta.icon && S.meta.blurb);
});

// Review Focus 1: las cajas son de 2 filas por 3 columnas, no al reves.
test('las cajas son de 2 filas por 3 columnas', () => {
  assert.strictEqual(S.BOX_W, 3);
  assert.strictEqual(S.BOX_H, 2);

  assert.strictEqual(S.boxOf(0, N), S.boxOf(2, N), 'misma caja a lo ancho');
  assert.strictEqual(S.boxOf(0, N), S.boxOf(6 + 2, N), 'la caja baja una fila');
  assert.notStrictEqual(S.boxOf(0, N), S.boxOf(3, N), 'la cuarta columna ya es otra caja');
  assert.notStrictEqual(S.boxOf(0, N), S.boxOf(12, N), 'dos filas abajo ya es otra caja');
});

test('un digito repetido en la fila marca ambas celdas', () => {
  const cells = grilla();
  cells[0] = 4; cells[4] = 4;
  assert.deepStrictEqual(S.conflicts(tablero(), cells), [0, 4]);
});

test('un digito repetido en la columna marca ambas celdas', () => {
  const cells = grilla();
  cells[1] = 2; cells[1 + N * 3] = 2;
  assert.deepStrictEqual(S.conflicts(tablero(), cells), [1, 19]);
});

test('un digito repetido en la caja marca ambas celdas', () => {
  const cells = grilla();
  cells[0] = 5; cells[N + 1] = 5;
  assert.deepStrictEqual(S.conflicts(tablero(), cells), [0, 7]);
});

// Review Focus 2: las vacias no son repeticion.
test('las celdas vacias no cuentan como repetidas', () => {
  const cells = grilla();
  cells[0] = 3;
  assert.deepStrictEqual(S.conflicts(tablero(), cells), []);
});

test('una grilla parcial sin repeticiones no marca nada', () => {
  const cells = grilla();
  cells[0] = 1; cells[1] = 2; cells[2] = 3;
  cells[N] = 4; cells[N + 1] = 5; cells[N + 2] = 6;
  assert.deepStrictEqual(S.conflicts(tablero(), cells), []);
});

test('isSolved exige grilla llena y sin conflictos', () => {
  const filas = [
    [1, 2, 3, 4, 5, 6],
    [4, 5, 6, 1, 2, 3],
    [2, 3, 4, 5, 6, 1],
    [5, 6, 1, 2, 3, 4],
    [3, 4, 5, 6, 1, 2],
    [6, 1, 2, 3, 4, 5],
  ];
  const cells = [].concat.apply([], filas);
  const b = tablero({ solution: cells.slice() });

  assert.deepStrictEqual(S.conflicts(b, cells), [], 'el patron debe ser legal');
  assert.strictEqual(S.isSolved(b, cells), true);

  const incompleta = cells.slice();
  incompleta[0] = 0;
  assert.strictEqual(S.isSolved(b, incompleta), false);
});
