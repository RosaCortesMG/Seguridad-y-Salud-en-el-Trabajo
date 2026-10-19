// tipos.js
// Los cuatro tipos de pausa. `tipo` es el valor guardado en Firestore
// (debe coincidir con tiposValidos() en firestore.rules); `archivo` es su editor.

export const TIPOS = [
  {
    tipo: "pausa_activa",
    nombre: "Pausas Activas",
    desc: "Video de ejercicios con registro de participación y un reto.",
    archivo: "pausas-activas.html",
    color: "blue",
    icono: '<svg viewBox="0 0 24 24" fill="none"><circle cx="13" cy="4.5" r="2" stroke="currentColor" stroke-width="2"/><path d="M7 21l3-6 3 2v4M10 15l1-5 4 3 3-1M11 10l-3 1-2 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  },
  {
    tipo: "pausa_motivacional",
    nombre: "Pausas Motivacionales",
    desc: "Tarjeta con la palabra y la frase de la semana.",
    archivo: "pausas-motivacionales.html",
    color: "green",
    icono: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9L12 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
  },
  {
    tipo: "campana_informativa",
    nombre: "Campañas Informativas",
    desc: "Información visual a pantalla completa que se descubre deslizando.",
    archivo: "campanas-informativas.html",
    color: "blue",
    icono: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 10v4h3l6 4V6L7 10H4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M17 9a4 4 0 0 1 0 6M19.5 6.5a7.5 7.5 0 0 1 0 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  },
  {
    tipo: "sugerencia_aprendizaje",
    nombre: "Sugerencias de Aprendizaje",
    desc: "Respuesta abierta o con opciones escondidas en nubes.",
    archivo: "sugerencias-aprendizaje.html",
    color: "green",
    icono: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  }
];

export const enlaceRespuesta = (id) => new URL("responder.html?e=" + encodeURIComponent(id), location.href).toString();
