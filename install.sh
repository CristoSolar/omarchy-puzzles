#!/usr/bin/env bash
# Instala el plugin en la ruta de plugins de omarchy-shell.
set -euo pipefail

PLUGIN_ID="io.github.cristosolar.puzzles"
TARGET="${XDG_CONFIG_HOME:-$HOME/.config}/omarchy/plugins/$PLUGIN_ID"
SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

OLD_ID="io.github.cristosolar.queens"
OLD_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/omarchy/plugins/$OLD_ID"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/omarchy-puzzles"
OLD_STATE="${XDG_STATE_HOME:-$HOME/.local/state}/omarchy-queens/state.json"

mkdir -p "$STATE_DIR"

# El archivo viejo se copia, no se mueve: si el usuario vuelve a la version
# anterior, su racha sigue donde esa version la busca.
if [ -f "$OLD_STATE" ] && [ ! -f "$STATE_DIR/state.json" ]; then
  cp "$OLD_STATE" "$STATE_DIR/state.json"
  echo "Estado migrado desde omarchy-queens."
fi

# Dos instalaciones a la vez serian dos coronas en la barra.
if [ -d "$OLD_DIR" ]; then
  rm -rf "$OLD_DIR"
  echo "Instalacion anterior ($OLD_ID) eliminada."
  echo "Cambia su entrada en shell.json por: { \"id\": \"$PLUGIN_ID\" }"
fi

if [ "$SOURCE" = "$TARGET" ]; then
  echo "Ya estas en la ruta de instalacion; nada que copiar."
else
  mkdir -p "$TARGET"
  # Todos obligatorios: sin Panel.qml el Loader del widget queda vacio y el
  # clic en la corona no hace nada, sin un solo error visible.
  cp -r "$SOURCE/manifest.json" "$SOURCE/qmldir" "$SOURCE/BarWidget.qml" "$SOURCE/Panel.qml" \
        "$SOURCE/Menu.qml" "$SOURCE/GameRegistry.qml" "$SOURCE/lib" "$SOURCE/games" "$TARGET/"
  echo "Instalado en $TARGET"
fi

echo "Activalo en Omarchy: menu > Setup > Plugins, o reinicia omarchy-shell."
