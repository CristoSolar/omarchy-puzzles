import QtQuick
import qs.Commons
import "logic.js" as Logic

// Tablero de Tetris. La carcasa le reenvia el teclado: flechas para mover, rotar
// (arriba) y bajar (abajo), espacio o Enter para la caida dura. La corrida vive
// en `run` y no se guarda: cerrar el panel la pierde. Perder reinicia la misma
// cola del dia; llegar a la meta resuelve.
Item {
  id: root

  property var board: null
  property var cells: []
  property bool locked: false
  property var badCells: []
  property var run: null

  signal cellsEdited(var updated)
  signal solvedNow()

  readonly property int cellPixels: 20
  readonly property int fieldWidth: board ? board.w * cellPixels : 0
  readonly property int fieldHeight: board ? board.h * cellPixels : 0
  readonly property int sideWidth: 90

  readonly property int contentWidth: fieldWidth + 16 + sideWidth
  readonly property int contentHeight: fieldHeight

  implicitWidth: contentWidth
  implicitHeight: contentHeight

  // 800 ms al arrancar, 60 menos cada 5 lineas, nunca bajo 200.
  readonly property int gravityMs: root.run
    ? Math.max(200, 800 - 60 * Math.floor(root.run.lines / 5)) : 800

  readonly property var pieceColors: ["#00bcd4", "#ffc107", "#9c27b0", "#4caf50",
                                      "#f44336", "#3f51b5", "#ff9800"]

  // Mapa celda -> tipo+1 de la pieza en juego, para pintarla sobre el campo.
  readonly property var falling: {
    var mapa = {}
    if (!root.run || root.locked) return mapa
    var bloques = Logic.blocksOf(root.run.piece)
    for (var k = 0; k < bloques.length; k++) {
      mapa[bloques[k][1] * root.board.w + bloques[k][0]] = root.run.piece.kind + 1
    }
    return mapa
  }

  function adopt(incoming) {
    if (!root.board) return
    root.cells = incoming.slice()
    root.run = Logic.newRun(root.board)
  }

  function advance(next) {
    if (root.locked || !root.board || !root.run) return
    // La meta va primero: llegar a ella en el mismo bloqueo que tapa la salida gana.
    if (next.lines >= root.board.goal) {
      root.run = next
      root.solvedNow()
      return
    }
    if (next.over) {
      root.run = Logic.newRun(root.board)
      return
    }
    root.run = next
  }

  function keyMove(dx, dy) {
    if (root.locked || !root.run) return
    if (dy < 0) root.advance(Logic.rotate(root.board, root.run))
    else if (dy > 0) root.advance(Logic.softDrop(root.board, root.run))
    else root.advance(Logic.move(root.board, root.run, dx))
  }

  function keyAction() {
    if (root.locked || !root.run) return
    root.advance(Logic.hardDrop(root.board, root.run))
  }

  Timer {
    interval: root.gravityMs
    repeat: true
    running: root.visible && !root.locked && root.run !== null
    onTriggered: root.advance(Logic.softDrop(root.board, root.run))
  }

  Row {
    anchors.centerIn: parent
    spacing: 16

    Rectangle {
      width: root.fieldWidth
      height: root.fieldHeight
      color: Qt.rgba(Color.foreground.r, Color.foreground.g, Color.foreground.b, 0.05)
      border.width: 1
      border.color: Qt.rgba(Color.foreground.r, Color.foreground.g, Color.foreground.b, 0.25)

      Repeater {
        model: root.board ? root.board.w * root.board.h : 0

        Rectangle {
          id: bloque
          required property int index
          readonly property int tipo: root.run
            ? (root.falling[bloque.index] || root.run.field[bloque.index]) : 0

          visible: bloque.tipo > 0
          x: (bloque.index % root.board.w) * root.cellPixels + 1
          y: Math.floor(bloque.index / root.board.w) * root.cellPixels + 1
          width: root.cellPixels - 2
          height: root.cellPixels - 2
          radius: 3
          color: bloque.tipo > 0 ? root.pieceColors[bloque.tipo - 1] : "transparent"
        }
      }

      Text {
        visible: root.locked
        anchors.centerIn: parent
        text: "Meta cumplida"
        font.pixelSize: 16
        font.bold: true
        color: Color.accent
      }
    }

    Column {
      width: root.sideWidth
      spacing: 10

      Text {
        text: "Líneas"
        font.pixelSize: 12
        color: Color.foreground
        opacity: 0.7
      }

      Text {
        text: (root.locked && root.board ? root.board.goal
               : (root.run ? Math.min(root.run.lines, root.board.goal) : 0)) + " / "
              + (root.board ? root.board.goal : 0)
        font.pixelSize: 20
        font.bold: true
        color: Color.foreground
      }

      Text {
        text: "Siguiente"
        font.pixelSize: 12
        color: Color.foreground
        opacity: 0.7
      }

      // La siguiente pieza, dibujada en su caja de 4x4.
      Item {
        width: 4 * 16
        height: 4 * 16

        Repeater {
          model: root.run && !root.locked ? 4 : 0

          Rectangle {
            required property int index
            readonly property int tipo: Logic.nextKind(root.board, root.run)
            readonly property var celda: Logic.PIECES[tipo].cells[index]

            x: celda[0] * 16
            y: celda[1] * 16
            width: 14
            height: 14
            radius: 2
            color: root.pieceColors[tipo]
          }
        }
      }

      Text {
        width: root.sideWidth
        wrapMode: Text.WordWrap
        text: "← → mover\n↑ rotar\n↓ bajar\nespacio: soltar"
        font.pixelSize: 11
        color: Color.foreground
        opacity: 0.55
      }
    }
  }
}
