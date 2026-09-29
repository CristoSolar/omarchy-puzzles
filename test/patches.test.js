const test = require('node:test');
const assert = require('node:assert');
const P = require('../games/patches/logic.js');
const R = require('../lib/rng.js');

const N = 6;

// Tablero chico hecho a mano: 2x3, dos pistas.
//   fila 0: A A A
//   fila 1: B B B
function mini() {
  return {
    n: 3,
    clues: [
      { cell: 0, area: 3, shape: 'wide' },
      { cell: 4, area: 6, shape: 'any' }
    ],
    solution: []
  };
}

test('meta cumple el contrato', () => {
  assert.strictEqual(P.meta.id, 'patches');
  assert.deepStrictEqual(P.meta.sizes, [6]);
  assert.strictEqual(P.meta.defaultSize, 6);
  assert.ok(P.meta.name && P.meta.icon && P.meta.blurb);
});

test('shapeOf y fitsShape', () => {
  assert.strictEqual(P.shapeOf(2, 2), 'square');
  assert.strictEqual(P.shapeOf(3, 1), 'wide');
  assert.strictEqual(P.shapeOf(1, 3), 'tall');
  assert.strictEqual(P.fitsShape('any', 1, 4), true);
  assert.strictEqual(P.fitsShape('tall', 4, 1), false);
});

test('placeRect asigna el rectangulo a su unica pista', () => {
  const b = mini();
  const cells = P.placeRect(b, P.emptyCells(b), 0, 2);
  assert.deepStrictEqual(cells, [1, 1, 1, 0, 0, 0, 0, 0, 0]);
});

test('placeRect sin pistas o con dos devuelve null', () => {
  const b = mini();
  assert.strictEqual(P.placeRect(b, P.emptyCells(b), 6, 8), null, 'sin pista');
  assert.strictEqual(P.placeRect(b, P.emptyCells(b), 0, 4), null, 'dos pistas');
});

// Review Focus 2: redibujar una pista no deja restos del rectangulo viejo, y
// pisar otro rectangulo lo borra entero, no solo la parte pisada.
test('placeRect reemplaza el rectangulo anterior y borra los que pisa', () => {
  const b = mini();
  let cells = P.placeRect(b, P.emptyCells(b), 0, 1);          // A en 0..1
  cells = P.placeRect(b, cells, 4, 8);                          // B en 4,5,7,8
  assert.deepStrictEqual(cells, [1, 1, 0, 0, 2, 2, 0, 2, 2]);
  cells = P.placeRect(b, cells, 0, 3);                          // A pasa a 0,3
  assert.deepStrictEqual(cells, [1, 0, 0, 1, 2, 2, 0, 2, 2]);
  cells = P.placeRect(b, cells, 1, 4);                          // B no pisa A: A queda
  assert.deepStrictEqual(cells, [1, 2, 0, 1, 2, 0, 0, 0, 0]);
  cells = P.placeRect(b, cells, 3, 4);                          // B pisa A en 3: A se borra entera
  assert.deepStrictEqual(cells, [0, 0, 0, 2, 2, 0, 0, 0, 0]);
});

test('eraseAt borra el rectangulo entero', () => {
  const b = mini();
  const cells = P.placeRect(b, P.emptyCells(b), 0, 2);
  assert.deepStrictEqual(P.eraseAt(b, cells, 1), P.emptyCells(b));
  assert.deepStrictEqual(P.eraseAt(b, cells, 5), cells, 'celda vacia no cambia nada');
});

test('conflicts marca area y forma que no calzan', () => {
  const b = mini();
  const corto = P.placeRect(b, P.emptyCells(b), 0, 1);   // area 2, pide 3
  assert.deepStrictEqual(P.conflicts(b, corto), [0, 1]);
  const alto = P.placeRect(b, P.emptyCells(b), 0, 6);    // 1x3 alto, pide ancho
  assert.deepStrictEqual(P.conflicts(b, alto), [0, 3, 6]);
  const bien = P.placeRect(b, P.emptyCells(b), 0, 2);
  assert.deepStrictEqual(P.conflicts(b, bien), []);
});

test('isSolved exige grilla llena y sin conflictos', () => {
  const b = mini();
  let cells = P.placeRect(b, P.emptyCells(b), 0, 2);
  assert.strictEqual(P.isSolved(b, cells), false);
  cells = P.placeRect(b, cells, 3, 8);
  assert.strictEqual(P.isSolved(b, cells), true);
});

// Review Focus 1: sin unicidad el jugador llega a otra particion valida y el
// juego no se la acepta.
test('generate produce tableros de solucion unica', () => {
  for (let s = 0; s < 30; s++) {
    const board = P.generate(R.mulberry32(s), N);
    assert.strictEqual(P.countSolutions(board, 3), 1, `semilla ${s} no es unica`);
    assert.strictEqual(P.isSolved(board, P.solvedCells(board)), true, `semilla ${s}`);
    for (const c of board.clues) {
      assert.ok(c.area >= 2 && c.area <= 8, `area fuera de rango: ${c.area}`);
    }
  }
});

test('la misma semilla da el mismo tablero', () => {
  assert.deepStrictEqual(P.generate(R.mulberry32(9), N), P.generate(R.mulberry32(9), N));
});

test('generate rechaza tamanos que no sean 6', () => {
  for (const malo of [4, 7, '6', undefined]) {
    assert.throws(() => P.generate(R.mulberry32(1), malo), /tamano/i);
  }
});

test('emptyCells y maxCellValue', () => {
  const board = P.generate(R.mulberry32(2), N);
  assert.ok(P.emptyCells(board).every((v) => v === 0));
  assert.strictEqual(P.emptyCells(board).length, 36);
  assert.strictEqual(P.maxCellValue(board), board.clues.length);
});
