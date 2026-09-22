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
