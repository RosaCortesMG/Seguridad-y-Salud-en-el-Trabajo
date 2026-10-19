// media.js
// Video e imagen de las pausas (compartido por todos los tipos):
//  - analizarVideo / pintarVideo: YouTube, Vimeo, Drive o .mp4
//  - urlImagen / pintarImagen: imagen con aviso "toca para ampliar"
//  - abrirVisor: imagen a pantalla completa con zoom (pellizcar, rueda, doble toque) y arrastre
//  - comprimirImagen: reduce una foto del computador para guardarla dentro de la pausa
// Estilos en css/media.css.

// ---------- Video ----------
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

/** Dibuja el video en `caja`. Sin link: se oculta, o muestra `placeholder` si se pasa. */
export function pintarVideo(caja, url, { placeholder = "" } = {}) {
  caja.replaceChildren();
  caja.className = "pa-video";
  const v = analizarVideo(url);
  caja.hidden = !v && !placeholder;
  if (!v || v.tipo === "invalido") {
    caja.classList.add("vacio");
    caja.textContent = v ? "El link del video no es válido." : placeholder;
    return;
  }
  if (v.tipo === "iframe") {
    const f = document.createElement("iframe");
    f.src = v.src;
    f.title = "Video de la pausa";
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

// ---------- Imagen ----------
/** Devuelve una URL de imagen utilizable, o null. Convierte links de Drive y Dropbox. */
export function urlImagen(valor) {
  valor = (valor || "").trim();
  if (!valor) return null;
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(valor)) return valor;
  let u;
  try { u = new URL(valor); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.hostname === "drive.google.com") {
    const m = u.pathname.match(/\/file\/d\/([\w-]+)/) || [null, u.searchParams.get("id")];
    if (m[1]) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w2000`;
  }
  if (u.hostname.endsWith("dropbox.com")) {
    u.searchParams.delete("dl");
    u.searchParams.set("raw", "1");
    return u.href;
  }
  return u.href;
}

/** Dibuja la imagen con el aviso para ampliar; al tocarla abre el visor con zoom. */
export function pintarImagen(caja, valor, { aviso = "", alt = "Imagen de la pausa" } = {}) {
  caja.replaceChildren();
  caja.className = "pa-imagen";
  const src = urlImagen(valor);
  caja.hidden = !src;
  if (!src) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "pa-img-btn";
  btn.setAttribute("aria-label", (aviso || "Ampliar imagen").replace(/[^\p{L}\p{N}\s.,¿?¡!]/gu, "").trim());
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.loading = "lazy";
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  const lupa = document.createElement("span");
  lupa.className = "pa-img-lupa";
  lupa.setAttribute("aria-hidden", "true");
  lupa.innerHTML = '<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2.4"/><path d="M16 16l4.5 4.5M11 8v6M8 11h6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  btn.append(img, lupa);
  img.onerror = () => {
    btn.replaceWith(Object.assign(document.createElement("div"), {
      className: "pa-img-error",
      textContent: "No se pudo cargar la imagen. Revisa que el link sea público."
    }));
  };
  btn.onclick = () => abrirVisor(src, alt);
  caja.append(btn);

  if (aviso.trim()) {
    const p = document.createElement("p");
    p.className = "pa-img-aviso";
    p.textContent = aviso;
    p.onclick = () => abrirVisor(src, alt);
    caja.append(p);
  }
}

// ---------- Visor con zoom ----------
const ZOOM_MAX = 5;

export function abrirVisor(src, alt = "") {
  const capa = document.createElement("div");
  capa.className = "visor";
  capa.setAttribute("role", "dialog");
  capa.setAttribute("aria-modal", "true");
  capa.setAttribute("aria-label", "Imagen ampliada");
  capa.innerHTML = `
    <div class="visor-escena"><img alt=""></div>
    <div class="visor-barra">
      <button type="button" data-a="menos" aria-label="Alejar">−</button>
      <button type="button" data-a="ajustar" aria-label="Ajustar a la pantalla">⤢</button>
      <button type="button" data-a="mas" aria-label="Acercar">+</button>
    </div>
    <button type="button" class="visor-cerrar" aria-label="Cerrar">×</button>
    <div class="visor-ayuda">Pellizca o usa la rueda para hacer zoom · Doble toque para acercar</div>`;
  const escena = capa.querySelector(".visor-escena");
  const img = capa.querySelector("img");
  img.alt = alt;
  img.referrerPolicy = "no-referrer";
  img.draggable = false;

  let base = { w: 0, h: 0 };   // tamaño de la imagen ajustada a la pantalla (zoom 1)
  let s = 1, tx = 0, ty = 0;   // zoom y desplazamiento

  function aplicar(animar = false) {
    img.style.transition = animar ? "transform .25s ease" : "none";
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  }
  // Mantiene la imagen centrada si es más pequeña que la pantalla, y sin dejar huecos si es más grande.
  function limitar() {
    const W = escena.clientWidth, H = escena.clientHeight;
    const w = base.w * s, h = base.h * s;
    tx = w <= W ? (W - w) / 2 : Math.min(0, Math.max(W - w, tx));
    ty = h <= H ? (H - h) / 2 : Math.min(0, Math.max(H - h, ty));
  }
  function ajustar(animar) {
    const W = escena.clientWidth, H = escena.clientHeight;
    const r = Math.min((W - 24) / img.naturalWidth, (H - 24) / img.naturalHeight, 2);
    base = { w: img.naturalWidth * r, h: img.naturalHeight * r };
    img.style.width = base.w + "px";
    img.style.height = base.h + "px";
    s = 1; limitar(); aplicar(animar);
  }
  // Zoom alrededor de un punto (px, py) de la pantalla.
  function zoomEn(nuevo, px, py, animar) {
    nuevo = Math.min(ZOOM_MAX, Math.max(1, nuevo));
    tx = px - (px - tx) * (nuevo / s);
    ty = py - (py - ty) * (nuevo / s);
    s = nuevo;
    limitar(); aplicar(animar);
  }
  const centro = () => [escena.clientWidth / 2, escena.clientHeight / 2];

  img.onload = () => ajustar(false);
  img.src = src;

  // Rueda del mouse
  escena.addEventListener("wheel", (e) => {
    e.preventDefault();
    const r = escena.getBoundingClientRect();
    zoomEn(s * Math.exp(-e.deltaY * 0.0018), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  // Dedos / mouse: arrastrar con uno, pellizcar con dos
  const punteros = new Map();
  let prev = null;
  let ultimoToque = 0;
  const leerGesto = () => {
    const r = escena.getBoundingClientRect();
    const ps = [...punteros.values()];
    const x = ps.reduce((a, p) => a + p.x, 0) / ps.length - r.left;
    const y = ps.reduce((a, p) => a + p.y, 0) / ps.length - r.top;
    const d = ps.length > 1 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0;
    return { x, y, d, n: ps.length };
  };
  escena.addEventListener("pointerdown", (e) => {
    escena.setPointerCapture(e.pointerId);
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    prev = leerGesto();
    // Doble toque / doble clic: acercar o volver a ajustar
    if (punteros.size === 1) {
      const ahora = Date.now();
      if (ahora - ultimoToque < 300) {
        if (s > 1.05) ajustar(true);
        else zoomEn(2.5, prev.x, prev.y, true);
        ultimoToque = 0;
      } else ultimoToque = ahora;
    }
  });
  escena.addEventListener("pointermove", (e) => {
    if (!punteros.has(e.pointerId)) return;
    punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = leerGesto();
    if (prev && g.n === prev.n) {
      if (g.n > 1 && prev.d) {
        tx += g.x - prev.x; ty += g.y - prev.y;
        zoomEn(s * (g.d / prev.d), g.x, g.y);
      } else if (s > 1) {
        tx += g.x - prev.x; ty += g.y - prev.y;
        limitar(); aplicar();
      }
    }
    prev = g;
  });
  const quitar = (e) => { punteros.delete(e.pointerId); prev = punteros.size ? leerGesto() : null; };
  escena.addEventListener("pointerup", quitar);
  escena.addEventListener("pointercancel", quitar);

  // Botones
  capa.querySelector(".visor-barra").onclick = (e) => {
    const a = e.target.closest("button")?.dataset.a;
    if (a === "mas") zoomEn(s * 1.6, ...centro(), true);
    if (a === "menos") zoomEn(s / 1.6, ...centro(), true);
    if (a === "ajustar") ajustar(true);
  };

  // Cerrar
  const previoFoco = document.activeElement;
  const overflowPrevio = document.body.style.overflow;
  function cerrar() {
    capa.classList.add("saliendo");
    document.removeEventListener("keydown", teclas);
    window.removeEventListener("resize", alRedimensionar);
    setTimeout(() => {
      capa.remove();
      document.body.style.overflow = overflowPrevio;
      previoFoco?.focus?.();
    }, 180);
  }
  function teclas(e) {
    if (e.key === "Escape") cerrar();
    if (e.key === "+" || e.key === "=") zoomEn(s * 1.6, ...centro(), true);
    if (e.key === "-") zoomEn(s / 1.6, ...centro(), true);
  }
  const alRedimensionar = () => { if (img.naturalWidth) ajustar(false); };
  capa.querySelector(".visor-cerrar").onclick = cerrar;
  document.addEventListener("keydown", teclas);
  window.addEventListener("resize", alRedimensionar);

  document.body.style.overflow = "hidden";
  document.body.append(capa);
  capa.querySelector(".visor-cerrar").focus();
}

// ---------- Subir desde el computador ----------
/**
 * Reduce y comprime una foto para guardarla dentro de la pausa (Firestore
 * permite ~1 MB por documento). Devuelve un data URL JPEG de máx. ~650 KB.
 */
export async function comprimirImagen(archivo, { lado = 1600, maxBytes = 650_000 } = {}) {
  if (!archivo.type.startsWith("image/")) throw new Error("El archivo no es una imagen.");
  const bmp = await createImageBitmap(archivo);
  let escala = Math.min(1, lado / Math.max(bmp.width, bmp.height));
  for (let intento = 0; intento < 6; intento++) {
    const w = Math.round(bmp.width * escala), h = Math.round(bmp.height * escala);
    const lienzo = document.createElement("canvas");
    lienzo.width = w; lienzo.height = h;
    const cx = lienzo.getContext("2d");
    cx.fillStyle = "#ffffff";           // fondo blanco para PNG transparentes
    cx.fillRect(0, 0, w, h);
    cx.drawImage(bmp, 0, 0, w, h);
    for (const calidad of [0.85, 0.75, 0.65, 0.55]) {
      const url = lienzo.toDataURL("image/jpeg", calidad);
      if (url.length * 0.75 <= maxBytes) { bmp.close?.(); return url; }
    }
    escala *= 0.75;
  }
  bmp.close?.();
  throw new Error("La imagen es demasiado pesada. Prueba con otra más pequeña.");
}
