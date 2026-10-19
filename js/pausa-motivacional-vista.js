// pausa-motivacional-vista.js
// Lo que ve el trabajador en una Pausa Motivacional:
// una tarjeta con la PALABRA de la semana que se desliza (o se toca) para
// descubrir la FRASE debajo; botón opcional del libro; propósito de la frase
// con opciones de respuesta; reto; y la misma despedida de las demás pausas.
// Usa las clases base de css/pausa-activa.css (.pa, .pa-form, .pa-opt, .pa-reto…)
// y las propias en css/pausa-motivacional.css (.pm-*).

import { pintarVideo, pintarImagen } from "./media.js";
import { crearFirma } from "./firma.js";
import { visibles, aplicarVisibles, faltanDatos } from "./visibles.js";

export const TIPO = "pausa_motivacional";

// Elementos que RH puede activar o desactivar (interruptores del editor).
export const VISIBLES = ["carga", "autor", "objetivo", "logro", "video", "imagen", "nombre", "cargo", "reto"];

export const DEFAULTS = {
  titulo: "Pausa motivacional",
  palabra: "Resiliencia",
  frase: "No es lo que nos pasa, sino cómo respondemos a lo que nos pasa.",
  autor: "",
  objetivo: "Recordarte que tienes la fuerza para levantarte y seguir adelante.",
  opciones: [
    { emoji: "💪", texto: "Me motivó" },
    { emoji: "🤔", texto: "Me hizo reflexionar" },
    { emoji: "😐", texto: "No mucho" }
  ],
  libro: { mostrar: false, titulo: "", autor: "", pagina: "", enlace: "" },
  video: "",
  imagen: "",
  textos: {
    ampliar: "🔍 Toca la imagen para verla en grande",
    palabraTag: "Palabra de la semana",
    fraseTag: "Frase de la semana",
    deslizar: "Desliza la tarjeta para descubrir la frase",
    descubrir: "Descubrir la frase",
    volver: "Ver la palabra otra vez",
    libroBoton: "📖 ¿En qué libro aparece?",
    participacion: "Tu participación",
    nombre: "Nombre y Apellido",
    cargo: "Cargo",
    objetivoTag: "Lo que buscamos con esta frase",
    logro: "¿Lo logramos contigo?",
    reto: "Reto",
    pregunta: "Describe en una palabra lo que te deja esta frase",
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
    // Tarjetas
    titulo: "#1f6fd6",
    cartaPalabra: "#1f6fd6",
    cartaPalabra2: "#12a07c",
    palabra: "#ffffff",
    frase: "#0f2434",
    autor: "#0d8a6a",
    libro: "#0f8fa8",
    // Formulario
    participacion: "#0d8a6a",
    nombre: "#1f6fd6",
    cargo: "#1f6fd6",
    objetivo: "#0d8a6a",
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

export function normalizar(d = {}) {
  const estilo = {};
  for (const [k, v] of Object.entries(DEFAULTS.estilo)) {
    const dado = d.estilo?.[k];
    estilo[k] = typeof dado === "string" && HEX.test(dado) ? dado : v;
  }
  const textos = {};
  for (const [k, v] of Object.entries(DEFAULTS.textos)) textos[k] = str(d.textos?.[k], v);

  const opciones = Array.isArray(d.opciones)
    ? d.opciones.slice(0, 4).map((o) => ({ emoji: str(o?.emoji, ""), texto: str(o?.texto, "") }))
    : DEFAULTS.opciones.map((o) => ({ ...o }));

  const l = d.libro || {};
  return {
    titulo: str(d.titulo, DEFAULTS.titulo),
    palabra: str(d.palabra, DEFAULTS.palabra),
    frase: str(d.frase, DEFAULTS.frase),
    autor: str(d.autor, DEFAULTS.autor),
    objetivo: str(d.objetivo, DEFAULTS.objetivo),
    opciones,
    libro: {
      mostrar: l.mostrar === true,
      titulo: str(l.titulo, ""), autor: str(l.autor, ""), pagina: str(l.pagina, ""), enlace: str(l.enlace, "")
    },
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

const PLANTILLA = `
<div class="pa pm">
  <h1 class="pm-titulo" data-t="titulo" data-c="titulo"></h1>

  <section class="pm-mazo">
    <article class="pm-carta pm-frase" aria-live="polite">
      <span class="pm-tag" data-t="textos.fraseTag" data-c="autor"></span>
      <blockquote class="pm-texto" data-t="frase" data-c="frase"></blockquote>
      <cite class="pm-autor" data-c="autor" data-vis="autor"></cite>
      <div class="pm-chispas" aria-hidden="true"></div>
    </article>
    <article class="pm-carta pm-palabra" tabindex="0" role="button">
      <span class="pm-tag" data-t="textos.palabraTag"></span>
      <div class="pm-pal" data-t="palabra"></div>
      <div class="pm-pista"><span class="pm-mano" aria-hidden="true">👆</span><span data-t="textos.deslizar"></span></div>
    </article>
  </section>

  <div class="pm-controles">
    <button type="button" class="pm-btn pm-descubrir" data-t="textos.descubrir"></button>
    <button type="button" class="pm-btn pm-volver" data-t="textos.volver" hidden></button>
  </div>

  <section class="pm-libro" hidden>
    <button type="button" class="pm-libro-btn" data-t="textos.libroBoton" data-c="libro" aria-expanded="false"></button>
    <div class="pm-libro-info" data-c="libro" hidden>
      <div class="pm-libro-ico" aria-hidden="true">📖</div>
      <div class="pm-libro-datos">
        <b class="pm-libro-tit"></b>
        <span class="pm-libro-aut"></span>
        <span class="pm-libro-pag"></span>
        <a class="pm-libro-link" target="_blank" rel="noopener">Ver el libro →</a>
      </div>
    </div>
  </section>

  <section class="pa-card pm-media" hidden>
    <div class="pa-video" hidden></div>
    <div class="pa-imagen" hidden></div>
  </section>

  <form class="pa-card pa-form pm-form" novalidate hidden>
    <h2 data-t="textos.participacion" data-c="participacion"></h2>
    <label data-vis="nombre"><span data-t="textos.nombre" data-c="nombre"></span>
      <input name="nombre" autocomplete="name" maxlength="120">
    </label>
    <label data-vis="cargo"><span data-t="textos.cargo" data-c="cargo"></span>
      <input name="cargo" autocomplete="organization-title" maxlength="120">
    </label>

    <div class="pm-objetivo" data-c="objetivo" data-vis="objetivo">
      <span class="pm-objetivo-tag" data-t="textos.objetivoTag"></span>
      <p data-t="objetivo"></p>
    </div>

    <fieldset class="pa-bien pm-logro" data-vis="logro">
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

export { montarPausaMotivacional as montar };

/**
 * Monta la pausa dentro de `root`.
 * @returns {{ actualizar, verDespedida, mostrarPalabra, revelar }}
 */
export function montarPausaMotivacional(root, datos, { modo = "real", onEnviar, pagina = false } = {}) {
  root.innerHTML = PLANTILLA;
  const el = root.querySelector(".pa");
  if (pagina) el.classList.add("pa-pagina");
  const q = (s) => el.querySelector(s);
  q(".pa-firma").append(crearFirma({ retraso: 1700 }));
  const carta = q(".pm-palabra");
  const form = q(".pm-form");
  const opts = q(".pm-opts");
  const err = q(".pa-err");
  const gracias = q(".pa-gracias");
  const btn = q(".pa-enviar");
  const libroBox = q(".pm-libro");
  const libroBtn = q(".pm-libro-btn");
  const libroInfo = q(".pm-libro-info");
  const mediaBox = q(".pm-media");
  const videoBox = q(".pm-media .pa-video");
  const imgBox = q(".pm-media .pa-imagen");
  let videoActual = null, imagenActual = null;

  let estado = normalizar(datos);
  let revelada = false;
  let elegida = -1;
  let firmaOpciones = "";

  // ---------- Deslizar la tarjeta ----------
  let arrastrando = false, x0 = 0, dx = 0;
  const UMBRAL = 80;

  function marcarTocada() { carta.classList.add("tocada"); }

  carta.addEventListener("pointerdown", (e) => {
    if (revelada) return;
    arrastrando = true; x0 = e.clientX; dx = 0;
    carta.setPointerCapture(e.pointerId);
    carta.classList.add("arrastrando");
    marcarTocada();
  });
  carta.addEventListener("pointermove", (e) => {
    if (!arrastrando) return;
    dx = e.clientX - x0;
    carta.style.transform = `translateX(${dx}px) rotate(${dx / 14}deg)`;
    el.style.setProperty("--prog", Math.min(1, Math.abs(dx) / (UMBRAL * 1.5)).toFixed(3));
  });
  function soltar() {
    if (!arrastrando) return;
    arrastrando = false;
    carta.classList.remove("arrastrando");
    if (Math.abs(dx) > UMBRAL) lanzar(Math.sign(dx));
    else if (Math.abs(dx) < 6) lanzar(1);          // un toque también la descubre
    else { carta.style.transform = ""; el.style.setProperty("--prog", 0); }
  }
  carta.addEventListener("pointerup", soltar);
  // Si el navegador toma el gesto (por ejemplo, para hacer scroll), la tarjeta vuelve a su lugar.
  carta.addEventListener("pointercancel", () => {
    if (!arrastrando) return;
    arrastrando = false;
    carta.classList.remove("arrastrando");
    carta.style.transform = "";
    el.style.setProperty("--prog", 0);
  });
  carta.addEventListener("keydown", (e) => {
    if (["Enter", " ", "ArrowRight"].includes(e.key)) { e.preventDefault(); marcarTocada(); lanzar(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); marcarTocada(); lanzar(-1); }
  });
  q(".pm-descubrir").onclick = () => { marcarTocada(); lanzar(1); };
  q(".pm-volver").onclick = () => mostrarPalabra();

  function lanzar(dir, sinAnimacion = false) {
    if (revelada) return;
    revelada = true;
    carta.classList.toggle("sin-anim", sinAnimacion);
    carta.style.transform = `translateX(${dir * 135}%) rotate(${dir * 28}deg)`;
    carta.classList.add("lanzada");
    el.classList.add("pm-revelada");
    el.style.setProperty("--prog", 1);
    q(".pm-descubrir").hidden = true;
    q(".pm-volver").hidden = false;
    libroBox.hidden = !estado.libro.mostrar;
    pintarMedia();
    if (form.hidden && !el.classList.contains("pa-fin")) {
      form.hidden = false;
      form.classList.add("pm-entrar");
    }
    if (!sinAnimacion) chispas();
  }

  function mostrarPalabra() {
    if (!revelada) return;
    revelada = false;
    carta.classList.remove("lanzada", "sin-anim");
    carta.style.transform = "";
    el.classList.remove("pm-revelada");
    el.style.setProperty("--prog", 0);
    q(".pm-descubrir").hidden = false;
    q(".pm-volver").hidden = true;
    libroBox.hidden = true;
    mediaBox.hidden = true;
  }

  // ---------- Video e imagen (aparecen al descubrir la frase) ----------
  function pintarMedia() {
    const video = estado.visible.video ? estado.video : "";
    const imagen = estado.visible.imagen ? estado.imagen : "";
    mediaBox.hidden = !((video.trim() || imagen.trim()) && revelada && !el.classList.contains("pa-fin"));
    if (video !== videoActual) { videoActual = video; pintarVideo(videoBox, video); }
    const claveImagen = imagen + "|" + estado.textos.ampliar;
    if (claveImagen !== imagenActual) {
      imagenActual = claveImagen;
      pintarImagen(imgBox, imagen, { aviso: estado.textos.ampliar, alt: estado.palabra });
    }
  }

  function chispas() {
    const caja = q(".pm-chispas");
    caja.replaceChildren();
    const simbolos = ["✨", "⭐", "💫", "✨", "🌟", "✨", "⭐", "💫"];
    simbolos.forEach((s, i) => {
      const c = document.createElement("span");
      const ang = (i / simbolos.length) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 90 + Math.random() * 60;
      c.textContent = s;
      c.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      c.style.setProperty("--dy", Math.sin(ang) * dist + "px");
      c.style.animationDelay = Math.random() * 120 + "ms";
      caja.append(c);
    });
    setTimeout(() => caja.replaceChildren(), 1400);
  }

  // ---------- Libro ----------
  libroBtn.onclick = () => {
    const abrir = libroInfo.hidden;
    libroInfo.hidden = !abrir;
    libroBtn.setAttribute("aria-expanded", String(abrir));
    if (abrir) { libroInfo.classList.remove("pm-entrar"); void libroInfo.offsetWidth; libroInfo.classList.add("pm-entrar"); }
  };

  function pintarLibro() {
    const l = estado.libro;
    libroBox.hidden = !(l.mostrar && revelada);
    q(".pm-libro-tit").textContent = l.titulo || "Título del libro";
    q(".pm-libro-aut").textContent = l.autor ? "de " + l.autor : "";
    q(".pm-libro-pag").textContent = l.pagina ? "Página " + l.pagina : "";
    const href = enlaceSeguro(l.enlace);
    const a = q(".pm-libro-link");
    a.hidden = !href;
    if (href) a.href = href;
  }

  // ---------- Opciones de respuesta ----------
  function pintarOpciones() {
    const validas = estado.opciones.filter((o) => o.texto.trim() || o.emoji.trim());
    const firma = JSON.stringify(validas);
    if (firma === firmaOpciones) return;
    firmaOpciones = firma;
    if (elegida >= validas.length) elegida = -1;
    opts.replaceChildren();
    opts.classList.toggle("elegido", elegida >= 0);
    opts.style.setProperty("--n", validas.length === 4 ? 2 : Math.max(1, validas.length));
    q(".pm-logro").hidden = !validas.length;
    validas.forEach((o, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pa-opt" + (i === elegida ? " on" : "");
      b.dataset.c = "logro";
      b.setAttribute("aria-pressed", String(i === elegida));
      const emo = document.createElement("span");
      emo.className = "emo"; emo.setAttribute("aria-hidden", "true");
      emo.textContent = o.emoji;
      const tx = document.createElement("span");
      tx.textContent = o.texto;
      b.append(emo, tx);
      b.style.setProperty("--c", estado.estilo.logro);
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
  const opcionesValidas = () => estado.opciones.filter((o) => o.texto.trim() || o.emoji.trim());

  // ---------- Envío ----------
  function error(texto) { err.textContent = texto; err.hidden = false; }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = form.nombre.value.trim();
    const cargo = form.cargo.value.trim();
    const respuesta = form.respuesta.value.trim();
    const v = estado.visible;
    const pregunta = v.reto ? estado.textos.pregunta.trim() : "";
    const validas = v.logro ? opcionesValidas() : [];
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
          palabra: estado.palabra,
          frase: estado.frase,
          proposito: v.objetivo ? estado.objetivo : "",
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
    else if (root.scrollTop) root.scrollTop = 0;
  }
  function reiniciar() {
    form.reset();
    elegida = -1;
    firmaOpciones = "";
    err.hidden = true;
    gracias.hidden = true;
    el.classList.remove("pa-fin");
    form.hidden = !revelada;
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
    el.style.setProperty("--pm-carta1", s.cartaPalabra);
    el.style.setProperty("--pm-carta2", s.cartaPalabra2);
    el.style.setProperty("--pm-palabra", s.palabra);
    el.style.setProperty("--pm-len", Math.max(6, [...estado.palabra.trim()].length));
    el.querySelectorAll("[data-c]").forEach((n) => { n.style.setProperty("--c", s[n.dataset.c]); });
    q(".pm-autor").textContent = estado.autor.trim() ? "— " + estado.autor.trim() : "";
    carta.setAttribute("aria-label", `${estado.textos.palabraTag}: ${estado.palabra}. ${estado.textos.deslizar}`);
    q(".pa-reto").hidden = !estado.textos.pregunta.trim();
    q(".pm-objetivo").hidden = !estado.objetivo.trim();
    pintarLibro();
    pintarOpciones();
    pintarMedia();
    aplicarVisibles(el, estado.visible);
  }

  actualizar(estado);

  return {
    actualizar,
    mostrarPalabra,
    revelar: () => lanzar(1, true),
    verDespedida() {
      if (el.classList.contains("pa-fin")) { gracias.hidden = true; void gracias.offsetWidth; gracias.hidden = false; }
      else despedir();
      programarReinicio();
    }
  };
}
