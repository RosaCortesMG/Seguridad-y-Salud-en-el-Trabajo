// compartir.js
// Herramientas para compartir una pausa publicada:
//  - mensajeWhatsApp: texto con emojis según el tipo de pausa (editable en el editor)
//  - crearCodigo / urlCorta: acortador propio (cortos/{código} → ediciones/{id}, ver p/index.html)
//  - dibujarQR: código QR con los colores de la plataforma, listo para descargar o copiar

import { fechaLarga } from "./horario.js";

// ---------- Mensaje para WhatsApp ----------
const minus = (s) => s.replace(/^./, (c) => c.toLowerCase());

/**
 * @param {string} tipo  pausa_activa | pausa_motivacional | campana_informativa | sugerencia_aprendizaje
 * @param {{titulo:string, tema?:string, enlace:string, fin?:Date|null}} d
 */
export function mensajeWhatsApp(tipo, { titulo, tema, enlace, fin }) {
  const hasta = fin ? `\n⏰ Disponible hasta el ${minus(fechaLarga(fin))}\n` : "";
  const t = (titulo || "").trim();
  switch (tipo) {
    case "pausa_activa":
      return `🏃‍♀️ *¡Es hora de una Pausa Activa!* 💪

${t ? `*${t}*\n\n` : ""}Tómate unos minutos para moverte, estirarte y cuidar tu cuerpo. 🧘‍♂️✨

👉 Participa aquí:
${enlace}
${hasta}
¡Tu bienestar es lo primero! 💙💚
_SST & RH_`;
    case "pausa_motivacional":
      return `✨ *Pausa Motivacional* ✨

${t ? `*${t}*\n\n` : ""}Esta semana tenemos una palabra y una frase especiales para ti. 💭
¿Te animas a descubrirla? 🃏👆

👉 Descúbrela aquí:
${enlace}
${hasta}
¡Que tengas una semana increíble! 🌟
_SST & RH_`;
    case "campana_informativa":
      return `📢 *Campaña Informativa*

${t ? `*${t}*\n\n` : ""}Tenemos información importante para ti. ¡No te la pierdas! 👀📌

👉 Entérate aquí:
${enlace}
${hasta}
Estar informado también es cuidarnos. 🤝
_SST & RH_`;
    case "sugerencia_aprendizaje":
      return `💡 *Sugerencias de Aprendizaje*

${(tema || t) ? `*${(tema || t).trim()}*\n\n` : ""}Tu opinión construye. 🙌 Cuéntanos qué te gustaría aprender.

👉 Responde aquí:
${enlace}
${hasta}
🕊️ ¡Te escuchamos!
_SST & RH_`;
    default:
      return `👋 ${t}\n\n👉 ${enlace}${hasta}\n_SST & RH_`;
  }
}

// ---------- Acortador ----------
// Sin letras ni números que se confundan (0/O, 1/l/I).
const ALFABETO = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
export function crearCodigo(largo = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(largo));
  return [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join("");
}
export const urlCorta = (codigo) => new URL("p/?" + codigo, location.href).toString();

// ---------- Código QR ----------
// Librería qrcode-generator (Kazuhiko Arase, MIT), se carga solo cuando hace falta.
let cargaQR = null;
function cargarLibQR() {
  if (window.qrcode) return Promise.resolve();
  cargaQR ??= new Promise((ok, mal) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
    s.onload = ok;
    s.onerror = () => { cargaQR = null; mal(new Error("No se pudo cargar el generador de QR.")); };
    document.head.append(s);
  });
  return cargaQR;
}

// Parte el título en líneas que quepan en `ancho`.
function lineas(ctx, texto, ancho, max = 2) {
  const palabras = texto.split(/\s+/);
  const out = [];
  let linea = "";
  for (const p of palabras) {
    const prueba = linea ? linea + " " + p : p;
    if (ctx.measureText(prueba).width > ancho && linea) { out.push(linea); linea = p; }
    else linea = prueba;
  }
  if (linea) out.push(linea);
  if (out.length > max) {
    out.length = max;
    out[max - 1] = out[max - 1].replace(/\s*\S*$/, "") + "…";
  }
  return out;
}

function cuadro(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Dibuja en `canvas` (600×740) una tarjeta con el título, el QR y "Escanea para participar".
 */
export async function dibujarQR(canvas, texto, { titulo = "", subtitulo = "" } = {}) {
  await cargarLibQR();
  const qr = window.qrcode(0, "M");
  qr.addData(texto);
  qr.make();
  const n = qr.getModuleCount();

  const W = 600, H = 740;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const fuente = "'Plus Jakarta Sans', system-ui, sans-serif";

  // Fondo y franja superior con el degradado de la plataforma
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#1f6fd6");
  grad.addColorStop(0.55, "#1590b0");
  grad.addColorStop(1, "#12a07c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 132);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = `700 15px ${fuente}`;
  ctx.fillText((subtitulo || "").toUpperCase(), W / 2, 38);
  ctx.font = `800 30px ${fuente}`;
  const ls = lineas(ctx, titulo || "Conecta RH", W - 70, 2);
  ls.forEach((l, i) => ctx.fillText(l, W / 2, ls.length === 1 ? 92 : 78 + i * 36));

  // QR con módulos redondeados en degradado azul → verde
  const lado = 440, x0 = (W - lado) / 2, y0 = 160;
  const celda = lado / n;
  const gq = ctx.createLinearGradient(x0, y0, x0 + lado, y0 + lado);
  gq.addColorStop(0, "#0b4592");
  gq.addColorStop(1, "#0d7f62");
  ctx.fillStyle = gq;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue;
      cuadro(ctx, x0 + c * celda + 0.4, y0 + r * celda + 0.4, celda - 0.8, celda - 0.8, celda * 0.32);
      ctx.fill();
    }
  }

  // Pie
  ctx.fillStyle = "#0f2434";
  ctx.font = `800 24px ${fuente}`;
  ctx.fillText("Escanea para participar", W / 2, y0 + lado + 52);
  ctx.fillStyle = "#5a6e7f";
  ctx.font = `600 15px ${fuente}`;
  ctx.fillText(texto.replace(/^https?:\/\//, ""), W / 2, y0 + lado + 80);
  ctx.fillStyle = "#12a07c";
  ctx.font = `800 13px ${fuente}`;
  ctx.fillText("SST & RH", W / 2, H - 18);
}

export function nombreArchivo(titulo) {
  const base = (titulo || "pausa").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 40);
  return `QR-${base || "pausa"}.png`;
}
