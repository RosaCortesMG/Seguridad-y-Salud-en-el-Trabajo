// firebase-config.js
// Configuración pública de Firebase. En apps web esto es público por diseño:
// lo que protege la base de datos son las Reglas de Firestore (firestore.rules).
//
// PASO 1: crea un proyecto en https://console.firebase.google.com,
// agrega una "App web" y pega aquí los valores que te entrega Firebase.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCMQabEphsLec0bi1sx8lkoSi1b7MFH7dM",
  authDomain: "pd-seguridad-y-salud.firebaseapp.com",
  projectId: "pd-seguridad-y-salud",
  storageBucket: "pd-seguridad-y-salud.firebasestorage.app",
  messagingSenderId: "404346255933",
  appId: "1:404346255933:web:a22ffd05539198a7c14854"
};

// true mientras sigan los valores de ejemplo (login.html muestra un aviso).
export const configPendiente = firebaseConfig.apiKey.startsWith("TU_");

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Firestore con caché local persistente: los datos aparecen al instante
// en visitas siguientes mientras se sincroniza con la nube.
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  // Navegadores sin persistencia (modo privado antiguo, etc.): Firestore normal.
  dbInstance = getFirestore(app);
}
export const db = dbInstance;
