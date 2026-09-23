import QtQuick
import Quickshell
import Quickshell.Io
import qs.Ui
import "lib/state.js" as State
import "lib/registry.js" as Registry
import "lib/rng.js" as Rng

// Indicador del puzzle del dia. Monta el panel y lo abre con un clic.
BarWidget {
  id: root
  moduleName: "io.github.cristosolar.puzzles"

  readonly property string icon: "♛"
  readonly property int size: root.setting("size", 8)

  property var store: State.parseState("")
  // `new Date()` no notifica nada, asi que el binding necesita una propiedad
  // que si cambie: sin esto la corona sigue diciendo "resuelto" todo el dia
  // siguiente, porque el shell corre semanas sin reiniciarse.
  property string today: Rng.dateKey(new Date())
  readonly property var pendientes: State.pendingToday(root.store, Registry.ids(), root.today)
  readonly property bool pendiente: root.pendientes.length > 0
  readonly property int streak: root.store.streak

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  // La barra identifica al panel por el widget montado en su ranura, no por el
  // panel anidado, asi que hay que pasarle quien es su anfitrion.
  function injectPanel() {
    var target = panelLoader.item
    if (!target) return
    if ("bar" in target) target.bar = root.bar
    if ("anchorItem" in target) target.anchorItem = button
    if ("hostWidget" in target) target.hostWidget = root
    if ("size" in target) target.size = root.size
  }

  readonly property bool opened: panelLoader.item ? panelLoader.item.opened === true : false
  readonly property bool popoutSwitchClosing: panelLoader.item ? panelLoader.item.popoutSwitchClosing === true : false

  function open() { if (panelLoader.item) panelLoader.item.open() }
  function close() { if (panelLoader.item) panelLoader.item.close() }
  function closeForPopoutSwitch() { if (panelLoader.item) panelLoader.item.closeForPopoutSwitch() }

  function refresh() {
    stateFile.reload()
  }

  Timer {
    interval: 60000
    running: true
    repeat: true
    onTriggered: root.today = Rng.dateKey(new Date())
  }

  FileView {
    id: stateFile
    path: Quickshell.env("HOME") + "/.local/state/omarchy-puzzles/state.json"
    watchChanges: true
    blockAllReads: true
    printErrors: false
    onLoaded: root.store = State.parseState(stateFile.text())
    onLoadFailed: root.store = State.parseState("")
    onFileChanged: reload()
  }

  onBarChanged: injectPanel()
  onSettingsChanged: injectPanel()

  Loader {
    id: panelLoader
    active: true
    source: Qt.resolvedUrl("Panel.qml")
    visible: false
    onLoaded: {
      root.injectPanel()
      Qt.callLater(root.injectPanel)
      if (item) item.solved.connect(function (elapsed) { root.refresh() })
    }
  }

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: root.streak > 0 && !root.vertical ? root.icon + "  " + root.streak : root.icon
    active: root.opened || !root.pendiente
    dimmed: root.pendiente && !root.opened
    tooltipText: root.pendiente
      ? "Faltan " + root.pendientes.length + " de " + Registry.ids().length
        + " hoy — racha de " + root.streak
      : "Todos resueltos hoy — racha de " + root.streak
    onPressed: function (b) {
      if (panelLoader.item) panelLoader.item.toggle()
    }
  }
}
