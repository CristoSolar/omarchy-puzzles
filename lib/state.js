// Estado persistido de la plataforma. Funciones puras: quien las llama lee y
// escribe el archivo. La racha es global -- sube con el primer juego resuelto de
// cada dia -- y cada juego guarda aparte su historia.
//
// Sin `.pragma library` ni `.import`, por el mismo motivo que el resto de lib/.

var VERSION = 2;

function freshState() {
  return { version: VERSION, streak: 0, lastSolvedDay: '', games: {} };
}

function freshGame() {
  return { lastSolved: '', lastElapsedMs: 0, best: {}, inProgress: null };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readGame(raw) {
  var g = freshGame();
  if (!isPlainObject(raw)) return g;
  if (typeof raw.lastSolved === 'string') g.lastSolved = raw.lastSolved;
  if (typeof raw.lastElapsedMs === 'number' && isFinite(raw.lastElapsedMs) && raw.lastElapsedMs >= 0) {
    g.lastElapsedMs = raw.lastElapsedMs;
  }
  if (isPlainObject(raw.best)) {
    for (var key in raw.best) {
      var v = raw.best[key];
      if (typeof v === 'number' && isFinite(v) && v >= 0) g.best[key] = v;
    }
  }
  if (isPlainObject(raw.inProgress) && Array.isArray(raw.inProgress.cells)) {
    g.inProgress = {
      date: typeof raw.inProgress.date === 'string' ? raw.inProgress.date : '',
      cells: raw.inProgress.cells.slice(),
      elapsedMs: typeof raw.inProgress.elapsedMs === 'number' && raw.inProgress.elapsedMs >= 0
        ? raw.inProgress.elapsedMs : 0
    };
  }
  return g;
}

// Un archivo sin `version` es el de la epoca en que el plugin era solo Queens:
// la racha de arriba era la de Queens y ahora pasa a ser la global, y el resto
// de los campos bajan a games.queens. Corre sobre el objeto ya parseado, asi un
// archivo corrupto cae en el estado por defecto antes de llegar aca.
function migrateV1(raw) {
  var state = freshState();
  if (typeof raw.streak === 'number' && isFinite(raw.streak) && raw.streak >= 0) {
    state.streak = Math.floor(raw.streak);
  }
  if (typeof raw.lastSolved === 'string') state.lastSolvedDay = raw.lastSolved;
  state.games.queens = readGame(raw);
  return state;
}

function parseState(text) {
  var raw = null;
  if (typeof text === 'string' && text.trim() !== '') {
    try {
      raw = JSON.parse(text);
    } catch (e) {
      raw = null;
    }
  }
  if (!isPlainObject(raw)) return freshState();
  if (raw.version !== VERSION) return migrateV1(raw);

  var state = freshState();
  if (typeof raw.streak === 'number' && isFinite(raw.streak) && raw.streak >= 0) {
    state.streak = Math.floor(raw.streak);
  }
  if (typeof raw.lastSolvedDay === 'string') state.lastSolvedDay = raw.lastSolvedDay;
  if (isPlainObject(raw.games)) {
    // Un sub-estado de un juego que el registro no conoce se conserva tal cual:
    // el menu se arma desde el registro, no desde estas claves.
    for (var id in raw.games) state.games[id] = readGame(raw.games[id]);
  }
  return state;
}

function pad2(value) {
  return value < 10 ? '0' + value : '' + value;
}

function previousKey(key) {
  var parts = key.split('-');
  var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  d.setDate(d.getDate() - 1);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function copyState(state) {
  return JSON.parse(JSON.stringify(state));
}

function gameState(state, gameId) {
  return state.games[gameId] ? copyState(state).games[gameId] : freshGame();
}

function ensureGame(state, gameId) {
  if (!state.games[gameId]) state.games[gameId] = freshGame();
  return state.games[gameId];
}

// La racha es global y sube una vez por dia: el primer juego resuelto de la
// jornada la mueve, el segundo ya no.
function recordSolve(state, gameId, dateKey, elapsedMs, size) {
  var next = copyState(state);
  if (next.lastSolvedDay !== dateKey) {
    next.streak = next.lastSolvedDay === previousKey(dateKey) ? next.streak + 1 : 1;
    next.lastSolvedDay = dateKey;
  }

  var g = ensureGame(next, gameId);
  g.lastSolved = dateKey;
  g.lastElapsedMs = elapsedMs;
  var sizeKey = '' + size;
  if (typeof g.best[sizeKey] !== 'number' || elapsedMs < g.best[sizeKey]) {
    g.best[sizeKey] = elapsedMs;
  }
  g.inProgress = null;
  return next;
}

function saveInProgress(state, gameId, dateKey, cells, elapsedMs) {
  var next = copyState(state);
  ensureGame(next, gameId).inProgress = {
    date: dateKey, cells: cells.slice(), elapsedMs: elapsedMs
  };
  return next;
}

// El maximo lo declara cada juego con maxCellValue: Zip guarda la posicion de
// cada celda dentro del camino, asi que sus valores llegan hasta n*n y un tope
// fijo le descartaria cualquier partida de mas de ocho celdas.
function restoreInProgress(state, gameId, dateKey, cellCount, maxValue) {
  var g = state.games[gameId];
  var wip = g ? g.inProgress : null;
  if (!wip || wip.date !== dateKey) return null;
  if (!Array.isArray(wip.cells) || wip.cells.length !== cellCount) return null;
  var tope = typeof maxValue === 'number' && isFinite(maxValue) ? maxValue : 0;
  for (var i = 0; i < wip.cells.length; i++) {
    var v = wip.cells[i];
    if (typeof v !== 'number' || !isFinite(v) || v < 0 || v > tope) return null;
  }
  return wip.cells.slice();
}

function solvedOn(state, gameId, dateKey) {
  var g = state.games[gameId];
  return !!g && g.lastSolved === dateKey && dateKey !== '';
}

function pendingToday(state, gameIds, dateKey) {
  var out = [];
  for (var i = 0; i < gameIds.length; i++) {
    if (!solvedOn(state, gameIds[i], dateKey)) out.push(gameIds[i]);
  }
  return out;
}

function serializeState(state) {
  return JSON.stringify(state, null, 2);
}

if (typeof module !== 'undefined') {
  module.exports = {
    VERSION: VERSION,
    parseState: parseState,
    previousKey: previousKey,
    gameState: gameState,
    recordSolve: recordSolve,
    saveInProgress: saveInProgress,
    restoreInProgress: restoreInProgress,
    solvedOn: solvedOn,
    pendingToday: pendingToday,
    serializeState: serializeState
  };
}
