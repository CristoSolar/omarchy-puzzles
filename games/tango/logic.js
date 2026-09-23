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

// Pisos del podado. Sin ellos el resultado depende del orden: podando dadas
// primero queda siempre una sola -- la simetria del complemento impide bajar de
// ahi -- y un tablero con una celda puesta se ve vacio; podando restricciones
// primero quedan dos o tres, y sin los signos = y x el juego deja de ser Tango.
var MIN_GIVENS = 4;
var MIN_CONSTRAINTS = 6;

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

// Poda del backtracking: las mismas reglas que `conflicts`, evaluadas de forma
// incremental sobre el prefijo ya colocado.
function puedeIr(cells, i, valor, n) {
  var mitad = n / 2;
  var fila = rowOf(i, n), col = colOf(i, n);

  if (col >= 2 && cells[i - 1] === valor && cells[i - 2] === valor) return false;
  if (fila >= 2 && cells[i - n] === valor && cells[i - 2 * n] === valor) return false;

  var c = 0, j;
  for (j = 0; j < n; j++) {
    if (cells[fila * n + j] === valor) c++;
  }
  if (c >= mitad) return false;

  c = 0;
  for (j = 0; j < n; j++) {
    if (cells[j * n + col] === valor) c++;
  }
  if (c >= mitad) return false;

  return true;
}

function randomSolution(rand, n) {
  var cells = [];
  var i;
  for (i = 0; i < n * n; i++) cells.push(VACIO);

  function fill(idx) {
    if (idx === n * n) return true;
    var orden = rand() < 0.5 ? [SOL, LUNA] : [LUNA, SOL];
    for (var k = 0; k < 2; k++) {
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

// Cuenta soluciones compatibles con las dadas y las restricciones, con corte
// temprano en `limit`.
function countSolutions(board, limit) {
  var n = board.n;
  var cells = board.givens.slice();
  var found = 0;

  var porCelda = {};
  var i;
  for (i = 0; i < board.constraints.length; i++) {
    var c = board.constraints[i];
    if (!porCelda[c.a]) porCelda[c.a] = [];
    if (!porCelda[c.b]) porCelda[c.b] = [];
    porCelda[c.a].push(c);
    porCelda[c.b].push(c);
  }

  function restriccionesOk(idx) {
    var lista = porCelda[idx];
    if (!lista) return true;
    for (var k = 0; k < lista.length; k++) {
      var c = lista[k];
      var va = cells[c.a], vb = cells[c.b];
      if (va === VACIO || vb === VACIO) continue;
      if ((va === vb) !== c.eq) return false;
    }
    return true;
  }

  function fill(idx) {
    if (found >= limit) return;
    if (idx === n * n) {
      found++;
      return;
    }
    if (board.givens[idx] !== VACIO) {
      var guardado = cells[idx];
      cells[idx] = VACIO;
      var ok = puedeIr(cells, idx, guardado, n);
      cells[idx] = guardado;
      if (ok && restriccionesOk(idx)) fill(idx + 1);
      return;
    }
    for (var v = 1; v <= 2; v++) {
      if (!puedeIr(cells, idx, v, n)) continue;
      cells[idx] = v;
      if (restriccionesOk(idx)) fill(idx + 1);
      cells[idx] = VACIO;
      if (found >= limit) return;
    }
  }

  fill(0);
  return found;
}

// Arranca con todas las restricciones y todas las dadas, y poda mientras la
// solucion siga siendo unica. Sin ninguna dada el tablero tendria siempre al
// menos dos soluciones, porque el complemento de una solucion tambien lo es:
// intercambiar soles por lunas conserva las cuentas, los tres seguidos y las
// restricciones. El podado se detiene solo por eso, sin necesidad de un minimo
// explicito.
function generate(rand, size) {
  if (!isAllowedSize(size)) {
    throw new Error('tamano no permitido: ' + String(size) + ' (use 6)');
  }
  var n = size;
  var solution = randomSolution(rand, n);

  var todas = [];
  var i, j;
  for (i = 0; i < n; i++) {
    for (j = 0; j < n; j++) {
      var idx = i * n + j;
      if (j + 1 < n) todas.push({ a: idx, b: idx + 1, eq: solution[idx] === solution[idx + 1] });
      if (i + 1 < n) todas.push({ a: idx, b: idx + n, eq: solution[idx] === solution[idx + n] });
    }
  }

  var board = { n: n, givens: solution.slice(), constraints: todas, solution: solution };

  // Se poda todo entremezclado, con un piso por tipo: el orden importa mas que
  // el algoritmo, porque quitar una dada habilita quitar restricciones y al
  // reves. Mezclar reparte el recorte en vez de vaciar un tipo antes del otro.
  var candidatos = [];
  for (i = 0; i < n * n; i++) candidatos.push({ tipo: 'g', celda: i });
  for (i = 0; i < board.constraints.length; i++) {
    candidatos.push({ tipo: 'c', ref: board.constraints[i] });
  }
  candidatos = shuffledLocal(candidatos, rand);

  var vivas = n * n;
  for (i = 0; i < candidatos.length; i++) {
    var cand = candidatos[i];

    if (cand.tipo === 'g') {
      if (vivas <= MIN_GIVENS) continue;
      var valor = board.givens[cand.celda];
      if (valor === VACIO) continue;
      board.givens[cand.celda] = VACIO;
      if (countSolutions(board, 2) !== 1) {
        board.givens[cand.celda] = valor;
      } else {
        vivas--;
      }
      continue;
    }

    if (board.constraints.length <= MIN_CONSTRAINTS) continue;
    var pos = board.constraints.indexOf(cand.ref);
    if (pos < 0) continue;
    board.constraints.splice(pos, 1);
    if (countSolutions(board, 2) !== 1) board.constraints.splice(pos, 0, cand.ref);
  }

  return board;
}

function emptyCells(board) {
  return board.givens.slice();
}

function solvedCells(board) {
  return board.solution.slice();
}

if (typeof module !== 'undefined') {
  module.exports = {
    VACIO: VACIO, SOL: SOL, LUNA: LUNA,
    meta: meta,
    rowOf: rowOf,
    colOf: colOf,
    conflicts: conflicts,
    isSolved: isSolved,
    generate: generate,
    emptyCells: emptyCells,
    solvedCells: solvedCells,
    countSolutions: countSolutions,
    randomSolution: randomSolution
  };
}
