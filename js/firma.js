// firma.js
// Firma «SST & RH» en cursiva que se escribe sola: primero se dibuja el
// contorno de las letras, luego entra la tinta y al final un trazo fino debajo.
// Toma el color del texto que la rodea (currentColor). Estilos en css/firma.css.

const NS = "http://www.w3.org/2000/svg";
export const FIRMA_TEXTO = "SST & RH";
const FUENTE = '600 56px "Dancing Script"';

/**
 * @param {object} [o]
 * @param {number} [o.retraso]  ms antes de empezar a escribir (cuenta desde que se ve)
 */
export function crearFirma({ retraso = 0 } = {}) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 320 112");
  svg.setAttribute("class", "firma");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", FIRMA_TEXTO);
  svg.style.setProperty("--retraso", retraso + "ms");

  const texto = document.createElementNS(NS, "text");
  texto.setAttribute("x", "160");
  texto.setAttribute("y", "68");
  texto.setAttribute("text-anchor", "middle");
  texto.setAttribute("class", "firma-texto");
  texto.textContent = FIRMA_TEXTO;

  // Trazo final por debajo, como el cierre de una firma.
  const trazo = document.createElementNS(NS, "path");
  trazo.setAttribute("d", "M72 90 C 122 80, 192 98, 250 84 S 278 76, 286 80");
  trazo.setAttribute("pathLength", "1");
  trazo.setAttribute("class", "firma-trazo");

  svg.append(texto, trazo);

  // Se espera a que cargue la letra cursiva para no "escribir" con otra fuente.
  let iniciada = false;
  const iniciar = () => { if (!iniciada) { iniciada = true; svg.classList.add("firmar"); } };
  if (document.fonts?.load) document.fonts.load(FUENTE).then(iniciar, iniciar);
  else iniciar();
  setTimeout(iniciar, 1500);
  return svg;
}
