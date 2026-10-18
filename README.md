# Conecta RH

Plataforma para que Recursos Humanos envíe actividades, motivaciones, encuestas y un
buzón de sugerencias mediante un enlace, registrando quién participó, cómo y qué hizo.

## Puesta en marcha

1. En la [consola de Firebase](https://console.firebase.google.com) crea un proyecto nuevo.
2. **Authentication → Sign-in method**: activa **Correo electrónico/contraseña**.
3. **Firestore Database**: créala (modo producción).
4. **Firestore → Reglas**: pega el contenido de `firestore.rules` y publica.
5. **Configuración del proyecto → Tus apps → Web**: copia el objeto `firebaseConfig`
   y pégalo en `js/firebase-config.js`.
6. Si publicas en un dominio propio (GitHub Pages, etc.), agrégalo en
   **Authentication → Settings → Dominios autorizados**.

Abre la app con un servidor local (los módulos ES no funcionan con `file://`), por ejemplo
la extensión *Live Server* de VS Code, o `npx serve .`.

## Estructura

| Archivo | Qué hace |
|---|---|
| `login.html` | Resumen y objetivo de la plataforma + ingreso, registro y recuperar contraseña |
| `inicio.html` | Franja informativa (nombre, fecha/hora, contadores) + "+ Pausas" y Consulta de Registros |
| `pausas-activas.html` | Editor de Pausas Activas con vista previa de celular y enlace para compartir |
| `responder.html` | Página pública que abre el trabajador (`responder.html?e=<id>`) |
| `js/tipos.js` | Los 4 tipos de pausa (nombre, ícono, archivo del editor) |
| `js/pausa-activa-vista.js` + `css/pausa-activa.css` | Lo que ve el trabajador en una Pausa Activa |
| `js/pantalla-carga.js` + `css/pantalla-carga.css` | Pantalla de carga con frase animada y firma «SST & RH» (15 frases por tipo) |
| `js/firebase-config.js` | Inicializa Firebase (aquí van tus claves) |
| `js/auth-guard.js` | Protege páginas internas; redirige a login sin sesión |
| `js/perfil.js` | Crea/lee el perfil del usuario en `usuarios/{uid}` |
| `firestore.rules` | Reglas de seguridad de Firestore |

## Modelo de datos

- `usuarios/{uid}` — perfil de RH: `nombre, email, empresa?, cargo?, rol:"rrhh", creado`
- `ediciones/{id}` — lo que RH crea y comparte por enlace: `uid, tipo, titulo, estado, creado, …`
  - `tipo`: `pausa_activa | pausa_motivacional | campana_informativa | sugerencia_aprendizaje`
  - Pausa Activa además guarda: `descripcion, video, textos{}, estilo{}`
  - `estado`: `borrador | activa | cerrada` (solo las activas se pueden abrir con el enlace)
- `registros/{id}` — cada participación: `edicionId, propietario, tipo, participante{}, contenido{}, medio{}, authUid?, creado`
  - **quién** → `participante`, **qué** → `contenido`, **cómo** → `medio` (dispositivo, navegador, canal)
