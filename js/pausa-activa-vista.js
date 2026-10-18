// pausa-activa-vista.js
// Dibuja la Pausa Activa tal como la ve el trabajador. Se usa en dos lugares:
//  - pausas-activas.html → vista previa en vivo (modo "preview", no guarda nada)
//  - responder.html      → enlace real (modo "real", llama a onEnviar)

export const TIPO = "pausa_activa";

export const DEFAULTS = {
  titulo: "Pausa activa",
  descripcion: "Tómate 5 minutos, sigue el video y cuéntanos cómo te fue.",
  video: "",
  textos: {
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
    textos,
    estilo
  };
}

// Convierte el link pegado por RH en algo reproducible.
export function analizarVideo(url) {
  url = (url || "").trim();
  if (!url) return null;
  let u;
  try { u = new URL(url); } catch { return { tipo: "invalido" }; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { tipo: "invalido" };

  const host = u.hostname.replace(/^(www\.|m\.)/, "");
  let id = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
    id = u.searchParams.get("v");
    if (!id) {
      const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/);
      if (m) id = m[2];
    }
  }
  if (id && /^[\w-]{6,}$/.test(id)) {
    return { tipo: "iframe", fuente: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1` };
  }
  if (host === "vimeo.com") {
    const m = u.pathname.match(/^\/(\d+)/);
    if (m) return { tipo: "iframe", fuente: "Vimeo", src: `https://player.vimeo.com/video/${m[1]}` };
  }
  if (host === "drive.google.com") {
    const m = u.pathname.match(/\/file\/d\/([\w-]+)/);
    if (m) return { tipo: "iframe", fuente: "Google Drive", src: `https://drive.google.com/file/d/${m[1]}/preview` };
  }
  if (/\.(mp4|webm|ogg)$/i.test(u.pathname)) return { tipo: "video", fuente: "Archivo de video", src: u.href };
  return { tipo: "enlace", fuente: "Enlace externo", src: u.href };
}

function pintarVideo(caja, url) {
  caja.replaceChildren();
  caja.className = "pa-video";
  const v = analizarVideo(url);
  if (!v || v.tipo === "invalido") {
    caja.classList.add("vacio");
    caja.textContent = v ? "El link del video no es válido." : "Aquí aparecerá el video";
    return;
  }
  if (v.tipo === "iframe") {
    const f = document.createElement("iframe");
    f.src = v.src;
    f.title = "Video de la pausa activa";
    f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    f.allowFullscreen = true;
    f.referrerPolicy = "strict-origin-when-cross-origin";
    f.loading = "lazy";
    caja.append(f);
  } else if (v.tipo === "video") {
    const el = document.createElement("video");
    el.src = v.src; el.controls = true; el.playsInline = true; el.preload = "metadata";
    caja.append(el);
  } else {
    caja.classList.add("enlace");
    const a = document.createElement("a");
    a.href = v.src; a.target = "_blank"; a.rel = "noopener";
    a.textContent = "▶  Ver el video";
    caja.append(a);
  }
}

const PLANTILLA = `
<div class="pa">
  <section class="pa-card">
    <h1 data-t="titulo" data-c="titulo"></h1>
    <p class="pa-desc" data-t="descripcion" data-c="descripcion"></p>
    <div class="pa-video"></div>
  </section>

  <form class="pa-card pa-form" novalidate>
    <h2 data-t="textos.participacion" data-c="participacion"></h2>
    <label><span data-t="textos.nombre" data-c="nombre"></span>
      <input name="nombre" autocomplete="name" maxlength="120">
    </label>
    <label><span data-t="textos.cargo" data-c="cargo"></span>
      <input name="cargo" autocomplete="organization-title" maxlength="120">
    </label>

    <fieldset class="pa-bien">
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

    <div class="pa-reto" data-c="reto">
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
    <div class="pa-firma">SST &amp; RH</div>
  </section>
</div>`;

const leer = (obj, ruta) => ruta.split(".").reduce((o, k) => o?.[k], obj) ?? "";

/**
 * Monta la pausa dentro de `root`.
 * @param {"preview"|"real"} opciones.modo
 * @param {(r:{nombre,cargo,bienestar,pregunta,respuesta})=>Promise} opciones.onEnviar
 * @returns {{ actualizar(datos): void }}
 */
export function montarPausaActiva(root, datos, { modo = "real", onEnviar, pagina = false } = {}) {
  root.innerHTML = PLANTILLA;
  const el = root.querySelector(".pa");
  if (pagina) el.classList.add("pa-pagina");
  const form = el.querySelector(".pa-form");
  const opts = el.querySelector(".pa-opts");
  const caja = el.querySelector(".pa-video");
  const retoBox = el.querySelector(".pa-reto");
  const err = el.querySelector(".pa-err");
  const gracias = el.querySelector(".pa-gracias");
  const btn = el.querySelector(".pa-enviar");

  let estado = normalizar(datos);
  let videoActual = null;
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
    const pregunta = estado.textos.pregunta.trim();
    if (!nombre || !cargo) return error("Escribe tu nombre, apellido y cargo.");
    if (!bienestar) return error("Elige si la pausa aportó a tu bienestar.");
    if (pregunta && !respuesta) return error("Responde el reto antes de enviar.");

    btn.disabled = true;
    try {
      if (onEnviar) await onEnviar({ nombre, cargo, bienestar, pregunta, respuesta });
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
    // Solo se recarga el video si cambió el link (evita reiniciarlo al escribir).
    if (estado.video !== videoActual) {
      videoActual = estado.video;
      pintarVideo(caja, estado.video);
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
