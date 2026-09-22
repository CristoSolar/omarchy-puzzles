import QtQuick
import qs.Ui

// Indicador del puzzle del dia. El estado real llega en la tarea 7; por ahora
// solo prueba que el plugin carga y que el boton responde.
BarWidget {
  id: root
  moduleName: "io.github.cristosolar.queens"

  readonly property string icon: "♛"

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  function refresh() {
    // Rellenado en la tarea 7.
  }

  WidgetButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: root.icon
    tooltipText: "Queens del dia"
    onPressed: function (b) { root.refresh() }
  }
}
