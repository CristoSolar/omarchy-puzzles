const test = require('node:test');
const assert = require('node:assert');
const Z = require('../games/zip/logic.js');

const N = 6;

function grilla() { return new Array(N * N).fill(0); }

function conCamino(indices) {
  const cells = grilla();
  indices.forEach((idx, k) => { cells[idx] = k + 1; });
  return cells;
}

function tablero(checkpoints) {
  return { n: N, checkpoints: checkpoints || grilla(), solution: [] };
}

test('meta cumple el contrato', () => {
  assert.strictEqual(Z.meta.id, 'zip');
  assert.deepStrictEqual(Z.meta.sizes, [6]);
  assert.ok(Z.meta.name && Z.meta.icon && Z.meta.blurb);
});

test('maxCellValue es el largo de la grilla', () => {
  assert.strictEqual(Z.maxCellValue({ n: 6 }), 36);
});

test('areAdjacent solo acepta vecinas ortogonales', () => {
  assert.strictEqual(Z.areAdjacent(0, 1, N), true, 'derecha');
  assert.strictEqual(Z.areAdjacent(0, N, N), true, 'abajo');
  assert.strictEqual(Z.areAdjacent(0, N + 1, N), false, 'diagonal no');
  assert.strictEqual(Z.areAdjacent(5, 6, N), false, 'no cruza el borde de fila');
  assert.strictEqual(Z.areAdjacent(0, 2, N), false, 'salteada no');
});

test('pathOf lee el camino en orden', () => {
  const cells = conCamino([0, 1, 2, 8]);
  assert.deepStrictEqual(Z.pathOf(cells), [0, 1, 2, 8]);
  assert.deepStrictEqual(Z.pathOf(grilla()), []);
});

// Review Focus 2: el camino parcial es legal mientras se dibuja.
test('un camino parcial sin errores no marca nada', () => {
  const b = tablero();
  assert.deepStrictEqual(Z.conflicts(b, conCamino([0, 1, 2])), []);
});

test('un salto entre celdas no vecinas marca el tramo', () => {
  const b = tablero();
  const cells = conCamino([0, 1, 3]);
  const malos = Z.conflicts(b, cells);
  assert.ok(malos.includes(1) && malos.includes(3), 'marca las dos puntas del salto');
});

test('un numero salteado marca el checkpoint que se paso por alto', () => {
  const checkpoints = grilla();
  checkpoints[0] = 1;
  checkpoints[2] = 2;
  checkpoints[35] = 3;
  const b = tablero(checkpoints);

  const cells = conCamino([0, 1, 7, 13, 19, 25, 31, 32, 33, 34, 35]);
  assert.ok(Z.conflicts(b, cells).includes(35), 'el 3 llego antes que el 2');
});

test('tocar los numeros en orden no marca nada', () => {
  const checkpoints = grilla();
  checkpoints[0] = 1;
  checkpoints[2] = 2;
  const b = tablero(checkpoints);
  assert.deepStrictEqual(Z.conflicts(b, conCamino([0, 1, 2])), []);
});

test('isSolved exige recorrer todas las celdas', () => {
  const checkpoints = grilla();
  checkpoints[0] = 1;
  checkpoints[N * N - 1] = 2;
  const b = tablero(checkpoints);

  const orden = [];
  for (let fila = 0; fila < N; fila++) {
    for (let k = 0; k < N; k++) {
      const col = fila % 2 === 0 ? k : N - 1 - k;
      orden.push(fila * N + col);
    }
  }
  const completo = conCamino(orden);
  assert.deepStrictEqual(Z.conflicts(b, completo), [], 'la serpentina es legal');
  assert.strictEqual(Z.isSolved(b, completo), true);

  const parcial = conCamino(orden.slice(0, 30));
  assert.strictEqual(Z.isSolved(b, parcial), false, 'faltan celdas');
});

test('emptyCells deja el camino vacio', () => {
  const b = tablero();
  const cells = Z.emptyCells(b);
  assert.strictEqual(cells.length, 36);
  assert.ok(cells.every((v) => v === 0));
});
