const test = require('node:test');
const assert = require('node:assert');
const T = require('../games/tango/logic.js');

const N = 6;
const VACIO = 0, SOL = 1, LUNA = 2;

function grilla(valor) {
  return new Array(N * N).fill(valor === undefined ? VACIO : valor);
}

function tablero(extra) {
  return Object.assign({ n: N, givens: grilla(), constraints: [], solution: grilla(SOL) }, extra || {});
}

test('meta cumple el contrato', () => {
  assert.strictEqual(T.meta.id, 'tango');
  assert.deepStrictEqual(T.meta.sizes, [6]);
  assert.strictEqual(T.meta.defaultSize, 6);
  assert.ok(T.meta.name && T.meta.icon && T.meta.blurb);
});

test('dos iguales seguidos no son conflicto, tres si', () => {
  const b = tablero();
  const cells = grilla();
  cells[0] = SOL; cells[1] = SOL;
  assert.deepStrictEqual(T.conflicts(b, cells), [], 'dos seguidos son legales');

  cells[2] = SOL;
  assert.deepStrictEqual(T.conflicts(b, cells), [0, 1, 2], 'tres seguidos no');
});

test('los tres seguidos tambien cuentan en vertical', () => {
  const b = tablero();
  const cells = grilla();
  cells[0] = LUNA; cells[6] = LUNA; cells[12] = LUNA;
  assert.deepStrictEqual(T.conflicts(b, cells), [0, 6, 12]);
});

test('tres del mismo simbolo en una fila no son conflicto, cuatro si', () => {
  const b = tablero();
  const cells = grilla();
  cells[0] = SOL; cells[2] = SOL; cells[4] = SOL;
  assert.deepStrictEqual(T.conflicts(b, cells), []);

  cells[5] = SOL;
  assert.deepStrictEqual(T.conflicts(b, cells), [0, 2, 4, 5]);
});

test('la cuenta tambien se controla por columna', () => {
  const b = tablero();
  const cells = grilla();
  for (const fila of [0, 1, 2, 3]) cells[fila * N] = LUNA;
  const malos = T.conflicts(b, cells);
  assert.ok(malos.includes(0) && malos.includes(6) && malos.includes(12) && malos.includes(18));
});

test('una restriccion con un extremo vacio no marca nada', () => {
  const b = tablero({ constraints: [{ a: 0, b: 1, eq: true }] });
  const cells = grilla();
  cells[0] = SOL;
  assert.deepStrictEqual(T.conflicts(b, cells), [], 'falta el otro extremo');
});

test('una restriccion de igualdad incumplida marca ambas celdas', () => {
  const b = tablero({ constraints: [{ a: 0, b: 1, eq: true }] });
  const cells = grilla();
  cells[0] = SOL; cells[1] = LUNA;
  assert.deepStrictEqual(T.conflicts(b, cells), [0, 1]);
});

test('una restriccion de diferencia incumplida marca ambas celdas', () => {
  const b = tablero({ constraints: [{ a: 0, b: 6, eq: false }] });
  const cells = grilla();
  cells[0] = SOL; cells[6] = SOL;
  assert.deepStrictEqual(T.conflicts(b, cells), [0, 6]);
});

test('una restriccion cumplida no marca nada', () => {
  const b = tablero({
    constraints: [{ a: 0, b: 1, eq: true }, { a: 2, b: 3, eq: false }],
  });
  const cells = grilla();
  // Ojo con armar tres seguidos sin querer: eso seria conflicto por otra regla.
  cells[0] = SOL; cells[1] = SOL; cells[2] = LUNA; cells[3] = SOL;
  assert.deepStrictEqual(T.conflicts(b, cells), []);
});

test('isSolved exige la grilla llena y sin conflictos', () => {
  const filas = [
    [1, 1, 2, 2, 1, 2],
    [2, 2, 1, 1, 2, 1],
    [1, 2, 1, 2, 1, 2],
    [2, 1, 2, 1, 2, 1],
    [1, 2, 2, 1, 1, 2],
    [2, 1, 1, 2, 2, 1],
  ];
  const cells = [].concat.apply([], filas);
  const b = tablero({ solution: cells.slice() });

  assert.deepStrictEqual(T.conflicts(b, cells), [], 'el patron debe ser legal');
  assert.strictEqual(T.isSolved(b, cells), true);

  const incompleta = cells.slice();
  incompleta[35] = VACIO;
  assert.strictEqual(T.isSolved(b, incompleta), false, 'falta una celda');
});
