// Azar determinista y clave del dia, compartidos por todos los juegos.
//
// Sin `.pragma library` ni `.import`: son sintaxis exclusiva de QML que Node no
// parsea. Quien necesite estas funciones las recibe por parametro o las importa
// desde QML.

// PRNG de 32 bits. Con la misma semilla da siempre la misma secuencia, que es
// lo que hace que el puzzle del dia sea el mismo en cada apertura.
function mulberry32(seed) {
  var state = seed >>> 0;
  return function () {
    state = (state + 0x6D2B79F5) >>> 0;
    var t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Logica de Queens. JavaScript plano: no importa nada de QML y no toca disco,
// asi los tests corren con `node --test` sin levantar el shell.
//
// Sin `.pragma library` a proposito: esa directiva es exclusiva de QML y Node
// no la parsea, y como aca no hay estado de modulo, lo unico que costaria es
// una instancia del script por componente QML que lo importe.


function hashString(text) {
  var h = 2166136261;
  for (var i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pad2(value) {
  return value < 10 ? '0' + value : '' + value;
}

// Fecha LOCAL, no UTC: con UTC el puzzle del dia cambiaria a una medianoche
// que no es la del usuario.
function dateKey(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

function seedForDate(date) {
  return hashString(dateKey(date));
}

function shuffled(values, rand) {
  var out = values.slice();
  for (var i = out.length - 1; i > 0; i--) {
    var j = Math.floor(rand() * (i + 1));
    var tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = {
    mulberry32: mulberry32,
    hashString: hashString,
    dateKey: dateKey,
    seedForDate: seedForDate,
    shuffled: shuffled
  };
}
