# Omarchy Puzzles

*[Read this in English](README.md)*

Cuatro puzzles diarios en la barra de [Omarchy](https://omarchy.org), al estilo
de los de LinkedIn: **Queens**, **Tango**, **Mini Sudoku** y **Zip**. Un clic
abre el menú con los juegos y su estado del día; se elige uno y se juega ahí
mismo.

Cada tablero se genera en tu equipo a partir de la fecha, con solución única
garantizada. Una racha global cuenta los días en que resolviste al menos uno.

Sin red, sin dependencias, sin telemetría.

## Reglas

Coloca **una reina por fila, por columna y por región de color**, y que ninguna
toque a otra en las ocho direcciones vecinas.

La adyacencia no es la del ajedrez: dos reinas en la misma diagonal larga son
legales mientras no sean vecinas inmediatas.

Un clic en una celda cicla entre vacía, marca ✕ y reina ♛. Las reinas en
conflicto se pintan con borde rojo mientras juegas.

### Zip

Un camino que pasa por **todas** las celdas exactamente una vez, tocando los
números en orden ascendente. Se juega arrastrando: el camino se extiende a la
celda vecina que toca el puntero, y volver sobre la anteúltima lo acorta.

Empezar desde el número 1 reinicia el camino.

## Instalación

```bash
omarchy plugin add https://github.com/CristoSolar/omarchy-puzzles.git
```

O desde una copia local:

```bash
git clone https://github.com/CristoSolar/omarchy-puzzles.git
cd omarchy-puzzles && ./install.sh
```

Después agrega el widget a la barra desde el menú de Omarchy (Setup → Plugins),
o a mano en `~/.config/omarchy/shell.json`, dentro de `bar.layout`:

```json
{ "id": "io.github.cristosolar.puzzles" }
```

## Desinstalar

```bash
omarchy plugin remove io.github.cristosolar.puzzles
```

Después sacá su entrada de `bar.layout` en `~/.config/omarchy/shell.json`.

Tu racha y tus mejores tiempos quedan en `~/.local/state/omarchy-puzzles/`;
borrá esa carpeta si también los querés sacar. El plugin no escribe en ningún
otro lado.

## Opciones

| Opción | Valores | Por defecto | Qué hace |
|--------|---------|-------------|----------|
| `size` | 7, 8, 9 | 8 | Lado del tablero y cantidad de regiones |

## El widget de la barra

Muestra la corona con tu racha. Atenuada mientras el puzzle de hoy siga sin
resolver, encendida cuando lo resolviste. Un clic abre y cierra el tablero.

## Estado

Todo vive en `~/.local/state/omarchy-puzzles/state.json`:

```json
{
  "version": 2,
  "streak": 3,
  "lastSolvedDay": "2026-09-23",
  "games": {
    "queens": {
      "lastSolved": "2026-09-23",
      "lastElapsedMs": 61000,
      "best": { "8": 55000 },
      "inProgress": null
    }
  }
}
```

La racha sube cuando resuelves el día siguiente al último resuelto, y vuelve a 1
tras un día sin jugar. `best` es tu mejor tiempo en milisegundos por tamaño de
tablero. `inProgress` guarda la partida a medias al cerrar el panel, y se
descarta sola al cambiar el día o el tamaño.

Borrar ese archivo reinicia la racha; el plugin arranca de cero sin quejarse, y
también lo hace si el archivo queda corrupto.

## Desarrollo

La lógica del juego es JavaScript plano en `lib/`, sin nada de QML ni acceso a
disco, así que se prueba sin levantar el shell:

```bash
node --test
```

- `lib/queens.js` — generador, solver y validador
- `lib/state.js` — racha, mejor tiempo y partida en curso, como funciones puras
- `Panel.qml` — el tablero
- `BarWidget.qml` — la corona de la barra

El generador coloca las reinas, hace crecer las regiones desde cada una y luego
refina: busca una solución sobrante y la invalida moviendo una de sus celdas a
una región vecina, cuidando que ninguna región quede partida. El crecimiento
puramente aleatorio da solución única menos de una vez cada 300 intentos en 8×8,
así que reintentar no alcanza.

## Licencia

MIT
