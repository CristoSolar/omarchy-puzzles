// Transiciones del estado persistido. Funciones puras: quien las llama se
// encarga de leer y escribir el archivo. Eso mantiene la logica de rachas
// probable sin tocar disco.
//
// Sin `.pragma library`, por el mismo motivo que en queens.js.

var DEFAULT_STATE = { lastSolved: '', streak: 0, best: {}, inProgress: null };

function freshState() {
  return { lastSolved: '', streak: 0, best: {}, inProgress: null };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Nunca lanza: el archivo puede no existir, estar vacio o haber quedado
// truncado por un corte. En todos esos casos se arranca de cero.
function parseState(text) {
  var raw = null;
  if (typeof text === 'string' && text.trim() !== '') {
    try {
      raw = JSON.parse(text);
    } catch (e) {
      raw = null;
    }
  }
  var state = freshState();
  if (!isPlainObject(raw)) return state;

  if (typeof raw.lastSolved === 'string') state.lastSolved = raw.lastSolved;
  if (typeof raw.streak === 'number' && isFinite(raw.streak) && raw.streak >= 0) {
    state.streak = Math.floor(raw.streak);
  }
  if (isPlainObject(raw.best)) {
    for (var key in raw.best) {
      if (typeof raw.best[key] === 'number' && isFinite(raw.best[key])) {
        state.best[key] = raw.best[key];
      }
    }
  }
  if (isPlainObject(raw.inProgress) && Array.isArray(raw.inProgress.cells)) {
    state.inProgress = {
      date: typeof raw.inProgress.date === 'string' ? raw.inProgress.date : '',
      cells: raw.inProgress.cells.slice(),
      elapsedMs: typeof raw.inProgress.elapsedMs === 'number' ? raw.inProgress.elapsedMs : 0
    };
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
  return {
    lastSolved: state.lastSolved,
    streak: state.streak,
    best: JSON.parse(JSON.stringify(state.best)),
    inProgress: state.inProgress ? {
      date: state.inProgress.date,
      cells: state.inProgress.cells.slice(),
      elapsedMs: state.inProgress.elapsedMs
    } : null
  };
}

// La racha sube solo si el ultimo resuelto es el dia anterior. Cualquier otra
// cosa -- hueco, primera vez, o un lastSolved en el futuro por un reloj mal
// puesto -- vuelve a 1.
function recordSolve(state, dateKey, elapsedMs, n) {
  var next = copyState(state);
  if (next.lastSolved !== dateKey) {
    next.streak = next.lastSolved === previousKey(dateKey) ? next.streak + 1 : 1;
    next.lastSolved = dateKey;
  }
  var sizeKey = '' + n;
  var previo = next.best[sizeKey];
  if (typeof previo !== 'number' || elapsedMs < previo) next.best[sizeKey] = elapsedMs;
  next.inProgress = null;
  return next;
}

function saveInProgress(state, dateKey, cells, elapsedMs) {
  var next = copyState(state);
  next.inProgress = { date: dateKey, cells: cells.slice(), elapsedMs: elapsedMs };
  return next;
}

// Devuelve las celdas solo si corresponden a hoy y al tamano actual: cambiar
// de tamano o cruzar la medianoche descarta la partida a medias en vez de
// pintarla sobre un tablero distinto.
function restoreInProgress(state, dateKey, n) {
  var wip = state.inProgress;
  if (!wip || wip.date !== dateKey) return null;
  if (!Array.isArray(wip.cells) || wip.cells.length !== n * n) return null;
  for (var i = 0; i < wip.cells.length; i++) {
    var v = wip.cells[i];
    if (v !== 0 && v !== 1 && v !== 2) return null;
  }
  return wip.cells.slice();
}

function serializeState(state) {
  return JSON.stringify(state, null, 2);
}

if (typeof module !== 'undefined') {
  module.exports = {
    DEFAULT_STATE: DEFAULT_STATE,
    parseState: parseState,
    previousKey: previousKey,
    recordSolve: recordSolve,
    saveInProgress: saveInProgress,
    restoreInProgress: restoreInProgress,
    serializeState: serializeState
  };
}
