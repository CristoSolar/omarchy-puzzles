// Que juegos existen. Lista literal a proposito: el motor JS de QML no lista
// directorios, y cuatro entradas no necesitan descubrimiento dinamico. Agregar
// un juego es agregar una carpeta y una linea aca, mas su import en
// GameRegistry.qml.
//
// Los textos estan duplicados desde el `meta` de cada logic.js porque este
// archivo no puede importarlo; test/registry.test.js verifica que no se
// desincronicen.

var GAMES = [
  {
    id: 'queens',
    name: 'Queens',
    icon: '♛',
    blurb: 'Una reina por fila, columna y region, sin que dos se toquen.',
    board: 'games/queens/Board.qml'
  },
  {
    id: 'tango',
    name: 'Tango',
    icon: '\u2600',
    blurb: 'Mitad soles y mitad lunas por fila y columna, sin tres seguidos.',
    board: 'games/tango/Board.qml'
  },
  {
    id: 'sudoku',
    name: 'Mini Sudoku',
    icon: '\u0023',
    blurb: 'Los digitos del 1 al 6, sin repetir por fila, columna ni caja.',
    board: 'games/sudoku/Board.qml'
  }
];

function ids() {
  var out = [];
  for (var i = 0; i < GAMES.length; i++) out.push(GAMES[i].id);
  return out;
}

function byId(id) {
  for (var i = 0; i < GAMES.length; i++) {
    if (GAMES[i].id === id) return GAMES[i];
  }
  return null;
}

if (typeof module !== 'undefined') {
  module.exports = { GAMES: GAMES, ids: ids, byId: byId };
}
