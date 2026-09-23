const test = require('node:test');
const assert = require('node:assert');
const Q = require('../games/queens/logic.js');
const R = require('../lib/rng.js');

test('randomPlacement respeta columnas únicas y no adyacencia', () => {
  for (let s = 0; s < 50; s++) {
    const n = 8;
    const cols = Q.randomPlacement(n, R.mulberry32(s));
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

const FRANJAS_4_BOARD = { n: 4, regions: FRANJAS_4, solution: [1, 3, 0, 2] };

test('countSolutions corta en el limite', () => {
  assert.strictEqual(Q.countSolutions(4, FRANJAS_4, 2), 2);
  assert.strictEqual(Q.countSolutions(4, FRANJAS_4, 1), 1);
});

test('conflicts marca columna, region y adyacencia', () => {
  const n = 4;
  const cells = new Array(n * n).fill(0);
  cells[0 * n + 0] = 2;   // fila 0, col 0
  cells[1 * n + 1] = 2;   // fila 1, col 1 — adyacente en diagonal
  const malos = Q.conflicts(FRANJAS_4_BOARD, cells);
  assert.deepStrictEqual(malos, [0, 5]);
});

test('conflicts no marca reinas legales', () => {
  const n = 4;
  const cells = new Array(n * n).fill(0);
  cells[0 * n + 0] = 2;
  cells[1 * n + 2] = 2;   // dos columnas de distancia, otra region
  assert.deepStrictEqual(Q.conflicts(FRANJAS_4_BOARD, cells), []);
});

test('isSolved exige N reinas sin conflictos', () => {
  const n = 4;
  const cells = new Array(n * n).fill(0);
  cells[0 * n + 1] = 2;
  cells[1 * n + 3] = 2;
  cells[2 * n + 0] = 2;
  cells[3 * n + 2] = 2;
  assert.deepStrictEqual(Q.conflicts(FRANJAS_4_BOARD, cells), []);
  assert.strictEqual(Q.isSolved(FRANJAS_4_BOARD, cells), true);

  cells[3 * n + 2] = 0;   // falta una reina
  assert.strictEqual(Q.isSolved(FRANJAS_4_BOARD, cells), false);
});

test('las marcas no cuentan como reinas', () => {
  const n = 4;
  const cells = new Array(n * n).fill(1);   // todo marcado con X
  assert.deepStrictEqual(Q.conflicts(FRANJAS_4_BOARD, cells), []);
  assert.strictEqual(Q.isSolved(FRANJAS_4_BOARD, cells), false);
});

test('findSolutions devuelve las colocaciones, no solo la cuenta', () => {
  const sols = Q.findSolutions(4, FRANJAS_4, 5);
  assert.strictEqual(sols.length, 2);
  for (const sol of sols) {
    assert.strictEqual(sol.length, 4);
    assert.strictEqual(new Set(sol).size, 4);
    for (let row = 1; row < 4; row++) {
      assert.ok(Math.abs(sol[row] - sol[row - 1]) > 1);
    }
  }
  assert.notDeepStrictEqual(sols[0], sols[1]);
});

test('findSolutions respeta el limite', () => {
  assert.strictEqual(Q.findSolutions(4, FRANJAS_4, 1).length, 1);
});

test('regionContiguous distingue una region partida', () => {
  // Region 0 en las dos puntas de la fila superior, sin camino entre ellas.
  const partida = [
    0, 1, 1, 0,
    1, 1, 1, 1,
    2, 2, 3, 3,
    2, 2, 3, 3,
  ];
  assert.strictEqual(Q.regionContiguous(4, partida, 0), false);
  assert.strictEqual(Q.regionContiguous(4, partida, 1), true);
  assert.strictEqual(Q.regionContiguous(4, FRANJAS_4, 2), true);
});

function invariantes(board) {
  const { n, regions, solution } = board;
  assert.strictEqual(regions.length, n * n);
  assert.strictEqual(solution.length, n);

  const vistos = new Set(regions);
  assert.strictEqual(vistos.size, n, 'debe haber exactamente N regiones');

  const cols = new Set();
  const regs = new Set();
  for (let row = 0; row < n; row++) {
    const col = solution[row];
    assert.ok(col >= 0 && col < n);
    cols.add(col);
    regs.add(regions[row * n + col]);
    if (row > 0) {
      assert.ok(Math.abs(col - solution[row - 1]) > 1, 'reinas adyacentes');
    }
  }
  assert.strictEqual(cols.size, n, 'columnas repetidas');
  assert.strictEqual(regs.size, n, 'regiones repetidas');
}

test('generate produce tableros validos y de solucion unica', () => {
  for (let seed = 0; seed < 15; seed++) {
    const board = Q.generate(R.mulberry32(seed), 8);
    invariantes(board);
    assert.strictEqual(Q.countSolutions(8, board.regions, 3), 1,
      `la semilla ${seed} no dio solucion unica`);
  }
});

test('generate funciona en los tres tamanos permitidos', () => {
  for (const n of Q.meta.sizes) {
    const board = Q.generate(R.mulberry32(7), n);
    assert.strictEqual(board.n, n);
    invariantes(board);
    assert.strictEqual(Q.countSolutions(n, board.regions, 3), 1);
  }
});

test('la misma semilla da el mismo tablero', () => {
  const a = Q.generate(R.mulberry32(4242), 8);
  const b = Q.generate(R.mulberry32(4242), 8);
  assert.deepStrictEqual(a.regions, b.regions);
  assert.deepStrictEqual(a.solution, b.solution);
});

test('fechas distintas dan tableros distintos', () => {
  const hoy = Q.generate(R.mulberry32(R.seedForDate(new Date(2026, 8, 22))), 8);
  const manana = Q.generate(R.mulberry32(R.seedForDate(new Date(2026, 8, 23))), 8);
  assert.notDeepStrictEqual(hoy.regions, manana.regions);
});

// Review Focus 1: un N invalido tiene que fallar rapido, no colgar el shell.
test('generate rechaza tamanos invalidos en vez de colgarse', () => {
  for (const malo of [0, 3, 4, 12, '8', undefined, null, 8.5]) {
    assert.throws(() => Q.generate(R.mulberry32(1), malo), /tamano/i,
      `N=${String(malo)} deberia lanzar`);
  }
});

test('growRegions deja exactamente una reina por region', () => {
  const n = 8;
  const rand = R.mulberry32(99);
  const queens = Q.randomPlacement(n, rand);
  const regions = Q.growRegions(n, queens, rand);

  assert.strictEqual(regions.length, n * n);
  assert.ok(regions.every((r) => r >= 0 && r < n), 'quedaron celdas sin asignar');

  const porRegion = new Map();
  queens.forEach((col, row) => {
    const reg = regions[row * n + col];
    porRegion.set(reg, (porRegion.get(reg) || 0) + 1);
  });
  assert.strictEqual(porRegion.size, n);
  for (const cuenta of porRegion.values()) assert.strictEqual(cuenta, 1);
});

test('las regiones generadas quedan contiguas', () => {
  for (let seed = 0; seed < 12; seed++) {
    const board = Q.generate(R.mulberry32(seed), 8);
    for (let r = 0; r < 8; r++) {
      assert.ok(Q.regionContiguous(8, board.regions, r),
        `region ${r} partida en la semilla ${seed}`);
    }
  }
});

test('blockedCells marca fila, columna, region y vecinas de cada reina', () => {
  const n = 4;
  const cells = new Array(n * n).fill(0);
  cells[1 * n + 1] = 2;   // reina en (1,1), region 1 por franjas
  const bloqueadas = new Set(Q.blockedCells(FRANJAS_4_BOARD, cells));

  assert.ok(bloqueadas.has(1 * n + 3), 'resto de su fila');
  assert.ok(bloqueadas.has(3 * n + 1), 'resto de su columna');
  assert.ok(bloqueadas.has(0 * n + 0), 'vecina en diagonal');
  assert.ok(bloqueadas.has(2 * n + 2), 'vecina en la otra diagonal');
  assert.ok(!bloqueadas.has(1 * n + 1), 'la celda de la reina no se marca a si misma');
  assert.ok(!bloqueadas.has(3 * n + 3), 'una celda libre no se marca');
});

test('blockedCells marca toda la region, no solo las vecinas', () => {
  const n = 4;
  // Region 0 en forma de L en la esquina superior izquierda.
  const regiones = [
    0, 0, 1, 1,
    0, 2, 2, 1,
    3, 3, 2, 1,
    3, 3, 2, 1,
  ];
  const cells = new Array(n * n).fill(0);
  cells[0] = 2;   // reina en (0,0), region 0
  const bloqueadas = new Set(Q.blockedCells({ n: 4, regions: regiones, solution: [0,0,0,0] }, cells));
  assert.ok(bloqueadas.has(1), 'misma region, adyacente');
  assert.ok(bloqueadas.has(4), 'misma region, la pata de la L');
});

test('blockedCells no marca celdas ya ocupadas por otra reina', () => {
  const n = 4;
  const cells = new Array(n * n).fill(0);
  cells[0 * n + 0] = 2;
  cells[1 * n + 1] = 2;   // en conflicto con la anterior, pero es una reina
  const bloqueadas = Q.blockedCells(FRANJAS_4_BOARD, cells);
  assert.ok(!bloqueadas.includes(0), 'una reina no se marca con X');
  assert.ok(!bloqueadas.includes(5), 'la otra tampoco');
});

test('sin reinas no hay nada bloqueado', () => {
  const n = 4;
  assert.deepStrictEqual(Q.blockedCells(FRANJAS_4_BOARD, new Array(n * n).fill(0)), []);
});

test('meta declara lo que el menu necesita mostrar', () => {
  assert.strictEqual(Q.meta.id, 'queens');
  assert.ok(Q.meta.name.length > 0);
  assert.ok(Q.meta.icon.length > 0);
  assert.ok(Q.meta.blurb.length > 0);
  assert.deepStrictEqual(Q.meta.sizes, [7, 8, 9]);
  assert.ok(Q.meta.sizes.includes(Q.meta.defaultSize));
});

test('emptyCells da una grilla vacia del tamano del tablero', () => {
  const board = Q.generate(R.mulberry32(1), 8);
  const cells = Q.emptyCells(board);
  assert.strictEqual(cells.length, 64);
  assert.ok(cells.every((v) => v === 0));
  assert.strictEqual(Q.isSolved(board, cells), false);
});

test('generate con el mismo rand sembrado igual da el mismo tablero', () => {
  const a = Q.generate(R.mulberry32(99), 8);
  const b = Q.generate(R.mulberry32(99), 8);
  assert.deepStrictEqual(a.regions, b.regions);
  assert.deepStrictEqual(a.solution, b.solution);
});
