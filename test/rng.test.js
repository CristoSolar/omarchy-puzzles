const test = require('node:test');
const assert = require('node:assert');
const R = require('../lib/rng.js');

test('mulberry32 es determinista y acotado', () => {
  const a = R.mulberry32(12345);
  const b = R.mulberry32(12345);
  for (let i = 0; i < 100; i++) {
    const v = a();
    assert.strictEqual(v, b());
    assert.ok(v >= 0 && v < 1, `valor fuera de rango: ${v}`);
  }
});

test('dateKey usa la fecha local, no UTC', () => {
  const d = new Date(2026, 8, 22, 23, 30, 0);
  assert.strictEqual(R.dateKey(d), '2026-09-22');
});

test('seedForDate es estable por día y distinta entre días', () => {
  assert.strictEqual(
    R.seedForDate(new Date(2026, 8, 22, 9, 0, 0)),
    R.seedForDate(new Date(2026, 8, 22, 22, 0, 0)));
  assert.notStrictEqual(
    R.seedForDate(new Date(2026, 8, 22)),
    R.seedForDate(new Date(2026, 8, 23)));
});

test('shuffled no muta el arreglo recibido y conserva los elementos', () => {
  const original = [0, 1, 2, 3, 4, 5];
  const copia = original.slice();
  const mezclado = R.shuffled(original, R.mulberry32(7));
  assert.deepStrictEqual(original, copia, 'no debe mutar');
  assert.deepStrictEqual(mezclado.slice().sort(), copia, 'mismos elementos');
});
