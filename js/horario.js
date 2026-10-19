// horario.js
// Horario de cada pausa: { activo, inicio, fin } (inicio/fin: Timestamp de Firestore, Date o null).
// Lo usan el editor (panel de horario y vista previa) y responder.html (abre/cierra el enlace).
// Las reglas de Firestore también rechazan respuestas fuera del horario.

export function aFecha(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (v instanceof Date) return isNaN(v) ? null : v;
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

/** "siempre" (sin horario) | "pronto" (aún no abre) | "abierta" | "cerrada" */
export function estadoHorario(h, ahora = new Date()) {
  if (!h?.activo) return { estado: "siempre", ini: null, fin: null };
  const ini = aFecha(h.inicio), fin = aFecha(h.fin);
  if (ini && ahora < ini) return { estado: "pronto", ini, fin };
  if (fin && ahora > fin) return { estado: "cerrada", ini, fin };
  return { estado: "abierta", ini, fin };
}

const fDia = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "long" });
const fHora = new Intl.DateTimeFormat("es", { hour: "numeric", minute: "2-digit" });
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Viernes 24 de noviembre, 5:00 p. m." */
export const fechaLarga = (d) => `${mayus(fDia.format(d))}, ${fHora.format(d)}`;
export const soloHora = (d) => fHora.format(d);

/** "2 días y 3 h" · "3 h 20 min" · "15 min" · "menos de 1 min" */
export function restante(ms) {
  const min = Math.floor(ms / 60000);
  if (min < 1) return "menos de 1 min";
  const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60;
  if (d) return `${d} ${d === 1 ? "día" : "días"}${h ? ` y ${h} h` : ""}`;
  if (h) return `${h} h${m ? ` ${m} min` : ""}`;
  return `${m} min`;
}

/**
 * Pone (o actualiza) la etiqueta "⏰ Disponible hasta…" dentro de la pausa.
 * Va arriba del contenido (después del telón en las Campañas).
 */
export function pintarLimite(pa, h) {
  if (!pa) return;
  let et = pa.querySelector(":scope > .pa-limite");
  const { estado, fin } = estadoHorario(h);
  if (estado === "siempre" || !fin) { et?.remove(); return; }
  if (!et) {
    et = document.createElement("div");
    et.className = "pa-limite";
    et.innerHTML = '<span class="pa-limite-ico" aria-hidden="true">⏰</span><span class="pa-limite-tx"></span>';
    const telon = pa.querySelector(":scope > .ci-telon");
    if (telon) telon.after(et); else pa.prepend(et);
  }
  const falta = fin - new Date();
  et.classList.toggle("urgente", falta > 0 && falta < 3 * 3600000);
  et.querySelector(".pa-limite-tx").textContent = falta > 0
    ? `Disponible hasta el ${fechaLarga(fin).replace(/^./, (c) => c.toLowerCase())} · quedan ${restante(falta)}`
    : "Esta pausa ya cerró";
}
