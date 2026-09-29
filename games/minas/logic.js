// Buscaminas: destapar toda celda sin mina. El tablero del dia es resoluble sin
// adivinar: arranca con una zona ya abierta y, desde ahi, un solver que solo
// usa deducciones seguras llega al final.
//
// Mismo contrato que los demas juegos y, como ellos, sin imports.

var TAPADA = 0, DESTAPADA = 1, BANDERA = 2;
var MINAS = 10;
var INTENTOS = 2000;

var meta = {
  id: 'minas',
  name: 'Buscaminas',
  icon: '✹',
  sizes: [9],
  defaultSize: 9,
  blurb: 'Destapa toda celda sin mina. Se resuelve sin adivinar.'
};

function neighbors(i, n) {
  var f = Math.floor(i / n), c = i % n;
  var out = [];
  for (var df = -1; df <= 1; df++) {
    for (var dc = -1; dc <= 1; dc++) {
      if (df === 0 && dc === 0) continue;
      var ff = f + df, cc = c + dc;
      if (ff >= 0 && ff < n && cc >= 0 && cc < n) out.push(ff * n + cc);
    }
  }
  return out;
}

function mineMap(board) {
  var mapa = [];
  for (var i = 0; i < board.n * board.n; i++) mapa.push(false);
  for (var k = 0; k < board.mines.length; k++) mapa[board.mines[k]] = true;
  return mapa;
}

function isMine(board, i) {
  return board.mines.indexOf(i) !== -1;
}

function neighborCount(board, i) {
  var vecinas = neighbors(i, board.n);
  var cuenta = 0;
  for (var k = 0; k < vecinas.length; k++) {
    if (isMine(board, vecinas[k])) cuenta++;
  }
  return cuenta;
}

// Destapa la celda y, si no tiene minas vecinas, sigue por sus vecinas. Una
// bandera sobre una celda segura tambien se destapa en la cascada. Si la celda
// es mina devuelve null.
function reveal(board, cells, index) {
  if (isMine(board, index)) return null;
  var n = board.n;
  var minas = mineMap(board);
  var next = cells.slice();
  var pila = [index];
  while (pila.length > 0) {
    var i = pila.pop();
    if (next[i] === DESTAPADA) continue;
    next[i] = DESTAPADA;
    var vecinas = neighbors(i, n);
    var cuenta = 0;
    for (var k = 0; k < vecinas.length; k++) {
      if (minas[vecinas[k]]) cuenta++;
    }
    if (cuenta > 0) continue;
    for (var m = 0; m < vecinas.length; m++) {
      if (next[vecinas[m]] !== DESTAPADA) pila.push(vecinas[m]);
    }
  }
  return next;
}

function conflicts(board, cells) {
  return [];
}

function isSolved(board, cells) {
  var minas = mineMap(board);
  for (var i = 0; i < board.n * board.n; i++) {
    if (!minas[i] && cells[i] !== DESTAPADA) return false;
  }
  return true;
}

// Solver sin adivinar. Conoce solo lo que ve el jugador: numeros destapados y
// minas que ya dedujo. Dos reglas, repetidas hasta no avanzar:
// - de un numero: si le faltan tantas minas como tapadas tiene alrededor, son
//   todas minas; si no le falta ninguna, son todas seguras.
// - de subconjunto: si las tapadas de A estan todas entre las de B, la
//   diferencia lleva exactamente faltan(B) - faltan(A) minas.
// Devuelve true si destapa toda celda sin mina.
function solvable(board) {
  var n = board.n;
  var cells = emptyCells(board);
  var minaSabida = [];
  var i;
  for (i = 0; i < n * n; i++) minaSabida.push(false);

  function frontera() {
    var out = [];
    for (var j = 0; j < n * n; j++) {
      if (cells[j] !== DESTAPADA) continue;
      var tapadas = [], sabidas = 0;
      var vecinas = neighbors(j, n);
      for (var k = 0; k < vecinas.length; k++) {
        var v = vecinas[k];
        if (minaSabida[v]) sabidas++;
        else if (cells[v] !== DESTAPADA) tapadas.push(v);
      }
      if (tapadas.length > 0) {
        out.push({ tapadas: tapadas, faltan: neighborCount(board, j) - sabidas });
      }
    }
    return out;
  }

  function aplicar(grupo, faltan) {
    if (grupo.length === 0) return false;
    var k;
    if (faltan === 0) {
      for (k = 0; k < grupo.length; k++) cells = reveal(board, cells, grupo[k]);
      return true;
    }
    if (faltan === grupo.length) {
      for (k = 0; k < grupo.length; k++) minaSabida[grupo[k]] = true;
      return true;
    }
    return false;
  }

  function incluido(a, b) {
    for (var k = 0; k < a.length; k++) {
      if (b.indexOf(a[k]) === -1) return false;
    }
    return true;
  }

  var avanzo = true;
  while (avanzo) {
    avanzo = false;
    var f = frontera();
    for (i = 0; i < f.length && !avanzo; i++) {
      if (aplicar(f[i].tapadas, f[i].faltan)) avanzo = true;
    }
    for (i = 0; i < f.length && !avanzo; i++) {
      for (var j = 0; j < f.length && !avanzo; j++) {
        if (i === j || !incluido(f[i].tapadas, f[j].tapadas)) continue;
        var resto = [];
        for (var k = 0; k < f[j].tapadas.length; k++) {
          if (f[i].tapadas.indexOf(f[j].tapadas[k]) === -1) resto.push(f[j].tapadas[k]);
        }
        if (aplicar(resto, f[j].faltan - f[i].faltan)) avanzo = true;
      }
    }
  }
  return isSolved(board, cells);
}

function shuffledLocal(values, rand) {
  var out = values.slice();
  for (var i = out.length - 1; i > 0; i--) {
    var j = Math.floor(rand() * (i + 1));
    var tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function isAllowedSize(n) {
  for (var i = 0; i < meta.sizes.length; i++) {
    if (n === meta.sizes[i]) return true;
  }
  return false;
}

// Minas al azar, arranque en una celda al azar sin minas vecinas, y se acepta
// solo si el solver sin adivinar lo termina.
function generate(rand, size) {
  if (!isAllowedSize(size)) {
    throw new Error('tamano no permitido: ' + String(size) + ' (use 9)');
  }
  var n = size;
  var todas = [];
  for (var i = 0; i < n * n; i++) todas.push(i);

  for (var intento = 0; intento < INTENTOS; intento++) {
    var mines = shuffledLocal(todas, rand).slice(0, MINAS);
    mines.sort(function (a, b) { return a - b; });
    var board = { n: n, mines: mines, start: -1 };

    var ceros = [];
    for (var j = 0; j < n * n; j++) {
      if (!isMine(board, j) && neighborCount(board, j) === 0) ceros.push(j);
    }
    if (ceros.length === 0) continue;
    board.start = ceros[Math.floor(rand() * ceros.length)];
    if (solvable(board)) return board;
  }
  throw new Error('no se pudo generar un Buscaminas sin adivinar');
}

// La partida arranca con la zona de `start` abierta: sin primer clic a ciegas.
function emptyCells(board) {
  var cells = [];
  for (var i = 0; i < board.n * board.n; i++) cells.push(TAPADA);
  return reveal(board, cells, board.start);
}

function solvedCells(board) {
  var minas = mineMap(board);
  var cells = [];
  for (var i = 0; i < board.n * board.n; i++) cells.push(minas[i] ? BANDERA : DESTAPADA);
  return cells;
}

function maxCellValue(board) {
  return BANDERA;
}

if (typeof module !== 'undefined') {
  module.exports = {
    TAPADA: TAPADA, DESTAPADA: DESTAPADA, BANDERA: BANDERA, MINAS: MINAS,
    meta: meta,
    neighbors: neighbors,
    isMine: isMine,
    neighborCount: neighborCount,
    reveal: reveal,
    solvable: solvable,
    conflicts: conflicts,
    isSolved: isSolved,
    generate: generate,
    emptyCells: emptyCells,
    solvedCells: solvedCells,
    maxCellValue: maxCellValue
  };
}
