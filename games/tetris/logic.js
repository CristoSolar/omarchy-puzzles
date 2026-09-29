// Tetris con meta diaria: limpiar 20 lineas con la secuencia de piezas del dia.
// No hay grilla que resolver, asi que del contrato solo importan `generate` y
// `meta`; el resto existe para que la carcasa lo trate como a los demas. La
// partida vive en un `run` que el tablero avanza con las funciones de abajo,
// todas puras: devuelven un run nuevo sin tocar el anterior.
//
// Sin imports, como los demas juegos.

var ANCHO = 10, ALTO = 20, META = 20;
var BOLSAS = 86;

var meta = {
  id: 'tetris',
  name: 'Tetris',
  icon: '▤',
  sizes: [10],
  defaultSize: 10,
  blurb: 'Limpia 20 lineas con las piezas del dia.'
};

// Cada pieza en su caja de `size` x `size`, como pares [x, y]. Rotar es girar
// dentro de esa caja.
var PIECES = [
  { name: 'I', size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  { name: 'O', size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { name: 'T', size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  { name: 'S', size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  { name: 'Z', size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { name: 'J', size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { name: 'L', size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] }
];

// Posiciones absolutas de los cuatro bloques de una pieza en juego.
function blocksOf(piece) {
  var forma = PIECES[piece.kind];
  var out = [];
  for (var k = 0; k < forma.cells.length; k++) {
    var x = forma.cells[k][0], y = forma.cells[k][1];
    for (var r = 0; r < piece.rot; r++) {
      var tmp = x;
      x = forma.size - 1 - y;
      y = tmp;
    }
    out.push([piece.x + x, piece.y + y]);
  }
  return out;
}

function fits(board, field, piece) {
  var bloques = blocksOf(piece);
  for (var k = 0; k < bloques.length; k++) {
    var x = bloques[k][0], y = bloques[k][1];
    if (x < 0 || x >= board.w || y < 0 || y >= board.h) return false;
    if (field[y * board.w + x] !== 0) return false;
  }
  return true;
}

function spawn(board, kind) {
  return { kind: kind, rot: 0, x: Math.floor((board.w - PIECES[kind].size) / 2), y: 0 };
}

function copyRun(run, cambios) {
  var out = { field: run.field, piece: run.piece, index: run.index, lines: run.lines, over: run.over };
  for (var k in cambios) out[k] = cambios[k];
  return out;
}

function newRun(board) {
  var field = [];
  for (var i = 0; i < board.w * board.h; i++) field.push(0);
  return { field: field, piece: spawn(board, board.queue[0]), index: 0, lines: 0, over: false };
}

function nextKind(board, run) {
  return board.queue[(run.index + 1) % board.queue.length];
}

function tryPiece(board, run, piece) {
  if (run.over || !fits(board, run.field, piece)) return run;
  return copyRun(run, { piece: piece });
}

function move(board, run, dx) {
  var p = run.piece;
  return tryPiece(board, run, { kind: p.kind, rot: p.rot, x: p.x + dx, y: p.y });
}

// Rotacion horaria. Si choca prueba correrse una columna a cada lado (dos para
// la I, que es mas larga), asi se puede rotar pegado a la pared.
function rotate(board, run) {
  if (run.over) return run;
  var p = run.piece;
  var kicks = PIECES[p.kind].size === 4 ? [0, -1, 1, -2, 2] : [0, -1, 1];
  for (var k = 0; k < kicks.length; k++) {
    var giro = { kind: p.kind, rot: (p.rot + 1) % 4, x: p.x + kicks[k], y: p.y };
    if (fits(board, run.field, giro)) return copyRun(run, { piece: giro });
  }
  return run;
}

// Fija la pieza, limpia filas completas y saca la siguiente de la cola. Si la
// nueva no entra al aparecer, la corrida termina. La cola da la vuelta si se
// acaba.
function lock(board, run) {
  var field = run.field.slice();
  var bloques = blocksOf(run.piece);
  for (var k = 0; k < bloques.length; k++) {
    field[bloques[k][1] * board.w + bloques[k][0]] = run.piece.kind + 1;
  }

  var quedan = [];
  var limpias = 0;
  for (var y = 0; y < board.h; y++) {
    var fila = field.slice(y * board.w, (y + 1) * board.w);
    var llena = true;
    for (var x = 0; x < board.w; x++) {
      if (fila[x] === 0) { llena = false; break; }
    }
    if (llena) limpias++;
    else quedan = quedan.concat(fila);
  }
  var nuevo = [];
  for (var i = 0; i < limpias * board.w; i++) nuevo.push(0);
  field = nuevo.concat(quedan);

  var index = (run.index + 1) % board.queue.length;
  var piece = spawn(board, board.queue[index]);
  return {
    field: field,
    piece: piece,
    index: index,
    lines: run.lines + limpias,
    over: !fits(board, field, piece)
  };
}

// Baja una fila; si no puede, fija.
function softDrop(board, run) {
  if (run.over) return run;
  var p = run.piece;
  var abajo = { kind: p.kind, rot: p.rot, x: p.x, y: p.y + 1 };
  if (fits(board, run.field, abajo)) return copyRun(run, { piece: abajo });
  return lock(board, run);
}

function hardDrop(board, run) {
  if (run.over) return run;
  var p = run.piece;
  var y = p.y;
  while (fits(board, run.field, { kind: p.kind, rot: p.rot, x: p.x, y: y + 1 })) y++;
  return lock(board, copyRun(run, { piece: { kind: p.kind, rot: p.rot, x: p.x, y: y } }));
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

// La cola del dia sale entera de aca, en bolsas de 7: cada bolsa trae las siete
// piezas barajadas, asi nunca hay sequias largas de una pieza.
function generate(rand, size) {
  if (size !== ANCHO) {
    throw new Error('tamano no permitido: ' + String(size) + ' (use 10)');
  }
  var queue = [];
  for (var b = 0; b < BOLSAS; b++) {
    queue = queue.concat(shuffledLocal([0, 1, 2, 3, 4, 5, 6], rand));
  }
  return { w: ANCHO, h: ALTO, goal: META, queue: queue };
}

// Del contrato de grilla, Tetris no guarda nada: la corrida no se persiste y
// resolver lo decide el tablero al llegar a la meta.
function conflicts(board, cells) { return []; }
function isSolved(board, cells) { return false; }
function emptyCells(board) { return []; }
function solvedCells(board) { return []; }
function maxCellValue(board) { return 0; }

if (typeof module !== 'undefined') {
  module.exports = {
    PIECES: PIECES,
    meta: meta,
    blocksOf: blocksOf,
    fits: fits,
    newRun: newRun,
    nextKind: nextKind,
    move: move,
    rotate: rotate,
    softDrop: softDrop,
    hardDrop: hardDrop,
    generate: generate,
    conflicts: conflicts,
    isSolved: isSolved,
    emptyCells: emptyCells,
    solvedCells: solvedCells,
    maxCellValue: maxCellValue
  };
}
