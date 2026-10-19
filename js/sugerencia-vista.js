// sugerencia-vista.js
// Lo que ve el trabajador en Sugerencias de Aprendizaje.
// Dos modos (los elige RH en el editor):
//  - "abierta": escribe su sugerencia con sus palabras.
//  - "cerrada": las opciones están NUBLADAS; cada toque descubre una nube
//    y luego toca la que elige (con opción "Otra" si RH la activa).
// Al enviar, una paloma se lleva la carta y aparece la despedida.
// Usa las clases base de css/pausa-activa.css y las propias de css/sugerencia.css (.su-*).

import { pintarVideo, pintarImagen } from "./media.js";
import { crearFirma } from "./firma.js";
import { visibles, aplicarVisibles, faltanDatos } from "./visibles.js";

export const TIPO = "sugerencia_aprendizaje";

// Elementos que RH puede activar o desactivar (interruptores del editor).
export const VISIBLES = ["carga", "descripcion", "video", "imagen", "nombre", "cargo", "reto"];

// Si RH deja vacío el texto secundario de la despedida, sale uno de estos al azar.
export const CIERRES = [
  "Tu voz hace la diferencia",
  "Cada idea suma para que todos crezcamos",
  "Juntos construimos un mejor lugar para trabajar",
  "Tu sugerencia ya va en camino",
  "Escucharte es nuestro compromiso",
  "Gracias a ti, aprender será más fácil para todos"
];

export const DEFAULTS = {
  titulo: "Sugerencias de aprendizaje",
  tema: "¿Qué te gustaría aprender este mes?",
  descripcion: "Queremos diseñar capacitaciones a tu medida. Cuéntanos qué te interesa.",
  modo: "cerrada",
  permitirOtra: true,
  opciones: [
    { emoji: "💻", texto: "Herramientas digitales" },
    { emoji: "🗣️", texto: "Comunicación asertiva" },
    { emoji: "🧘", texto: "Manejo del estrés" },
    { emoji: "🦺", texto: "Prevención de riesgos" }
  ],
  video: "",
  imagen: "",
  textos: {
    tag: "Buzón de sugerencias",
    ampliar: "🔍 Toca la imagen para verla en grande",
    comoFunciona: "Las opciones están escondidas en nubes. Toca cada nube para descubrirla y luego toca la que elijas.",
    tocaNube: "Toca para descubrir",
    otra: "Otra",
    otraPh: "¿Cuál? Escríbela aquí",
    abiertaPh: "Escribe aquí tu sugerencia…",
    participacion: "Tu participación",
    nombre: "Nombre y Apellido",
    cargo: "Cargo",
    reto: "Reto",
    pregunta: "¿Cómo te gustaría aprenderlo? (taller, video, lectura…)",
    respuesta: "Responde con una palabra o frase",
    enviar: "Enviar sugerencia",
    enviando: "Enviando tu sugerencia…",
    registrada: "Sugerencia Registrada",
    gracias: "Gracias por construir con nosotros",
    graciasSub: "",
    carga: ""
  },
  estilo: {
    // Generales
    fondo: "#eaf3fd",
    fondo2: "#e3f6ee",
    tarjeta: "#ffffff",
    acento: "#1f6fd6",
    texto: "#0f2434",
    // Pregunta
    titulo: "#1f6fd6",
    tema: "#0d8a6a",
    descripcion: "#4a6072",
    nube: "#8fb8ee",
    opcion: "#1f6fd6",
    // Formulario
    participacion: "#0d8a6a",
    nombre: "#1f6fd6",
    cargo: "#1f6fd6",
    reto: "#0f8fa8",
    pregunta: "#0f2434",
    boton: "#1f6fd6",
    botonTexto: "#ffffff",
    registrada: "#12a07c",
    gracias: "#0d8a6a"
  }
};

const HEX = /^#[0-9a-f]{6}$/i;
const str = (v, def) => (typeof v === "string" ? v : def);

export function normalizar(d = {}) {
  const estilo = {};
  for (const [k, v] of Object.entries(DEFAULTS.estilo)) {
    const dado = d.estilo?.[k];
    estilo[k] = typeof dado === "string" && HEX.test(dado) ? dado : v;
  }
  const textos = {};
  for (const [k, v] of Object.entries(DEFAULTS.textos)) textos[k] = str(d.textos?.[k], v);
  return {
    titulo: str(d.titulo, DEFAULTS.titulo),
    tema: str(d.tema, DEFAULTS.tema),
    descripcion: str(d.descripcion, DEFAULTS.descripcion),
    modo: d.modo === "abierta" ? "abierta" : d.modo === "cerrada" ? "cerrada" : DEFAULTS.modo,
    permitirOtra: typeof d.permitirOtra === "boolean" ? d.permitirOtra : DEFAULTS.permitirOtra,
    opciones: Array.isArray(d.opciones)
      ? d.opciones.slice(0, 6).map((o) => ({ emoji: str(o?.emoji, ""), texto: str(o?.texto, "") }))
      : DEFAULTS.opciones.map((o) => ({ ...o })),
    video: str(d.video, ""),
    imagen: str(d.imagen, ""),
    visible: visibles(d.visible, VISIBLES),
    textos,
    estilo
  };
}

const llenas = (lista) => lista.filter((o) => o.texto.trim() || o.emoji.trim());

// Paloma (mira a la derecha) llevando una carta. El ala se anima por CSS.
const PALOMA = `
<svg class="su-paloma-svg" viewBox="0 0 130 100" aria-hidden="true">
  <g class="su-carta-pico">
    <path d="M86 50 L92 62" stroke="#9fb3c6" stroke-width="2" stroke-linecap="round"/>
    <rect x="76" y="60" width="30" height="21" rx="3" fill="#fff" stroke="var(--pa-acento)" stroke-width="2.4"/>
    <path d="M77 62 L91 73 L105 62" fill="none" stroke="var(--pa-acento)" stroke-width="2.4" stroke-linejoin="round"/>
  </g>
  <path d="M24 54 L4 44 L11 56 L2 66 L27 61 Z" fill="#e8eff6" stroke="#b9cad9" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M22 55 C 38 40, 74 38, 94 45 C 101 47, 106 45, 110 41 C 113 48, 108 55, 100 59 C 80 69, 44 69, 22 55 Z" fill="#ffffff" stroke="#b9cad9" stroke-width="1.5"/>
  <circle cx="102" cy="40" r="9.5" fill="#ffffff" stroke="#b9cad9" stroke-width="1.5"/>
  <path d="M110 38 L121 41.5 L110 44 Z" fill="#f2a33a"/>
  <circle cx="104.5" cy="38" r="1.8" fill="#0f2434"/>
  <path class="su-ala" d="M60 47 C 50 20, 68 3, 92 1 C 84 15, 81 31, 72 47 Z" fill="#f3f7fb" stroke="#b9cad9" stroke-width="1.5" stroke-linejoin="round"/>
</svg>`;

const PLANTILLA = `
<div class="pa su">
  <section class="pa-card su-cabeza">
    <span class="su-tag" data-t="textos.tag"></span>
    <h1 data-t="titulo" data-c="titulo"></h1>
    <p class="pa-desc" data-t="descripcion" data-c="descripcion" data-vis="descripcion"></p>
    <div class="pa-video" hidden></div>
    <div class="pa-imagen" hidden></div>
  </section>

  <form class="pa-card pa-form" novalidate>
    <h2 class="su-tema" data-t="tema" data-c="tema"></h2>

    <div class="su-abierta">
      <textarea name="sugerencia" maxlength="600" data-ph="textos.abiertaPh" rows="5"></textarea>
      <div class="su-contador"><span>0</span>/600</div>
    </div>

    <div class="su-cerrada">
      <p class="su-como"><span aria-hidden="true">☁️</span><span data-t="textos.comoFunciona"></span></p>
      <div class="su-progreso" aria-live="polite"></div>
      <div class="su-opts"></div>
      <input class="su-otra-input" name="otra" maxlength="120" data-ph="textos.otraPh" hidden>
    </div>

    <h2 class="su-sub" data-t="textos.participacion" data-c="participacion"></h2>
    <label data-vis="nombre"><span data-t="textos.nombre" data-c="nombre"></span>
      <input name="nombre" autocomplete="name" maxlength="120">
    </label>
    <label data-vis="cargo"><span data-t="textos.cargo" data-c="cargo"></span>
      <input name="cargo" autocomplete="organization-title" maxlength="120">
    </label>

    <div class="pa-reto" data-c="reto" data-vis="reto">
      <div class="pa-reto-tag"><span aria-hidden="true">🎯</span><span data-t="textos.reto"></span></div>
      <p class="pa-preg" data-t="textos.pregunta" data-c="pregunta"></p>
      <input name="respuesta" maxlength="200" data-ph="textos.respuesta" autocomplete="off">
    </div>

    <div class="pa-err" hidden></div>
    <button type="submit" class="pa-enviar" data-c="boton"><span aria-hidden="true">🕊️</span> <span data-t="textos.enviar"></span></button>
  </form>

  <section class="pa-card pa-gracias" hidden>
    <div class="pa-check" data-c="registrada" aria-hidden="true">
      <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23"/><path d="M15 27l7.5 7.5L37.5 19"/></svg>
    </div>
    <div class="pa-registrada" data-t="textos.registrada" data-c="registrada"></div>
    <h2 data-t="textos.gracias" data-c="gracias"></h2>
    <p class="su-cierre"></p>
    <div class="pa-firma"></div>
  </section>

  <div class="su-vuelo" hidden>
    <div class="su-carta-sola" aria-hidden="true">
      <svg viewBox="0 0 60 42"><rect x="2" y="2" width="56" height="38" rx="5" fill="#fff" stroke="var(--pa-acento)" stroke-width="3"/><path d="M4 5 L30 25 L56 5" fill="none" stroke="var(--pa-acento)" stroke-width="3" stroke-linejoin="round"/></svg>
    </div>
    <div class="su-paloma">${PALOMA}</div>
    <p class="su-enviando" data-t="textos.enviando"></p>
  </div>
</div>`;

const leer = (obj, ruta) => ruta.split(".").reduce((o, k) => o?.[k], obj) ?? "";
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export { montarSugerencia as montar };

/**
 * Monta la pausa dentro de `root`.
 * @returns {{ actualizar, verDespedida, nublar }}
 */
export function montarSugerencia(root, datos, { modo = "real", onEnviar, pagina = false } = {}) {
  root.innerHTML = PLANTILLA;
  const el = root.querySelector(".pa");
  if (pagina) el.classList.add("pa-pagina");
  const q = (s) => el.querySelector(s);
  q(".pa-firma").append(crearFirma({ retraso: 1700 }));

  const form = q(".pa-form");
  const opts = q(".su-opts");
  const otraInput = q(".su-otra-input");
  const area = form.sugerencia;
  const err = q(".pa-err");
  const gracias = q(".pa-gracias");
  const btn = q(".pa-enviar");
  const vuelo = q(".su-vuelo");
  const videoBox = q(".su-cabeza .pa-video");
  const imgBox = q(".su-cabeza .pa-imagen");

  let estado = normalizar(datos);
  let elegida = null;          // índice de la opción o "otra"
  let descubiertas = new Set();
  let firmaOpciones = "";
  let videoActual = null, imagenActual = null;

  area.addEventListener("input", () => { q(".su-contador span").textContent = area.value.length; err.hidden = true; });

  // ---------- Opciones nubladas ----------
  function listaOpciones() {
    const l = llenas(estado.opciones).map((o, i) => ({ ...o, id: i }));
    if (estado.permitirOtra) l.push({ emoji: "✏️", texto: estado.textos.otra, id: "otra" });
    return l;
  }
  function pintarProgreso() {
    const total = listaOpciones().length;
    const n = Math.min(descubiertas.size, total);
    q(".su-progreso").textContent = n < total
      ? `☁️ Descubiertas ${n} de ${total}`
      : "✨ ¡Descubriste todas! Ahora toca la que elijas";
  }
  function pintarOpciones() {
    const lista = listaOpciones();
    const firma = JSON.stringify([lista, estado.textos.tocaNube]);
    if (firma === firmaOpciones) return;
    firmaOpciones = firma;
    opts.replaceChildren();
    lista.forEach((o, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "su-opt";
      b.dataset.id = String(o.id);
      b.style.setProperty("--i", i);
      const abierta = descubiertas.has(String(o.id));
      if (abierta) b.classList.add("descubierta");
      if (String(elegida) === String(o.id)) b.classList.add("on");
      b.setAttribute("aria-pressed", String(String(elegida) === String(o.id)));
      b.innerHTML = `
        <span class="su-opt-cont"><span class="emo" aria-hidden="true"></span><span class="su-opt-tx"></span></span>
        <span class="su-nube" aria-hidden="true"><span class="su-nube-emo">☁️</span><span class="su-nube-tx"></span></span>`;
      b.querySelector(".emo").textContent = o.emoji;
      b.querySelector(".su-opt-tx").textContent = o.texto;
      b.querySelector(".su-nube-tx").textContent = estado.textos.tocaNube;
      b.setAttribute("aria-label", abierta ? o.texto : estado.textos.tocaNube);
      b.onclick = () => tocar(b, o);
      opts.append(b);
    });
    pintarProgreso();
  }
  function tocar(b, o) {
    const id = String(o.id);
    err.hidden = true;
    if (!descubiertas.has(id)) {            // primer toque: se va la nube
      descubiertas.add(id);
      b.classList.add("descubierta", "soplando");
      b.setAttribute("aria-label", o.texto);
      setTimeout(() => b.classList.remove("soplando"), 700);
      pintarProgreso();
      return;
    }
    elegida = o.id;                          // segundo toque: se elige
    for (const x of opts.children) { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); }
    void b.offsetWidth;
    b.classList.add("on");
    b.setAttribute("aria-pressed", "true");
    otraInput.hidden = id !== "otra";
    if (id === "otra") otraInput.focus();
  }
  function nublar() {
    descubiertas = new Set();
    elegida = null;
    otraInput.hidden = true;
    otraInput.value = "";
    firmaOpciones = "";
    pintarOpciones();
  }

  // ---------- Paloma ----------
  async function volar() {
    // En la vista previa la capa ocupa solo la parte visible del celular.
    if (!pagina) {
      vuelo.style.top = root.scrollTop + "px";
      vuelo.style.height = root.clientHeight + "px";
    }
    vuelo.hidden = false;
    vuelo.classList.remove("volando");
    void vuelo.offsetWidth;
    vuelo.classList.add("volando");
    await espera(matchMedia("(prefers-reduced-motion: reduce)").matches ? 600 : 2500);
  }
  function aterrizar() { vuelo.hidden = true; vuelo.classList.remove("volando"); }

  // ---------- Envío ----------
  function error(texto) { err.textContent = texto; err.hidden = false; }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = form.nombre.value.trim();
    const cargo = form.cargo.value.trim();
    const respuesta = form.respuesta.value.trim();
    const v = estado.visible;
    const pregunta = v.reto ? estado.textos.pregunta.trim() : "";
    const contenido = { modo: estado.modo, tema: estado.tema };

    if (estado.modo === "abierta") {
      const sugerencia = area.value.trim();
      if (!sugerencia) return error("Escribe tu sugerencia antes de enviar.");
      contenido.sugerencia = sugerencia;
    } else {
      if (elegida === null) {
        return error(descubiertas.size ? "Toca otra vez la opción que elijas." : "Toca las nubes para descubrir las opciones.");
      }
      if (elegida === "otra") {
        const otra = otraInput.value.trim();
        if (!otra) { otraInput.focus(); return error("Escribe cuál es tu otra sugerencia."); }
        contenido.opcion = estado.textos.otra + ": " + otra;
        contenido.opcionEmoji = "✏️";
        contenido.otra = otra;
      } else {
        const o = llenas(estado.opciones)[elegida] || { emoji: "", texto: "" };
        contenido.opcion = o.texto;
        contenido.opcionEmoji = o.emoji;
      }
      contenido.descubiertas = descubiertas.size;
    }
    const falta = faltanDatos(v, nombre, cargo);
    if (falta) return error(falta);
    if (pregunta && !respuesta) return error("Responde el reto antes de enviar.");
    contenido.pregunta = pregunta;
    contenido.respuesta = pregunta ? respuesta : "";

    btn.disabled = true;
    const animacion = volar();               // la paloma sale mientras se guarda
    try {
      if (onEnviar) await onEnviar({ nombre: v.nombre ? nombre : "", cargo: v.cargo ? cargo : "", contenido });
      await animacion;
      despedir();
      if (modo === "preview") programarReinicio();
    } catch (ex) {
      aterrizar();
      error(ex?.message || "No se pudo enviar. Intenta de nuevo.");
    } finally {
      btn.disabled = false;
    }
  });

  let reinicioTimer;
  function programarReinicio() {
    clearTimeout(reinicioTimer);
    reinicioTimer = setTimeout(reiniciar, 5000);
  }
  function despedir() {
    aterrizar();
    videoBox.replaceChildren();   // detiene el video
    videoActual = null;
    const fija = estado.textos.graciasSub.trim();
    q(".su-cierre").textContent = fija || CIERRES[Math.floor(Math.random() * CIERRES.length)];
    form.hidden = true;
    gracias.hidden = false;
    el.classList.add("pa-fin");
    if (modo === "real") window.scrollTo({ top: 0 });
    else root.scrollTop = 0;
  }
  function reiniciar() {
    form.reset();
    q(".su-contador span").textContent = "0";
    err.hidden = true;
    gracias.hidden = true;
    form.hidden = false;
    el.classList.remove("pa-fin");
    nublar();
    actualizar(estado);
  }

  // ---------- Pintar datos ----------
  function actualizar(d) {
    estado = normalizar(d);
    el.querySelectorAll("[data-t]").forEach((n) => { n.textContent = leer(estado, n.dataset.t); });
    el.querySelectorAll("[data-ph]").forEach((n) => { n.placeholder = leer(estado, n.dataset.ph); });
    const s = estado.estilo;
    el.style.setProperty("--pa-fondo", s.fondo);
    el.style.setProperty("--pa-fondo2", s.fondo2);
    el.style.setProperty("--pa-tarjeta", s.tarjeta);
    el.style.setProperty("--pa-acento", s.acento);
    el.style.setProperty("--pa-texto", s.texto);
    el.style.setProperty("--pa-boton-texto", s.botonTexto);
    el.style.setProperty("--su-nube", s.nube);
    el.style.setProperty("--su-opcion", s.opcion);
    el.querySelectorAll("[data-c]").forEach((n) => { n.style.setProperty("--c", s[n.dataset.c]); });

    const abierta = estado.modo === "abierta";
    q(".su-abierta").hidden = !abierta;
    q(".su-cerrada").hidden = abierta;
    q(".pa-desc").hidden = !estado.descripcion.trim();
    q(".su-tema").hidden = !estado.tema.trim();
    q(".pa-reto").hidden = !estado.textos.pregunta.trim();
    if (elegida !== null && elegida !== "otra" && elegida >= llenas(estado.opciones).length) elegida = null;
    if (!estado.permitirOtra && elegida === "otra") { elegida = null; otraInput.hidden = true; }
    pintarOpciones();
    aplicarVisibles(el, estado.visible);

    const video = estado.visible.video ? estado.video : "";
    const imagen = estado.visible.imagen ? estado.imagen : "";
    if (video !== videoActual) { videoActual = video; pintarVideo(videoBox, video); }
    const claveImagen = imagen + "|" + estado.textos.ampliar;
    if (claveImagen !== imagenActual) {
      imagenActual = claveImagen;
      pintarImagen(imgBox, imagen, { aviso: estado.textos.ampliar, alt: estado.titulo });
    }
  }

  actualizar(estado);

  return {
    actualizar,
    nublar,
    // En el editor: muestra el vuelo de la paloma y luego la despedida.
    async verDespedida() {
      if (!el.classList.contains("pa-fin")) await volar();
      else { gracias.hidden = true; void gracias.offsetWidth; gracias.hidden = false; }
      despedir();
      programarReinicio();
    }
  };
}
