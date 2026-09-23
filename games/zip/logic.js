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

// Contar caminos hamiltonianos explota sin poda, asi que el contador lleva un
// presupuesto de nodos. Agotado, devuelve -1: el podado lo interpreta como "no
// se pudo demostrar unicidad" y deja el numero que estaba probando quitar.
var NODE_BUDGET = 60000;

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

function rangeOfZ(cuantos) {
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

function neighborsOf(idx, n) {
  var out = [];
  var f = rowOf(idx, n), c = colOf(idx, n);
  if (f > 0) out.push(idx - n);
  if (f < n - 1) out.push(idx + n);
  if (c > 0) out.push(idx - 1);
  if (c < n - 1) out.push(idx + 1);
  return out;
}

// Camino que pasa por todas las celdas, por backtracking con la heuristica de
// Warnsdorff: se prueba primero el vecino con menos salidas libres, que es lo
// que evita quedar encerrado.
function randomHamiltonian(rand, n) {
  var total = n * n;
  var visitado = [];
  var i;
  for (i = 0; i < total; i++) visitado.push(false);

  var camino = [];

  function libresDe(idx) {
    var vs = neighborsOf(idx, n);
    var c = 0;
    for (var k = 0; k < vs.length; k++) {
      if (!visitado[vs[k]]) c++;
    }
    return c;
  }

  function avanzar(idx) {
    visitado[idx] = true;
    camino.push(idx);
    if (camino.length === total) return true;

    var opciones = [];
    var vs = shuffledLocal(neighborsOf(idx, n), rand);
    for (var k = 0; k < vs.length; k++) {
      if (!visitado[vs[k]]) opciones.push({ idx: vs[k], grado: libresDe(vs[k]) });
    }
    opciones.sort(function (a, b) { return a.grado - b.grado; });

    for (var j = 0; j < opciones.length; j++) {
      if (avanzar(opciones[j].idx)) return true;
    }

    visitado[idx] = false;
    camino.pop();
    return false;
  }

  var arranques = shuffledLocal(rangeOfZ(total), rand);
  for (i = 0; i < arranques.length; i++) {
    if (avanzar(arranques[i])) return camino;
    camino = [];
  }
  throw new Error('sin camino hamiltoniano para n=' + n);
}

// Cuenta caminos validos con corte temprano en `limit`. Devuelve -1 si agoto el
// presupuesto de nodos: no se pudo demostrar nada.
function countPaths(board, limit) {
  var n = board.n;
  var total = n * n;
  var inicio = -1;
  var mayor = 0;
  var i;
  for (i = 0; i < total; i++) {
    if (board.checkpoints[i] === 1) inicio = i;
    if (board.checkpoints[i] > mayor) mayor = board.checkpoints[i];
  }
  if (inicio < 0) return 0;

  var visitado = [];
  for (i = 0; i < total; i++) visitado.push(false);

  var found = 0;
  var nodos = 0;
  var agotado = false;

  // Lo que falta por recorrer tiene que seguir conectado con la punta: si se
  // parte en dos islas, ningun camino puede completarlo.
  function restoConectado(desde, faltan) {
    if (faltan === 0) return true;
    var pila = [];
    var vistos = {};
    var vs = neighborsOf(desde, n);
    for (var k = 0; k < vs.length; k++) {
      if (!visitado[vs[k]]) {
        pila.push(vs[k]);
        vistos[vs[k]] = true;
        break;
      }
    }
    if (pila.length === 0) return false;

    var alcanzados = 0;
    while (pila.length > 0) {
      var cur = pila.pop();
      alcanzados++;
      var ws = neighborsOf(cur, n);
      for (var m = 0; m < ws.length; m++) {
        if (!visitado[ws[m]] && !vistos[ws[m]]) {
          vistos[ws[m]] = true;
          pila.push(ws[m]);
        }
      }
    }
    return alcanzados === faltan;
  }

  function avanzar(idx, largo, esperado) {
    if (found >= limit || agotado) return;
    nodos++;
    if (nodos > NODE_BUDGET) {
      agotado = true;
      return;
    }

    var numero = board.checkpoints[idx];
    if (numero !== 0) {
      if (numero !== esperado) return;
      esperado++;
    }

    visitado[idx] = true;

    if (largo === total) {
      if (esperado > mayor) found++;
      visitado[idx] = false;
      return;
    }

    if (restoConectado(idx, total - largo)) {
      var vs = neighborsOf(idx, n);
      for (var k = 0; k < vs.length; k++) {
        if (!visitado[vs[k]]) avanzar(vs[k], largo + 1, esperado);
        if (found >= limit || agotado) break;
      }
    }

    visitado[idx] = false;
  }

  avanzar(inicio, 1, 1);
  return agotado ? -1 : found;
}

// Numera todo el camino y despues quita numeros mientras la solucion siga
// siendo unica. El primero y el ultimo nunca se quitan: son los que anclan el
// arranque y el final.
function generate(rand, size) {
  if (!isAllowedSize(size)) {
    throw new Error('tamano no permitido: ' + String(size) + ' (use 6)');
  }
  var n = size;
  var camino = randomHamiltonian(rand, n);
  var total = n * n;

  var puestos = [];
  var i, k;
  for (i = 0; i < camino.length; i++) puestos.push(i);

  function numerar(posiciones) {
    var checkpoints = [];
    for (var m = 0; m < total; m++) checkpoints.push(0);
    var ordenadas = posiciones.slice().sort(function (a, b) { return a - b; });
    for (m = 0; m < ordenadas.length; m++) {
      checkpoints[camino[ordenadas[m]]] = m + 1;
    }
    return checkpoints;
  }

  var board = { n: n, checkpoints: numerar(puestos), solution: camino };

  var orden = shuffledLocal(rangeOfZ(total), rand);
  for (i = 0; i < orden.length; i++) {
    var pos = orden[i];
    if (pos === 0 || pos === total - 1) continue;
    var quedan = [];
    for (k = 0; k < puestos.length; k++) {
      if (puestos[k] !== pos) quedan.push(puestos[k]);
    }
    if (quedan.length === puestos.length) continue;

    var probar = { n: n, checkpoints: numerar(quedan), solution: camino };
    if (countPaths(probar, 2) === 1) {
      puestos = quedan;
      board = probar;
    }
  }

  return board;
}

function solvedCells(board) {
  var cells = emptyCells(board);
  for (var i = 0; i < board.solution.length; i++) {
    cells[board.solution[i]] = i + 1;
  }
  return cells;
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
    emptyCells: emptyCells,
    generate: generate,
    solvedCells: solvedCells,
    randomHamiltonian: randomHamiltonian,
    countPaths: countPaths,
    NODE_BUDGET: NODE_BUDGET
  };
}
