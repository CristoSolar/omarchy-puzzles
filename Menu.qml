import QtQuick
import "lib/registry.js" as Registry
import "lib/state.js" as State

// Lista de juegos con su estado del dia. Se arma desde el registro, nunca desde
// las claves del estado: un sub-estado de un juego que ya no existe no debe
// aparecer como fila.
Item {
  id: root

  property var store: null
  property string dayKey: ""
  property int streak: 0
  property color foreground: "#e0e0e0"

  signal chosen(string gameId)

  readonly property int rowHeight: 56
  readonly property int contentWidth: 320
  readonly property int contentHeight: columna.implicitHeight

  implicitWidth: contentWidth
  implicitHeight: contentHeight

  function solvedToday(id) {
    return root.store ? State.solvedOn(root.store, id, root.dayKey) : false
  }

  Column {
    id: columna
    width: root.contentWidth
    spacing: 8

    Text {
      text: root.streak > 0 ? "Racha de " + root.streak + (root.streak === 1 ? " dia" : " dias")
                            : "Sin racha todavia"
      font.pixelSize: 15
      font.bold: true
      color: root.foreground
    }

    Repeater {
      model: Registry.GAMES.length

      Rectangle {
        required property int index
        readonly property var juego: Registry.GAMES[index]
        readonly property bool resuelto: root.solvedToday(juego.id)

        width: root.contentWidth
        height: root.rowHeight
        radius: 6
        color: hover.hovered ? "#22ffffff" : "transparent"

        Row {
          anchors.fill: parent
          anchors.margins: 10
          spacing: 12

          Text {
            anchors.verticalCenter: parent.verticalCenter
            text: juego.icon
            font.pixelSize: 24
            color: root.foreground
            opacity: resuelto ? 1.0 : 0.65
          }

          Column {
            anchors.verticalCenter: parent.verticalCenter
            spacing: 2

            Text {
              text: juego.name
              font.pixelSize: 15
              font.bold: true
              color: root.foreground
            }

            Text {
              text: resuelto ? "Resuelto hoy" : juego.blurb
              font.pixelSize: 12
              color: root.foreground
              opacity: 0.7
              width: root.contentWidth - 70
              elide: Text.ElideRight
            }
          }
        }

        HoverHandler { id: hover }

        MouseArea {
          anchors.fill: parent
          onClicked: root.chosen(juego.id)
        }
      }
    }
  }
}
