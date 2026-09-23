// Mini Sudoku 6x6: los digitos del 1 al 6, una vez por fila, por columna y por
// caja de 2 filas por 3 columnas.
//
// Mismo contrato que los demas juegos y, como ellos, sin imports.

var VACIO = 0;
var BOX_W = 3;
var BOX_H = 2;

var meta = {
  id: 'sudoku',
  name: 'Mini Sudoku',
  icon: '#',
  sizes: [6],
  defaultSize: 6,
  blurb: 'Los digitos del 1 al 6, sin repetir por fila, columna ni caja.'
};

function rowOf(i, n) { return Math.floor(i / n); }
function colOf(i, n) { return i % n; }

// Con 6x6 y cajas de 2x3 hay dos cajas por banda horizontal y tres bandas.
function boxOf(i, n) {
  var cajasPorBanda = n / BOX_W;
  return Math.floor(rowOf(i, n) / BOX_H) * cajasPorBanda + Math.floor(colOf(i, n) / BOX_W);
}

// Solo repeticiones: las vacias nunca cuentan, asi la grilla a medio llenar no
// se marca sola.
function conflicts(board, cells) {
  var n = board.n;
  var malo = {};
  var i, j;

  function revisar(grupos) {
    for (var g in grupos) {
      var porValor = {};
      var celdas = grupos[g];
      for (var k = 0; k < celdas.length; k++) {
        var v = cells[celdas[k]];
        if (v === VACIO) continue;
        if (!porValor[v]) porValor[v] = [];
        porValor[v].push(celdas[k]);
      }
      for (var val in porValor) {
        if (porValor[val].length > 1) {
          for (var m = 0; m < porValor[val].length; m++) malo[porValor[val][m]] = true;
        }
      }
    }
  }

  var filas = {}, columnas = {}, cajas = {};
  for (i = 0; i < n * n; i++) {
    var f = rowOf(i, n), c = colOf(i, n), b = boxOf(i, n);
    if (!filas[f]) filas[f] = [];
    if (!columnas[c]) columnas[c] = [];
    if (!cajas[b]) cajas[b] = [];
    filas[f].push(i);
    columnas[c].push(i);
    cajas[b].push(i);
  }
  revisar(filas);
  revisar(columnas);
  revisar(cajas);

  var out = [];
  for (j = 0; j < n * n; j++) {
    if (malo[j]) out.push(j);
  }
  return out;
}

function isSolved(board, cells) {
  for (var i = 0; i < board.n * board.n; i++) {
    if (cells[i] === VACIO) return false;
  }
  return conflicts(board, cells).length === 0;
}

if (typeof module !== 'undefined') {
  module.exports = {
    VACIO: VACIO, BOX_W: BOX_W, BOX_H: BOX_H,
    meta: meta,
    rowOf: rowOf, colOf: colOf, boxOf: boxOf,
    conflicts: conflicts,
    isSolved: isSolved
  };
}
