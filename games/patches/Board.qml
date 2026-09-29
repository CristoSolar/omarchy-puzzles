import QtQuick
import qs.Commons
import "logic.js" as Logic

// Tablero de Patches. Se juega arrastrando de esquina a esquina: al soltar, el
// rectangulo se asigna a la unica pista que contiene. Un clic sin arrastrar
// sobre un rectangulo lo borra.
Item {
  id: root

  property var board: null
  property var cells: []
  property bool locked: false
  property var badCells: []

  // Arrastre en curso: celda donde empezo y celda bajo el puntero; -1 = nada.
  property int dragFrom: -1
  property int dragTo: -1

  signal cellsEdited(var updated)
  signal solvedNow()

  readonly property int cellPixels: 46
  readonly property int drawnSize: board ? board.n : 0
  readonly property int sidePixels: drawnSize * cellPixels

  readonly property int contentWidth: sidePixels
  readonly property int contentHeight: sidePixels

  implicitWidth: sidePixels
  implicitHeight: sidePixels

  function cellAt(px, py) {
    if (px < 0 || py < 0 || px >= root.sidePixels || py >= root.sidePixels) return -1
    return Math.floor(py / root.cellPixels) * root.drawnSize + Math.floor(px / root.cellPixels)
  }

  function isBad(index) {
    return root.badCells.indexOf(index) !== -1
  }

  // Color estable por pista, repartido en el circulo de tonos.
  function tint(id, alpha) {
    var total = root.board ? root.board.clues.length : 1
    return Qt.hsla((id - 1) / total, 0.55, 0.55, alpha)
  }

  function inDrag(index) {
    if (root.dragFrom < 0 || root.dragTo < 0) return false
    var n = root.drawnSize
    var f = Math.floor(index / n), c = index % n
    var fa = Math.floor(root.dragFrom / n), ca = root.dragFrom % n
    var fb = Math.floor(root.dragTo / n), cb = root.dragTo % n
    return f >= Math.min(fa, fb) && f <= Math.max(fa, fb)
        && c >= Math.min(ca, cb) && c <= Math.max(ca, cb)
  }

  function adopt(incoming) {
    if (!root.board) return
    root.cells = incoming.slice()
    root.badCells = Logic.conflicts(root.board, root.cells)
    root.dragFrom = -1
    root.dragTo = -1
  }

  function commit(next) {
    root.cells = next
    root.badCells = Logic.conflicts(root.board, next)
    root.cellsEdited(root.cells)
    if (Logic.isSolved(root.board, root.cells)) root.solvedNow()
  }

  // Soltar: clic sin arrastrar borra; arrastre dibuja. Un arrastre con cero o
  // varias pistas se descarta sin tocar nada.
  function release() {
    var a = root.dragFrom, b = root.dragTo
    root.dragFrom = -1
    root.dragTo = -1
    if (root.locked || !root.board || a < 0 || b < 0) return
    if (a === b) {
      if (root.cells[a] !== 0) root.commit(Logic.eraseAt(root.board, root.cells, a))
      return
    }
    var next = Logic.placeRect(root.board, root.cells, a, b)
    if (next) root.commit(next)
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
        readonly property int dueno: root.cells[celda.index] || 0
        readonly property int n: root.drawnSize
        // Bordes gruesos donde cambia el rectangulo, finos adentro.
        readonly property bool corteDerecha: celda.index % celda.n === celda.n - 1
          || root.cells[celda.index + 1] !== celda.dueno || celda.dueno === 0
        readonly property bool corteAbajo: Math.floor(celda.index / celda.n) === celda.n - 1
          || root.cells[celda.index + celda.n] !== celda.dueno || celda.dueno === 0

        x: (celda.index % celda.n) * root.cellPixels
        y: Math.floor(celda.index / celda.n) * root.cellPixels
        width: root.cellPixels
        height: root.cellPixels
        color: root.inDrag(celda.index)
          ? Qt.rgba(Color.accent.r, Color.accent.g, Color.accent.b, 0.30)
          : (celda.dueno > 0
             ? root.tint(celda.dueno, 0.42)
             : Qt.rgba(Color.foreground.r, Color.foreground.g, Color.foreground.b, 0.05))
        border.width: root.isBad(celda.index) ? 2 : 0
        border.color: Color.urgent

        Rectangle {
          anchors.right: parent.right
          width: celda.corteDerecha ? 2 : 1
          height: parent.height
          color: Qt.rgba(Color.foreground.r, Color.foreground.g, Color.foreground.b,
                         celda.corteDerecha ? 0.45 : 0.12)
        }

        Rectangle {
          anchors.bottom: parent.bottom
          height: celda.corteAbajo ? 2 : 1
          width: parent.width
          color: Qt.rgba(Color.foreground.r, Color.foreground.g, Color.foreground.b,
                         celda.corteAbajo ? 0.45 : 0.12)
        }
      }
    }

    // Pistas: numero y un glifo de la forma pedida.
    Repeater {
      model: root.board ? root.board.clues : []

      Rectangle {
        id: pista
        required property var modelData
        required property int index

        x: (pista.modelData.cell % root.drawnSize) * root.cellPixels + 5
        y: Math.floor(pista.modelData.cell / root.drawnSize) * root.cellPixels + 5
        width: root.cellPixels - 10
        height: root.cellPixels - 10
        radius: 6
        color: root.tint(pista.index + 1, 0.95)

        Text {
          anchors.centerIn: parent
          text: pista.modelData.area
          font.pixelSize: 16
          font.bold: true
          color: Color.background
        }

        Text {
          anchors.right: parent.right
          anchors.bottom: parent.bottom
          anchors.margins: 2
          text: ({ square: "□", wide: "▭", tall: "▯", any: "" })[pista.modelData.shape]
          font.pixelSize: 10
          color: Color.background
        }
      }
    }

    MouseArea {
      anchors.fill: parent
      enabled: !root.locked

      onPressed: function (mouse) {
        root.dragFrom = root.cellAt(mouse.x, mouse.y)
        root.dragTo = root.dragFrom
      }

      onPositionChanged: function (mouse) {
        if (!pressed) return
        var idx = root.cellAt(mouse.x, mouse.y)
        if (idx >= 0) root.dragTo = idx
      }

      onReleased: root.release()
      onCanceled: {
        root.dragFrom = -1
        root.dragTo = -1
      }
    }
  }
}
