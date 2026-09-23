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

const R = require('../lib/rng.js');

test('randomSolution da una grilla completa y legal', () => {
  for (let s = 0; s < 20; s++) {
    const cells = S.randomSolution(R.mulberry32(s), N);
    const b = tablero({ solution: cells.slice() });
    assert.ok(cells.every((v) => v >= 1 && v <= 6), 'todos los digitos puestos');
    assert.deepStrictEqual(S.conflicts(b, cells), [], `semilla ${s} ilegal`);
  }
});

// Review Focus 5: sin unicidad el jugador puede completar una grilla legal
// distinta y el juego no se la aceptaria.
test('generate produce tableros de solucion unica', () => {
  for (let s = 0; s < 8; s++) {
    const board = S.generate(R.mulberry32(s), 6);
    assert.strictEqual(S.countSolutions(board, 3), 1, `semilla ${s} no es unica`);
    assert.strictEqual(S.isSolved(board, board.solution), true);
  }
});

test('las dadas coinciden con la solucion y dejan celdas por llenar', () => {
  const board = S.generate(R.mulberry32(3), 6);
  let dadas = 0;
  for (let i = 0; i < 36; i++) {
    if (board.givens[i] !== 0) {
      dadas++;
      assert.strictEqual(board.givens[i], board.solution[i], `dada ${i} no coincide`);
    }
  }
  assert.ok(dadas > 0 && dadas < 36, `dadas fuera de rango: ${dadas}`);
});

test('emptyCells devuelve las dadas y solvedCells la solucion', () => {
  const board = S.generate(R.mulberry32(6), 6);
  assert.deepStrictEqual(S.emptyCells(board), board.givens);
  assert.deepStrictEqual(S.solvedCells(board), board.solution);
  assert.strictEqual(S.isSolved(board, S.solvedCells(board)), true);
});

test('la misma semilla da el mismo tablero', () => {
  const a = S.generate(R.mulberry32(55), 6);
  const b = S.generate(R.mulberry32(55), 6);
  assert.deepStrictEqual(a.givens, b.givens);
  assert.deepStrictEqual(a.solution, b.solution);
});

test('generate rechaza tamanos que no sean 6', () => {
  for (const malo of [4, 9, '6', undefined, null]) {
    assert.throws(() => S.generate(R.mulberry32(1), malo), /tamano/i);
  }
});
