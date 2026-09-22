// Logica de Queens. JavaScript plano: no importa nada de QML y no toca disco,
// asi los tests corren con `node --test` sin levantar el shell.
//
// Sin `.pragma library` a proposito: esa directiva es exclusiva de QML y Node
// no la parsea, y como aca no hay estado de modulo, lo unico que costaria es
// una instancia del script por componente QML que lo importe.

// PRNG de 32 bits. Con la misma semilla da siempre la misma secuencia, que es
// lo que hace que el puzzle del dia sea el mismo en cada apertura.
function mulberry32(seed) {
  var state = seed >>> 0;
  return function () {
    state = (state + 0x6D2B79F5) >>> 0;
    var t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(text) {
  var h = 2166136261;
  for (var i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pad2(value) {
  return value < 10 ? '0' + value : '' + value;
}

// Fecha LOCAL, no UTC: con UTC el puzzle del dia cambiaria a una medianoche
// que no es la del usuario.
function dateKey(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

function seedForDate(date) {
  return hashString(dateKey(date));
}

function shuffled(values, rand) {
  var out = values.slice();
  for (var i = out.length - 1; i > 0; i--) {
    var j = Math.floor(rand() * (i + 1));
    var tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

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

if (typeof module !== 'undefined') {
  module.exports = {
    mulberry32: mulberry32,
    hashString: hashString,
    dateKey: dateKey,
    seedForDate: seedForDate,
    shuffled: shuffled,
    randomPlacement: randomPlacement,
    countSolutions: countSolutions,
    conflicts: conflicts,
    isSolved: isSolved
  };
}
