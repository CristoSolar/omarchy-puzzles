import QtQuick
import "logic.js" as Logic

// Tablero de Mini Sudoku. La entrada no es clickear una celda sino elegirla y
// despues apretar un digito, asi que el Board guarda cual esta seleccionada y
// dibuja su propio teclado.
Item {
  id: root

  property var board: null
  property var cells: []
  property bool locked: false
  property var badCells: []
  property int selected: -1

  signal cellsEdited(var updated)
  signal solvedNow()

  readonly property int cellPixels: 46
  readonly property int drawnSize: board ? board.n : 0
  readonly property int gridPixels: drawnSize * cellPixels
  readonly property int padHeight: 44

  readonly property int contentWidth: gridPixels
  readonly property int contentHeight: gridPixels + padHeight + 12

  implicitWidth: contentWidth
  implicitHeight: contentHeight

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
    root.selected = -1
  }

  function select(index) {
    if (root.locked || root.isGiven(index)) return
    root.selected = root.selected === index ? -1 : index
  }

  // Sin celda elegida no escribe en ningun lado. Un digito repetido borra, para
  // no obligar a pasar por un boton de borrar.
  function setDigit(d) {
    if (root.locked || !root.board) return
    if (root.selected < 0 || root.isGiven(root.selected)) return

    var next = root.cells.slice()
    next[root.selected] = next[root.selected] === d ? 0 : d
    root.cells = next
    root.badCells = Logic.conflicts(root.board, next)
    root.cellsEdited(root.cells)
    if (Logic.isSolved(root.board, root.cells)) root.solvedNow()
  }

  Column {
    anchors.centerIn: parent
    spacing: 12

    // La grilla es un bloque continuo, con las lineas de caja mas marcadas que
    // las de celda.
    Item {
      width: root.gridPixels
      height: root.gridPixels

      Repeater {
        model: root.board ? root.drawnSize * root.drawnSize : 0

        Rectangle {
          id: celda
          required property int index
          readonly property int fila: Math.floor(celda.index / root.drawnSize)
          readonly property int col: celda.index % root.drawnSize

          x: celda.col * root.cellPixels
          y: celda.fila * root.cellPixels
          width: root.cellPixels
          height: root.cellPixels
          color: root.selected === celda.index ? "#4b5666"
                 : (root.isGiven(celda.index) ? "#2f3542" : "#3d4454")
          border.width: root.isBad(celda.index) ? 2 : 0
          border.color: "#e53935"

          Rectangle {
            anchors.right: parent.right
            width: (celda.col + 1) % Logic.BOX_W === 0 && celda.col + 1 < root.drawnSize ? 2 : 1
            height: parent.height
            color: width > 1 ? "#0f1115" : "#00000033"
          }

          Rectangle {
            anchors.bottom: parent.bottom
            height: (celda.fila + 1) % Logic.BOX_H === 0 && celda.fila + 1 < root.drawnSize ? 2 : 1
            width: parent.width
            color: height > 1 ? "#0f1115" : "#00000033"
          }

          Text {
            anchors.centerIn: parent
            text: root.cells[celda.index] > 0 ? root.cells[celda.index] : ""
            font.pixelSize: 22
            font.bold: root.isGiven(celda.index)
            color: root.isGiven(celda.index) ? "#ffd166" : "#e6e6e6"
          }

          MouseArea {
            anchors.fill: parent
            onClicked: root.select(celda.index)
          }
        }
      }
    }

    Row {
      anchors.horizontalCenter: parent.horizontalCenter
      spacing: 6

      Repeater {
        model: root.drawnSize

        Rectangle {
          id: tecla
          required property int index
          readonly property int digito: tecla.index + 1

          width: root.cellPixels - 4
          height: root.padHeight
          radius: 6
          color: hover.hovered && root.selected >= 0 ? "#4b5666" : "#39404e"
          opacity: root.selected >= 0 ? 1.0 : 0.45

          Text {
            anchors.centerIn: parent
            text: tecla.digito
            font.pixelSize: 20
            color: "#e6e6e6"
          }

          HoverHandler { id: hover }

          MouseArea {
            anchors.fill: parent
            onClicked: root.setDigit(tecla.digito)
          }
        }
      }
    }
  }
}
