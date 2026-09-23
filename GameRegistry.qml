pragma Singleton
import QtQuick
import "games/queens/logic.js" as QueensLogic

// Los modulos de logica se importan estaticamente porque QML no admite imports
// dinamicos por id. Cada juego nuevo agrega su import y su rama.
QtObject {
  function logic(id) {
    if (id === "queens") return QueensLogic
    return null
  }
}
