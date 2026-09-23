import QtQuick
import qs.Commons
import "logic.js" as Logic

// Tablero de Tango. Las celdas se posicionan a mano porque las restricciones se
// dibujan entre ellas, sobre la juntura, y eso no sale de un Grid.
Item {
  id: root

  property var board: null
  property var cells: []
  property bool locked: false
  property var badCells: []

  signal cellsEdited(var updated)
  signal solvedNow()

  readonly property int cellPixels: 46
  readonly property int gap: 8
  readonly property int drawnSize: board ? board.n : 0
  readonly property int sidePixels: drawnSize * cellPixels + Math.max(0, drawnSize - 1) * gap

  readonly property int contentWidth: sidePixels
  readonly property int contentHeight: sidePixels

  implicitWidth: sidePixels
  implicitHeight: sidePixels

  function cellX(index) { return (index % root.drawnSize) * (root.cellPixels + root.gap) }
  function cellY(index) { return Math.floor(index / root.drawnSize) * (root.cellPixels + root.gap) }

  function isGiven(index) {
    return root.board ? root.board.givens[index] !== 0 : false
  }

  function isBad(index) {
    for (var i = 0; i < root.badCells.length; i++) {
      if (root.badCells[i] === index) return true
    }
    return false
  }

  function adopt(incoming) {
    if (!root.board) return
    root.cells = incoming.slice()
    root.badCells = Logic.conflicts(root.board, root.cells)
  }

  // Las dadas no se editan: un clic sobre una no hace nada.
  function cycle(index) {
    if (root.locked || !root.board || root.isGiven(index)) return
    var next = root.cells.slice()
    next[index] = (next[index] + 1) % 3
    root.cells = next
    root.badCells = Logic.conflicts(root.board, next)
    root.cellsEdited(root.cells)
    if (Logic.isSolved(root.board, root.cells)) root.solvedNow()
  }

  function simbolo(valor) {
    return valor === 1 ? "☀" : (valor === 2 ? "☾" : "")
  }

  Item {
    anchors.centerIn: parent
    width: root.sidePixels
    height: root.sidePixels

    Repeater {
      model: root.board ? root.drawnSize * root.drawnSize : 0

      Rectangle {
        id: celda
        required property int index
        x: root.cellX(celda.index)
        y: root.cellY(celda.index)
        width: root.cellPixels
        height: root.cellPixels
        radius: 6
        // Fondo del tema; las dadas se asientan un poco mas que las libres.
        color: root.isGiven(celda.index)
          ? Qt.rgba(Color.accent.r, Color.accent.g, Color.accent.b, 0.13)
          : Qt.rgba(Color.foreground.r, Color.foreground.g, Color.foreground.b, 0.06)
        border.width: root.isBad(celda.index) ? 3 : 1
        border.color: root.isBad(celda.index)
          ? Color.urgent
          : Qt.rgba(Color.accent.r, Color.accent.g, Color.accent.b, 0.22)

        Text {
          anchors.centerIn: parent
          text: root.simbolo(root.cells[celda.index])
          font.pixelSize: 26
          // Las dadas van en acento; lo que pone el jugador, en el color de texto.
          color: root.isGiven(celda.index) ? Color.accent : Color.foreground
          opacity: root.isGiven(celda.index) ? 1.0 : 0.88
        }

        MouseArea {
          anchors.fill: parent
          enabled: !root.isGiven(celda.index)
          onClicked: root.cycle(celda.index)
        }
      }
    }

    Repeater {
      model: root.board ? root.board.constraints.length : 0

      Text {
        id: marca
        required property int index
        readonly property var c: root.board.constraints[marca.index]
        readonly property bool horizontal: (marca.c.b - marca.c.a) === 1

        x: root.cellX(marca.c.a)
           + (marca.horizontal ? root.cellPixels + root.gap / 2 : root.cellPixels / 2)
           - width / 2
        y: root.cellY(marca.c.a)
           + (marca.horizontal ? root.cellPixels / 2 : root.cellPixels + root.gap / 2)
           - height / 2
        text: marca.c.eq ? "=" : "×"
        font.pixelSize: 14
        font.bold: true
        color: Color.accent
      }
    }
  }
}
