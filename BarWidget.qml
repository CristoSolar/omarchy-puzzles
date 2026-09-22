import QtQuick
import qs.Ui

// Indicador del puzzle del dia. Monta el panel y lo abre con un clic.
BarWidget {
  id: root
  moduleName: "io.github.cristosolar.queens"

  readonly property string icon: "♛"
  readonly property int size: root.setting("size", 8)

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
    // Rellenado en la tarea 7.
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
    text: root.icon
    active: root.opened
    tooltipText: "Queens del dia"
    onPressed: function (b) {
      if (panelLoader.item) panelLoader.item.toggle()
    }
  }
}
