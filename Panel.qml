import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
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
  //
  // Funciona tambien sobre un tablero ya resuelto: limpiar el puzzle del dia
  // para rejugarlo es justamente para lo que sirve el boton. La racha no se
  // mueve -- ya subio hoy -- y `saveIfNeeded` no pisa el estado de un dia
  // resuelto, asi que la rejugada no deja rastro salvo que mejore el tiempo.
  function clearBoard() {
    if (!root.board) return
    root.won = false
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
    var juego = root.currentGame, dia = root.dayKey
    var celdas = root.cells, transcurrido = root.elapsedMs
    root.mutate(function (st) {
      return State.saveInProgress(st, juego, dia, celdas, transcurrido)
    })
  }

  function onSolved() {
    root.won = true
    clock.stop()
    fiesta.lanzar()
    var juego = root.currentGame, dia = root.dayKey
    var transcurrido = root.elapsedMs, tam = root.sizeFor(root.currentGame)
    root.mutate(function (st) {
      return State.recordSolve(st, juego, dia, transcurrido, tam)
    })
    root.solved(root.elapsedMs)
  }

  // Toda escritura se calcula sobre lo que hay en disco AHORA, no sobre la copia
  // en memoria. Hay un panel por monitor, cada uno con su propio `store`: sin
  // releer, el que escribe ultimo vuelca su copia entera y resucita lo que el
  // otro ya habia cambiado -- resolver en una pantalla se perdia cuando la otra
  // guardaba una partida a medias.
  function mutate(cambio) {
    stateFile.reload()
    var actual = State.parseState(stateFile.text())
    var next = cambio(actual)
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

    // Festejo al resolver. Una sola animacion mueve `progreso`, y cada particula
    // deriva su posicion de ese numero: no hay una animacion por particula.
    Item {
      id: fiesta
      anchors.fill: parent
      z: 10
      visible: fiesta.progreso > 0 && fiesta.progreso < 1

      property real progreso: 0
      readonly property int cuantas: 20
      readonly property real alcance: Math.min(parent.width, parent.height) * 0.55

      function lanzar() {
        fiesta.progreso = 0
        rafaga.restart()
      }

      NumberAnimation {
        id: rafaga
        target: fiesta
        property: "progreso"
        from: 0
        to: 1
        duration: 950
        easing.type: Easing.OutCubic
      }

      // Anillo que se abre desde el centro.
      Rectangle {
        anchors.centerIn: parent
        width: fiesta.alcance * 2 * fiesta.progreso
        height: width
        radius: width / 2
        color: "transparent"
        border.width: 3
        border.color: Color.accent
        opacity: 1 - fiesta.progreso
      }

      Repeater {
        model: fiesta.cuantas

        Rectangle {
          id: chispa
          required property int index
          // Angulo repartido parejo, con una desviacion fija por particula para
          // que no salga un circulo perfecto.
          readonly property real angulo: chispa.index * (2 * Math.PI / fiesta.cuantas)
                                         + (chispa.index % 3) * 0.12
          readonly property real lejos: fiesta.alcance
                                        * (0.5 + 0.5 * ((chispa.index * 7) % 10) / 10)
                                        * fiesta.progreso

          width: 7
          height: 7
          radius: 3.5
          color: Color.accent
          opacity: 1 - fiesta.progreso * fiesta.progreso
          scale: 1 - 0.5 * fiesta.progreso

          x: parent.width / 2 + Math.cos(chispa.angulo) * chispa.lejos - width / 2
          // La gravedad las hace caer sobre el final del vuelo.
          y: parent.height / 2 + Math.sin(chispa.angulo) * chispa.lejos - height / 2
             + 46 * fiesta.progreso * fiesta.progreso
        }
      }
    }

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
                color: root.won ? Color.accent : root.barForeground
                opacity: root.won ? 1.0 : 0.75
              }
            }
          }

          Button {
            anchors.right: parent.right
            anchors.verticalCenter: parent.verticalCenter
            text: "Limpiar"
            enabled: root.board !== null
            onClicked: root.clearBoard()
          }
        }

        Text {
          visible: root.errorText !== ""
          width: 320
          text: "No se pudo generar el tablero: " + root.errorText
          color: Color.urgent
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
