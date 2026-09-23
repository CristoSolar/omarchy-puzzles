// Zip: un camino que pasa por todas las celdas exactamente una vez, tocando los
// numeros en orden ascendente.
//
// `cells[i]` es la posicion de la celda i dentro del camino: 0 si no esta, k si
// es el paso k. Por eso los valores llegan hasta n*n, y por eso el contrato
// necesita maxCellValue.

var VACIO = 0;

var meta = {
  id: 'zip',
  name: 'Zip',
  icon: '⚡',
  sizes: [6],
  defaultSize: 6,
  blurb: 'Un camino que pasa por todas las celdas tocando los numeros en orden.'
};

function rowOf(i, n) { return Math.floor(i / n); }
function colOf(i, n) { return i % n; }

function areAdjacent(a, b, n) {
  var dr = Math.abs(rowOf(a, n) - rowOf(b, n));
  var dc = Math.abs(colOf(a, n) - colOf(b, n));
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

function maxCellValue(board) {
  return board.n * board.n;
}

// El camino como lista de indices en orden de recorrido.
function pathOf(cells) {
  var pares = [];
  var i;
  for (i = 0; i < cells.length; i++) {
    if (cells[i] > 0) pares.push({ idx: i, paso: cells[i] });
  }
  pares.sort(function (a, b) { return a.paso - b.paso; });
  var out = [];
  for (i = 0; i < pares.length; i++) out.push(pares[i].idx);
  return out;
}

// Lo unico que se reporta es lo que ya esta mal: un tramo entre celdas no
// vecinas, y un numero alcanzado fuera de orden. Un camino corto no es error.
function conflicts(board, cells) {
  var n = board.n;
  var camino = pathOf(cells);
  var malo = {};
  var i;

  for (i = 1; i < camino.length; i++) {
    if (!areAdjacent(camino[i - 1], camino[i], n)) {
      malo[camino[i - 1]] = true;
      malo[camino[i]] = true;
    }
  }

  var esperado = 1;
  for (i = 0; i < camino.length; i++) {
    var numero = board.checkpoints[camino[i]];
    if (numero === 0) continue;
    if (numero !== esperado) malo[camino[i]] = true;
    else esperado++;
  }

  var out = [];
  for (i = 0; i < n * n; i++) {
    if (malo[i]) out.push(i);
  }
  return out;
}

function isSolved(board, cells) {
  var n = board.n;
  var camino = pathOf(cells);
  if (camino.length !== n * n) return false;
  return conflicts(board, cells).length === 0;
}

function emptyCells(board) {
  var out = [];
  for (var i = 0; i < board.n * board.n; i++) out.push(VACIO);
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = {
    VACIO: VACIO,
    meta: meta,
    rowOf: rowOf, colOf: colOf,
    areAdjacent: areAdjacent,
    maxCellValue: maxCellValue,
    pathOf: pathOf,
    conflicts: conflicts,
    isSolved: isSolved,
    emptyCells: emptyCells
  };
}
