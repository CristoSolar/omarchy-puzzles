#!/usr/bin/env bash
# Instala el plugin en la ruta de plugins de omarchy-shell.
set -euo pipefail

PLUGIN_ID="io.github.cristosolar.puzzles"
TARGET="${XDG_CONFIG_HOME:-$HOME/.config}/omarchy/plugins/$PLUGIN_ID"
SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/omarchy-puzzles"
mkdir -p "$STATE_DIR"

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
