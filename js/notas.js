// notas.js
// Notas rápidas del inicio (columna derecha):
//  - Botón + → recuadro con título, nota, "recordar hasta" e importancia (rojo/amarillo/verde).
//  - Se muestran ordenadas: 🔴 muy importante → 🟡 importante → 🟢 puede esperar.
//  - Al tocar una nota: "¿Completado?" con ✕ (no) y ✓ (sí).
//  - Historial: notas completadas y las que vencieron sin completarse.
// Se guardan en usuarios/{uid}/notas/{id}. Estilos en css/notas.css.

import { db } from "./firebase-config.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, Timestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const IMPORTANCIA = {
  alta:  { nombre: "Muy importante", emoji: "🔴", orden: 0 },
  media: { nombre: "Importante",     emoji: "🟡", orden: 1 },
  baja:  { nombre: "Puede esperar",  emoji: "🟢", orden: 2 }
};

const $ = (id) => document.getElementById(id);
// Ícono "+" dibujado (queda centrado igual en cualquier fuente).
const MAS = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
const fecha = (v) => (v?.toDate ? v.toDate() : null);
const dos = (n) => String(n).padStart(2, "0");
const fHora = new Intl.DateTimeFormat("es", { hour: "numeric", minute: "2-digit" });
const fDia = new Intl.DateTimeFormat("es", { weekday: "short", day: "numeric", month: "short" });
const fCompleta = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function mismoDia(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
/** "Hoy, 5:00 p. m." · "Mañana, 8:00 a. m." · "vie, 24 nov, 6:00 p. m." */
function cuando(d) {
  const hoy = new Date();
  const manana = new Date(hoy.getTime() + 86400000);
  const hora = fHora.format(d);
  if (mismoDia(d, hoy)) return `Hoy, ${hora}`;
  if (mismoDia(d, manana)) return `Mañana, ${hora}`;
  return `${fDia.format(d)}, ${hora}`;
}
const vencida = (n, ahora = new Date()) => !n.completada && fecha(n.hasta) && fecha(n.hasta) < ahora;

export function iniciarNotas(uid, { toast }) {
  const col = collection(db, "usuarios", uid, "notas");
  let notas = [];
  let cargadas = false;

  crearModales();

  // ---------- Datos en vivo ----------
  onSnapshot(col, (snap) => {
    notas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cargadas = true;
    pintar();
    if (!$("notaHist").hidden) pintarHistorial();
  }, (e) => {
    console.error(e);
    $("notasLista").innerHTML = '<div class="notas-vacio">No se pudieron cargar las notas. Revisa las reglas de Firebase.</div>';
  });
  // Las que vencen pasan solas al historial.
  setInterval(() => { if (cargadas) pintar(); }, 60000);

  function activas() {
    const ahora = new Date();
    return notas
      .filter((n) => !n.completada && !vencida(n, ahora))
      .sort((a, b) =>
        (IMPORTANCIA[a.importancia]?.orden ?? 1) - (IMPORTANCIA[b.importancia]?.orden ?? 1)
        || (fecha(a.hasta)?.getTime() ?? Infinity) - (fecha(b.hasta)?.getTime() ?? Infinity)
        || (fecha(b.creado)?.getTime() ?? Date.now()) - (fecha(a.creado)?.getTime() ?? Date.now()));
  }

  // ---------- Columna de notas ----------
  function pintar() {
    const lista = $("notasLista");
    const act = activas();
    $("notasN").textContent = act.length || "";
    $("notasN").hidden = !act.length;
    const enHistorial = notas.length - act.length;
    $("btnHistorial").querySelector("span").textContent = enHistorial ? ` ${enHistorial}` : "";
    lista.replaceChildren();
    if (!act.length) {
      const v = document.createElement("div");
      v.className = "notas-vacio";
      v.innerHTML = `<b>Sin notas pendientes</b><p>Toca <span class="notas-mini" aria-hidden="true">${MAS}</span> para anotar algo rápido.</p>`;
      lista.append(v);
      return;
    }
    act.forEach((n, i) => lista.append(tarjeta(n, i)));
  }

  function tarjeta(n, i) {
    const imp = IMPORTANCIA[n.importancia] ? n.importancia : "media";
    const el = document.createElement("article");
    el.className = "nota " + imp;
    el.style.setProperty("--i", i);
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `${IMPORTANCIA[imp].nombre}: ${n.titulo}. Toca para marcar como completada.`);
    el.innerHTML = `
      <div class="nota-cara">
        <div class="nota-tit"><span class="nota-dot" aria-hidden="true"></span><b></b></div>
        <p class="nota-tx"></p>
        <span class="nota-fecha"></span>
      </div>
      <div class="nota-confirma" hidden>
        <span>¿Completado?</span>
        <div class="nota-botones">
          <button type="button" class="borrar" aria-label="Eliminar nota (creada por error)" title="Eliminar nota">🗑</button>
          <button type="button" class="no" aria-label="No, sigue pendiente" title="No, sigue pendiente">✕</button>
          <button type="button" class="si" aria-label="Sí, completado" title="Sí, completado">✓</button>
        </div>
      </div>`;
    el.querySelector("b").textContent = n.titulo;
    const tx = el.querySelector(".nota-tx");
    tx.textContent = n.texto || "";
    tx.hidden = !n.texto;
    const f = el.querySelector(".nota-fecha");
    const hasta = fecha(n.hasta);
    if (hasta) {
      f.textContent = "⏰ Hasta " + cuando(hasta).replace(/^./, (c) => c.toLowerCase());
      f.classList.toggle("pronto", hasta - new Date() < 24 * 3600000);
    } else f.hidden = true;

    const confirma = el.querySelector(".nota-confirma");
    const preguntar = (si) => {
      // Solo una nota preguntando a la vez.
      document.querySelectorAll(".nota.preguntando").forEach((x) => {
        if (x !== el) { x.classList.remove("preguntando"); x.querySelector(".nota-confirma").hidden = true; }
      });
      el.classList.toggle("preguntando", si);
      confirma.hidden = !si;
      if (si) confirma.querySelector(".si").focus();
    };
    el.addEventListener("click", (e) => { if (!e.target.closest(".nota-confirma")) preguntar(true); });
    el.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target === el) { e.preventDefault(); preguntar(true); }
      if (e.key === "Escape") preguntar(false);
    });
    confirma.querySelector(".no").onclick = (e) => { e.stopPropagation(); preguntar(false); el.focus(); };
    // Nota creada por error: se borra sin pasar por el historial.
    confirma.querySelector(".borrar").onclick = async (e) => {
      e.stopPropagation();
      if (!confirm(`¿Eliminar la nota «${n.titulo}»? No quedará en el historial.`)) return;
      el.classList.add("saliendo");
      try {
        await deleteDoc(doc(col, n.id));
        toast("🗑 Nota eliminada.");
      } catch (err) {
        console.error(err);
        el.classList.remove("saliendo");
        toast("No se pudo eliminar la nota.");
      }
    };
    confirma.querySelector(".si").onclick = async (e) => {
      e.stopPropagation();
      el.classList.add("saliendo");
      try {
        await updateDoc(doc(col, n.id), { completada: true, completadaEn: serverTimestamp() });
        toast("✓ Nota completada. Queda en el historial.");
      } catch (err) {
        console.error(err);
        el.classList.remove("saliendo");
        toast("No se pudo completar la nota.");
      }
    };
    return el;
  }

  // ---------- Recuadro: nueva nota ----------
  function crearModales() {
    const nueva = document.createElement("div");
    nueva.className = "modal";
    nueva.id = "notaModal";
    nueva.hidden = true;
    nueva.innerHTML = `
      <form class="modal-caja nf" role="dialog" aria-modal="true" aria-labelledby="nfTit" novalidate>
        <div class="modal-top">
          <div><h2 id="nfTit">📌 Nueva nota rápida</h2><p>Anota algo que no se te puede olvidar.</p></div>
          <button type="button" class="cerrar" data-cerrar aria-label="Cerrar">&times;</button>
        </div>
        <div class="nf-campo">
          <label for="nfTitulo">Título</label>
          <input id="nfTitulo" maxlength="80" placeholder="Ej: Enviar campaña de vacunación" autocomplete="off">
        </div>
        <div class="nf-campo">
          <label for="nfTexto">Nota <span class="opc">· opcional</span></label>
          <textarea id="nfTexto" maxlength="500" rows="3" placeholder="Detalles, a quién, qué falta…"></textarea>
        </div>
        <div class="nf-campo">
          <label>Importancia</label>
          <div class="nf-imp">
            <label class="alta"><input type="radio" name="nfImp" value="alta"><span>🔴 Muy importante<small>Aparece primero</small></span></label>
            <label class="media"><input type="radio" name="nfImp" value="media" checked><span>🟡 Importante<small>En segundo lugar</small></span></label>
            <label class="baja"><input type="radio" name="nfImp" value="baja"><span>🟢 Puede esperar<small>Al final</small></span></label>
          </div>
        </div>
        <div class="nf-campo">
          <label>Recordar hasta <span class="opc">· opcional</span></label>
          <div class="nf-fecha">
            <input type="date" id="nfFecha" aria-label="Fecha">
            <input type="time" id="nfHora" aria-label="Hora">
          </div>
          <div class="nf-chips">
            <button type="button" data-cuando="hoy">Hoy 6:00 p. m.</button>
            <button type="button" data-cuando="manana">Mañana</button>
            <button type="button" data-cuando="viernes">Este viernes</button>
            <button type="button" data-cuando="semana">En una semana</button>
            <button type="button" data-cuando="nada">Sin fecha</button>
          </div>
          <div class="nf-ayuda">Después de esa fecha la nota pasa al historial.</div>
        </div>
        <div class="nf-err" id="nfErr" hidden></div>
        <div class="nf-acciones">
          <button type="button" class="btn btn-ghost" data-cerrar>Cancelar</button>
          <button type="submit" class="btn btn-primary" id="nfGuardar">Guardar nota</button>
        </div>
      </form>`;

    const hist = document.createElement("div");
    hist.className = "modal";
    hist.id = "notaHist";
    hist.hidden = true;
    hist.innerHTML = `
      <div class="modal-caja" role="dialog" aria-modal="true" aria-labelledby="nhTit">
        <div class="modal-top">
          <div><h2 id="nhTit">🕘 Historial de notas</h2><p>Notas completadas y las que vencieron sin completarse.</p></div>
          <button type="button" class="cerrar" data-cerrar aria-label="Cerrar">&times;</button>
        </div>
        <div class="nh-barra" id="nhBarra">
          <button type="button" id="nhBorrarComp">🗑 Borrar completadas</button>
          <button type="button" id="nhBorrarTodo" class="fuerte">🗑 Vaciar historial</button>
        </div>
        <div class="nh-lista" id="nhLista"></div>
      </div>`;

    document.body.append(nueva, hist);
    for (const m of [nueva, hist]) {
      m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-cerrar]")) m.hidden = true; });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { nueva.hidden = true; hist.hidden = true; }
    });

    $("btnNota").onclick = abrirNueva;
    $("btnHistorial").onclick = () => { pintarHistorial(); hist.hidden = false; };
    $("nhBorrarComp").onclick = () => borrarVarias(
      notas.filter((n) => n.completada), "las notas completadas");
    $("nhBorrarTodo").onclick = () => borrarVarias(
      notas.filter((n) => n.completada || vencida(n)), "todo el historial (completadas y vencidas)");

    nueva.querySelectorAll("[data-cuando]").forEach((b) => b.onclick = () => {
      const ahora = new Date();
      let d = null;
      if (b.dataset.cuando === "hoy") { d = new Date(ahora); d.setHours(18, 0, 0, 0); if (d < ahora) d.setHours(23, 59, 0, 0); }
      if (b.dataset.cuando === "manana") { d = new Date(ahora.getTime() + 86400000); d.setHours(18, 0, 0, 0); }
      if (b.dataset.cuando === "viernes") {
        d = new Date(ahora);
        d.setDate(d.getDate() + (((5 - d.getDay()) + 7) % 7));
        d.setHours(18, 0, 0, 0);
        if (d < ahora) d.setDate(d.getDate() + 7);
      }
      if (b.dataset.cuando === "semana") { d = new Date(ahora.getTime() + 7 * 86400000); d.setHours(18, 0, 0, 0); }
      $("nfFecha").value = d ? `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}` : "";
      $("nfHora").value = d ? `${dos(d.getHours())}:${dos(d.getMinutes())}` : "";
    });

    nueva.querySelector("form").addEventListener("submit", guardar);
  }

  function abrirNueva() {
    const f = $("notaModal").querySelector("form");
    f.reset();
    $("nfErr").hidden = true;
    $("notaModal").hidden = false;
    $("nfTitulo").focus();
  }

  async function guardar(e) {
    e.preventDefault();
    const err = $("nfErr");
    const mal = (t) => { err.textContent = t; err.hidden = false; };
    const titulo = $("nfTitulo").value.trim();
    const texto = $("nfTexto").value.trim();
    const importancia = $("notaModal").querySelector('input[name="nfImp"]:checked')?.value || "media";
    if (!titulo) { $("nfTitulo").focus(); return mal("Escribe un título para la nota."); }
    let hasta = null;
    if ($("nfFecha").value) {
      hasta = new Date(`${$("nfFecha").value}T${$("nfHora").value || "23:59"}`);
      if (isNaN(hasta)) return mal("La fecha no es válida.");
      if (hasta < new Date()) return mal("La fecha de recordar ya pasó. Elige una fecha futura.");
    }
    $("nfGuardar").disabled = true;
    try {
      await addDoc(col, {
        titulo, texto, importancia,
        hasta: hasta ? Timestamp.fromDate(hasta) : null,
        completada: false,
        completadaEn: null,
        creado: serverTimestamp()
      });
      $("notaModal").hidden = true;
      toast(`${IMPORTANCIA[importancia].emoji} Nota guardada`);
    } catch (ex) {
      console.error(ex);
      mal(ex.code === "permission-denied" ? "Firebase rechazó la nota (revisa las reglas)." : "No se pudo guardar. Revisa tu conexión.");
    } finally {
      $("nfGuardar").disabled = false;
    }
  }

  // ---------- Historial ----------
  // Borra varias notas de una vez (en bloques de 400, el máximo seguro por lote).
  async function borrarVarias(lista, que) {
    if (!lista.length) return toast("No hay notas para borrar.");
    if (!confirm(`¿Borrar ${que}? Son ${lista.length} ${lista.length === 1 ? "nota" : "notas"} y no se puede deshacer.`)) return;
    const botones = [$("nhBorrarComp"), $("nhBorrarTodo")];
    botones.forEach((b) => b.disabled = true);
    try {
      for (let i = 0; i < lista.length; i += 400) {
        const lote = writeBatch(db);
        lista.slice(i, i + 400).forEach((n) => lote.delete(doc(col, n.id)));
        await lote.commit();
      }
      toast(`🗑 ${lista.length} ${lista.length === 1 ? "nota borrada" : "notas borradas"}.`);
    } catch (e) {
      console.error(e);
      toast("No se pudieron borrar las notas.");
    } finally {
      botones.forEach((b) => b.disabled = false);
    }
  }

  function pintarHistorial() {
    const ahora = new Date();
    const lista = $("nhLista");
    const hist = notas
      .filter((n) => n.completada || vencida(n, ahora))
      .sort((a, b) => ((fecha(b.completadaEn) || fecha(b.hasta))?.getTime() ?? 0)
        - ((fecha(a.completadaEn) || fecha(a.hasta))?.getTime() ?? 0));
    lista.replaceChildren();
    const nComp = hist.filter((n) => n.completada).length;
    $("nhBarra").hidden = !hist.length;
    $("nhBorrarComp").hidden = !nComp;
    $("nhBorrarComp").textContent = `🗑 Borrar completadas (${nComp})`;
    $("nhBorrarTodo").textContent = `🗑 Vaciar historial (${hist.length})`;
    if (!hist.length) {
      lista.innerHTML = '<div class="notas-vacio"><b>El historial está vacío</b><p>Aquí aparecerán tus notas completadas.</p></div>';
      return;
    }
    for (const n of hist) {
      const imp = IMPORTANCIA[n.importancia] ? n.importancia : "media";
      const fila = document.createElement("div");
      fila.className = "nh-fila " + imp;
      fila.innerHTML = `
        <span class="nota-dot" aria-hidden="true"></span>
        <div class="nh-info"><b></b><p></p><small></small></div>
        <div class="nh-acc"></div>`;
      fila.querySelector("b").textContent = n.titulo;
      const p = fila.querySelector("p");
      p.textContent = n.texto || "";
      p.hidden = !n.texto;
      const estado = fila.querySelector("small");
      const acc = fila.querySelector(".nh-acc");
      if (n.completada) {
        const c = fecha(n.completadaEn);
        estado.textContent = "✅ Completada" + (c ? " el " + fCompleta.format(c) : "");
        estado.className = "ok";
        acc.append(boton("↩", "Volver a pendientes", async () => {
          await updateDoc(doc(col, n.id), { completada: false, completadaEn: null });
          toast(vencida({ ...n, completada: false }) ? "Restaurada, pero su fecha ya pasó." : "Nota de nuevo en pendientes.");
        }));
      } else {
        estado.textContent = "⌛ Venció el " + fCompleta.format(fecha(n.hasta)) + " sin completarse";
        estado.className = "vencio";
        acc.append(boton("✓", "Marcar como completada", async () => {
          await updateDoc(doc(col, n.id), { completada: true, completadaEn: serverTimestamp() });
        }));
      }
      const borrar = boton("🗑", "Eliminar del historial", async () => {
        if (!confirm(`¿Eliminar la nota «${n.titulo}»? No se puede deshacer.`)) return;
        await deleteDoc(doc(col, n.id));
        toast("🗑 Nota eliminada del historial.");
      });
      borrar.classList.add("borrar");
      acc.append(borrar);
      lista.append(fila);
    }
  }

  function boton(icono, titulo, accion) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = icono;
    b.title = titulo;
    b.setAttribute("aria-label", titulo);
    b.onclick = async () => {
      b.disabled = true;
      try { await accion(); }
      catch (e) { console.error(e); toast("No se pudo hacer el cambio."); }
      finally { b.disabled = false; }
    };
    return b;
  }
}
