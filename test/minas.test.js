const test = require('node:test');
const assert = require('node:assert');
const M = require('../games/minas/logic.js');
const R = require('../lib/rng.js');

const N = 9;

// 3x3 con una mina en la esquina inferior derecha.
function mini() {
  return { n: 3, mines: [8], start: 0 };
}

test('meta cumple el contrato', () => {
  assert.strictEqual(M.meta.id, 'minas');
  assert.deepStrictEqual(M.meta.sizes, [9]);
  assert.strictEqual(M.meta.defaultSize, 9);
  assert.ok(M.meta.name && M.meta.icon && M.meta.blurb);
});

test('neighbors respeta los bordes', () => {
  assert.deepStrictEqual(M.neighbors(0, 3), [1, 3, 4]);
  assert.strictEqual(M.neighbors(4, 3).length, 8);
});

test('neighborCount cuenta minas vecinas', () => {
  const b = mini();
  assert.strictEqual(M.neighborCount(b, 4), 1);
  assert.strictEqual(M.neighborCount(b, 0), 0);
});

test('reveal hace cascada desde un cero y se frena en los numeros', () => {
  const b = mini();
  const cells = M.reveal(b, new Array(9).fill(M.TAPADA), 0);
  assert.deepStrictEqual(cells, [1, 1, 1, 1, 1, 1, 1, 1, 0]);
});

test('reveal de una celda con numero no abre vecinas', () => {
  const b = mini();
  const cells = M.reveal(b, new Array(9).fill(M.TAPADA), 4);
  assert.deepStrictEqual(cells, [0, 0, 0, 0, 1, 0, 0, 0, 0]);
});

// Review Focus 3: pisar una mina no puede dejar el tablero a medio cambiar.
test('reveal sobre una mina devuelve null', () => {
  assert.strictEqual(M.reveal(mini(), new Array(9).fill(M.TAPADA), 8), null);
});

test('reveal destapa banderas mal puestas en la cascada', () => {
  const b = mini();
  const inicio = new Array(9).fill(M.TAPADA);
  inicio[2] = M.BANDERA;
  assert.strictEqual(M.reveal(b, inicio, 0)[2], M.DESTAPADA);
});

test('isSolved ignora banderas y exige toda celda segura destapada', () => {
  const b = mini();
  const casi = [1, 1, 1, 1, 1, 1, 1, 0, 0];
  assert.strictEqual(M.isSolved(b, casi), false);
  assert.strictEqual(M.isSolved(b, [1, 1, 1, 1, 1, 1, 1, 1, 0]), true);
  assert.strictEqual(M.isSolved(b, M.solvedCells(b)), true);
});

test('conflicts nunca delata banderas', () => {
  const b = mini();
  assert.deepStrictEqual(M.conflicts(b, [2, 0, 0, 0, 0, 0, 0, 0, 0]), []);
});

// Review Focus 1: un tablero que obliga a adivinar hace que la racha dependa
// de la suerte.
test('generate da tableros resolubles sin adivinar', () => {
  for (let s = 0; s < 30; s++) {
    const board = M.generate(R.mulberry32(s), N);
    assert.strictEqual(board.mines.length, M.MINAS, `semilla ${s}`);
    assert.strictEqual(new Set(board.mines).size, M.MINAS, `minas repetidas en ${s}`);
    assert.ok(!M.isMine(board, board.start), `start es mina en ${s}`);
    assert.strictEqual(M.neighborCount(board, board.start), 0, `start con vecinas en ${s}`);
    assert.strictEqual(M.solvable(board), true, `semilla ${s} no resoluble`);
  }
});

test('emptyCells trae la zona del arranque abierta', () => {
  const board = M.generate(R.mulberry32(4), N);
  const cells = M.emptyCells(board);
  assert.strictEqual(cells[board.start], M.DESTAPADA);
  assert.ok(cells.filter((v) => v === M.DESTAPADA).length > 1, 'la cascada abre mas de una');
  assert.strictEqual(M.isSolved(board, cells), false);
});

test('la misma semilla da el mismo tablero', () => {
  assert.deepStrictEqual(M.generate(R.mulberry32(21), N), M.generate(R.mulberry32(21), N));
});

test('generate rechaza tamanos que no sean 9', () => {
  for (const malo of [6, 10, '9', undefined]) {
    assert.throws(() => M.generate(R.mulberry32(1), malo), /tamano/i);
  }
});

test('maxCellValue es la bandera', () => {
  assert.strictEqual(M.maxCellValue(mini()), M.BANDERA);
});
