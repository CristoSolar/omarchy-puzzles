pragma Singleton
import QtQuick
import "games/queens/logic.js" as QueensLogic
import "games/tango/logic.js" as TangoLogic
import "games/sudoku/logic.js" as SudokuLogic
import "games/zip/logic.js" as ZipLogic
import "games/patches/logic.js" as PatchesLogic
import "games/minas/logic.js" as MinasLogic

// Los modulos de logica se importan estaticamente porque QML no admite imports
// dinamicos por id. Cada juego nuevo agrega su import y su rama.
QtObject {
  function logic(id) {
    if (id === "queens") return QueensLogic
    if (id === "tango") return TangoLogic
    if (id === "sudoku") return SudokuLogic
    if (id === "zip") return ZipLogic
    if (id === "patches") return PatchesLogic
    if (id === "minas") return MinasLogic
    return null
  }
}
