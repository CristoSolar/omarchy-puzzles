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

function rangeOf(cuantos) {
  var out = [];
  for (var i = 0; i < cuantos; i++) out.push(i);
  return out;
}

function isAllowedSize(n) {
  for (var i = 0; i < meta.sizes.length; i++) {
    if (n === meta.sizes[i]) return true;
  }
  return false;
}

// Puede ir el digito en la celda, mirando fila, columna y caja.
function puedeIr(cells, idx, valor, n) {
  var f = rowOf(idx, n), c = colOf(idx, n), b = boxOf(idx, n);
  for (var i = 0; i < n * n; i++) {
    if (i === idx || cells[i] !== valor) continue;
    if (rowOf(i, n) === f || colOf(i, n) === c || boxOf(i, n) === b) return false;
  }
  return true;
}

function randomSolution(rand, n) {
  var cells = [];
  var i;
  for (i = 0; i < n * n; i++) cells.push(VACIO);
  var digitos = rangeOf(n);
  for (i = 0; i < digitos.length; i++) digitos[i] += 1;

  function fill(idx) {
    if (idx === n * n) return true;
    var orden = shuffledLocal(digitos, rand);
    for (var k = 0; k < orden.length; k++) {
      if (!puedeIr(cells, idx, orden[k], n)) continue;
      cells[idx] = orden[k];
      if (fill(idx + 1)) return true;
      cells[idx] = VACIO;
    }
    return false;
  }

  if (!fill(0)) throw new Error('sin solucion inicial para n=' + n);
  return cells;
}

function countSolutions(board, limit) {
  var n = board.n;
  var cells = board.givens.slice();
  var found = 0;

  function fill(idx) {
    if (found >= limit) return;
    if (idx === n * n) {
      found++;
      return;
    }
    if (cells[idx] !== VACIO) {
      fill(idx + 1);
      return;
    }
    for (var v = 1; v <= n; v++) {
      if (!puedeIr(cells, idx, v, n)) continue;
      cells[idx] = v;
      fill(idx + 1);
      cells[idx] = VACIO;
      if (found >= limit) return;
    }
  }

  fill(0);
  return found;
}

// Grilla completa, despues cavar huecos en orden aleatorio, revirtiendo el que
// deje mas de una solucion. No hace falta piso de dadas: a diferencia de Tango,
// aca la unicidad se agota sola y el cavado se frena.
function generate(rand, size) {
  if (!isAllowedSize(size)) {
    throw new Error('tamano no permitido: ' + String(size) + ' (use 6)');
  }
  var n = size;
  var solution = randomSolution(rand, n);
  var board = { n: n, givens: solution.slice(), solution: solution };

  var orden = shuffledLocal(rangeOf(n * n), rand);
  for (var i = 0; i < orden.length; i++) {
    var celda = orden[i];
    var valor = board.givens[celda];
    if (valor === VACIO) continue;
    board.givens[celda] = VACIO;
    if (countSolutions(board, 2) !== 1) board.givens[celda] = valor;
  }

  return board;
}

function emptyCells(board) {
  return board.givens.slice();
}

function solvedCells(board) {
  return board.solution.slice();
}

// Tope del valor de una celda, para que la carcasa pueda validar una partida
// guardada sin saber que significa cada numero.
function maxCellValue(board) {
  return board.n;
}

if (typeof module !== 'undefined') {
  module.exports = {
    VACIO: VACIO, BOX_W: BOX_W, BOX_H: BOX_H,
    meta: meta,
    rowOf: rowOf, colOf: colOf, boxOf: boxOf,
    conflicts: conflicts,
    isSolved: isSolved,
    generate: generate,
    emptyCells: emptyCells,
    maxCellValue: maxCellValue,
    solvedCells: solvedCells,
    countSolutions: countSolutions,
    randomSolution: randomSolution
  };
}
