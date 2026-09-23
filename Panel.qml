import QtQuick
import Quickshell
import Quickshell.Io
import qs.Ui
import "lib/rng.js" as Rng
import "lib/state.js" as State
import "lib/registry.js" as Registry

// Carcasa del popover: alterna entre el menu de juegos y el tablero del juego
// elegido, y es el unico lugar que toca el disco. No sabe nada del juego
// cargado mas alla de su contrato.
//
// El Panel de qs.Ui solo guarda el estado abierto/cerrado; la ventana la pone
// KeyboardPanel, anclado al boton de la barra.
Panel {
  id: root
  moduleName: "io.github.cristosolar.puzzles"
  ipcTarget: "io.github.cristosolar.puzzles"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  readonly property var barIdentity: hostWidget || root

  // Vacio = menu.
  property string currentGame: ""
  property var logic: null
  property var board: null
  property var cells: []
  property string dayKey: ""
  property int elapsedMs: 0
  property bool won: false
  property string errorText: ""

  readonly property string statePath: Quickshell.env("HOME") + "/.local/state/omarchy-puzzles/state.json"
  property var store: State.parseState("")

  signal solved(int elapsed)


  function sizeFor(id) {
    if (id === "queens") return root.setting("size", 8)
    var entrada = GameRegistry.logic(id)
    return entrada ? entrada.meta.defaultSize : 0
  }

  function openGame(id) {
    if (!Registry.byId(id)) return
    root.currentGame = id
    root.logic = GameRegistry.logic(id)
    root.dayKey = Rng.dateKey(new Date())
    root.newGame()
  }

  function backToMenu() {
    saveIfNeeded()
    clock.stop()
    root.currentGame = ""
    root.board = null
    root.logic = null
  }

  function newGame() {
    try {
      root.board = root.logic.generate(Rng.mulberry32(Rng.seedForDate(new Date())),
                                       root.sizeFor(root.currentGame))
      root.errorText = ""
    } catch (e) {
      root.board = null
      root.errorText = "" + e
      return
    }

    var vacias = root.logic.emptyCells(root.board)

    if (State.solvedOn(root.store, root.currentGame, root.dayKey)) {
      // Ya resuelto hoy: tras reiniciar el shell, o en otro monitor, se muestra
      // el tablero terminado en vez de ofrecerlo de nuevo.
      root.cells = root.logic.solvedCells(root.board)
      root.elapsedMs = State.gameState(root.store, root.currentGame).lastElapsedMs
      root.won = true
      adoptInBoard()
      return
    }

    var guardadas = State.restoreInProgress(root.store, root.currentGame,
                                            root.dayKey, vacias.length,
                                            root.logic.maxCellValue(root.board))
    root.cells = guardadas ? guardadas : vacias
    root.elapsedMs = guardadas
      ? State.gameState(root.store, root.currentGame).inProgress.elapsedMs : 0
    root.won = false
    clock.start()
    adoptInBoard()
  }

  // El Loader puede emitir onLoaded antes de que newGame() genere el tablero,
  // en cuyo caso adoptaria celdas vacias. Adoptar tambien aca cubre el orden
  // inverso, y adoptar dos veces es idempotente.
  // Agnostico del juego: las celdas vacias las declara su propia logica.
  function clearBoard() {
    if (!root.board || root.won) return
    root.cells = root.logic.emptyCells(root.board)
    root.elapsedMs = 0
    adoptInBoard()
    clock.start()
  }

  function adoptInBoard() {
    if (vista.item && vista.item.adopt) vista.item.adopt(root.cells)
  }

  // Volver al menu guarda igual que cerrar el panel: la partida a medias no se
  // pierde por navegar.
  function saveIfNeeded() {
    if (!root.board || root.won || root.currentGame === "") return
    if (State.solvedOn(root.store, root.currentGame, root.dayKey)) return
    root.persist(State.saveInProgress(root.store, root.currentGame,
                                      root.dayKey, root.cells, root.elapsedMs))
  }

  function onSolved() {
    root.won = true
    clock.stop()
    root.persist(State.recordSolve(root.store, root.currentGame, root.dayKey,
                                   root.elapsedMs, root.sizeFor(root.currentGame)))
    root.solved(root.elapsedMs)
  }

  function persist(next) {
    root.store = next
    stateFile.setText(State.serializeState(next))
  }

  function open() {
    // El dia se recalcula en cada apertura: el shell corre semanas seguidas.
    root.dayKey = Rng.dateKey(new Date())
    root.currentGame = ""
    root.board = null
    root.controller.show()
  }

  function close() {
    saveIfNeeded()
    clock.stop()
    root.controller.hide()
  }

  function formatTime(ms) {
    var total = Math.floor(ms / 1000)
    var mm = Math.floor(total / 60)
    var ss = total % 60
    return (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss
  }

  // blockAllReads deja la lectura sincrona: sin eso newGame() puede correr antes
  // de que el archivo cargue y perder la partida en curso.
  FileView {
    id: stateFile
    path: root.statePath
    watchChanges: true
    blockAllReads: true
    atomicWrites: true
    printErrors: false
    onLoaded: {
      root.store = State.parseState(stateFile.text())
      // Resuelto en otra pantalla: este panel deja de correr su propio reloj.
      if (root.board && !root.won && root.currentGame !== ""
          && State.solvedOn(root.store, root.currentGame, root.dayKey)) {
        clock.stop()
        root.elapsedMs = State.gameState(root.store, root.currentGame).lastElapsedMs
        root.won = true
      }
    }
    onLoadFailed: root.store = State.parseState("")
    onFileChanged: reload()
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
    // El ancho sale de la columna entera: encabezado incluido. Calcularlo solo
    // desde el tablero dejaba el encabezado desbordando la tarjeta.
    contentWidth: panel.fittedContentWidth(
      Math.max(contenido.implicitWidth, vista.item ? vista.item.contentWidth : 320) + 32)
    contentHeight: panel.fittedContentHeight(contenido.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.currentGame === "" ? root.close() : root.backToMenu()

      Column {
        id: contenido
        anchors.horizontalCenter: parent.horizontalCenter
        spacing: 12

        Item {
          visible: root.currentGame !== ""
          width: Math.max(vista.item ? vista.item.contentWidth : 320, fila.implicitWidth)
          height: fila.implicitHeight

          Row {
            id: fila
            anchors.left: parent.left
            spacing: 10

            Button {
              text: "←"
              onClicked: root.backToMenu()
            }

            Column {
              anchors.verticalCenter: parent.verticalCenter
              spacing: 1

              Text {
                text: root.currentGame === "" ? "" : Registry.byId(root.currentGame).name
                font.pixelSize: 15
                font.bold: true
                color: root.barForeground
              }

              Text {
                text: root.won
                  ? "Resuelto en " + root.formatTime(root.elapsedMs) + " · racha " + root.store.streak
                  : root.formatTime(root.elapsedMs)
                font.pixelSize: 12
                color: root.won ? "#6abf69" : root.barForeground
                opacity: root.won ? 1.0 : 0.75
              }
            }
          }

          Button {
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            text: "Limpiar"
            enabled: !root.won
            onClicked: root.clearBoard()
          }
        }

        Text {
          visible: root.errorText !== ""
          width: 320
          text: "No se pudo generar el tablero: " + root.errorText
          color: "#ef5350"
          wrapMode: Text.WordWrap
        }

        Loader {
          id: vista
          source: root.currentGame === ""
            ? Qt.resolvedUrl("Menu.qml")
            : Qt.resolvedUrl(Registry.byId(root.currentGame).board)

          onLoaded: {
            if (root.currentGame === "") {
              item.store = Qt.binding(function () { return root.store })
              item.dayKey = Qt.binding(function () { return root.dayKey })
              item.streak = Qt.binding(function () { return root.store.streak })
              item.foreground = root.barForeground
              item.chosen.connect(root.openGame)
            } else {
              item.board = Qt.binding(function () { return root.board })
              item.locked = Qt.binding(function () { return root.won })
              item.adopt(root.cells)
              item.cellsEdited.connect(function (updated) { root.cells = updated })
              item.solvedNow.connect(root.onSolved)
            }
          }
        }
      }
    }
  }
}
