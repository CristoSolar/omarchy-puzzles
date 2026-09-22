#!/usr/bin/env bash
# Instala el plugin en la ruta de plugins de omarchy-shell.
set -euo pipefail

PLUGIN_ID="io.github.cristosolar.queens"
TARGET="${XDG_CONFIG_HOME:-$HOME/.config}/omarchy/plugins/$PLUGIN_ID"
SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "${XDG_STATE_HOME:-$HOME/.local/state}/omarchy-queens"

if [ "$SOURCE" = "$TARGET" ]; then
  echo "Ya estas en la ruta de instalacion; nada que copiar."
else
  mkdir -p "$TARGET"
  cp -r "$SOURCE/manifest.json" "$SOURCE/BarWidget.qml" "$SOURCE/lib" "$TARGET/"
  [ -f "$SOURCE/Panel.qml" ] && cp "$SOURCE/Panel.qml" "$TARGET/"
  echo "Instalado en $TARGET"
fi

echo "Activalo en Omarchy: menu > Setup > Plugins, o reinicia omarchy-shell."
