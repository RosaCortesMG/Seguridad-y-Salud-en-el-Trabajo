// editor-pausa.js
// Motor común de los editores de pausas: lista "Mis pausas", pestañas,
// campos enlazados (data-k), colores, combinaciones rápidas, vista previa,
// pantalla de carga/despedida, guardar/publicar/cerrar y enlace para compartir.
//
// Cada página de editor solo aporta su HTML y una configuración:
//   iniciarEditor({
//     TIPO, DEFAULTS, normalizar, montar,      // del módulo de vista del tipo
//     estiloDePreset(p),                        // colores de cada elemento a partir de una combinación
//     camposGuardar(datos),                     // campos propios del tipo que se guardan en Firestore
//     antesDePublicar?(datos) → boolean,        // validación extra al publicar
//     alPintar?(ctx),                           // al cargar datos en el formulario
//     alCambiar?(ruta, ctx),                    // al editar un campo
//     alCambiarTab?(tab, ctx)                   // al cambiar de pestaña
//   })
//
// Los campos se enlazan con data-k="ruta.del.dato" (texto, color o checkbox),
// también los que se agregan después (por ejemplo, filas de opciones).

import { db } from "./firebase-config.js";
import { sessionReady } from "./auth-guard.js";
import { enlaceRespuesta } from "./tipos.js";
import { mostrarPantallaCarga } from "./pantalla-carga.js";
import { analizarVideo, urlImagen, comprimirImagen } from "./media.js";
import { aFecha, estadoHorario, fechaLarga, restante, pintarLimite } from "./horario.js";
import { mensajeWhatsApp, crearCodigo, urlCorta, dibujarQR, nombreArchivo } from "./compartir.js";
import { TIPOS } from "./tipos.js";
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
export const leer = (o, ruta) => ruta.split(".").reduce((x, k) => x?.[k], o);
function escribir(o, ruta, v) {
  const ks = ruta.split(".");
  const ult = ks.pop();
  ks.reduce((x, k) => (x[k] ??= {}), o)[ult] = v;
}

let toastTimer;
export function toast(t) {
  $("toast").textContent = t;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2600);
}

// a = color principal, b = color secundario.
export const PRESETS = [
  { n: "Cielo",   fondo: "#eaf3fd", fondo2: "#e3f6ee", tarjeta: "#ffffff", texto: "#0f2434", a: "#1f6fd6", b: "#0d8a6a" },
  { n: "Menta",   fondo: "#e3f6ee", fondo2: "#f3fbf7", tarjeta: "#ffffff", texto: "#0f2a24", a: "#0d8a6a", b: "#0f8fa8" },
  { n: "Océano",  fondo: "#d8ecfb", fondo2: "#c9f0e4", tarjeta: "#ffffff", texto: "#0c2433", a: "#0f7fa0", b: "#1f6fd6" },
  { n: "Blanco",  fondo: "#ffffff", fondo2: "#ffffff", tarjeta: "#f4f7fb", texto: "#0f2434", a: "#1f6fd6", b: "#12a07c" },
  { n: "Lavanda", fondo: "#efeafd", fondo2: "#e6f1fd", tarjeta: "#ffffff", texto: "#1d1638", a: "#6a4fd1", b: "#1f6fd6" },
  { n: "Durazno", fondo: "#fff1e6", fondo2: "#fdf7e3", tarjeta: "#ffffff", texto: "#3a1f12", a: "#d9622b", b: "#c2410c" },
  { n: "Noche",   fondo: "#0f2434", fondo2: "#123a3a", tarjeta: "#18324a", texto: "#eaf3f8", a: "#5aa8ff", b: "#2fc69c" }
];

const NOMBRE_ESTADO = { borrador: "Borrador", activa: "Publicada", cerrada: "Cerrada" };

export async function iniciarEditor(cfg) {
  const { TIPO, DEFAULTS, normalizar, montar, estiloDePreset, camposGuardar } = cfg;

  // ---------- Pestañas ----------
  document.querySelectorAll(".tab").forEach((t) => t.onclick = () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x === t));
    document.querySelectorAll(".seccion").forEach((s) => s.classList.toggle("on", s.id === "s-" + t.dataset.s));
    cfg.alCambiarTab?.(t.dataset.s, ctx);
  });
  $("vistaSwitch").onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $("zona").dataset.vista = b.dataset.v;
    $("vistaSwitch").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
  };

  // ---------- Estado del editor ----------
  let id = null;
  let estadoPub = null;         // borrador | activa | cerrada (null = nueva sin guardar)
  let yaPublicada = false;      // ¿ya tiene fecha de publicación?
  let datos = normalizar(DEFAULTS);
  let sucio = false;
  const vista = montar($("screen"), datos, { modo: "preview" });

  // Contexto que reciben los ganchos de cada tipo.
  const ctx = {
    get datos() { return datos; },
    vista,
    marcarCambio() { sucio = true; vista.actualizar(datos); },
    pintarCampos: () => pintarCampos()
  };

  // ---------- Listas de filas emoji + texto ----------
  // <div class="opciones-ed" data-lista="opciones" data-min="2" data-max="4" data-ph="Opción"></div>
  // <button data-agregar="opciones">+ Agregar</button>
  function pintarListas() {
    document.querySelectorAll("[data-lista]").forEach((cont) => {
      const clave = cont.dataset.lista;
      const min = Number(cont.dataset.min || 0), max = Number(cont.dataset.max || 10);
      if (!Array.isArray(datos[clave])) datos[clave] = [];
      const arr = datos[clave];
      cont.replaceChildren();
      arr.forEach((_, i) => {
        const fila = document.createElement("div");
        fila.className = "opcion-ed";
        const emo = document.createElement("input");
        emo.type = "text"; emo.className = "emoji"; emo.maxLength = 8;
        emo.dataset.k = `${clave}.${i}.emoji`;
        emo.setAttribute("aria-label", `Emoji ${i + 1}`);
        const tx = document.createElement("input");
        tx.type = "text"; tx.maxLength = Number(cont.dataset.largo || 60);
        tx.placeholder = `${cont.dataset.ph || "Elemento"} ${i + 1}`;
        tx.dataset.k = `${clave}.${i}.texto`;
        const quitar = document.createElement("button");
        quitar.type = "button"; quitar.className = "quitar"; quitar.textContent = "×";
        quitar.title = "Quitar"; quitar.disabled = arr.length <= min;
        quitar.onclick = () => {
          arr.splice(i, 1);
          pintarCampos(); ctx.marcarCambio(); cfg.alCambiar?.(clave, ctx);
        };
        fila.append(emo, tx, quitar);
        cont.append(fila);
      });
      const agregar = document.querySelector(`[data-agregar="${clave}"]`);
      if (agregar) agregar.hidden = arr.length >= max;
    });
  }
  document.querySelectorAll("[data-agregar]").forEach((b) => b.addEventListener("click", () => {
    const clave = b.dataset.agregar;
    const cont = document.querySelector(`[data-lista="${clave}"]`);
    if (datos[clave].length >= Number(cont.dataset.max || 10)) return;
    datos[clave].push({ emoji: "", texto: "" });
    pintarCampos(); ctx.marcarCambio(); cfg.alCambiar?.(clave, ctx);
    cont.lastElementChild?.querySelector(".emoji")?.focus();
  }));

  // ---------- Interruptores Activo / Inactivo ----------
  // Un bloque con data-interruptor="cargo" recibe un interruptor enlazado a visible.cargo.
  // Va en su <h3>, en su .lbl o junto a su <label>. Apagado: el bloque se ve atenuado.
  document.querySelectorAll("[data-interruptor]").forEach((g) => {
    const clave = g.dataset.interruptor;
    const sw = document.createElement("label");
    sw.className = "tg";
    sw.title = "Mostrar u ocultar al trabajador";
    sw.innerHTML = `<input type="checkbox" data-k="visible.${clave}"><span class="tg-txt"></span>`;
    const h3 = g.querySelector(":scope > h3");
    const lbl = g.querySelector(":scope > .lbl");
    const label = g.querySelector(":scope > label:not(.tg):not(.switch-campo)");
    if (h3) h3.append(sw);
    else if (lbl) lbl.append(sw);
    else if (label) {
      const fila = document.createElement("div");
      fila.className = "lbl";
      label.before(fila);
      fila.append(label, sw);
    } else g.prepend(sw);
  });
  function pintarInterruptores() {
    document.querySelectorAll("[data-interruptor]").forEach((g) => {
      g.classList.toggle("apagado", leer(datos, "visible." + g.dataset.interruptor) === false);
    });
  }

  // ---------- Horario (fecha y hora de apertura y cierre) ----------
  // Se guarda aparte de `datos` porque las vistas no lo necesitan para dibujarse.
  let horario = { activo: false, inicio: null, fin: null };
  const panelHorario = crearPanelHorario();
  document.querySelector(".panel .acciones")?.before(panelHorario);

  function crearPanelHorario() {
    const s = document.createElement("section");
    s.className = "horario";
    s.innerHTML = `
      <div class="hor-top">
        <div class="hor-tit-top"><span class="hor-reloj" aria-hidden="true">⏰</span>
          <div><b>Horario de la pausa</b><small>Desde cuándo y hasta cuándo se puede responder el enlace.</small></div>
        </div>
        <label class="tg tg-grande" title="Activar horario"><input type="checkbox" id="horActivo"><span class="tg-txt"></span></label>
      </div>
      <div class="hor-cuerpo">
        <div class="hor-bloque abre">
          <span class="hor-etq">🟢 Abre</span>
          <div class="hor-campos">
            <input type="date" id="horIniF" aria-label="Fecha de apertura">
            <input type="time" id="horIniH" aria-label="Hora de apertura">
          </div>
          <div class="chips">
            <button type="button" data-ini="ahora">Ahora</button>
            <button type="button" data-ini="manana">Mañana 8:00</button>
            <button type="button" data-ini="lunes">Lunes 8:00</button>
          </div>
        </div>
        <div class="hor-flecha" aria-hidden="true">→</div>
        <div class="hor-bloque cierra">
          <span class="hor-etq">🔴 Cierra</span>
          <div class="hor-campos">
            <input type="date" id="horFinF" aria-label="Fecha de cierre">
            <input type="time" id="horFinH" aria-label="Hora de cierre">
          </div>
          <div class="chips">
            <button type="button" data-fin="1h">+1 hora</button>
            <button type="button" data-fin="hoy">Hoy 6:00 p. m.</button>
            <button type="button" data-fin="1d">+1 día</button>
            <button type="button" data-fin="1s">+1 semana</button>
          </div>
        </div>
        <div class="hor-resumen" id="horResumen"></div>
      </div>`;
    return s;
  }

  const dos = (n) => String(n).padStart(2, "0");
  const aInputFecha = (d) => d ? `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}` : "";
  const aInputHora = (d) => d ? `${dos(d.getHours())}:${dos(d.getMinutes())}` : "";
  function deInputs(f, h) {
    if (!f) return null;
    const d = new Date(`${f}T${h || "00:00"}`);
    return isNaN(d) ? null : d;
  }
  const conHora = (d, h, m = 0) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };

  function pintarHorario() {
    $("horActivo").checked = horario.activo;
    panelHorario.classList.toggle("on", horario.activo);
    $("horIniF").value = aInputFecha(horario.inicio);
    $("horIniH").value = aInputHora(horario.inicio);
    $("horFinF").value = aInputFecha(horario.fin);
    $("horFinH").value = aInputHora(horario.fin);
    pintarResumenHorario();
  }
  function pintarResumenHorario() {
    const r = $("horResumen");
    const { inicio: ini, fin } = horario;
    let clase = "info", texto;
    if (!horario.activo) {
      texto = "Sin horario: el enlace funciona mientras la pausa esté publicada.";
    } else if (ini && fin && fin <= ini) {
      clase = "mal"; texto = "⚠️ La hora de cierre debe ser después de la apertura.";
    } else {
      const { estado } = estadoHorario(horario);
      const dur = ini && fin ? ` · dura ${restante(fin - ini)}` : "";
      if (estado === "pronto") { clase = "pronto"; texto = `🗓️ Programada: abre en ${restante(ini - new Date())}${dur}`; }
      else if (estado === "cerrada") { clase = "mal"; texto = `⛔ Ya cerró el ${fechaLarga(fin).toLowerCase()}`; }
      else if (fin) { clase = "ok"; texto = `✅ Abierta ahora · cierra en ${restante(fin - new Date())}${dur}`; }
      else { clase = "ok"; texto = "✅ Abierta ahora, sin hora de cierre"; }
    }
    r.className = "hor-resumen " + clase;
    r.textContent = texto;
  }
  function cambioHorario() {
    sucio = true;
    pintarHorario();
    pintarLimite($("screen").querySelector(".pa"), horario);
    if (estadoPub === "activa") pintarCompartir();   // el mensaje de WhatsApp incluye la hora de cierre
  }

  $("horActivo").addEventListener("change", () => {
    horario.activo = $("horActivo").checked;
    // Al activarlo por primera vez: abre ahora y cierra hoy a las 6 p. m. (o mañana si ya pasó).
    if (horario.activo && !horario.inicio && !horario.fin) {
      const ahora = new Date(); ahora.setSeconds(0, 0);
      horario.inicio = ahora;
      const hoy6 = conHora(ahora, 18);
      horario.fin = hoy6 > ahora ? hoy6 : conHora(new Date(ahora.getTime() + 86400000), 18);
    }
    cambioHorario();
  });
  ["horIniF", "horIniH"].forEach((k) => $(k).addEventListener("change", () => {
    horario.inicio = deInputs($("horIniF").value, $("horIniH").value);
    cambioHorario();
  }));
  ["horFinF", "horFinH"].forEach((k) => $(k).addEventListener("change", () => {
    horario.fin = deInputs($("horFinF").value, $("horFinH").value);
    cambioHorario();
  }));
  panelHorario.querySelectorAll("[data-ini]").forEach((b) => b.onclick = () => {
    const ahora = new Date(); ahora.setSeconds(0, 0);
    if (b.dataset.ini === "ahora") horario.inicio = ahora;
    if (b.dataset.ini === "manana") horario.inicio = conHora(new Date(ahora.getTime() + 86400000), 8);
    if (b.dataset.ini === "lunes") {
      const l = new Date(ahora);
      l.setDate(l.getDate() + (((8 - l.getDay()) % 7) || 7));
      horario.inicio = conHora(l, 8);
    }
    cambioHorario();
  });
  panelHorario.querySelectorAll("[data-fin]").forEach((b) => b.onclick = () => {
    const base = horario.inicio && horario.inicio > new Date() ? horario.inicio : new Date();
    const t = base.getTime();
    if (b.dataset.fin === "1h") horario.fin = new Date(t + 3600000);
    if (b.dataset.fin === "hoy") horario.fin = conHora(base, 18);
    if (b.dataset.fin === "1d") horario.fin = new Date(t + 86400000);
    if (b.dataset.fin === "1s") horario.fin = new Date(t + 7 * 86400000);
    horario.fin.setSeconds(0, 0);
    cambioHorario();
  });
  // El resumen ("cierra en 3 h") se mantiene al día.
  setInterval(() => { if (horario.activo) pintarResumenHorario(); }, 30000);

  function pintarCampos() {
    pintarListas();
    cfg.alPintar?.(ctx); // puede crear campos nuevos propios del tipo
    document.querySelectorAll("[data-k]").forEach((c) => {
      const v = leer(datos, c.dataset.k);
      if (c.type === "checkbox") c.checked = !!v;
      else if (c.type === "radio") c.checked = c.value === v;
      else c.value = v ?? "";
    });
    pintarColores();
    pintarMediaEd();
    pintarInterruptores();
  }

  // ---------- Video e imagen (si la página tiene esos campos) ----------
  function pintarMediaEd() {
    const a = $("videoAyuda");
    if (a) {
      const v = analizarVideo(datos.video);
      if (!v) { a.className = "ayuda"; a.textContent = "Acepta YouTube, Vimeo, Google Drive o un archivo .mp4."; }
      else if (v.tipo === "invalido") { a.className = "ayuda mal"; a.textContent = "Ese link no es válido. Cópialo completo, empezando por https://"; }
      else if (v.tipo === "enlace") { a.className = "ayuda"; a.textContent = "No se puede incrustar: el trabajador verá un botón para abrir el video."; }
      else { a.className = "ayuda ok"; a.textContent = "✓ Video de " + v.fuente + " detectado."; }
    }
    if ($("imgUrl")) {
      const val = datos.imagen || "";
      const subida = val.startsWith("data:");
      // No se pisa lo que la persona está escribiendo.
      if (document.activeElement !== $("imgUrl")) $("imgUrl").value = subida ? "" : val;
      const previa = $("imgPrevia");
      previa.hidden = !val.trim();
      if (val.trim()) {
        const src = urlImagen(val);
        previa.querySelector("img").src = src || "";
        previa.querySelector("span").textContent = subida
          ? `Imagen subida desde el computador (${Math.round((val.length * 0.75) / 1024)} KB)`
          : src ? "Imagen desde un link" : "Ese link no es válido. Cópialo completo, empezando por https://";
      }
    }
  }
  function cambiarImagen(valor) {
    datos.imagen = valor;
    ctx.marcarCambio();
    pintarMediaEd();
    cfg.alCambiar?.("imagen", ctx);
  }
  if ($("imgUrl")) {
    $("imgUrl").addEventListener("input", () => cambiarImagen($("imgUrl").value.trim()));
    $("imgArchivo").addEventListener("change", async () => {
      const archivo = $("imgArchivo").files[0];
      $("imgArchivo").value = "";
      if (!archivo) return;
      try {
        toast("Optimizando la imagen…");
        $("imgUrl").value = "";
        cambiarImagen(await comprimirImagen(archivo));
        toast("Imagen lista. Recuerda guardar.");
      } catch (e) {
        toast(e.message || "No se pudo usar esa imagen.");
      }
    });
    $("imgQuitar").addEventListener("click", () => { $("imgUrl").value = ""; cambiarImagen(""); });
  }
  function pintarColores() {
    document.querySelectorAll(".color").forEach((l) => {
      l.querySelector("small").textContent = l.querySelector("input").value.toUpperCase();
    });
  }
  // Delegado: sirve también para campos agregados después.
  document.addEventListener("input", (e) => {
    const c = e.target.closest?.("[data-k]");
    if (!c) return;
    if (c.type === "radio" && !c.checked) return;
    escribir(datos, c.dataset.k, c.type === "checkbox" ? c.checked : c.value);
    // Si el mismo dato está en otro campo (p. ej. un color repetido en Apariencia), se sincroniza.
    document.querySelectorAll(`[data-k="${c.dataset.k}"]`).forEach((o) => {
      if (o === c) return;
      if (o.type === "checkbox") o.checked = c.checked;
      else if (o.type === "radio") o.checked = o.value === c.value;
      else o.value = c.value;
    });
    ctx.marcarCambio();
    if (c.type === "color") pintarColores();
    if (c.dataset.k === "video") pintarMediaEd();
    if (c.dataset.k.startsWith("visible.")) pintarInterruptores();
    cfg.alCambiar?.(c.dataset.k, ctx);
  });

  // ---------- Combinaciones de color ----------
  PRESETS.forEach((p) => {
    const b = document.createElement("button");
    b.className = "preset"; b.type = "button";
    b.innerHTML = `<i style="background:linear-gradient(135deg,${p.fondo} 0 34%,${p.a} 34% 67%,${p.b} 67% 100%)"></i>`;
    b.append(p.n);
    b.onclick = () => {
      datos.estilo = estiloDePreset(p);
      pintarCampos();
      ctx.marcarCambio();
    };
    $("presets").append(b);
  });

  // ---------- Pantallas de carga y despedida (vista previa) ----------
  function irAPrevia() {
    if ($("zona").dataset.vista === "editar" && matchMedia("(max-width:1020px)").matches) {
      $("vistaSwitch").querySelector('[data-v="previa"]').click();
    }
  }
  ctx.irAPrevia = irAPrevia;
  $("btnVerDespedida")?.addEventListener("click", () => { irAPrevia(); vista.verDespedida(); });

  let cargaEnCurso = false;
  document.querySelectorAll("[data-ver-carga]").forEach((b) => b.onclick = async () => {
    irAPrevia();
    if (cargaEnCurso) return;
    cargaEnCurso = true;
    await mostrarPantallaCarga($("phone"), { tipo: TIPO, frase: datos.textos.carga, estilo: datos.estilo, fijo: false });
    cargaEnCurso = false;
  });

  // ---------- Compartir: enlace corto, mensaje de WhatsApp y QR ----------
  const nombreTipo = TIPOS.find((t) => t.tipo === TIPO)?.nombre || "Pausa";
  $("enlaceBox").innerHTML = `
    <div class="comp-top">
      <span class="comp-ico" aria-hidden="true">🎉</span>
      <div><b>¡Listo para compartir!</b><small>Copia el enlace corto, el mensaje para WhatsApp o el código QR.</small></div>
    </div>
    <div class="comp-grid">
      <div class="comp-izq">
        <label class="comp-lbl" for="enlace">🔗 Enlace corto</label>
        <div class="enlace-fila">
          <input id="enlace" readonly>
          <button class="btn btn-primary" id="btnCopiar">Copiar</button>
          <a class="btn btn-white" id="btnAbrir" target="_blank" rel="noopener">Abrir</a>
        </div>
        <div class="comp-nota" id="cortoNota"></div>

        <label class="comp-lbl" for="msgWhats">💬 Mensaje para WhatsApp <span>· puedes editarlo antes de copiarlo</span></label>
        <textarea id="msgWhats" rows="10" spellcheck="true"></textarea>
        <div class="comp-acc">
          <button class="btn btn-primary" id="btnCopiarMsg">📋 Copiar mensaje</button>
          <a class="btn btn-whats" id="btnWhats" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>
            Abrir WhatsApp
          </a>
          <button class="btn btn-white" id="btnMsgReset" title="Volver al mensaje sugerido">↺ Restaurar</button>
        </div>
        <a class="comp-reg" id="btnRegistros">📊 Ver registros de esta pausa →</a>
      </div>
      <div class="comp-qr">
        <span class="comp-lbl">📱 Código QR</span>
        <div class="comp-qr-caja"><canvas id="qrCanvas" width="600" height="740" aria-label="Código QR del enlace"></canvas></div>
        <div class="comp-acc">
          <button class="btn btn-primary" id="btnQrDescargar">⬇ Descargar</button>
          <button class="btn btn-white" id="btnQrCopiar">📋 Copiar</button>
        </div>
      </div>
    </div>`;

  let corto = null;             // código del enlace corto de esta pausa
  let mensajeEditado = false;   // si RH cambió el mensaje, no se sobrescribe
  let creandoCorto = false;
  let qrTexto = "";

  const enlaceActual = () => (corto ? urlCorta(corto) : enlaceRespuesta(id));
  function mensajeSugerido() {
    const fin = horario.activo ? horario.fin : null;
    return mensajeWhatsApp(TIPO, { titulo: datos.titulo, tema: datos.tema, enlace: enlaceActual(), fin });
  }
  function pintarCompartir() {
    const url = enlaceActual();
    $("enlace").value = url;
    $("btnAbrir").href = url;
    $("btnRegistros").href = "registros.html?e=" + encodeURIComponent(id);
    $("cortoNota").textContent = corto ? "" : "Creando enlace corto…";
    if (!mensajeEditado) $("msgWhats").value = mensajeSugerido();
    $("btnWhats").href = "https://wa.me/?text=" + encodeURIComponent($("msgWhats").value);
    if (url !== qrTexto) {
      qrTexto = url;
      dibujarQR($("qrCanvas"), url, { titulo: datos.titulo, subtitulo: nombreTipo })
        .catch((e) => { console.error(e); toast(e.message); });
    }
  }
  // Crea el código corto la primera vez que la pausa está publicada.
  async function asegurarCorto() {
    if (corto || creandoCorto || !id || estadoPub !== "activa") return;
    creandoCorto = true;
    try {
      for (let intento = 0; intento < 4 && !corto; intento++) {
        const codigo = crearCodigo();
        try {
          // Si el código ya existe, las reglas lo rechazan y se prueba otro.
          await setDoc(doc(db, "cortos", codigo), { e: id, uid, creado: serverTimestamp() });
          await updateDoc(doc(db, "ediciones", id), { corto: codigo });
          corto = codigo;
        } catch (e) {
          if (e.code !== "permission-denied") throw e;
        }
      }
      if (!corto) throw new Error("sin código");
    } catch (e) {
      console.error(e);
      $("cortoNota").textContent = "No se pudo crear el enlace corto; se usa el enlace completo (revisa las reglas de Firebase).";
    } finally {
      creandoCorto = false;
      if (estadoPub === "activa") pintarCompartir();
    }
  }

  $("msgWhats").addEventListener("input", () => {
    mensajeEditado = true;
    $("btnWhats").href = "https://wa.me/?text=" + encodeURIComponent($("msgWhats").value);
  });
  $("btnMsgReset").onclick = () => { mensajeEditado = false; pintarCompartir(); toast("Mensaje restaurado"); };

  async function copiarTexto(texto, aviso) {
    try { await navigator.clipboard.writeText(texto); }
    catch {
      const t = document.createElement("textarea");
      t.value = texto; document.body.append(t); t.select(); document.execCommand("copy"); t.remove();
    }
    toast(aviso);
  }
  $("btnCopiar").onclick = () => copiarTexto($("enlace").value, "🔗 Enlace copiado");
  $("btnCopiarMsg").onclick = () => copiarTexto($("msgWhats").value, "📋 Mensaje copiado: pégalo en WhatsApp");
  $("btnQrDescargar").onclick = () => {
    $("qrCanvas").toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = nombreArchivo(datos.titulo);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  };
  $("btnQrCopiar").onclick = () => {
    $("qrCanvas").toBlob(async (blob) => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast("📋 QR copiado: pégalo donde quieras");
      } catch {
        toast("Este navegador no permite copiar imágenes. Usa «Descargar».");
      }
    }, "image/png");
  };

  // ---------- Eliminar una pausa ----------
  const btnEliminar = document.createElement("button");
  btnEliminar.type = "button";
  btnEliminar.className = "btn btn-borrar";
  btnEliminar.id = "btnEliminar";
  btnEliminar.hidden = true;
  btnEliminar.textContent = "🗑 Eliminar";
  btnEliminar.title = "Eliminar esta pausa";
  $("btnGuardar").before(btnEliminar);
  btnEliminar.onclick = () => eliminar(id, datos.titulo, corto);

  async function eliminar(pid, titulo, codigo) {
    if (!pid) return;
    const ok = confirm(
      `¿Eliminar «${titulo || "Sin título"}»?\n\n` +
      "• El enlace y el código QR dejarán de funcionar.\n" +
      "• Los registros de quienes ya participaron se conservan en Consulta de Registros.\n\n" +
      "Esta acción no se puede deshacer.");
    if (!ok) return;
    btnEliminar.disabled = true;
    try {
      await deleteDoc(doc(db, "ediciones", pid));
      // El enlace corto también se borra (si falla, igual ya no lleva a nada).
      if (codigo) await deleteDoc(doc(db, "cortos", codigo)).catch(() => {});
      if (pid === id) { sucio = false; cargarEnEditor(null, null); }
      await cargarLista();
      toast("🗑 Pausa eliminada.");
    } catch (e) {
      console.error(e);
      toast(e.code === "permission-denied" ? "Firebase no permitió eliminarla (revisa las reglas)." : "No se pudo eliminar. Revisa tu conexión.");
    } finally {
      btnEliminar.disabled = false;
    }
  }

  // ---------- Estado / enlace ----------
  function pintarEstado() {
    const p = $("estadoPill");
    p.className = "pill " + (estadoPub || "borrador");
    p.textContent = estadoPub ? NOMBRE_ESTADO[estadoPub] : "Nueva";
    $("btnPublicar").hidden = estadoPub === "activa";
    $("btnPublicar").textContent = estadoPub === "cerrada" ? "Reabrir participación" : "Publicar y obtener enlace";
    $("btnCerrar").hidden = estadoPub !== "activa";
    $("btnEliminar").hidden = !id;
    $("btnGuardar").textContent = estadoPub === "activa" ? "Guardar cambios" : "Guardar borrador";
    $("enlaceBox").classList.toggle("on", estadoPub === "activa");
    if (estadoPub === "activa") {
      pintarCompartir();
      asegurarCorto();
    }
  }

  // ---------- Firestore ----------
  const { uid } = await sessionReady;
  let misPausas = [];

  async function cargarLista() {
    const snap = await getDocs(query(collection(db, "ediciones"), where("uid", "==", uid), where("tipo", "==", TIPO)));
    misPausas = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.creado?.toMillis?.() ?? Date.now()) - (a.creado?.toMillis?.() ?? Date.now()));
    pintarLista();
  }
  function pintarLista() {
    const lista = $("lista");
    lista.replaceChildren();
    for (const p of misPausas) {
      const b = document.createElement("button");
      b.className = "item" + (p.id === id ? " actual" : "");
      const t = document.createElement("b"); t.textContent = p.titulo || "Sin título";
      const s = document.createElement("small");
      const pill = document.createElement("span");
      pill.className = "pill " + (p.estado || "borrador");
      pill.textContent = NOMBRE_ESTADO[p.estado] || "Borrador";
      s.append(pill, " ", p.creado?.toDate ? p.creado.toDate().toLocaleDateString("es") : "");
      b.append(t, s);
      b.onclick = () => abrir(p.id);
      // Cada tarjeta lleva su botón de eliminar (fuera del botón principal).
      const caja = document.createElement("div");
      caja.className = "item-caja";
      const borrar = document.createElement("button");
      borrar.type = "button";
      borrar.className = "item-borrar";
      borrar.textContent = "🗑";
      borrar.title = "Eliminar esta pausa";
      borrar.setAttribute("aria-label", `Eliminar ${p.titulo || "pausa sin título"}`);
      borrar.onclick = () => eliminar(p.id, p.titulo, p.corto);
      caja.append(b, borrar);
      lista.append(caja);
    }
  }

  const confirmarDescartar = () => !sucio || confirm("Tienes cambios sin guardar. ¿Descartarlos?");

  function cargarEnEditor(nuevoId, d) {
    id = nuevoId;
    estadoPub = d ? d.estado : null;
    yaPublicada = !!d?.publicado;
    if (corto !== (d?.corto || null)) { mensajeEditado = false; qrTexto = ""; }
    corto = typeof d?.corto === "string" ? d.corto : null;
    datos = normalizar(d || DEFAULTS);
    horario = {
      activo: d?.horario?.activo === true,
      inicio: aFecha(d?.horario?.inicio),
      fin: aFecha(d?.horario?.fin)
    };
    sucio = false;
    pintarCampos(); vista.actualizar(datos); pintarEstado(); pintarLista();
    pintarHorario();
    pintarLimite($("screen").querySelector(".pa"), horario);
    const url = new URL(location.href);
    if (id) url.searchParams.set("id", id); else url.searchParams.delete("id");
    history.replaceState(null, "", url);
  }

  async function abrir(nuevoId) {
    if (nuevoId === id || !confirmarDescartar()) return;
    try {
      const snap = await getDoc(doc(db, "ediciones", nuevoId));
      if (!snap.exists() || snap.data().uid !== uid || snap.data().tipo !== TIPO) throw new Error();
      cargarEnEditor(nuevoId, snap.data());
    } catch {
      toast("No se pudo abrir esa pausa.");
    }
  }

  $("btnNueva").onclick = () => { if (confirmarDescartar()) cargarEnEditor(null, null); };

  async function guardar(nuevoEstado) {
    const titulo = datos.titulo.trim();
    if (!titulo) {
      document.querySelector('.tab[data-s="contenido"]').click();
      $("fTitulo").focus();
      toast("Escribe un título para la pausa.");
      return;
    }
    if (nuevoEstado === "activa" && cfg.antesDePublicar && !cfg.antesDePublicar(datos)) return;
    if (horario.activo && horario.inicio && horario.fin && horario.fin <= horario.inicio) {
      panelHorario.scrollIntoView({ behavior: "smooth", block: "center" });
      toast("Revisa el horario: el cierre debe ser después de la apertura.");
      return;
    }
    if (nuevoEstado === "activa" && estadoHorario(horario).estado === "cerrada"
      && !confirm("El horario ya terminó: el enlace no recibirá respuestas. ¿Publicar de todas formas?")) return;

    const botones = [$("btnGuardar"), $("btnPublicar"), $("btnCerrar")];
    botones.forEach((b) => b.disabled = true);
    const cuerpo = {
      titulo,
      ...camposGuardar(datos),
      textos: datos.textos,
      estilo: datos.estilo,
      visible: datos.visible || {},
      horario: {
        activo: horario.activo,
        inicio: horario.inicio ? Timestamp.fromDate(horario.inicio) : null,
        fin: horario.fin ? Timestamp.fromDate(horario.fin) : null
      },
      estado: nuevoEstado,
      actualizado: serverTimestamp()
    };
    // La primera vez que se publica queda la fecha: sirve para medir el tiempo de respuesta.
    if (nuevoEstado === "activa" && !yaPublicada) cuerpo.publicado = serverTimestamp();
    try {
      if (!id) {
        const ref = await addDoc(collection(db, "ediciones"), { ...cuerpo, uid, tipo: TIPO, creado: serverTimestamp() });
        id = ref.id;
      } else {
        await updateDoc(doc(db, "ediciones", id), cuerpo);
      }
      qrTexto = "";   // el título pudo cambiar: se redibuja el QR
      cargarEnEditor(id, { ...cuerpo, publicado: yaPublicada || cuerpo.publicado, corto });
      await cargarLista();
      toast(nuevoEstado === "activa" ? "¡Publicada! Comparte el enlace." : nuevoEstado === "cerrada" ? "Participación cerrada." : "Guardado.");
    } catch (e) {
      console.error(e);
      toast(e.code === "permission-denied" ? "Firebase rechazó el guardado (revisa las reglas)." : "No se pudo guardar. Revisa tu conexión.");
    } finally {
      botones.forEach((b) => b.disabled = false);
    }
  }

  $("btnGuardar").onclick = () => guardar(estadoPub || "borrador");
  $("btnPublicar").onclick = () => guardar("activa");
  $("btnCerrar").onclick = () => {
    if (confirm("Al cerrar, el enlace dejará de recibir respuestas. ¿Continuar?")) guardar("cerrada");
  };

  window.addEventListener("beforeunload", (e) => { if (sucio) { e.preventDefault(); e.returnValue = ""; } });

  // Inicio: abre ?id= si viene en la URL, o una pausa nueva.
  pintarCampos(); pintarEstado(); pintarHorario();
  await cargarLista().catch((e) => { console.error(e); toast("No se pudo cargar tu lista de pausas."); });
  const pedido = new URLSearchParams(location.search).get("id");
  if (pedido) await abrir(pedido);
  return ctx;
}
