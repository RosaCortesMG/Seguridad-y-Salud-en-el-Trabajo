// pantalla-carga.js
// Pantalla de bienvenida que se muestra antes de la pausa: una frase que se
// arma palabra por palabra y, debajo, la firma "SST & RH".
// Las palabras entre *asteriscos* salen destacadas con degradado de color.

import { crearFirma } from "./firma.js";

export const FRASES = {
  pausa_activa: [
    "Es hora de una *Pausa Activa*",
    "Ey, tómate un tiempo para tu *bienestar*",
    "Sí, tú, es hora de una *pausa*",
    "Estírate, respira y vuelve con más *energía*",
    "Tu cuerpo te pide un *descanso*",
    "Cinco minutos para ti, *¡vamos!*",
    "Levántate, muévete y *sonríe*",
    "Tu cuerpo te lo va a *agradecer*",
    "Suelta el teclado un momento y *muévete*",
    "Respira profundo, llegó tu *pausa*",
    "Un pequeño descanso, un gran *bienestar*",
    "¡Arriba! Es momento de *activarte*",
    "Cuidarte también es parte del *trabajo*",
    "Afloja los hombros, llegó la *Pausa Activa*",
    "Menos tensión, más *movimiento*"
  ],
  pausa_motivacional: [
    "Es hora de una *Pausa Motivacional*",
    "Ey, esta frase es para *ti*",
    "Detente un momento y *inspírate*",
    "Una palabra puede cambiar tu *día*",
    "Sí, tú, mereces un momento de *inspiración*",
    "Descubre la frase de la *semana*",
    "Respira, lee y *sonríe*",
    "Hoy te traemos una dosis de *motivación*",
    "Pequeñas palabras, grandes *cambios*",
    "Tu mente también necesita una *pausa*",
    "Algo bueno te espera en esta *tarjeta*",
    "Un respiro para el *alma*",
    "Cree en ti, hoy y *siempre*",
    "Llénate de energía con una *frase*",
    "Las palabras correctas *inspiran*"
  ],
  campana_informativa: [
    "Esto te va a *interesar*",
    "Es momento de *informarse*",
    "*SST & RH* te envían el siguiente mensaje",
    "Tenemos algo importante que *contarte*",
    "Ey, tómate un minuto para *informarte*",
    "Sí, tú, esta información es para *ti*",
    "Mantente al día con *SST & RH*",
    "Una noticia que no te puedes *perder*",
    "Información que te *cuida*",
    "Estar informado también es *prevenir*",
    "Atento: llegó un nuevo *mensaje*",
    "Lo que necesitas saber, en un *minuto*",
    "Descubre lo que tenemos para *ti*",
    "Tu bienestar empieza por estar *informado*",
    "Pon atención, esto es *importante*"
  ],
  sugerencia_aprendizaje: [
    "Es momento de *Sugerencias*",
    "Te *escuchamos*",
    "Cuando todos participamos todo es más *completo*",
    "Tu opinión *construye*",
    "Ey, queremos saber qué *piensas*",
    "Sí, tú, tu idea *cuenta*",
    "Juntos aprendemos *mejor*",
    "Cada sugerencia nos hace *crecer*",
    "Tu voz es parte del *cambio*",
    "Las mejores ideas nacen de *todos*",
    "Hablemos de lo que quieres *aprender*",
    "Cuéntanos, estamos *atentos*",
    "Construyamos juntos el *aprendizaje*",
    "Una idea tuya puede inspirar a *muchos*",
    "Aquí tu palabra *importa*"
  ]
};

export function fraseAleatoria(tipo) {
  const lista = FRASES[tipo] || FRASES.pausa_activa;
  return lista[Math.floor(Math.random() * lista.length)];
}

// Divide la frase en palabras y marca las que van entre *...*.
function palabras(frase) {
  const out = [];
  let destacando = false;
  for (const crudo of frase.trim().split(/\s+/)) {
    let p = crudo;
    const abre = p.startsWith("*");
    if (abre) { destacando = true; p = p.slice(1); }
    const cierra = p.endsWith("*");
    if (cierra) p = p.slice(0, -1);
    if (p) out.push({ texto: p, destacada: destacando });
    if (cierra) destacando = false;
  }
  return out;
}

const PASO = 170;      // ms entre palabra y palabra
const INICIO = 300;    // ms antes de la primera palabra
const PAUSA = 2500;    // ms que la frase queda en pantalla (alcanza a escribirse la firma)

/**
 * Muestra la pantalla sobre `contenedor` y resuelve cuando desaparece.
 * Tocar la pantalla la salta.
 * @param {object} o
 * @param {string} o.tipo     tipo de pausa (elige el grupo de frases)
 * @param {string} [o.frase]  frase fija; si viene vacía se elige una al azar
 * @param {object} o.estilo   colores de la pausa (fondo, fondo2, titulo, acento, participacion, texto)
 * @param {boolean} [o.fijo]  true = cubre toda la ventana; false = solo el contenedor
 */
export function mostrarPantallaCarga(contenedor, { tipo, frase, estilo, fijo = true }) {
  return new Promise((resolve) => {
    const capa = document.createElement("div");
    capa.className = "pc" + (fijo ? " pc-fijo" : "");
    capa.setAttribute("role", "status");
    const vars = {
      "--pc-fondo": estilo.fondo, "--pc-fondo2": estilo.fondo2, "--pc-texto": estilo.titulo,
      "--pc-acento": estilo.acento, "--pc-acento2": estilo.participacion, "--pc-sub": estilo.texto
    };
    for (const [k, v] of Object.entries(vars)) capa.style.setProperty(k, v);

    const texto = (frase || "").trim() || fraseAleatoria(tipo);
    const lista = palabras(texto);
    const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

    for (let i = 0; i < 3; i++) {
      const b = document.createElement("span");
      b.className = "pc-burbuja pc-b" + i;
      capa.append(b);
    }

    const centro = document.createElement("div");
    centro.className = "pc-centro";
    const h = document.createElement("h1");
    h.className = "pc-frase";
    h.setAttribute("aria-label", texto.replace(/\*/g, ""));
    lista.forEach((p, i) => {
      const s = document.createElement("span");
      s.className = "pc-pal" + (p.destacada ? " pc-dest" : "");
      s.textContent = p.texto;
      s.setAttribute("aria-hidden", "true");
      s.style.animationDelay = INICIO + i * PASO + "ms";
      h.append(s, " ");
    });
    const finPalabras = INICIO + lista.length * PASO + 450;

    const firma = document.createElement("div");
    firma.className = "pc-firma";
    firma.append(crearFirma({ retraso: reducido ? 0 : finPalabras }));

    const total = reducido ? 2000 : finPalabras + 500 + PAUSA;
    const barra = document.createElement("div");
    barra.className = "pc-barra";
    barra.style.animationDuration = total + "ms";

    centro.append(h, firma);
    capa.append(centro, barra);
    contenedor.append(capa);

    let terminado = false;
    const fin = () => {
      if (terminado) return;
      terminado = true;
      clearTimeout(t);
      capa.classList.add("pc-salir");
      setTimeout(() => { capa.remove(); resolve(); }, 550);
    };
    const t = setTimeout(fin, total);
    capa.addEventListener("click", fin);
  });
}
