// 2048 con meta diaria: llegar a la ficha 512. Como Tetris, no hay grilla que
// resolver: la partida vive en un `run` que el tablero avanza con `slide`, y
// las fichas que aparecen salen de una lista de tiradas fijada por la semilla,
// asi el dia es el mismo para todos mientras jueguen igual.
//
// Sin imports, como los demas juegos.

var LADO = 4, META = 512;
var TIRADAS = 4096;
var PROB_CUATRO = 0.1;

var meta = {
  id: 'n2048',
  name: '2048',
  icon: '\u25a3',
  sizes: [4],
  defaultSize: 4,
  blurb: 'Junta fichas iguales hasta llegar a 512.'
};

// Cada tirada elige la casilla (entre las libres) y si sale un 2 o un 4.
function generate(rand, size) {
  if (size !== LADO) {
    throw new Error('tamano no permitido: ' + String(size) + ' (use 4)');
  }
  var rolls = [];
  for (var i = 0; i < TIRADAS; i++) rolls.push({ pos: rand(), four: rand() < PROB_CUATRO });
  return { n: LADO, goal: META, rolls: rolls };
}

// Pone la ficha de la tirada `index` en una casilla libre. Las tiradas dan la
// vuelta si se acaban.
function spawn(board, grid, index) {
  var libres = [];
  for (var i = 0; i < grid.length; i++) {
    if (grid[i] === 0) libres.push(i);
  }
  var out = grid.slice();
  if (libres.length === 0) return out;
  var roll = board.rolls[index % board.rolls.length];
  out[libres[Math.floor(roll.pos * libres.length)]] = roll.four ? 4 : 2;
  return out;
}

function newRun(board) {
  var grid = [];
  for (var i = 0; i < board.n * board.n; i++) grid.push(0);
  grid = spawn(board, grid, 0);
  grid = spawn(board, grid, 1);
  return { grid: grid, index: 2, score: 0, best: Math.max.apply(null, grid), over: false };
}

// Junta una linea hacia su inicio: cada ficha se fusiona como mucho una vez
// por jugada, que es la regla que hace que [2,2,2,2] de [4,4] y no [8].
function slideLine(line) {
  var fichas = [];
  for (var i = 0; i < line.length; i++) {
    if (line[i] !== 0) fichas.push(line[i]);
  }
  var out = [], puntos = 0;
  for (var k = 0; k < fichas.length; k++) {
    if (k + 1 < fichas.length && fichas[k] === fichas[k + 1]) {
      out.push(fichas[k] * 2);
      puntos += fichas[k] * 2;
      k++;
    } else {
      out.push(fichas[k]);
    }
  }
  while (out.length < line.length) out.push(0);
  return { line: out, points: puntos };
}

// Indices de cada linea en el orden en que se desliza: el primero es la pared
// hacia la que van las fichas.
function linesFor(n, dx, dy) {
  var lineas = [];
  for (var a = 0; a < n; a++) {
    var linea = [];
    for (var b = 0; b < n; b++) {
      if (dx === -1) linea.push(a * n + b);
      else if (dx === 1) linea.push(a * n + (n - 1 - b));
      else if (dy === -1) linea.push(b * n + a);
      else linea.push((n - 1 - b) * n + a);
    }
    lineas.push(linea);
  }
  return lineas;
}

function canMove(board, grid) {
  var n = board.n;
  for (var i = 0; i < grid.length; i++) {
    if (grid[i] === 0) return true;
    if (i % n < n - 1 && grid[i] === grid[i + 1]) return true;
    if (i + n < grid.length && grid[i] === grid[i + n]) return true;
  }
  return false;
}

// Una jugada. Si nada se mueve no aparece ficha y el run vuelve igual.
function slide(board, run, dx, dy) {
  if (run.over) return run;
  var grid = run.grid.slice();
  var lineas = linesFor(board.n, dx, dy);
  var puntos = 0, cambio = false;
  for (var l = 0; l < lineas.length; l++) {
    var valores = [];
    for (var k = 0; k < lineas[l].length; k++) valores.push(grid[lineas[l][k]]);
    var r = slideLine(valores);
    puntos += r.points;
    for (k = 0; k < lineas[l].length; k++) {
      if (grid[lineas[l][k]] !== r.line[k]) cambio = true;
      grid[lineas[l][k]] = r.line[k];
    }
  }
  if (!cambio) return run;
  grid = spawn(board, grid, run.index);
  return {
    grid: grid,
    index: run.index + 1,
    score: run.score + puntos,
    best: Math.max.apply(null, grid),
    over: !canMove(board, grid)
  };
}

// Del contrato de grilla, 2048 no guarda nada: igual que Tetris, la corrida no
// se persiste y resolver lo decide el tablero al llegar a la meta.
function conflicts(board, cells) { return []; }
function isSolved(board, cells) { return false; }
function emptyCells(board) { return []; }
function solvedCells(board) { return []; }
function maxCellValue(board) { return 0; }

if (typeof module !== 'undefined') {
  module.exports = {
    meta: meta,
    generate: generate,
    newRun: newRun,
    slideLine: slideLine,
    slide: slide,
    canMove: canMove,
    conflicts: conflicts,
    isSolved: isSolved,
    emptyCells: emptyCells,
    solvedCells: solvedCells,
    maxCellValue: maxCellValue
  };
}
