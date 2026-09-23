import QtQuick
import "logic.js" as Logic

// Tablero de Queens. Solo sabe de su juego: importa su propia logica -- pasarla
// por propiedad no funciona, el namespace de un modulo JS de QML no sobrevive
// la asignacion entre componentes -- y avisa cuando cambian las celdas o cuando
// el puzzle quedo resuelto. No toca disco ni conoce la racha.
Item {
  id: root

  property var board: null
  property var cells: []
  property bool locked: false

  property var badCells: []
  property var manualMarks: []
  property var autoMarks: []

  signal cellsEdited(var updated)
  signal solvedNow()

  readonly property int cellPixels: 44
  readonly property int drawnSize: board ? board.n : 0
  readonly property int boardPixels: drawnSize * cellPixels + Math.max(0, drawnSize - 1) * 2

  readonly property int contentWidth: boardPixels
  readonly property int contentHeight: boardPixels

  implicitWidth: boardPixels
  implicitHeight: boardPixels

  // Reconstruye la grilla visible: reinas, X propias y X deducidas de las reinas
  // presentes. Entera en cada clic, asi sacar una reina limpia sus marcas sin
  // llevar contabilidad incremental.
  function recompute(queenCells) {
    var next = queenCells.slice()
    var i
    for (i = 0; i < next.length; i++) {
      if (next[i] === 1) next[i] = 0
    }
    for (i = 0; i < root.manualMarks.length; i++) {
      if (next[root.manualMarks[i]] === 0) next[root.manualMarks[i]] = 1
    }

    var auto = Logic.blockedCells(root.board, next)
    var autos = []
    for (i = 0; i < auto.length; i++) {
      if (next[auto[i]] === 0) {
        next[auto[i]] = 1
        autos.push(auto[i])
      }
    }
    root.autoMarks = autos
    root.cells = next
    root.badCells = Logic.conflicts(root.board, next)
  }

  // Al recibir celdas de la carcasa (partida restaurada o juego nuevo), las X
  // guardadas son las propias; las deducidas se recalculan.
  function adopt(incoming) {
    if (!root.board) return
    var marcas = []
    for (var i = 0; i < incoming.length; i++) {
      if (incoming[i] === 1) marcas.push(i)
    }
    root.manualMarks = marcas
    root.autoMarks = []
    recompute(incoming)
  }

  function isAuto(index) {
    for (var i = 0; i < root.autoMarks.length; i++) {
      if (root.autoMarks[i] === index) return true
    }
    return false
  }

  function isBad(index) {
    for (var i = 0; i < root.badCells.length; i++) {
      if (root.badCells[i] === index) return true
    }
    return false
  }

  // Tonos repartidos por razon aurea con luminosidad alternada, para que dos
  // regiones vecinas no se confundan.
  function regionColor(region) {
    var hue = (region * 0.61803398875 + 0.08) % 1.0
    var light = region % 2 === 0 ? 0.70 : 0.56
    return Qt.hsla(hue, 0.45, light, 1.0)
  }

  function cycle(index) {
    if (root.locked || !root.board) return
    var next = root.cells.slice()
    var era = next[index]
    next[index] = (era + 1) % 3

    // Una X deducida clickeada se vuelve propia, no se saltea.
    if (era === 1 && root.isAuto(index)) next[index] = 1

    var marcas = []
    for (var i = 0; i < root.manualMarks.length; i++) {
      if (root.manualMarks[i] !== index) marcas.push(root.manualMarks[i])
    }
    if (next[index] === 1) marcas.push(index)
    root.manualMarks = marcas

    recompute(next)
    root.cellsEdited(root.cells)
    if (Logic.isSolved(root.board, root.cells)) root.solvedNow()
  }

  Grid {
    anchors.centerIn: parent
    visible: root.board !== null
    columns: root.drawnSize
    spacing: 2

    Repeater {
      model: root.board ? root.drawnSize * root.drawnSize : 0

      Rectangle {
        id: cell
        required property int index
        width: root.cellPixels
        height: root.cellPixels
        radius: 3
        color: root.board ? root.regionColor(root.board.regions[cell.index]) : "transparent"
        border.width: root.isBad(cell.index) ? 3 : 0
        border.color: "#e53935"

        Text {
          anchors.centerIn: parent
          font.pixelSize: root.cells[cell.index] === 2 ? 26 : 18
          text: root.cells[cell.index] === 2 ? "♛" : (root.cells[cell.index] === 1 ? "✕" : "")
          color: root.cells[cell.index] === 2
            ? "#141414"
            : (root.isAuto(cell.index) ? "#33000000" : "#77000000")
        }

        MouseArea {
          anchors.fill: parent
          onClicked: root.cycle(cell.index)
        }
      }
    }
  }
}
