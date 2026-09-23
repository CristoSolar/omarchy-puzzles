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

const R = require('../lib/rng.js');

test('randomSolution da una grilla legal y completa', () => {
  for (let s = 0; s < 20; s++) {
    const cells = T.randomSolution(R.mulberry32(s), N);
    const b = tablero({ solution: cells.slice() });
    assert.strictEqual(cells.filter((v) => v === VACIO).length, 0, 'sin vacias');
    assert.deepStrictEqual(T.conflicts(b, cells), [], `semilla ${s} ilegal`);
  }
});

test('generate produce tableros de solucion unica', () => {
  for (let s = 0; s < 8; s++) {
    const board = T.generate(R.mulberry32(s), 6);
    assert.strictEqual(board.n, 6);
    assert.strictEqual(T.countSolutions(board, 3), 1, `semilla ${s} no es unica`);
    assert.strictEqual(T.isSolved(board, board.solution), true, 'la solucion debe resolver');
  }
});

// Review Focus 1: el complemento de una solucion tambien lo es.
test('siempre queda al menos una celda dada, o el tablero tendria dos soluciones', () => {
  for (let s = 0; s < 8; s++) {
    const board = T.generate(R.mulberry32(s), 6);
    const dadas = board.givens.filter((v) => v !== VACIO).length;
    assert.ok(dadas >= 1, `semilla ${s} sin dadas`);
  }
});

test('el complemento de una solucion cumple las reglas, por eso hacen falta dadas', () => {
  const board = T.generate(R.mulberry32(1), 6);
  const complemento = board.solution.map((v) => (v === SOL ? LUNA : SOL));
  const sinDadas = { n: 6, givens: new Array(36).fill(VACIO), constraints: board.constraints,
                     solution: board.solution };
  assert.deepStrictEqual(T.conflicts(sinDadas, complemento), [],
    'el complemento es legal, asi que sin dadas habria dos soluciones');
});

test('las dadas coinciden con la solucion', () => {
  const board = T.generate(R.mulberry32(5), 6);
  for (let i = 0; i < 36; i++) {
    if (board.givens[i] !== VACIO) {
      assert.strictEqual(board.givens[i], board.solution[i], `dada ${i} no coincide`);
    }
  }
});

test('las restricciones unen celdas vecinas y coinciden con la solucion', () => {
  const board = T.generate(R.mulberry32(2), 6);
  for (const c of board.constraints) {
    const dif = Math.abs(c.a - c.b);
    const vecinas = dif === 6 || (dif === 1 && T.rowOf(c.a, 6) === T.rowOf(c.b, 6));
    assert.ok(vecinas, `restriccion entre celdas no vecinas: ${c.a}-${c.b}`);
    assert.strictEqual(board.solution[c.a] === board.solution[c.b], c.eq, 'restriccion mentirosa');
  }
});

// Review Focus 5: emptyCells de Tango no esta vacio.
test('emptyCells devuelve las dadas, no una grilla vacia', () => {
  const board = T.generate(R.mulberry32(3), 6);
  const cells = T.emptyCells(board);
  assert.deepStrictEqual(cells, board.givens, 'el estado inicial son las dadas');
  assert.ok(cells.some((v) => v !== VACIO), 'y tiene al menos una');
  assert.strictEqual(cells.length, 36);
});

test('solvedCells devuelve la solucion completa', () => {
  const board = T.generate(R.mulberry32(4), 6);
  assert.deepStrictEqual(T.solvedCells(board), board.solution);
  assert.strictEqual(T.isSolved(board, T.solvedCells(board)), true);
});

test('la misma semilla da el mismo tablero', () => {
  const a = T.generate(R.mulberry32(77), 6);
  const b = T.generate(R.mulberry32(77), 6);
  assert.deepStrictEqual(a.givens, b.givens);
  assert.deepStrictEqual(a.solution, b.solution);
  assert.deepStrictEqual(a.constraints, b.constraints);
});

test('generate rechaza tamanos que no sean 6', () => {
  for (const malo of [4, 8, '6', undefined, null]) {
    assert.throws(() => T.generate(R.mulberry32(1), malo), /tamano/i);
  }
});
