// Patches: cubrir la grilla con rectangulos que no se pisan. Cada rectangulo
// contiene exactamente una pista, su area es el numero de la pista y, si la
// pista trae forma, la respeta: cuadrado, mas ancho que alto o mas alto que
// ancho.
//
// Mismo contrato que los demas juegos y, como ellos, sin imports.

var VACIO = 0;
var AREA_MIN = 2;
var AREA_MAX = 8;
var INTENTOS = 200;

var meta = {
  id: 'patches',
  name: 'Patches',
  icon: '▦',
  sizes: [6],
  defaultSize: 6,
  blurb: 'Cubre la grilla con rectangulos, cada uno con su pista, su area y su forma.'
};

function rowOf(i, n) { return Math.floor(i / n); }
function colOf(i, n) { return i % n; }

function shapeOf(w, h) {
  if (w === h) return 'square';
  return w > h ? 'wide' : 'tall';
}

function fitsShape(shape, w, h) {
  return shape === 'any' || shape === shapeOf(w, h);
}

// Las celdas de cada pista, agrupadas por id (indice de pista + 1).
function cellsById(board, cells) {
  var grupos = {};
  for (var i = 0; i < board.n * board.n; i++) {
    var id = cells[i];
    if (id === VACIO) continue;
    if (!grupos[id]) grupos[id] = [];
    grupos[id].push(i);
  }
  return grupos;
}

// Un grupo esta mal si no es un rectangulo lleno, si no contiene su pista, o si
// su area o su forma no calzan con ella. El input solo crea rectangulos
// enteros, asi que un grupo a medias no aparece en la practica, pero una
// partida guardada a mano podria traerlo.
function conflicts(board, cells) {
  var n = board.n;
  var grupos = cellsById(board, cells);
  var malo = {};

  for (var id in grupos) {
    var celdas = grupos[id];
    var pista = board.clues[id - 1];
    var f0 = n, f1 = -1, c0 = n, c1 = -1;
    for (var k = 0; k < celdas.length; k++) {
      var f = rowOf(celdas[k], n), c = colOf(celdas[k], n);
      if (f < f0) f0 = f;
      if (f > f1) f1 = f;
      if (c < c0) c0 = c;
      if (c > c1) c1 = c;
    }
    var w = c1 - c0 + 1, h = f1 - f0 + 1;
    var bien = pista
      && celdas.length === w * h
      && cells[pista.cell] === Number(id)
      && pista.area === w * h
      && fitsShape(pista.shape, w, h);
    if (!bien) {
      for (var m = 0; m < celdas.length; m++) malo[celdas[m]] = true;
    }
  }

  var out = [];
  for (var i = 0; i < n * n; i++) {
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

// Dibuja el rectangulo entre dos celdas. Si contiene exactamente una pista se
// asigna a ella: su rectangulo anterior se borra, y tambien todo rectangulo que
// el nuevo pise. Con cero o varias pistas devuelve null y no cambia nada.
function placeRect(board, cells, a, b) {
  var n = board.n;
  var f0 = Math.min(rowOf(a, n), rowOf(b, n)), f1 = Math.max(rowOf(a, n), rowOf(b, n));
  var c0 = Math.min(colOf(a, n), colOf(b, n)), c1 = Math.max(colOf(a, n), colOf(b, n));

  function dentro(i) {
    var f = rowOf(i, n), c = colOf(i, n);
    return f >= f0 && f <= f1 && c >= c0 && c <= c1;
  }

  var pistaId = -1;
  for (var k = 0; k < board.clues.length; k++) {
    if (!dentro(board.clues[k].cell)) continue;
    if (pistaId !== -1) return null;
    pistaId = k + 1;
  }
  if (pistaId === -1) return null;

  var pisados = {};
  pisados[pistaId] = true;
  var i;
  for (i = 0; i < n * n; i++) {
    if (dentro(i) && cells[i] !== VACIO) pisados[cells[i]] = true;
  }

  var next = cells.slice();
  for (i = 0; i < n * n; i++) {
    if (pisados[next[i]]) next[i] = VACIO;
    if (dentro(i)) next[i] = pistaId;
  }
  return next;
}

// Borra el rectangulo entero al que pertenece la celda.
function eraseAt(board, cells, index) {
  var id = cells[index];
  var next = cells.slice();
  if (id === VACIO) return next;
  for (var i = 0; i < next.length; i++) {
    if (next[i] === id) next[i] = VACIO;
  }
  return next;
}

// Backtracking sobre la primera celda vacia en orden de lectura: todo lo que
// esta antes ya esta cubierto, asi que esa celda es la esquina superior
// izquierda de su rectangulo y solo hay que probar anchos y altos.
function countSolutions(board, limit) {
  var n = board.n;
  var pistaEn = [];
  var i;
  for (i = 0; i < n * n; i++) pistaEn.push(-1);
  for (i = 0; i < board.clues.length; i++) pistaEn[board.clues[i].cell] = i;

  var cubierta = [];
  for (i = 0; i < n * n; i++) cubierta.push(false);
  var found = 0;

  function marcar(f, c, w, h, valor) {
    for (var y = f; y < f + h; y++) {
      for (var x = c; x < c + w; x++) cubierta[y * n + x] = valor;
    }
  }

  function fill(desde) {
    if (found >= limit) return;
    var idx = desde;
    while (idx < n * n && cubierta[idx]) idx++;
    if (idx === n * n) {
      found++;
      return;
    }
    var f = rowOf(idx, n), c = colOf(idx, n);

    for (var h = 1; f + h <= n; h++) {
      for (var w = 1; c + w <= n; w++) {
        // Si la fila de abajo choca con algo cubierto, ningun ancho mayor sirve.
        var libre = true, pista = -1, dobles = false;
        for (var y = f; y < f + h && libre; y++) {
          for (var x = c; x < c + w; x++) {
            var j = y * n + x;
            if (cubierta[j]) { libre = false; break; }
            if (pistaEn[j] !== -1) {
              if (pista !== -1) dobles = true;
              pista = pistaEn[j];
            }
          }
        }
        if (!libre) break;
        if (dobles) break;
        if (pista === -1) continue;
        var dada = board.clues[pista];
        if (dada.area !== w * h || !fitsShape(dada.shape, w, h)) continue;

        marcar(f, c, w, h, true);
        fill(idx + 1);
        marcar(f, c, w, h, false);
        if (found >= limit) return;
      }
    }
  }

  fill(0);
  return found;
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

// Particion aleatoria: desde la primera celda libre, un rectangulo al azar que
// quepa en lo libre con area entre AREA_MIN y AREA_MAX. Devuelve la lista de
// rectangulos, o null si una celda quedo encerrada sin lugar para uno.
function randomPartition(rand, n) {
  var usada = [];
  var i;
  for (i = 0; i < n * n; i++) usada.push(false);
  var rects = [];

  for (var idx = 0; idx < n * n; idx++) {
    if (usada[idx]) continue;
    var f = rowOf(idx, n), c = colOf(idx, n);
    var opciones = [];
    for (var h = 1; f + h <= n; h++) {
      for (var w = 1; c + w <= n; w++) {
        var libre = true;
        for (var y = f; y < f + h && libre; y++) {
          for (var x = c; x < c + w; x++) {
            if (usada[y * n + x]) { libre = false; break; }
          }
        }
        if (!libre) break;
        if (w * h >= AREA_MIN && w * h <= AREA_MAX) opciones.push({ f: f, c: c, w: w, h: h });
      }
    }
    if (opciones.length === 0) return null;
    var r = opciones[Math.floor(rand() * opciones.length)];
    for (var yy = r.f; yy < r.f + r.h; yy++) {
      for (var xx = r.c; xx < r.c + r.w; xx++) usada[yy * n + xx] = true;
    }
    rects.push(r);
  }
  return rects;
}

// Particion al azar, una pista por rectangulo en una celda al azar, la forma
// revelada la mitad de las veces. Si quedan varias soluciones se revelan formas
// ocultas de a una; si ni con todas queda unica, se descarta y se reintenta.
function generate(rand, size) {
  if (!isAllowedSize(size)) {
    throw new Error('tamano no permitido: ' + String(size) + ' (use 6)');
  }
  var n = size;

  for (var intento = 0; intento < INTENTOS; intento++) {
    var rects = randomPartition(rand, n);
    if (!rects) continue;

    var clues = [];
    var solution = [];
    var i;
    for (i = 0; i < n * n; i++) solution.push(VACIO);
    for (i = 0; i < rects.length; i++) {
      var r = rects[i];
      var dx = Math.floor(rand() * r.w), dy = Math.floor(rand() * r.h);
      clues.push({
        cell: (r.f + dy) * n + (r.c + dx),
        area: r.w * r.h,
        shape: rand() < 0.5 ? shapeOf(r.w, r.h) : 'any'
      });
      for (var y = r.f; y < r.f + r.h; y++) {
        for (var x = r.c; x < r.c + r.w; x++) solution[y * n + x] = i + 1;
      }
    }

    var board = { n: n, clues: clues, solution: solution };
    var ocultas = [];
    for (i = 0; i < clues.length; i++) {
      if (clues[i].shape === 'any') ocultas.push(i);
    }
    ocultas = shuffledLocal(ocultas, rand);

    while (countSolutions(board, 2) !== 1 && ocultas.length > 0) {
      var k = ocultas.pop();
      clues[k].shape = shapeOf(rects[k].w, rects[k].h);
    }
    if (countSolutions(board, 2) === 1) return board;
  }
  throw new Error('no se pudo generar un Patches unico');
}

function emptyCells(board) {
  var out = [];
  for (var i = 0; i < board.n * board.n; i++) out.push(VACIO);
  return out;
}

function solvedCells(board) {
  return board.solution.slice();
}

function maxCellValue(board) {
  return board.clues.length;
}

if (typeof module !== 'undefined') {
  module.exports = {
    VACIO: VACIO,
    meta: meta,
    shapeOf: shapeOf,
    fitsShape: fitsShape,
    conflicts: conflicts,
    isSolved: isSolved,
    placeRect: placeRect,
    eraseAt: eraseAt,
    countSolutions: countSolutions,
    generate: generate,
    emptyCells: emptyCells,
    solvedCells: solvedCells,
    maxCellValue: maxCellValue
  };
}
