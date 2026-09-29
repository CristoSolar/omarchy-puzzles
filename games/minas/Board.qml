import QtQuick
import qs.Commons
import "logic.js" as Logic

// Tablero de Buscaminas. Clic izquierdo destapa, clic derecho pone o saca
// bandera. Pisar una mina muestra todas por un segundo y vuelve al tablero
// inicial; el reloj de la carcasa sigue corriendo.
Item {
  id: root

  property var board: null
  property var cells: []
  property bool locked: false
  property var badCells: []
  // Mina pisada: se muestran todas y se ignora el input hasta el reinicio.
  property int boom: -1

  signal cellsEdited(var updated)
  signal solvedNow()

  readonly property int cellPixels: 34
  readonly property int drawnSize: board ? board.n : 0
  readonly property int sidePixels: drawnSize * cellPixels

  readonly property int contentWidth: sidePixels
  readonly property int contentHeight: sidePixels

  implicitWidth: sidePixels
  implicitHeight: sidePixels

  // Colores clasicos por numero, atenuados hacia el tema.
  readonly property var numberColors: ["transparent", "#4a90d9", "#3fa34d", "#d9534f", "#6f42c1",
                                       "#a0522d", "#17a2b8", "#555555", "#888888"]

  function adopt(incoming) {
    if (!root.board) return
    reinicio.stop()
    root.cells = incoming.slice()
    root.badCells = []
    root.boom = -1
  }

  function commit(next) {
    root.cells = next
    root.cellsEdited(root.cells)
    if (Logic.isSolved(root.board, root.cells)) root.solvedNow()
  }

  function open(index) {
    if (root.locked || root.boom >= 0 || !root.board) return
    if (root.cells[index] !== Logic.TAPADA) return
    var next = Logic.reveal(root.board, root.cells, index)
    if (next === null) {
      root.boom = index
      // La carcasa ya guarda el tablero inicial; aqui solo queda la muestra.
      root.cellsEdited(Logic.emptyCells(root.board))
      reinicio.restart()
      return
    }
    root.commit(next)
  }

  function toggleFlag(index) {
    if (root.locked || root.boom >= 0 || !root.board) return
    var v = root.cells[index]
    if (v === Logic.DESTAPADA) return
    var next = root.cells.slice()
    next[index] = v === Logic.BANDERA ? Logic.TAPADA : Logic.BANDERA
    root.cells = next
    root.cellsEdited(root.cells)
  }

  Timer {
    id: reinicio
    interval: 1000
    onTriggered: {
      root.adopt(Logic.emptyCells(root.board))
      root.cellsEdited(root.cells)
    }
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
        readonly property int estado: root.cells[celda.index] || 0
        readonly property bool mina: root.board ? Logic.isMine(root.board, celda.index) : false
        readonly property bool mostrarMina: celda.mina && (root.boom >= 0 || root.locked)
        readonly property int cuenta: root.board ? Logic.neighborCount(root.board, celda.index) : 0

        x: (celda.index % root.drawnSize) * root.cellPixels
        y: Math.floor(celda.index / root.drawnSize) * root.cellPixels
        width: root.cellPixels
        height: root.cellPixels
        color: celda.index === root.boom
          ? Color.urgent
          : (celda.estado === Logic.DESTAPADA
             ? Qt.rgba(Color.foreground.r, Color.foreground.g, Color.foreground.b, 0.04)
             : Qt.rgba(Color.foreground.r, Color.foreground.g, Color.foreground.b,
                       hover.hovered && !root.locked ? 0.22 : 0.14))
        border.width: 1
        border.color: Qt.rgba(Color.foreground.r, Color.foreground.g, Color.foreground.b, 0.10)

        Text {
          anchors.centerIn: parent
          font.pixelSize: 16
          font.bold: true
          text: celda.mostrarMina && celda.estado !== Logic.BANDERA ? "✹"
            : celda.estado === Logic.BANDERA ? "⚑"
            : (celda.estado === Logic.DESTAPADA && celda.cuenta > 0 ? celda.cuenta : "")
          color: celda.estado === Logic.BANDERA ? Color.accent
            : celda.mostrarMina ? Color.foreground
            : root.numberColors[celda.cuenta]
        }

        HoverHandler { id: hover }

        MouseArea {
          anchors.fill: parent
          acceptedButtons: Qt.LeftButton | Qt.RightButton
          onClicked: function (mouse) {
            if (mouse.button === Qt.RightButton) root.toggleFlag(celda.index)
            else root.open(celda.index)
          }
        }
      }
    }
  }
}
