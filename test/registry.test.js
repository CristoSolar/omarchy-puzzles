const test = require('node:test');
const assert = require('node:assert');
const Reg = require('../lib/registry.js');
const queens = require('../games/queens/logic.js');
const tango = require('../games/tango/logic.js');
const sudoku = require('../games/sudoku/logic.js');

test('el registro conoce Queens y coincide con su meta', () => {
  const entrada = Reg.byId('queens');
  assert.ok(entrada, 'queens debe estar registrado');
  assert.strictEqual(entrada.name, queens.meta.name);
  assert.strictEqual(entrada.icon, queens.meta.icon);
  assert.strictEqual(entrada.blurb, queens.meta.blurb);
});

test('cada entrada trae lo que el menu necesita', () => {
  for (const g of Reg.GAMES) {
    assert.ok(g.id && g.name && g.icon && g.blurb, `entrada incompleta: ${g.id}`);
    assert.ok(g.board.endsWith('Board.qml'), `board mal apuntado: ${g.id}`);
  }
});

test('los ids son unicos', () => {
  const ids = Reg.ids();
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('byId devuelve null para un juego desconocido', () => {
  assert.strictEqual(Reg.byId('buscaminas'), null);
});

test('el registro conoce Tango y coincide con su meta', () => {
  const entrada = Reg.byId('tango');
  assert.ok(entrada, 'tango debe estar registrado');
  assert.strictEqual(entrada.name, tango.meta.name);
  assert.strictEqual(entrada.icon, tango.meta.icon);
  assert.strictEqual(entrada.blurb, tango.meta.blurb);
});

test('el registro conoce Mini Sudoku y coincide con su meta', () => {
  const entrada = Reg.byId('sudoku');
  assert.ok(entrada, 'sudoku debe estar registrado');
  assert.strictEqual(entrada.name, sudoku.meta.name);
  assert.strictEqual(entrada.icon, sudoku.meta.icon);
  assert.strictEqual(entrada.blurb, sudoku.meta.blurb);
});
