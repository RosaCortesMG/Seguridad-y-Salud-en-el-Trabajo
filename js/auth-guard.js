// auth-guard.js  (módulo ES)
// Protege las páginas internas: sin sesión, redirige a login.html.
// Expone `sessionReady`, que resuelve con { uid, email, perfil }.
//
// Uso:
//   import { sessionReady, cerrarSesion } from './js/auth-guard.js';

import { auth } from "./firebase-config.js";
import { asegurarPerfil } from "./perfil.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const LOGIN_URL = "login.html";

// Oculta la página hasta confirmar la sesión, para evitar el "parpadeo".
const style = document.createElement("style");
style.textContent = "body{visibility:hidden}";
document.head.appendChild(style);

function irALogin(motivo) {
  const url = new URL(LOGIN_URL, location.href);
  if (motivo) url.searchParams.set("motivo", motivo);
  location.replace(url.toString());
}

export const sessionReady = new Promise((resolve) => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) { irALogin(); return; }

    let perfil;
    try {
      perfil = await asegurarPerfil(user);
    } catch (e) {
      await signOut(auth).catch(() => {});
      irALogin("sin-perfil");
      return;
    }

    style.remove();
    resolve({ uid: user.uid, email: user.email, perfil });
  });
});

export async function cerrarSesion() {
  await signOut(auth).catch(() => {});
  irALogin();
}
