import QtQuick
import qs.Commons
import "logic.js" as Logic

// Tablero de 2048. La carcasa le reenvia las flechas. La corrida vive en `run`
// y no se guarda: cerrar el panel la pierde. Quedarse sin jugadas reinicia las
// mismas tiradas del dia; llegar a la meta resuelve.
Item {
  id: root

  property var board: null
  property var cells: []
  property bool locked: false
  property var badCells: []
  property var run: null

  signal cellsEdited(var updated)
  signal solvedNow()

  readonly property int cellPixels: 64
  readonly property int gap: 6
  readonly property int drawnSize: board ? board.n : 0
  readonly property int gridPixels: drawnSize * cellPixels + (drawnSize + 1) * gap
  readonly property int infoHeight: 22

  readonly property int contentWidth: gridPixels
  readonly property int contentHeight: gridPixels + infoHeight + 10

  implicitWidth: contentWidth
  implicitHeight: contentHeight

  // Un tono por potencia de dos, de frio a calido, hasta la meta.
  readonly property var tileColors: ["#eee4da", "#ede0c8", "#f2b179", "#f59563", "#f67c5f",
                                     "#f65e3b", "#edcf72", "#edcc61", "#edc850", "#edc53f"]

  function tileColor(v) {
    var k = Math.round(Math.log(v) / Math.LN2) - 1
    return root.tileColors[Math.min(k, root.tileColors.length - 1)]
  }

  function adopt(incoming) {
    if (!root.board) return
    root.cells = incoming.slice()
    root.run = Logic.newRun(root.board)
  }

  function keyMove(dx, dy) {
    if (root.locked || !root.board || !root.run) return
    var next = Logic.slide(root.board, root.run, dx, dy)
    if (next === root.run) return
    // La meta va primero: alcanzarla con la grilla llena igual gana.
    if (next.best >= root.board.goal) {
      root.run = next
      root.solvedNow()
      return
    }
    root.run = next.over ? Logic.newRun(root.board) : next
  }

  Column {
    anchors.centerIn: parent
    spacing: 10

    Rectangle {
      width: root.gridPixels
      height: root.gridPixels
      radius: 8
      color: Qt.rgba(Color.foreground.r, Color.foreground.g, Color.foreground.b, 0.08)

      Repeater {
        model: root.drawnSize * root.drawnSize

        Rectangle {
          id: ficha
          required property int index
          readonly property int valor: root.run ? root.run.grid[ficha.index] : 0

          x: root.gap + (ficha.index % root.drawnSize) * (root.cellPixels + root.gap)
          y: root.gap + Math.floor(ficha.index / root.drawnSize) * (root.cellPixels + root.gap)
          width: root.cellPixels
          height: root.cellPixels
          radius: 6
          color: ficha.valor > 0 ? root.tileColor(ficha.valor)
            : Qt.rgba(Color.foreground.r, Color.foreground.g, Color.foreground.b, 0.06)

          // Un pulso cada vez que la casilla cambia a una ficha: aparece o se
          // fusiona.
          onValorChanged: if (ficha.valor > 0) pulso.restart()
          SequentialAnimation {
            id: pulso
            NumberAnimation { target: ficha; property: "scale"; to: 1.1; duration: 70 }
            NumberAnimation { target: ficha; property: "scale"; to: 1.0; duration: 90 }
          }

          Text {
            anchors.centerIn: parent
            text: ficha.valor > 0 ? ficha.valor : ""
            font.pixelSize: ficha.valor >= 100 ? 22 : 26
            font.bold: true
            color: ficha.valor <= 4 ? "#776e65" : "#f9f6f2"
          }
        }
      }

      Text {
        visible: root.locked
        anchors.centerIn: parent
        text: "Meta cumplida"
        font.pixelSize: 18
        font.bold: true
        color: Color.accent
        style: Text.Outline
        styleColor: Color.background
      }
    }

    Text {
      height: root.infoHeight
      text: "Puntos " + (root.run ? root.run.score : 0) + "  ·  meta "
            + (root.board ? root.board.goal : 0) + "  ·  ← ↑ → ↓"
      font.pixelSize: 12
      color: Color.foreground
      opacity: 0.7
    }
  }
}
