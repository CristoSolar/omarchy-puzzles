import QtQuick
import qs.Ui
import "lib/queens.js" as Queens

// Tablero del dia. La clave de fecha se recalcula en cada apertura, nunca se
// cachea al cargar: el shell corre semanas seguidas y el dia cambia bajo sus
// pies.
//
// El Panel de qs.Ui solo guarda el estado abierto/cerrado; la ventana la pone
// KeyboardPanel, anclado al boton de la barra, igual que los paneles de
// primera parte.
Panel {
  id: root
  moduleName: "io.github.cristosolar.queens"
  ipcTarget: "io.github.cristosolar.queens"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  readonly property var barIdentity: hostWidget || root

  property int size: 8
  property var board: null
  property var cells: []
  property string dayKey: ""
  property var badCells: []
  property int elapsedMs: 0
  property bool won: false
  property string errorText: ""

  readonly property int cellPixels: 44
  readonly property int boardPixels: root.size * root.cellPixels + (root.size - 1) * 2

  signal solved(int elapsed)

  function newDay() {
    var now = new Date()
    root.dayKey = Queens.dateKey(now)
    try {
      root.board = Queens.generateForDate(now, root.size)
      root.errorText = ""
    } catch (e) {
      root.board = null
      root.errorText = "" + e
      return
    }
    root.cells = blankCells()
    root.badCells = []
    root.elapsedMs = 0
    root.won = false
  }

  function blankCells() {
    var blank = []
    for (var i = 0; i < root.size * root.size; i++) blank.push(0)
    return blank
  }

  function open() {
    // Si cambio el dia mientras el shell seguia corriendo, el tablero se
    // regenera al abrir.
    if (!root.board || root.dayKey !== Queens.dateKey(new Date())) newDay()
    root.controller.show()
    if (!root.won) clock.start()
  }

  function close() {
    clock.stop()
    root.controller.hide()
  }

  function cycle(index) {
    if (root.won || !root.board) return
    var next = root.cells.slice()
    next[index] = (next[index] + 1) % 3
    root.cells = next
    root.badCells = Queens.conflicts(root.size, root.board.regions, next)
    if (Queens.isSolved(root.size, root.board.regions, next)) {
      root.won = true
      clock.stop()
      root.solved(root.elapsedMs)
    }
  }

  function clear() {
    if (!root.board) return
    root.cells = blankCells()
    root.badCells = []
    root.won = false
    clock.start()
  }

  function isBad(index) {
    for (var i = 0; i < root.badCells.length; i++) {
      if (root.badCells[i] === index) return true
    }
    return false
  }

  // Tonos repartidos parejo por el circulo cromatico, y luminosidad alternada
  // para que dos regiones vecinas no se confundan cuando comparten matiz.
  function regionColor(region) {
    var hue = (region * 0.61803398875 + 0.08) % 1.0
    var light = region % 2 === 0 ? 0.70 : 0.56
    return Qt.hsla(hue, 0.45, light, 1.0)
  }

  function formatTime(ms) {
    var total = Math.floor(ms / 1000)
    var mm = Math.floor(total / 60)
    var ss = total % 60
    return (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss
  }

  Timer {
    id: clock
    interval: 1000
    repeat: true
    running: false
    onTriggered: if (!root.won) root.elapsedMs += 1000
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(root.boardPixels + 32)
    contentHeight: panel.fittedContentHeight(content.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.close()

      Column {
        id: content
        anchors.horizontalCenter: parent.horizontalCenter
        spacing: 12

        Item {
          width: root.boardPixels
          height: 30

          Text {
            anchors.left: parent.left
            anchors.verticalCenter: parent.verticalCenter
            text: root.won ? "Resuelto en " + root.formatTime(root.elapsedMs)
                           : root.formatTime(root.elapsedMs)
            font.pixelSize: 17
            font.bold: root.won
            color: root.won ? "#6abf69" : root.barForeground
          }

          Button {
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            text: "Limpiar"
            onClicked: root.clear()
          }
        }

        Text {
          visible: root.errorText !== ""
          width: root.boardPixels
          text: "No se pudo generar el tablero: " + root.errorText
          color: "#ef5350"
          wrapMode: Text.WordWrap
        }

        Grid {
          visible: root.board !== null
          columns: root.size
          spacing: 2

          Repeater {
            model: root.board ? root.size * root.size : 0

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
                color: root.cells[cell.index] === 2 ? "#141414" : "#55000000"
              }

              MouseArea {
                anchors.fill: parent
                onClicked: root.cycle(cell.index)
              }
            }
          }
        }
      }
    }
  }
}
