import QtQuick
import "logic.js" as Logic

// Tablero de Zip. Se juega arrastrando: el camino se extiende a la celda vecina
// que toca el puntero, y retrocede si el puntero vuelve sobre la anteultima.
Item {
  id: root

  property var board: null
  property var cells: []
  property bool locked: false
  property var badCells: []

  signal cellsEdited(var updated)
  signal solvedNow()

  readonly property int cellPixels: 46
  readonly property int drawnSize: board ? board.n : 0
  readonly property int sidePixels: drawnSize * cellPixels

  readonly property int contentWidth: sidePixels
  readonly property int contentHeight: sidePixels

  implicitWidth: sidePixels
  implicitHeight: sidePixels

  readonly property var camino: root.cells.length > 0 ? Logic.pathOf(root.cells) : []

  function cellAt(px, py) {
    if (px < 0 || py < 0 || px >= root.sidePixels || py >= root.sidePixels) return -1
    var col = Math.floor(px / root.cellPixels)
    var fila = Math.floor(py / root.cellPixels)
    return fila * root.drawnSize + col
  }

  function adopt(incoming) {
    if (!root.board) return
    root.cells = incoming.slice()
    root.badCells = Logic.conflicts(root.board, root.cells)
  }

  function resetPath() {
    if (root.locked || !root.board) return
    root.cells = Logic.emptyCells(root.board)
    root.badCells = []
    root.cellsEdited(root.cells)
  }

  // Extiende el camino, o lo acorta si la celda es la anteultima. Cualquier otra
  // celda que no sea vecina de la punta se ignora, asi un arrastre rapido no
  // dibuja saltos.
  function extend(index) {
    if (root.locked || !root.board || index < 0) return
    var actual = root.camino
    var next = root.cells.slice()

    if (actual.length === 0) {
      next[index] = 1
      root.cells = next
      root.badCells = Logic.conflicts(root.board, next)
      root.cellsEdited(root.cells)
      return
    }

    var punta = actual[actual.length - 1]
    if (index === punta) return

    // Volver sobre la anteultima acorta: es el movimiento mas frecuente.
    if (actual.length >= 2 && index === actual[actual.length - 2]) {
      next[punta] = 0
      root.cells = next
      root.badCells = Logic.conflicts(root.board, next)
      root.cellsEdited(root.cells)
      return
    }

    if (next[index] !== 0) return
    if (!Logic.areAdjacent(punta, index, root.drawnSize)) return

    next[index] = actual.length + 1
    root.cells = next
    root.badCells = Logic.conflicts(root.board, next)
    root.cellsEdited(root.cells)
    if (Logic.isSolved(root.board, root.cells)) root.solvedNow()
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
        readonly property int numero: root.board ? root.board.checkpoints[celda.index] : 0
        readonly property bool enCamino: root.cells[celda.index] > 0
        readonly property bool esPunta: root.camino.length > 0
                                        && root.camino[root.camino.length - 1] === celda.index

        x: (celda.index % root.drawnSize) * root.cellPixels
        y: Math.floor(celda.index / root.drawnSize) * root.cellPixels
        width: root.cellPixels
        height: root.cellPixels
        color: celda.enCamino ? (celda.esPunta ? "#4f7cac" : "#3f5d7d") : "#3d4454"
        border.width: 1
        border.color: "#00000044"

        Rectangle {
          anchors.centerIn: parent
          visible: celda.numero > 0
          width: 30
          height: 30
          radius: 15
          color: "#ffd166"

          Text {
            anchors.centerIn: parent
            text: celda.numero
            font.pixelSize: 15
            font.bold: true
            color: "#1a1a1a"
          }
        }
      }
    }

    MouseArea {
      anchors.fill: parent
      enabled: !root.locked

      onPressed: function (mouse) {
        var idx = root.cellAt(mouse.x, mouse.y)
        // Empezar de nuevo desde el 1, o continuar el camino existente.
        if (root.camino.length === 0 || (root.board && root.board.checkpoints[idx] === 1)) {
          root.resetPath()
        }
        root.extend(idx)
      }

      onPositionChanged: function (mouse) {
        if (!pressed) return
        root.extend(root.cellAt(mouse.x, mouse.y))
      }
    }
  }
}
