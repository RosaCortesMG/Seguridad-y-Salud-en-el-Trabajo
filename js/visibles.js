// visibles.js
// Interruptores Activo/Inactivo de cada elemento de una pausa.
// En los datos: visible = { cargo: true, reto: false, ... } (por defecto todo activo).
// En la vista: los elementos con data-vis="cargo" se ocultan con la clase .pa-off.

/** Completa visible con `true` para cada clave que no venga definida. */
export function visibles(dado, claves) {
  const v = {};
  for (const k of claves) v[k] = typeof dado?.[k] === "boolean" ? dado[k] : true;
  return v;
}

/** Oculta/muestra los elementos [data-vis] dentro de `el` según `visible`. */
export function aplicarVisibles(el, visible) {
  el.querySelectorAll("[data-vis]").forEach((n) => n.classList.toggle("pa-off", visible[n.dataset.vis] === false));
}

/** Valida nombre y cargo solo si están activos. Devuelve el mensaje de error o "". */
export function faltanDatos(visible, nombre, cargo) {
  const faltan = [];
  if (visible.nombre && !nombre) faltan.push("tu nombre y apellido");
  if (visible.cargo && !cargo) faltan.push("tu cargo");
  return faltan.length ? `Escribe ${faltan.join(" y ")}.` : "";
}
