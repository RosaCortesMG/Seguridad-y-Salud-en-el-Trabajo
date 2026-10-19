// campana-informativa-vista.js
// Lo que ve el trabajador en una Campaña Informativa:
// un TELÓN a pantalla completa que solo se quita deslizando hacia arriba
// (o con la rueda del mouse / teclado). Debajo está la información, muy visual:
// imagen y/o video grandes, titular, mensaje, dato destacado, puntos clave y enlace.
// Luego: datos del trabajador, confirmación con opciones, reto y despedida.
// Usa las clases base de css/pausa-activa.css y las propias de css/campana-informativa.css (.ci-*).

import { pintarVideo, pintarImagen } from "./media.js";
import { crearFirma } from "./firma.js";
import { visibles, aplicarVisibles, faltanDatos } from "./visibles.js";

export const TIPO = "campana_informativa";

// Elementos que RH puede activar o desactivar (interruptores del editor).
export const VISIBLES = ["carga", "icono", "resumen", "dato", "puntos", "enlace", "video", "imagen",
  "nombre", "cargo", "logro", "reto"];

export const DEFAULTS = {
  titulo: "Jornada de salud visual",
  icono: "📢",
  resumen: "Este jueves tendremos tamizaje visual gratuito para todo el equipo. ¡Aparta tu espacio!",
  dato: { valor: "", texto: "" },
  puntos: [
    { emoji: "📅", texto: "Jueves 20 de noviembre" },
    { emoji: "🕘", texto: "De 8:00 a. m. a 12:00 m." },
    { emoji: "📍", texto: "Sala de capacitaciones" }
  ],
  enlace: { texto: "Más información", url: "" },
  opciones: [
    { emoji: "✅", texto: "Me quedó claro" },
    { emoji: "🤔", texto: "Tengo dudas" },
    { emoji: "🙋", texto: "Quiero participar" }
  ],
  video: "",
  imagen: "",
  textos: {
    portadaTag: "Campaña informativa",
    portadaTitulo: "Tenemos algo importante que contarte",
    deslizar: "Desliza hacia arriba para descubrirlo",
    infoTag: "SST & RH informa",
    puntosTitulo: "Lo que debes saber",
    ampliar: "🔍 Toca la imagen para verla en grande",
    participacion: "Tu participación",
    nombre: "Nombre y Apellido",
    cargo: "Cargo",
    logro: "¿Te quedó clara la información?",
    reto: "Reto",
    pregunta: "¿Qué día es la jornada?",
    respuesta: "Responde con una palabra o frase",
    enviar: "Enviar",
    registrada: "Participación Registrada",
    gracias: "Gracias por Participar",
    graciasSub: "Para nosotros es importante que te cuides",
    carga: ""
  },
  estilo: {
    // Generales
    fondo: "#eaf3fd",
    fondo2: "#e3f6ee",
    tarjeta: "#ffffff",
    acento: "#1f6fd6",
    texto: "#0f2434",
    // Telón
    portada1: "#1f6fd6",
    portada2: "#0f8fa8",
    portadaTexto: "#ffffff",
    // Información
    titulo: "#1f6fd6",
    resumen: "#0f2434",
    dato: "#0d8a6a",
    puntos: "#0d8a6a",
    enlace: "#1f6fd6",
    // Formulario
    participacion: "#0d8a6a",
    nombre: "#1f6fd6",
    cargo: "#1f6fd6",
    logro: "#1f6fd6",
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
const filas = (v, def, max) => Array.isArray(v)
  ? v.slice(0, max).map((o) => ({ emoji: str(o?.emoji, ""), texto: str(o?.texto, "") }))
  : def.map((o) => ({ ...o }));

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
    icono: str(d.icono, DEFAULTS.icono),
    resumen: str(d.resumen, DEFAULTS.resumen),
    dato: { valor: str(d.dato?.valor, ""), texto: str(d.dato?.texto, "") },
    puntos: filas(d.puntos, DEFAULTS.puntos, 6),
    enlace: { texto: str(d.enlace?.texto, DEFAULTS.enlace.texto), url: str(d.enlace?.url, "") },
    opciones: filas(d.opciones, DEFAULTS.opciones, 4),
    video: str(d.video, ""),
    imagen: str(d.imagen, ""),
    visible: visibles(d.visible, VISIBLES),
    textos,
    estilo
  };
}

function enlaceSeguro(url) {
  try {
    const u = new URL((url || "").trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch { return null; }
}
const llenas = (lista) => lista.filter((o) => o.texto.trim() || o.emoji.trim());

const PLANTILLA = `
<div class="pa ci ci-cubierta">
  <section class="ci-telon" tabindex="0" role="button">
    <span class="ci-burbuja ci-b1" aria-hidden="true"></span>
    <span class="ci-burbuja ci-b2" aria-hidden="true"></span>
    <div class="ci-telon-centro">
      <span class="ci-telon-tag" data-t="textos.portadaTag"></span>
      <div class="ci-icono" aria-hidden="true" data-vis="icono"><span data-t="icono"></span></div>
      <h2 class="ci-telon-titulo" data-t="textos.portadaTitulo"></h2>
    </div>
    <div class="ci-deslizar">
      <span class="ci-flechas" aria-hidden="true"><i></i><i></i><i></i></span>
      <span data-t="textos.deslizar"></span>
    </div>
  </section>

  <section class="pa-card ci-media" hidden>
    <div class="pa-video" hidden></div>
    <div class="pa-imagen" hidden></div>
  </section>

  <section class="pa-card ci-cuerpo">
    <span class="ci-tag" data-t="textos.infoTag"></span>
    <h1 data-t="titulo" data-c="titulo"></h1>
    <p class="ci-resumen" data-t="resumen" data-c="resumen" data-vis="resumen"></p>
    <div class="ci-dato" data-c="dato" data-vis="dato">
      <b data-t="dato.valor"></b>
      <span data-t="dato.texto"></span>
    </div>
  </section>

  <section class="pa-card ci-puntos" data-c="puntos" data-vis="puntos">
    <h2 data-t="textos.puntosTitulo"></h2>
    <ul></ul>
  </section>

  <a class="ci-enlace" data-c="enlace" data-vis="enlace" target="_blank" rel="noopener" hidden>
    <span data-t="enlace.texto"></span><span aria-hidden="true">↗</span>
  </a>

  <form class="pa-card pa-form" novalidate>
    <h2 data-t="textos.participacion" data-c="participacion"></h2>
    <label data-vis="nombre"><span data-t="textos.nombre" data-c="nombre"></span>
      <input name="nombre" autocomplete="name" maxlength="120">
    </label>
    <label data-vis="cargo"><span data-t="textos.cargo" data-c="cargo"></span>
      <input name="cargo" autocomplete="organization-title" maxlength="120">
    </label>

    <fieldset class="pa-bien ci-logro" data-vis="logro">
      <legend data-t="textos.logro" data-c="logro"></legend>
      <div class="pa-opts pm-opts"></div>
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

export { montarCampanaInformativa as montar };

/**
 * Monta la campaña dentro de `root`.
 * @returns {{ actualizar, verDespedida, cubrir, descubrir }}
 */
export function montarCampanaInformativa(root, datos, { modo = "real", onEnviar, pagina = false } = {}) {
  root.innerHTML = PLANTILLA;
  const el = root.querySelector(".pa");
  if (pagina) el.classList.add("pa-pagina");
  const q = (s) => el.querySelector(s);
  q(".pa-firma").append(crearFirma({ retraso: 1700 }));

  const telon = q(".ci-telon");
  const form = q(".pa-form");
  const opts = q(".pm-opts");
  const err = q(".pa-err");
  const gracias = q(".pa-gracias");
  const btn = q(".pa-enviar");
  const mediaBox = q(".ci-media");
  const videoBox = q(".ci-media .pa-video");
  const imgBox = q(".ci-media .pa-imagen");

  let estado = normalizar(datos);
  let cubierta = true;
  let elegida = -1;
  let firmaOpciones = "", firmaPuntos = "";
  let videoActual = null, imagenActual = null;

  // ---------- Telón: deslizar hacia arriba ----------
  const alto = () => (pagina ? window.innerHeight : el.clientHeight) || 600;
  let arrastrando = false, y0 = 0, dy = 0, t0 = 0;

  telon.addEventListener("pointerdown", (e) => {
    if (!cubierta) return;
    arrastrando = true; y0 = e.clientY; dy = 0; t0 = performance.now();
    telon.setPointerCapture(e.pointerId);
    telon.classList.add("arrastrando", "tocado");
  });
  telon.addEventListener("pointermove", (e) => {
    if (!arrastrando) return;
    dy = e.clientY - y0;
    const y = dy < 0 ? dy : dy * 0.2;   // hacia abajo casi no se mueve
    telon.style.transform = `translateY(${y}px)`;
    el.style.setProperty("--ci-prog", Math.min(1, Math.max(0, -dy) / (alto() * 0.45)).toFixed(3));
  });
  telon.addEventListener("pointerup", () => {
    if (!arrastrando) return;
    arrastrando = false;
    telon.classList.remove("arrastrando");
    const velocidad = dy / Math.max(1, performance.now() - t0);   // px/ms (negativo = hacia arriba)
    if (dy < -alto() * 0.22 || (dy < -40 && velocidad < -0.5)) descubrir();
    else {
      telon.style.transform = "";
      el.style.setProperty("--ci-prog", 0);
      if (Math.abs(dy) < 8) empujon();   // un toque no basta: recuerda que hay que deslizar
    }
  });
  telon.addEventListener("pointercancel", () => {
    arrastrando = false;
    telon.classList.remove("arrastrando");
    telon.style.transform = "";
    el.style.setProperty("--ci-prog", 0);
  });
  telon.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (e.deltaY > 20) descubrir();
  }, { passive: false });
  telon.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "PageDown", "Enter", " "].includes(e.key)) { e.preventDefault(); descubrir(); }
  });

  function empujon() {
    telon.classList.remove("empujon");
    void telon.offsetWidth;
    telon.classList.add("empujon");
  }

  function descubrir(sinAnimacion = false) {
    if (!cubierta || el.classList.contains("pa-fin")) return;
    cubierta = false;
    // Se fija la altura actual para que no cambie mientras sube.
    telon.style.height = alto() + "px";
    telon.classList.toggle("sin-anim", sinAnimacion);
    telon.classList.add("ido");
    telon.style.transform = "translateY(-105%)";
    el.classList.remove("ci-cubierta");
    el.classList.add("ci-descubierta");
    el.style.setProperty("--ci-prog", 1);
    if (modo === "real") window.scrollTo({ top: 0 });
    else root.scrollTop = 0;
    setTimeout(() => { if (!cubierta) telon.hidden = true; }, sinAnimacion ? 0 : 650);
  }

  function cubrir() {
    if (cubierta) return;
    cubierta = true;
    telon.hidden = false;
    telon.classList.remove("ido", "empujon");
    telon.classList.add("sin-anim");
    telon.style.transform = "translateY(-105%)";
    void telon.offsetWidth;
    telon.classList.remove("sin-anim");
    telon.style.transform = "";
    telon.style.height = "";
    el.classList.add("ci-cubierta");
    el.classList.remove("ci-descubierta");
    el.style.setProperty("--ci-prog", 0);
    if (modo === "real") window.scrollTo({ top: 0 });
    else root.scrollTop = 0;
  }

  // ---------- Opciones ----------
  function pintarOpciones() {
    const validas = llenas(estado.opciones);
    const firma = JSON.stringify(validas);
    if (firma === firmaOpciones) return;
    firmaOpciones = firma;
    if (elegida >= validas.length) elegida = -1;
    opts.replaceChildren();
    opts.classList.toggle("elegido", elegida >= 0);
    opts.style.setProperty("--n", validas.length === 4 ? 2 : Math.max(1, validas.length));
    q(".ci-logro").hidden = !validas.length;
    validas.forEach((o, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pa-opt" + (i === elegida ? " on" : "");
      b.dataset.c = "logro";
      b.style.setProperty("--c", estado.estilo.logro);
      b.setAttribute("aria-pressed", String(i === elegida));
      const emo = document.createElement("span");
      emo.className = "emo"; emo.setAttribute("aria-hidden", "true"); emo.textContent = o.emoji;
      const tx = document.createElement("span");
      tx.textContent = o.texto;
      b.append(emo, tx);
      b.onclick = () => {
        elegida = i;
        opts.classList.add("elegido");
        for (const x of opts.children) { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); }
        void b.offsetWidth;
        b.classList.add("on"); b.setAttribute("aria-pressed", "true");
        err.hidden = true;
      };
      opts.append(b);
    });
  }

  // ---------- Puntos clave ----------
  function pintarPuntos() {
    const lista = llenas(estado.puntos);
    q(".ci-puntos").hidden = !lista.length;
    const firma = JSON.stringify(lista);
    if (firma === firmaPuntos) return;
    firmaPuntos = firma;
    const ul = q(".ci-puntos ul");
    ul.replaceChildren();
    lista.forEach((p, i) => {
      const li = document.createElement("li");
      li.style.setProperty("--i", i);
      const emo = document.createElement("span");
      emo.className = "ci-punto-emo"; emo.setAttribute("aria-hidden", "true");
      emo.textContent = p.emoji || "•";
      const tx = document.createElement("span");
      tx.textContent = p.texto;
      li.append(emo, tx);
      ul.append(li);
    });
  }

  // ---------- Video e imagen ----------
  function pintarMedia() {
    const video = estado.visible.video ? estado.video : "";
    const imagen = estado.visible.imagen ? estado.imagen : "";
    mediaBox.hidden = !(video.trim() || imagen.trim());
    if (video !== videoActual) { videoActual = video; pintarVideo(videoBox, video); }
    const claveImagen = imagen + "|" + estado.textos.ampliar;
    if (claveImagen !== imagenActual) {
      imagenActual = claveImagen;
      pintarImagen(imgBox, imagen, { aviso: estado.textos.ampliar, alt: estado.titulo });
    }
  }

  // ---------- Envío ----------
  function error(texto) { err.textContent = texto; err.hidden = false; }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = form.nombre.value.trim();
    const cargo = form.cargo.value.trim();
    const respuesta = form.respuesta.value.trim();
    const v = estado.visible;
    const pregunta = v.reto ? estado.textos.pregunta.trim() : "";
    const validas = v.logro ? llenas(estado.opciones) : [];
    const falta = faltanDatos(v, nombre, cargo);
    if (falta) return error(falta);
    if (validas.length && elegida < 0) return error("Elige una opción en «" + estado.textos.logro + "».");
    if (pregunta && !respuesta) return error("Responde el reto antes de enviar.");

    const op = validas[elegida] || { emoji: "", texto: "" };
    btn.disabled = true;
    try {
      if (onEnviar) await onEnviar({
        nombre: v.nombre ? nombre : "",
        cargo: v.cargo ? cargo : "",
        contenido: {
          titulo: estado.titulo,
          logroPregunta: v.logro ? estado.textos.logro : "",
          opcion: op.texto,
          opcionEmoji: op.emoji,
          pregunta,
          respuesta
        }
      });
      despedir();
      if (modo === "preview") programarReinicio();
    } catch (ex) {
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
    videoBox.replaceChildren();   // detiene el video
    videoActual = null;
    form.hidden = true;
    gracias.hidden = false;
    el.classList.add("pa-fin");
    if (modo === "real") window.scrollTo({ top: 0 });
    else root.scrollTop = 0;
  }
  function reiniciar() {
    form.reset();
    elegida = -1;
    firmaOpciones = "";
    err.hidden = true;
    gracias.hidden = true;
    form.hidden = false;
    el.classList.remove("pa-fin");
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
    el.style.setProperty("--ci-p1", s.portada1);
    el.style.setProperty("--ci-p2", s.portada2);
    el.style.setProperty("--ci-ptexto", s.portadaTexto);
    el.querySelectorAll("[data-c]").forEach((n) => { n.style.setProperty("--c", s[n.dataset.c]); });

    telon.setAttribute("aria-label", `${estado.textos.portadaTitulo}. ${estado.textos.deslizar}`);
    q(".ci-icono").hidden = !estado.icono.trim();
    q(".ci-resumen").hidden = !estado.resumen.trim();
    q(".ci-dato").hidden = !(estado.dato.valor.trim() || estado.dato.texto.trim());
    const href = enlaceSeguro(estado.enlace.url);
    const a = q(".ci-enlace");
    a.hidden = !href;
    if (href) a.href = href;
    q(".pa-reto").hidden = !estado.textos.pregunta.trim();
    pintarPuntos();
    pintarOpciones();
    pintarMedia();
    aplicarVisibles(el, estado.visible);
  }

  actualizar(estado);

  return {
    actualizar,
    cubrir,
    descubrir: () => descubrir(true),
    verDespedida() {
      descubrir(true);
      if (el.classList.contains("pa-fin")) { gracias.hidden = true; void gracias.offsetWidth; gracias.hidden = false; }
      else despedir();
      programarReinicio();
    }
  };
}
