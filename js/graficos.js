// graficos.js
// Gráficos livianos en SVG/HTML, sin librerías. Reglas de diseño:
// barras de máx. 24px con punta redondeada de 4px, grilla de 1px tenue,
// textos en gris (nunca del color de la barra) y tooltip al pasar el mouse.
// Los estilos (.graf-*) están en css/registros.css.

const NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs, padre) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  padre.append(n);
  return n;
}

// Escala del eje Y con números redondos (0, 2, 4…).
function escala(max) {
  if (max <= 4) return { tope: Math.max(max, 1), paso: 1 };
  const crudo = max / 4;
  const p = 10 ** Math.floor(Math.log10(crudo));
  const paso = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= crudo);
  return { tope: Math.ceil(max / paso) * paso, paso };
}

// Columna con la punta redondeada y la base recta.
function columna(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function vacio(cont, texto) {
  const p = document.createElement("div");
  p.className = "graf-vacio";
  p.textContent = texto;
  cont.append(p);
}

function tooltip(cont) {
  const d = document.createElement("div");
  d.className = "graf-tip";
  d.hidden = true;
  cont.append(d);
  const api = {
    mostrar(texto, e) { d.textContent = texto; d.hidden = false; api.mover(e); },
    mover(e) {
      const r = cont.getBoundingClientRect();
      const x = Math.max(4, Math.min(e.clientX - r.left + 12, r.width - d.offsetWidth - 4));
      const y = Math.max(0, e.clientY - r.top - d.offsetHeight - 10);
      d.style.left = x + "px";
      d.style.top = y + "px";
    },
    ocultar() { d.hidden = true; }
  };
  return api;
}

/**
 * Columnas verticales de una sola serie.
 * items: [{ etiqueta, valor, tip? }]
 */
export function graficoColumnas(cont, items, {
  alto = 220, resaltar = -1, cadaEtiqueta = 1,
  color = "#1f6fd6", colorResaltado = "#0b4592", textoVacio = "Aún no hay datos"
} = {}) {
  cont.replaceChildren();
  if (!items.length || items.every((i) => !i.valor)) return vacio(cont, textoVacio);

  const W = Math.max(260, cont.clientWidth);
  const H = alto;
  const m = { t: 22, r: 6, b: 26, l: 30 };
  const { tope, paso } = escala(Math.max(...items.map((i) => i.valor)));
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const banda = iw / items.length;
  const bw = Math.max(3, Math.min(24, banda * 0.72));

  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "graf-svg" }, cont);
  for (let v = 0; v <= tope; v += paso) {
    const y = m.t + ih - (v / tope) * ih;
    svgEl("line", { x1: m.l, x2: W - m.r, y1: y, y2: y, class: "graf-grid" }, svg);
    svgEl("text", { x: m.l - 7, y: y + 4, "text-anchor": "end", class: "graf-eje" }, svg).textContent = v;
  }

  const tip = tooltip(cont);
  items.forEach((it, i) => {
    const cx = m.l + banda * i + banda / 2;
    const h = (it.valor / tope) * ih;
    const y = m.t + ih - h;
    let barra = null;
    if (it.valor > 0) {
      barra = svgEl("path", {
        d: columna(cx - bw / 2, y, bw, h),
        fill: i === resaltar ? colorResaltado : color,
        class: "graf-barra"
      }, svg);
    }
    if (i === resaltar && it.valor > 0) {
      svgEl("text", { x: cx, y: y - 7, "text-anchor": "middle", class: "graf-valor" }, svg).textContent = it.valor;
    }
    if (i % cadaEtiqueta === 0) {
      svgEl("text", { x: cx, y: H - 8, "text-anchor": "middle", class: "graf-eje" }, svg).textContent = it.etiqueta;
    }
    // Zona de hover más grande que la barra.
    const hit = svgEl("rect", { x: m.l + banda * i, y: m.t, width: banda, height: ih, class: "graf-hit" }, svg);
    hit.addEventListener("pointerenter", (e) => { barra?.classList.add("on"); tip.mostrar(it.tip ?? `${it.etiqueta}: ${it.valor}`, e); });
    hit.addEventListener("pointermove", (e) => tip.mover(e));
    hit.addEventListener("pointerleave", () => { barra?.classList.remove("on"); tip.ocultar(); });
  });
}

/**
 * Barras horizontales (una por fila) con el valor en la punta.
 * items: [{ etiqueta, valor, tip? }]
 */
export function barrasHorizontales(cont, items, { color = "#1f6fd6", textoVacio = "Aún no hay datos" } = {}) {
  cont.replaceChildren();
  if (!items.length) return vacio(cont, textoVacio);
  const max = Math.max(1, ...items.map((i) => i.valor));
  const tip = tooltip(cont);
  const lista = document.createElement("div");
  lista.className = "graf-hbars";
  for (const it of items) {
    const fila = document.createElement("div");
    fila.className = "graf-hfila";
    const et = document.createElement("span");
    et.className = "graf-het";
    et.textContent = it.etiqueta;
    const pista = document.createElement("div");
    pista.className = "graf-hpista";
    const b = document.createElement("i");
    b.style.width = `max(${it.valor ? 3 : 0}px, ${(it.valor / max) * 100}%)`;
    b.style.background = color;
    const val = document.createElement("b");
    val.textContent = it.valor;
    pista.append(b, val);
    fila.append(et, pista);
    fila.addEventListener("pointerenter", (e) => tip.mostrar(it.tip ?? `${it.etiqueta}: ${it.valor}`, e));
    fila.addEventListener("pointermove", (e) => tip.mover(e));
    fila.addEventListener("pointerleave", () => tip.ocultar());
    lista.append(fila);
  }
  cont.append(lista);
}

/**
 * Una barra 100% dividida en partes, con leyenda debajo.
 * partes: [{ etiqueta, valor, color, icono? }]
 */
export function barraApilada(cont, partes, { textoVacio = "Aún no hay datos" } = {}) {
  cont.replaceChildren();
  const total = partes.reduce((s, p) => s + p.valor, 0);
  if (!total) return vacio(cont, textoVacio);
  const tip = tooltip(cont);
  const barra = document.createElement("div");
  barra.className = "graf-apilada";
  const leyenda = document.createElement("div");
  leyenda.className = "graf-leyenda";
  for (const p of partes) {
    const pct = Math.round((p.valor / total) * 100);
    const texto = `${p.icono ? p.icono + " " : ""}${p.etiqueta}: ${p.valor} (${pct}%)`;
    if (p.valor) {
      const seg = document.createElement("div");
      seg.style.flexGrow = p.valor;
      seg.style.background = p.color;
      if (pct >= 12) seg.textContent = pct + "%";
      seg.addEventListener("pointerenter", (e) => tip.mostrar(texto, e));
      seg.addEventListener("pointermove", (e) => tip.mover(e));
      seg.addEventListener("pointerleave", () => tip.ocultar());
      barra.append(seg);
    }
    const item = document.createElement("span");
    const sw = document.createElement("i");
    sw.style.background = p.color;
    item.append(sw, texto);
    leyenda.append(item);
  }
  cont.append(barra, leyenda);
}
