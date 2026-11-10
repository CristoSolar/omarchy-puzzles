const test = require('node:test');
const assert = require('node:assert');
const G = require('../games/n2048/logic.js');
const R = require('../lib/rng.js');

test('slideLine fusiona cada ficha una sola vez por jugada', () => {
  assert.deepStrictEqual(G.slideLine([2, 2, 2, 2]), { line: [4, 4, 0, 0], points: 8 });
  assert.deepStrictEqual(G.slideLine([0, 2, 0, 2]), { line: [4, 0, 0, 0], points: 4 });
  assert.deepStrictEqual(G.slideLine([4, 4, 8, 0]), { line: [8, 8, 0, 0], points: 8 });
  assert.deepStrictEqual(G.slideLine([2, 4, 2, 4]), { line: [2, 4, 2, 4], points: 0 });
});

test('slide desliza en las cuatro direcciones y suma una ficha nueva', () => {
  const b = G.generate(R.mulberry32(1), 4);
  const base = { grid: [2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], index: 2, score: 0, best: 2, over: false };
  const izq = G.slide(b, base, -1, 0);
  assert.strictEqual(izq.grid[0], 4);
  assert.strictEqual(izq.score, 4);
  assert.strictEqual(izq.grid.filter(v => v).length, 2, 'la fusionada mas la nueva');
  assert.strictEqual(G.slide(b, base, 1, 0).grid[3], 4);
  assert.strictEqual(G.slide(b, base, 0, 1).grid[12], 2, 'abajo');
  assert.strictEqual(G.slide(b, { ...base, grid: [2, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, 0, -1).grid[0], 4, 'arriba');
});

test('una jugada que no mueve nada no hace aparecer ficha', () => {
  const b = G.generate(R.mulberry32(1), 4);
  const run = { grid: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], index: 2, score: 0, best: 2, over: false };
  assert.strictEqual(G.slide(b, run, -1, 0), run);
});

test('el dia es determinista: misma semilla y mismas jugadas, mismo tablero', () => {
  const jugar = () => {
    const b = G.generate(R.mulberry32(42), 4);
    let run = G.newRun(b);
    for (let k = 0; k < 60; k++) run = G.slide(b, run, [-1, 0, 1, 0][k % 4], [0, 1, 0, -1][k % 4]);
    return run.grid;
  };
  assert.deepStrictEqual(jugar(), jugar());
});

test('sin casillas libres ni pares vecinos se acaba', () => {
  const b = { n: 4 };
  assert.strictEqual(G.canMove(b, [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]), false);
  assert.strictEqual(G.canMove(b, [2, 2, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]), true);
});

test('la meta de 512 se alcanza jugando: un bot codicioso llega con alguna semilla', () => {
  let llego = false;
  for (let s = 1; s <= 10 && !llego; s++) {
    const b = G.generate(R.mulberry32(s), 4);
    let run = G.newRun(b);
    for (let k = 0; k < 3000 && !run.over && run.best < b.goal; k++) {
      // Codicioso: la jugada que deja mas casillas libres, prefiriendo abajo e izquierda.
      let mejor = null, libres = -1;
      for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
        const next = G.slide(b, run, dx, dy);
        const l = next.grid.filter(v => v === 0).length;
        if (next !== run && l > libres) { mejor = next; libres = l; }
      }
      run = mejor;
    }
    llego = run.best >= b.goal;
  }
  assert.ok(llego);
});
