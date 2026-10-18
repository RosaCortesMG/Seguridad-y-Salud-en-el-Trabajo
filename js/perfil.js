// perfil.js
// Lee el perfil del usuario en usuarios/{uid}; si no existe, lo crea.
// Las reglas exigen: email igual al de la cuenta, rol "rrhh" y fecha del servidor.

import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function asegurarPerfil(user, extra = {}) {
  const ref = doc(db, "usuarios", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const perfil = {
    nombre: extra.nombre || user.displayName || user.email.split("@")[0],
    email: user.email,
    rol: "rrhh",
    creado: serverTimestamp()
  };
  if (extra.empresa) perfil.empresa = extra.empresa;
  if (extra.cargo) perfil.cargo = extra.cargo;

  await setDoc(ref, perfil);
  return { ...perfil, creado: new Date() };
}
