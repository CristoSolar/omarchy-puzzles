const test = require('node:test');
const assert = require('node:assert');
const Q = require('../lib/queens.js');

test('mulberry32 es determinista y acotado', () => {
  const a = Q.mulberry32(12345);
  const b = Q.mulberry32(12345);
  for (let i = 0; i < 100; i++) {
    const v = a();
    assert.strictEqual(v, b());
    assert.ok(v >= 0 && v < 1, `valor fuera de rango: ${v}`);
  }
});

test('dateKey usa la fecha local, no UTC', () => {
  // 23:30 local del 22 de septiembre. En una zona al oeste de UTC esto ya es
  // el 23 en UTC; la clave tiene que seguir siendo el 22.
  const d = new Date(2026, 8, 22, 23, 30, 0);
  assert.strictEqual(Q.dateKey(d), '2026-09-22');
});

test('seedForDate es estable por día y distinta entre días', () => {
  const manana = new Date(2026, 8, 22, 9, 0, 0);
  const noche = new Date(2026, 8, 22, 22, 0, 0);
  const otroDia = new Date(2026, 8, 23, 9, 0, 0);
  assert.strictEqual(Q.seedForDate(manana), Q.seedForDate(noche));
  assert.notStrictEqual(Q.seedForDate(manana), Q.seedForDate(otroDia));
});

test('randomPlacement respeta columnas únicas y no adyacencia', () => {
  for (let s = 0; s < 50; s++) {
    const n = 8;
    const cols = Q.randomPlacement(n, Q.mulberry32(s));
    assert.strictEqual(cols.length, n);
    assert.strictEqual(new Set(cols).size, n, 'columnas repetidas');
    for (let row = 1; row < n; row++) {
      assert.ok(Math.abs(cols[row] - cols[row - 1]) > 1,
        `filas ${row - 1} y ${row} adyacentes en la semilla ${s}`);
    }
  }
});

// Tablero 4x4 con regiones en franjas horizontales. Franja por fila implica
// que la restriccion de region coincide con la de fila, asi que las soluciones
// son las colocaciones sin columnas repetidas ni reinas adyacentes.
const FRANJAS_4 = [
  0, 0, 0, 0,
  1, 1, 1, 1,
  2, 2, 2, 2,
  3, 3, 3, 3,
];

test('countSolutions corta en el limite', () => {
  assert.strictEqual(Q.countSolutions(4, FRANJAS_4, 2), 2);
  assert.strictEqual(Q.countSolutions(4, FRANJAS_4, 1), 1);
});

test('conflicts marca columna, region y adyacencia', () => {
  const n = 4;
  const cells = new Array(n * n).fill(0);
  cells[0 * n + 0] = 2;   // fila 0, col 0
  cells[1 * n + 1] = 2;   // fila 1, col 1 — adyacente en diagonal
  const malos = Q.conflicts(n, FRANJAS_4, cells);
  assert.deepStrictEqual(malos, [0, 5]);
});

test('conflicts no marca reinas legales', () => {
  const n = 4;
  const cells = new Array(n * n).fill(0);
  cells[0 * n + 0] = 2;
  cells[1 * n + 2] = 2;   // dos columnas de distancia, otra region
  assert.deepStrictEqual(Q.conflicts(n, FRANJAS_4, cells), []);
});

test('isSolved exige N reinas sin conflictos', () => {
  const n = 4;
  const cells = new Array(n * n).fill(0);
  cells[0 * n + 1] = 2;
  cells[1 * n + 3] = 2;
  cells[2 * n + 0] = 2;
  cells[3 * n + 2] = 2;
  assert.deepStrictEqual(Q.conflicts(n, FRANJAS_4, cells), []);
  assert.strictEqual(Q.isSolved(n, FRANJAS_4, cells), true);

  cells[3 * n + 2] = 0;   // falta una reina
  assert.strictEqual(Q.isSolved(n, FRANJAS_4, cells), false);
});

test('las marcas no cuentan como reinas', () => {
  const n = 4;
  const cells = new Array(n * n).fill(1);   // todo marcado con X
  assert.deepStrictEqual(Q.conflicts(n, FRANJAS_4, cells), []);
  assert.strictEqual(Q.isSolved(n, FRANJAS_4, cells), false);
});
