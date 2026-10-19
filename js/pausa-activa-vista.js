// pausa-activa-vista.js
// Dibuja la Pausa Activa tal como la ve el trabajador. Se usa en dos lugares:
//  - pausas-activas.html → vista previa en vivo (modo "preview", no guarda nada)
//  - responder.html      → enlace real (modo "real", llama a onEnviar)

import { pintarVideo, pintarImagen } from "./media.js";
import { crearFirma } from "./firma.js";
import { visibles, aplicarVisibles, faltanDatos } from "./visibles.js";
export { analizarVideo } from "./media.js";

export const TIPO = "pausa_activa";

// Elementos que RH puede activar o desactivar (interruptores del editor).
export const VISIBLES = ["carga", "descripcion", "video", "imagen", "nombre", "cargo", "bienestar", "reto"];

export const DEFAULTS = {
  titulo: "Pausa activa",
  descripcion: "Tómate 5 minutos, sigue el video y cuéntanos cómo te fue.",
  video: "",
  imagen: "",
  textos: {
    ampliar: "🔍 Toca la imagen para verla en grande",
    participacion: "Tu participación",
    nombre: "Nombre y Apellido",
    cargo: "Cargo",
    bienestar: "¿Aportó a mi bienestar?",
    si: "¡Sí, me ayudó!",
    no: "No mucho",
    reto: "Reto",
    pregunta: "¿Qué ejercicio del video te gustó más?",
    respuesta: "Responde con una palabra o frase",
    enviar: "Enviar",
    registrada: "Participación Registrada",
    gracias: "Gracias por Participar",
    graciasSub: "Para nosotros es importante que te cuides",
    carga: ""            // frase de la pantalla de carga; vacía = una al azar
  },
  estilo: {
    // Generales
    fondo: "#eaf3fd",
    fondo2: "#e3f6ee",
    tarjeta: "#ffffff",
    acento: "#1f6fd6",   // bordes de casillas y frase destacada de la pantalla de carga
    texto: "#0f2434",
    // Color de cada elemento
    titulo: "#1f6fd6",
    descripcion: "#4a6072",
    participacion: "#0d8a6a",
    nombre: "#1f6fd6",
    cargo: "#1f6fd6",
    bienestar: "#0d8a6a",
    si: "#12a07c",
    no: "#d9622b",
    reto: "#0f8fa8",
    pregunta: "#0f2434",
    boton: "#1f6fd6",
    botonTexto: "#ffffff",
    registrada: "#12a07c",
    gracias: "#0d8a6a"
  }
};

// Textos por defecto de versiones anteriores: si una pausa guardada aún los
// tiene, se reemplazan por los nuevos.
const TEXTOS_ANTIGUOS = {
  gracias: ["¡Gracias por participar!"],
  graciasSub: ["Tu respuesta quedó registrada."]
};

const HEX = /^#[0-9a-f]{6}$/i;

// Completa con valores por defecto y descarta colores inválidos.
export function normalizar(d = {}) {
  const estilo = {};
  for (const [k, v] of Object.entries(DEFAULTS.estilo)) {
    const dado = d.estilo?.[k];
    estilo[k] = typeof dado === "string" && HEX.test(dado) ? dado : v;
  }
  const textos = {};
  for (const [k, v] of Object.entries(DEFAULTS.textos)) {
    const dado = d.textos?.[k];
    textos[k] = typeof dado === "string" && !TEXTOS_ANTIGUOS[k]?.includes(dado) ? dado : v;
  }
  return {
    titulo: typeof d.titulo === "string" ? d.titulo : DEFAULTS.titulo,
    descripcion: typeof d.descripcion === "string" ? d.descripcion : DEFAULTS.descripcion,
    video: typeof d.video === "string" ? d.video : "",
    imagen: typeof d.imagen === "string" ? d.imagen : "",
    visible: visibles(d.visible, VISIBLES),
    textos,
    estilo
  };
}

const PLANTILLA = `
<div class="pa">
  <section class="pa-card">
    <h1 data-t="titulo" data-c="titulo"></h1>
    <p class="pa-desc" data-t="descripcion" data-c="descripcion" data-vis="descripcion"></p>
    <div class="pa-video"></div>
    <div class="pa-imagen" hidden></div>
  </section>

  <form class="pa-card pa-form" novalidate>
    <h2 data-t="textos.participacion" data-c="participacion"></h2>
    <label data-vis="nombre"><span data-t="textos.nombre" data-c="nombre"></span>
      <input name="nombre" autocomplete="name" maxlength="120">
    </label>
    <label data-vis="cargo"><span data-t="textos.cargo" data-c="cargo"></span>
      <input name="cargo" autocomplete="organization-title" maxlength="120">
    </label>

    <fieldset class="pa-bien" data-vis="bienestar">
      <legend data-t="textos.bienestar" data-c="bienestar"></legend>
      <div class="pa-opts">
        <button type="button" class="pa-opt si" data-v="si" data-c="si" aria-pressed="false">
          <span class="emo" aria-hidden="true">👍</span><span data-t="textos.si"></span>
        </button>
        <button type="button" class="pa-opt no" data-v="no" data-c="no" aria-pressed="false">
          <span class="emo" aria-hidden="true">😢</span><span data-t="textos.no"></span>
        </button>
      </div>
    </fieldset>

    <div class="pa-reto" data-c="reto" data-vis="reto">
      <div class="pa-reto-tag"><span aria-hidden="true">🎯</span><span data-t="textos.reto"></span></div>
      <p class="pa-preg" data-t="textos.pregunta" data-c="pregunta"></p>
      <input name="respuesta" maxlength="200" data-ph="textos.respuesta" autocomplete="off">
    </div>

    <div class="pa-err" hidden></div>
    <button type="submit" class="pa-enviar" data-t="textos.enviar" data-c="boton"></button>
  </form>

  <section class="pa-card pa-gracias" hidden>
    <div class="pa-check" data-c="registrada" aria-hidden="true">
      <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="23"/><path d="M15 27l7.5 7.5L37.5 19"/></svg>
    </div>
    <div class="pa-registrada" data-t="textos.registrada" data-c="registrada"></div>
    <h2 data-t="textos.gracias" data-c="gracias"></h2>
    <p data-t="textos.graciasSub"></p>
    <div class="pa-firma"></div>
  </section>
</div>`;

const leer = (obj, ruta) => ruta.split(".").reduce((o, k) => o?.[k], obj) ?? "";

// Nombre común que usa responder.html para cualquier tipo de pausa.
export { montarPausaActiva as montar };

/**
 * Monta la pausa dentro de `root`.
 * @param {"preview"|"real"} opciones.modo
 * @param {(r:{nombre,cargo,contenido})=>Promise} opciones.onEnviar
 * @returns {{ actualizar(datos): void, verDespedida(): void }}
 */
export function montarPausaActiva(root, datos, { modo = "real", onEnviar, pagina = false } = {}) {
  root.innerHTML = PLANTILLA;
  const el = root.querySelector(".pa");
  if (pagina) el.classList.add("pa-pagina");
  // La firma se escribe cuando aparece la despedida (al mostrarse, la animación arranca).
  el.querySelector(".pa-firma").append(crearFirma({ retraso: 1700 }));
  const form = el.querySelector(".pa-form");
  const opts = el.querySelector(".pa-opts");
  const caja = el.querySelector(".pa-video");
  const imgBox = el.querySelector(".pa-imagen");
  const retoBox = el.querySelector(".pa-reto");
  const err = el.querySelector(".pa-err");
  const gracias = el.querySelector(".pa-gracias");
  const btn = el.querySelector(".pa-enviar");

  let estado = normalizar(datos);
  let videoActual = null;
  let imagenActual = null;
  let bienestar = null;

  opts.addEventListener("click", (e) => {
    const b = e.target.closest(".pa-opt");
    if (!b) return;
    bienestar = b.dataset.v;
    opts.classList.add("elegido");
    for (const o of opts.children) { o.classList.remove("on"); o.setAttribute("aria-pressed", "false"); }
    void b.offsetWidth; // reinicia la animación si se vuelve a tocar
    b.classList.add("on");
    b.setAttribute("aria-pressed", "true");
    err.hidden = true;
  });

  function error(texto) { err.textContent = texto; err.hidden = false; }

  function reiniciar() {
    form.reset();
    bienestar = null;
    opts.classList.remove("elegido");
    for (const o of opts.children) { o.classList.remove("on"); o.setAttribute("aria-pressed", "false"); }
    err.hidden = true;
    gracias.hidden = true;
    form.hidden = false;
    el.classList.remove("pa-fin");
    actualizar(estado); // vuelve a poner el video
  }

  // En la vista previa la despedida se muestra unos segundos y vuelve al formulario.
  let reinicioTimer;
  function programarReinicio() {
    clearTimeout(reinicioTimer);
    reinicioTimer = setTimeout(reiniciar, 5000);
  }

  // Pantalla de despedida: oculta todo lo demás y detiene el video.
  function despedir() {
    caja.replaceChildren();
    videoActual = null;
    form.hidden = true;
    gracias.hidden = false;
    el.classList.add("pa-fin");
    if (modo === "real") window.scrollTo({ top: 0 });
    else if (root.scrollTop) root.scrollTop = 0;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = form.nombre.value.trim();
    const cargo = form.cargo.value.trim();
    const respuesta = form.respuesta.value.trim();
    const v = estado.visible;
    const pregunta = v.reto ? estado.textos.pregunta.trim() : "";
    const falta = faltanDatos(v, nombre, cargo);
    if (falta) return error(falta);
    if (v.bienestar && !bienestar) return error("Elige si la pausa aportó a tu bienestar.");
    if (pregunta && !respuesta) return error("Responde el reto antes de enviar.");

    btn.disabled = true;
    try {
      if (onEnviar) await onEnviar({
        nombre: v.nombre ? nombre : "",
        cargo: v.cargo ? cargo : "",
        contenido: { bienestar: v.bienestar ? bienestar : "", pregunta, respuesta: pregunta ? respuesta : "" }
      });
      despedir();
      if (modo === "preview") programarReinicio();
    } catch (ex) {
      error(ex?.message || "No se pudo enviar. Intenta de nuevo.");
    } finally {
      btn.disabled = false;
    }
  });

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
    // Cada elemento con data-c toma su propio color (--c).
    el.querySelectorAll("[data-c]").forEach((n) => { n.style.setProperty("--c", s[n.dataset.c]); });
    retoBox.hidden = !estado.textos.pregunta.trim();
    aplicarVisibles(el, estado.visible);
    // Solo se recarga el video/imagen si cambió (evita reiniciarlo al escribir).
    // En la vista previa, si no hay ninguno, se muestra un recuadro de ejemplo.
    const video = estado.visible.video ? estado.video : "";
    const imagen = estado.visible.imagen ? estado.imagen : "";
    const placeholder = modo === "preview" && !video.trim() && !imagen.trim()
      ? "Aquí aparecerá el video o la imagen" : "";
    const claveVideo = video + "|" + placeholder;
    if (claveVideo !== videoActual) {
      videoActual = claveVideo;
      pintarVideo(caja, video, { placeholder });
    }
    const claveImagen = imagen + "|" + estado.textos.ampliar;
    if (claveImagen !== imagenActual) {
      imagenActual = claveImagen;
      pintarImagen(imgBox, imagen, { aviso: estado.textos.ampliar, alt: estado.titulo });
    }
  }

  actualizar(estado);
  return {
    actualizar,
    // Solo para el editor: muestra la despedida sin enviar nada.
    verDespedida() {
      if (el.classList.contains("pa-fin")) { gracias.hidden = true; void gracias.offsetWidth; gracias.hidden = false; }
      else despedir();
      programarReinicio();
    }
  };
}
