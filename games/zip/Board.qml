import QtQuick
import qs.Commons
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

  readonly property int trazo: 16

  function cellCenterX(index) {
    return (index % root.drawnSize + 0.5) * root.cellPixels
  }

  function cellCenterY(index) {
    return (Math.floor(index / root.drawnSize) + 0.5) * root.cellPixels
  }

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

    // Tres capas: las celdas de fondo, la linea del camino, y los numeros
    // encima. El camino se dibuja como tramos entre centros de celdas vecinas,
    // con las puntas redondeadas: dos tramos que se cruzan en una celda dejan
    // la esquina continua sin dibujar nada extra.
    Repeater {
      model: root.board ? root.drawnSize * root.drawnSize : 0

      Rectangle {
        required property int index
        x: (index % root.drawnSize) * root.cellPixels
        y: Math.floor(index / root.drawnSize) * root.cellPixels
        width: root.cellPixels
        height: root.cellPixels
        color: "transparent"
        border.width: 1
        border.color: Qt.rgba(Color.foreground.r, Color.foreground.g, Color.foreground.b, 0.15)
      }
    }

    Repeater {
      model: Math.max(0, root.camino.length - 1)

      Rectangle {
        id: tramo
        required property int index
        readonly property int desde: root.camino[tramo.index]
        readonly property int hasta: root.camino[tramo.index + 1]
        readonly property bool horizontal:
          Math.floor(tramo.desde / root.drawnSize) === Math.floor(tramo.hasta / root.drawnSize)

        readonly property real x1: root.cellCenterX(tramo.desde)
        readonly property real y1: root.cellCenterY(tramo.desde)
        readonly property real x2: root.cellCenterX(tramo.hasta)
        readonly property real y2: root.cellCenterY(tramo.hasta)

        x: Math.min(tramo.x1, tramo.x2) - (tramo.horizontal ? 0 : root.trazo / 2)
        y: Math.min(tramo.y1, tramo.y2) - (tramo.horizontal ? root.trazo / 2 : 0)
        width: tramo.horizontal ? Math.abs(tramo.x2 - tramo.x1) : root.trazo
        height: tramo.horizontal ? root.trazo : Math.abs(tramo.y2 - tramo.y1)
        color: Color.accent
      }
    }

    // Tapones redondeados en cada celda del camino: cierran las esquinas y le
    // dan punta al arranque y al final.
    Repeater {
      model: root.camino.length

      Rectangle {
        required property int index
        readonly property int celda: root.camino[index]
        readonly property bool esPunta: index === root.camino.length - 1

        x: root.cellCenterX(celda) - root.trazo / 2
        y: root.cellCenterY(celda) - root.trazo / 2
        width: root.trazo
        height: root.trazo
        radius: root.trazo / 2
        color: Color.accent
        scale: esPunta ? 1.35 : 1.0

        Behavior on scale {
          NumberAnimation { duration: 90 }
        }
      }
    }

    Repeater {
      model: root.board ? root.drawnSize * root.drawnSize : 0

      Rectangle {
        id: numero
        required property int index
        readonly property int valor: root.board ? root.board.checkpoints[numero.index] : 0

        visible: numero.valor > 0
        x: root.cellCenterX(numero.index) - width / 2
        y: root.cellCenterY(numero.index) - height / 2
        width: 30
        height: 30
        radius: 15
        color: Color.accent
        border.width: 2
        border.color: Color.background

        Text {
          anchors.centerIn: parent
          text: numero.valor
          font.pixelSize: 15
          font.bold: true
          color: Color.background
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
