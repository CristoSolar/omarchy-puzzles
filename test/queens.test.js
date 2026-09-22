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
    const board = Q.generate(seed, 8);
    invariantes(board);
    assert.strictEqual(Q.countSolutions(8, board.regions, 3), 1,
      `la semilla ${seed} no dio solucion unica`);
  }
});

test('generate funciona en los tres tamanos permitidos', () => {
  for (const n of Q.ALLOWED_SIZES) {
    const board = Q.generate(7, n);
    assert.strictEqual(board.n, n);
    invariantes(board);
    assert.strictEqual(Q.countSolutions(n, board.regions, 3), 1);
  }
});

test('la misma semilla da el mismo tablero', () => {
  const a = Q.generate(4242, 8);
  const b = Q.generate(4242, 8);
  assert.deepStrictEqual(a.regions, b.regions);
  assert.deepStrictEqual(a.solution, b.solution);
});

test('fechas distintas dan tableros distintos', () => {
  const hoy = Q.generateForDate(new Date(2026, 8, 22), 8);
  const manana = Q.generateForDate(new Date(2026, 8, 23), 8);
  assert.notDeepStrictEqual(hoy.regions, manana.regions);
});

// Review Focus 1: un N invalido tiene que fallar rapido, no colgar el shell.
test('generate rechaza tamanos invalidos en vez de colgarse', () => {
  for (const malo of [0, 3, 4, 12, '8', undefined, null, 8.5]) {
    assert.throws(() => Q.generate(1, malo), /tamano/i,
      `N=${String(malo)} deberia lanzar`);
  }
});

test('growRegions deja exactamente una reina por region', () => {
  const n = 8;
  const rand = Q.mulberry32(99);
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
    const board = Q.generate(seed, 8);
    for (let r = 0; r < 8; r++) {
      assert.ok(Q.regionContiguous(8, board.regions, r),
        `region ${r} partida en la semilla ${seed}`);
    }
  }
});
