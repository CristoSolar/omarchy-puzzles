
// Una reina por fila y por columna, y ninguna tocando a otra. Como ya hay una
// sola reina por fila, la unica adyacencia posible es entre filas consecutivas.
function randomPlacement(n, rand) {
  var cols = [];
  var used = [];
  var i;
  for (i = 0; i < n; i++) used.push(false);
  var all = [];
  for (i = 0; i < n; i++) all.push(i);

  function fill(row) {
    if (row === n) return true;
    var order = shuffled(all, rand);
    for (var k = 0; k < order.length; k++) {
      var col = order[k];
      if (used[col]) continue;
      if (row > 0 && Math.abs(col - cols[row - 1]) <= 1) continue;
      used[col] = true;
      cols.push(col);
      if (fill(row + 1)) return true;
      cols.pop();
      used[col] = false;
    }
    return false;
  }

  if (!fill(0)) throw new Error('sin colocacion valida para n=' + n);
  return cols;
}

// Backtracking fila por fila con mascaras de bits. Corta al llegar a `limit`,
// que en la generacion es 2: solo importa distinguir "unica" de "varias".
function countSolutions(n, regions, limit) {
  var found = 0;

  function place(row, usedCols, usedRegions, prevCol) {
    if (found >= limit) return;
    if (row === n) {
      found++;
      return;
    }
    for (var col = 0; col < n; col++) {
      var colBit = 1 << col;
      if (usedCols & colBit) continue;
      if (prevCol >= 0 && Math.abs(col - prevCol) <= 1) continue;
      var regionBit = 1 << regions[row * n + col];
      if (usedRegions & regionBit) continue;
      place(row + 1, usedCols | colBit, usedRegions | regionBit, col);
      if (found >= limit) return;
    }
  }

  place(0, 0, 0, -1);
  return found;
}

// Conflictos de la grilla que esta jugando el usuario. A diferencia del solver,
// acepta grillas incompletas: reporta solo lo que ya esta mal.
function conflicts(n, regions, cells) {
  var queens = [];
  var i;
  for (i = 0; i < n * n; i++) {
    if (cells[i] === 2) queens.push(i);
  }

  var bad = {};
  function flag(a, b) {
    bad[a] = true;
    bad[b] = true;
  }

  for (i = 0; i < queens.length; i++) {
    for (var j = i + 1; j < queens.length; j++) {
      var ra = Math.floor(queens[i] / n), ca = queens[i] % n;
      var rb = Math.floor(queens[j] / n), cb = queens[j] % n;
      if (ra === rb) flag(queens[i], queens[j]);
      else if (ca === cb) flag(queens[i], queens[j]);
      else if (regions[queens[i]] === regions[queens[j]]) flag(queens[i], queens[j]);
      else if (Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1) flag(queens[i], queens[j]);
    }
  }

  var out = [];
  for (i = 0; i < queens.length; i++) {
    if (bad[queens[i]]) out.push(queens[i]);
  }
  out.sort(function (a, b) { return a - b; });
  return out;
}

function isSolved(n, regions, cells) {
  var queens = 0;
  for (var i = 0; i < n * n; i++) {
    if (cells[i] === 2) queens++;
  }
  return queens === n && conflicts(n, regions, cells).length === 0;
}

var ALLOWED_SIZES = [7, 8, 9];
var REGROW_ATTEMPTS = 40;
var PLACEMENT_ATTEMPTS = 25;
var REFINE_ATTEMPTS = 400;

// Cada reina siembra su region; el resto de las celdas se reparte por frontera
// aleatoria. Nacer de una reina y solo una es lo que garantiza que la
// colocacion original sea solucion del tablero generado.
function growRegions(n, queens, rand) {
  var regions = [];
  var i;
  for (i = 0; i < n * n; i++) regions.push(-1);

  var frontier = [];
  function pushNeighbors(idx, region) {
    var row = Math.floor(idx / n), col = idx % n;
    if (row > 0) frontier.push({ idx: idx - n, region: region });
    if (row < n - 1) frontier.push({ idx: idx + n, region: region });
    if (col > 0) frontier.push({ idx: idx - 1, region: region });
    if (col < n - 1) frontier.push({ idx: idx + 1, region: region });
  }

  for (var row = 0; row < n; row++) {
    var seedIdx = row * n + queens[row];
    regions[seedIdx] = row;
    pushNeighbors(seedIdx, row);
  }

  while (frontier.length > 0) {
    var k = Math.floor(rand() * frontier.length);
    var pick = frontier[k];
    frontier[k] = frontier[frontier.length - 1];
    frontier.pop();
    if (regions[pick.idx] !== -1) continue;
    regions[pick.idx] = pick.region;
    pushNeighbors(pick.idx, pick.region);
  }

  return regions;
}

function isAllowedSize(n) {
  for (var i = 0; i < ALLOWED_SIZES.length; i++) {
    if (n === ALLOWED_SIZES[i]) return true;
  }
  return false;
}

// Genera hasta dar con un tablero de solucion unica. Los dos presupuestos de
// reintento estan para que un caso dificil falle con error en vez de girar
// para siempre dentro del shell.
function generate(seed, n) {
  if (!isAllowedSize(n)) {
    throw new Error('tamano no permitido: ' + String(n) + ' (use 7, 8 o 9)');
  }
  var rand = mulberry32(seed);
  for (var p = 0; p < PLACEMENT_ATTEMPTS; p++) {
    var queens = randomPlacement(n, rand);
    for (var g = 0; g < REGROW_ATTEMPTS; g++) {
      var regions = growRegions(n, queens, rand);
      if (refineToUnique(n, regions, queens, rand)) {
        return { n: n, regions: regions, solution: queens };
      }
    }
  }
  throw new Error('sin tablero unico para n=' + n + ' semilla=' + seed);
}

function generateForDate(date, n) {
  return generate(seedForDate(date), n);
}

// Igual que countSolutions pero devolviendo las colocaciones. El refinado del
// generador necesita ver la solucion sobrante para poder matarla.
function findSolutions(n, regions, limit) {
  var out = [];
  var current = [];

  function place(row, usedCols, usedRegions, prevCol) {
    if (out.length >= limit) return;
    if (row === n) {
      out.push(current.slice());
      return;
    }
    for (var col = 0; col < n; col++) {
      var colBit = 1 << col;
      if (usedCols & colBit) continue;
      if (prevCol >= 0 && Math.abs(col - prevCol) <= 1) continue;
      var regionBit = 1 << regions[row * n + col];
      if (usedRegions & regionBit) continue;
      current.push(col);
      place(row + 1, usedCols | colBit, usedRegions | regionBit, col);
      current.pop();
      if (out.length >= limit) return;
    }
  }

  place(0, 0, 0, -1);
  return out;
}

// Una region partida en dos islas se ve mal y rompe la lectura del tablero,
// asi que el refinado no puede dejar ninguna.
function regionContiguous(n, regions, region) {
  var total = 0;
  var start = -1;
  var i;
  for (i = 0; i < n * n; i++) {
    if (regions[i] === region) {
      total++;
      if (start < 0) start = i;
    }
  }
  if (total === 0) return false;

  var seen = {};
  var stack = [start];
  seen[start] = true;
  var reached = 0;
  while (stack.length > 0) {
    var idx = stack.pop();
    reached++;
    var row = Math.floor(idx / n), col = idx % n;
    var vecinos = [];
    if (row > 0) vecinos.push(idx - n);
    if (row < n - 1) vecinos.push(idx + n);
    if (col > 0) vecinos.push(idx - 1);
    if (col < n - 1) vecinos.push(idx + 1);
    for (var v = 0; v < vecinos.length; v++) {
      var vi = vecinos[v];
      if (!seen[vi] && regions[vi] === region) {
        seen[vi] = true;
        stack.push(vi);
      }
    }
  }
  return reached === total;
}

// El crecimiento aleatorio da solucion unica menos de una vez cada 300 intentos
// en 8x8, asi que en vez de reintentar se refina: se busca una solucion
// sobrante y se le quita el piso moviendo una de sus celdas a otra region. Esa
// celda nunca es la de una reina de la solucion buscada, asi que la solucion
// buscada sobrevive intacta mientras la sobrante deja de serlo.
function refineToUnique(n, regions, queens, rand) {
  for (var iter = 0; iter < REFINE_ATTEMPTS; iter++) {
    var sols = findSolutions(n, regions, 2);
    if (sols.length === 0) return false;
    if (sols.length === 1) return true;

    var alt = sameCols(sols[0], queens) ? sols[1] : sols[0];
    var filas = [];
    for (var row = 0; row < n; row++) {
      if (alt[row] !== queens[row]) filas.push(row);
    }
    filas = shuffled(filas, rand);

    var movido = false;
    for (var f = 0; f < filas.length && !movido; f++) {
      var idx = filas[f] * n + alt[filas[f]];
      var desde = regions[idx];
      var destinos = shuffled(neighborRegions(n, regions, idx), rand);
      for (var d = 0; d < destinos.length; d++) {
        regions[idx] = destinos[d];
        if (regionContiguous(n, regions, desde)) {
          movido = true;
          break;
        }
        regions[idx] = desde;
      }
    }
    if (!movido) return false;
  }
  return findSolutions(n, regions, 2).length === 1;
}

function sameCols(a, b) {
  for (var i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function neighborRegions(n, regions, idx) {
  var row = Math.floor(idx / n), col = idx % n;
  var mine = regions[idx];
  var vecinos = [];
  if (row > 0) vecinos.push(idx - n);
  if (row < n - 1) vecinos.push(idx + n);
  if (col > 0) vecinos.push(idx - 1);
  if (col < n - 1) vecinos.push(idx + 1);

  var out = [];
  for (var v = 0; v < vecinos.length; v++) {
    var r = regions[vecinos[v]];
    if (r === mine) continue;
    var visto = false;
    for (var o = 0; o < out.length; o++) {
      if (out[o] === r) visto = true;
    }
    if (!visto) out.push(r);
  }
  return out;
}

// Celdas que quedan muertas con las reinas ya puestas: su fila, su columna, su
// region y sus ocho vecinas. El panel las pinta con una X tenue para separarlas
// de las que marco el usuario.
function blockedCells(n, regions, cells) {
  var bloqueada = [];
  var i;
  for (i = 0; i < n * n; i++) bloqueada.push(false);

  for (i = 0; i < n * n; i++) {
    if (cells[i] !== 2) continue;
    var qr = Math.floor(i / n), qc = i % n;
    var qreg = regions[i];

    for (var j = 0; j < n * n; j++) {
      if (j === i || cells[j] === 2) continue;
      var r = Math.floor(j / n), c = j % n;
      if (r === qr || c === qc || regions[j] === qreg
          || (Math.abs(r - qr) <= 1 && Math.abs(c - qc) <= 1)) {
        bloqueada[j] = true;
      }
    }
  }

  var out = [];
  for (i = 0; i < n * n; i++) {
    if (bloqueada[i]) out.push(i);
  }
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = {
    randomPlacement: randomPlacement,
    countSolutions: countSolutions,
    conflicts: conflicts,
    isSolved: isSolved,
    growRegions: growRegions,
    generate: generate,
    generateForDate: generateForDate,
    ALLOWED_SIZES: ALLOWED_SIZES,
    REGROW_ATTEMPTS: REGROW_ATTEMPTS,
    PLACEMENT_ATTEMPTS: PLACEMENT_ATTEMPTS,
    REFINE_ATTEMPTS: REFINE_ATTEMPTS,
    findSolutions: findSolutions,
    regionContiguous: regionContiguous,
    refineToUnique: refineToUnique,
    blockedCells: blockedCells
  };
}
