// Tango: cada fila y cada columna llevan mitad soles y mitad lunas, nunca tres
// iguales seguidos, y las restricciones entre celdas vecinas obligan a que sean
// iguales (=) o distintas (x).
//
// Mismo contrato que Queens y, como el, sin imports: el azar llega sembrado.

var VACIO = 0, SOL = 1, LUNA = 2;

var meta = {
  id: 'tango',
  name: 'Tango',
  icon: '☀',
  sizes: [6],
  defaultSize: 6,
  blurb: 'Mitad soles y mitad lunas por fila y columna, sin tres seguidos.'
};

function rowOf(i, n) { return Math.floor(i / n); }
function colOf(i, n) { return i % n; }

// Conflictos de una grilla que puede estar a medio llenar: solo se reporta lo
// que ya es imposible de arreglar sin borrar. Dos iguales seguidos todavia no
// lo son; tres si. Tres del mismo simbolo en una fila tampoco; cuatro si.
function conflicts(board, cells) {
  var n = board.n;
  var mitad = n / 2;
  var malo = {};
  var i, j, k;

  function marcar(indices) {
    for (var m = 0; m < indices.length; m++) malo[indices[m]] = true;
  }

  for (i = 0; i < n; i++) {
    for (j = 0; j + 2 < n; j++) {
      var fila = [i * n + j, i * n + j + 1, i * n + j + 2];
      if (cells[fila[0]] !== VACIO && cells[fila[0]] === cells[fila[1]]
          && cells[fila[1]] === cells[fila[2]]) marcar(fila);

      var col = [j * n + i, (j + 1) * n + i, (j + 2) * n + i];
      if (cells[col[0]] !== VACIO && cells[col[0]] === cells[col[1]]
          && cells[col[1]] === cells[col[2]]) marcar(col);
    }
  }

  for (i = 0; i < n; i++) {
    var enFila = { 1: [], 2: [] };
    var enCol = { 1: [], 2: [] };
    for (j = 0; j < n; j++) {
      var vf = cells[i * n + j];
      if (vf !== VACIO) enFila[vf].push(i * n + j);
      var vc = cells[j * n + i];
      if (vc !== VACIO) enCol[vc].push(j * n + i);
    }
    for (k = 1; k <= 2; k++) {
      if (enFila[k].length > mitad) marcar(enFila[k]);
      if (enCol[k].length > mitad) marcar(enCol[k]);
    }
  }

  for (i = 0; i < board.constraints.length; i++) {
    var c = board.constraints[i];
    var va = cells[c.a], vb = cells[c.b];
    if (va === VACIO || vb === VACIO) continue;
    if ((va === vb) !== c.eq) marcar([c.a, c.b]);
  }

  var out = [];
  for (i = 0; i < n * n; i++) {
    if (malo[i]) out.push(i);
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
    VACIO: VACIO, SOL: SOL, LUNA: LUNA,
    meta: meta,
    rowOf: rowOf,
    colOf: colOf,
    conflicts: conflicts,
    isSolved: isSolved
  };
}
