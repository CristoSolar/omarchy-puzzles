pragma Singleton
import QtQuick
import "games/queens/logic.js" as QueensLogic
import "games/tango/logic.js" as TangoLogic
import "games/sudoku/logic.js" as SudokuLogic

// Los modulos de logica se importan estaticamente porque QML no admite imports
// dinamicos por id. Cada juego nuevo agrega su import y su rama.
QtObject {
  function logic(id) {
    if (id === "queens") return QueensLogic
    if (id === "tango") return TangoLogic
    if (id === "sudoku") return SudokuLogic
    return null
  }
}
