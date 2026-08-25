# Spec: VERA SOCIALIS — Beta cerrada (<100 usuarios)

> Fuente de verdad del desarrollo · v1.0 · 2026-08-24
> Aprobado por: Francisco (fundador) — pendiente
> Reemplaza por completo la documentación de `vera-cowork/` (histórico).

---

## 1. Objetivo

Construir **VERA SOCIALIS**: red social gratuita donde cada cuenta es un humano verificado. Sin likes, sin algoritmo de recomendación, sin publicidad (salvo la categoría Empresas). Compite por confianza y bienestar, no por tiempo en pantalla.

**Entrega de esta fase:** app web (PWA móvil-first) funcionando en beta cerrada con el círculo cercano del fundador (**menos de 100 usuarios**), con backend real desplegado.

**Usuario objetivo de la beta:** círculo directo de Francisco (Chile). Español neutro (Chile) en toda la copy.

**Éxito =** un invitado recibe su código de referido, crea cuenta verificada desde el celular, y puede usar las 8 secciones completas sin errores, con las mecánicas de bienestar activas.

**Modelo de negocio:** gratis para personas. Suscripción solo para empresas (precio por segmento chica/mediana/grande — pendiente, fuera del alcance de la beta: en beta los perfiles de empresa se crean manualmente sin cobro, con 1-2 empresas demo). El login incluye una **sección de acceso para empresas** como botón pequeño, sin quitar el foco de las personas.

---

## 2. Producto — Funciones

### 2.1 Registro y verificación humana (EXCLUYENTE)

- Crear cuenta requiere: **código de referido de un usuario existente + verificación biométrica**.
- Beta: biometría = **passkey/WebAuthn** (huella o rostro del dispositivo) + selfie de registro con **validación algorítmica** (detección de rostro/vivacidad básica) y **aprobación final manual del fundador** (viable con <100 usuarios). El algoritmo queda funcionando desde la beta. Post-beta: proveedor de verificación de identidad.
- Al crear la cuenta exitosamente se genera **automáticamente la primera conexión** (referido ↔ referente).
- Cuenta verificada muestra **medalla de verificación humana** en el perfil.
- Semilla del grafo: la cuenta del fundador se crea por seed (sin referido).

### 2.2 Perfil

- Layout centrado: **banner** arriba, foto de perfil, nombre, descripción, **medalla de verificación**, **nivel de social score** (cualitativo), **número de conexiones** (nunca "seguidores").
- **Grid de posts** tipo Instagram. Los posts de perfil son en modo personal solo los ven las conexiones (no aparece en contenido mundial)
- **Tarjetas públicas** con las categorías de contenido más vistas por el usuario (transparencia de preferencias).
- Botón **Métricas personales** (100% privado): resumen de uso, tendencias, contenido más visto, alertas y felicitaciones por buen uso. Feedback que se actualiza con cada sesión.
- Perfil **público o privado** según preferencia de la cuenta (privado: solo conexiones ven posts y detalle; siempre visible: nombre, foto, medalla, nivel). (publico, todo público como si tuvieras una conexión, se puede cambiar en cualquier momento)

### 2.3 Chat

- Completo tipo WhatsApp/Telegram: texto, archivos, audios, ubicación.
- **Cifrado de extremo a extremo** (ver §8 Seguridad).
- **Llamadas y videollamadas** vía WebRTC (cifradas por defecto DTLS-SRTP).
- Mensajes **reaccionables positivo/negativo**: la reacción es **invisible para el otro** y afecta el social score del autor del mensaje. Rate limit anti-spam (§2.6).
- Empresas: no pueden iniciar chats; solo responder si el usuario escribe primero.

### 2.4 Mi Red (conexiones)

- Conexiones por **solicitud de amistad** (aceptar/rechazar), tipo Facebook.
- **Buscador de usuarios por nombre** para enviar solicitud.
- Vista **grafo tipo red neuronal**: el usuario al centro, sus conexiones alrededor, aristas entre conexiones que también se conocen.

### 2.5 Contenido mundial

- Foros por **categoría elegida por el usuario** — sin algoritmo de recomendación. El usuario entra a la categoría y ahí scrollea solo ese contenido.
- **Categorías borrador** (ajustables por Comunidad): Gastronomía · Automovilismo · Finanzas · Tecnología · Música · Deporte · Viajes · Arte y Diseño · Ciencia · Bienestar · Cine y Series · Videojuegos · Literatura · Mascotas · Naturaleza · Educación · Fotografía · Emprendimiento · **Empresas** (especial).
- Se postea **desde este menú** eligiendo categoría (no desde el perfil).
- **Post en categoría incorrecta:** se baja la publicación + ban temporal de posteo + baja el social score (parámetros en §3).
- **Propaganda VERA cada 30 posts**: piezas de concientización sobre buen uso de redes, bienestar mental, conexiones reales. Sin publicidad comercial en ninguna categoría salvo Empresas.
- **Moderación:** clasificador automático (IA) al publicar + buzón de tickets para moderadores humanos (beta: el fundador).

### 2.6 Comentarios, reacciones y Social Score

- **No existen likes.** La interacción con un post es el **comentario**.
- Cada comentario se clasifica automáticamente (IA) como **positivo o negativo** hacia quien publica → **suma o resta al social score del que comenta**. El que comenta **nunca ve** la clasificación.
- Social score:
  - **Numérico interno** (para el sistema) · **cualitativo en el perfil** como Nivel.
  - Niveles borrador: `Inicial → En crecimiento → Confiable → Ejemplar → Referente`.
  - Sube/baja por: sentimiento de comentarios emitidos, reacciones recibidas/emitidas en chat, calidad de conexiones, frecuencia de conversaciones, menciones, publicaciones.
  - **Rate limit anti-colusión:** las interacciones entre el mismo par de usuarios tienen rendimiento decreciente por día; tope diario de eventos que afectan score (parámetros en §3).

### 2.7 Socialis

- Feed scrolleable **solo con posts de conexiones** (lo que publican en su perfil). Orden cronológico. Sin algoritmo.

### 2.8 Comunidad

- **Votaciones democráticas**: propuestas de añadir/eliminar/cambiar funciones; un humano verificado = un voto.
- **Buzón** de bugs y sugerencias (mejoramiento de la app).

### 2.9 Config

- Secciones: Perfil · App · Cuenta · Seguridad · Privacidad (público/privado) · Apariencia.
- **Ayuda**: tickets de asistencia técnica (beta: llegan al fundador).

### 2.10 Notificaciones (según prototipo `app_web.html`)

- Pantalla propia con lista scrolleable de notificaciones: **avatar** (foto del usuario, o logo V en gradiente verde si es notificación del sistema VERA), **texto**, **detalle** en cursiva (ej. cita del comentario o mensaje), **tiempo relativo** ("hace 5 min", "ayer").
- No leídas: fondo con tinte verde suave + **punto verde** al costado.
- **Badge contador** de no leídas en el ícono de notificaciones (header y menú lateral). Verde, nunca rojo (doctrina).
- **Tap en una notificación:** la marca como leída, descuenta el badge y navega a la sección relacionada (Socialis, Perfil, Chats, Comunidad, Mi Red).
- Tipos de notificación (del prototipo, adaptados al modelo de conexiones — no existen seguidores):
  - Comentario en tu publicación (con cita del comentario)
  - Mención en un post (`@usuario`)
  - Solicitud de conexión recibida / conexión aceptada ("+1 conexión nueva")
  - Mensaje nuevo en chat (con vista previa)
  - Guardaron tu publicación
  - Sistema VERA: hitos propios y novedades de categorías que sigues ("12 nuevos posts desde tu última visita")

### 2.11 Mecánicas de bienestar

**Stop scrolling** (por sesión, en secciones scrolleables):
- Aparece a los **2 min** de scroll, luego a los **10**, luego a los **30**, y desde ahí **cada 30 min**.
- Pantalla completa: video de **30 s obligatorio** (buen uso de redes, autoregulación, bienestar) — solo dos salidas: ver el video completo o el botón **"Salir de la app"**.
- Videos producidos por VERA, se cargan a R2. **Mientras no haya videos:** aviso de concientización "llevas mucho tiempo scrolleando, tómate un break" con las mismas dos salidas.

**Ráfaga ansiosa** (única regla heredada):
- Varias entradas/salidas de la app en corto periodo → al ingresar, aviso de ráfaga ansiosa + **ejercicio de autoregulación**: respiración guiada 4-6 (inhalar 4 s, exhalar 6 s). Sin culpa, sin bloqueo.
- Parámetro borrador: 3ª apertura dentro de 10 min con estancias previas < 15 s.

---

## 3. Parámetros de producto (config remota)

Todos en tabla `remote_config` de la base de datos, editables sin deploy. Valores iniciales:

```
STOP_SCROLL_STEPS_MIN   = [2, 10, 30]     // luego cada 30
STOP_VIDEO_S            = 30
PROPAGANDA_EVERY_POSTS  = 30
RAFAGA_VENTANA_MIN      = 10
RAFAGA_APERTURAS        = 3
RAFAGA_REBOTE_S         = 15
BAN_CATEGORIA_HORAS     = 72
SCORE_COMENTARIO_POS    = +2
SCORE_COMENTARIO_NEG    = -3
SCORE_REACCION_POS      = +1
SCORE_REACCION_NEG      = -2
SCORE_TOPE_DIARIO       = 20              // máx |Δscore|/día por usuario
SCORE_PAR_TOPE_DIA      = 3               // eventos que puntúan entre mismo par/día
NIVELES_UMBRAL          = [0, 50, 200, 600, 1500]
```

Doctrina (NO configurable): sin likes · sin algoritmo de recomendación · reacciones/clasificaciones invisibles · publicidad solo en Empresas · stop scrolling y ráfaga ansiosa existen siempre.

---

## 4. Tech Stack

| Capa | Elección | Nota |
|---|---|---|
| Frontend | **React 18 + Vite + TypeScript**, PWA móvil-first | Estética base: prototipo `VERA/app_web.html` |
| Backend | **Node.js 22 + Fastify + TypeScript** | REST + WebSocket en el mismo servicio |
| Base de datos | **Neon** (Postgres serverless) + **Drizzle ORM** | Free/Launch ~$0-8/mes |
| Archivos/media | **Cloudflare R2** (S3-compatible, presigned URLs) | 10 GB gratis |
| Tiempo real | WebSocket (chat, señalización WebRTC) | Cloud Run soporta WS |
| Llamadas | **WebRTC** P2P + STUN público (TURN post-beta si hace falta) | Cifrado DTLS-SRTP nativo |
| E2E chat | **WebCrypto**: X25519 (intercambio) + AES-GCM (mensajes) | §8 |
| IA (sentimiento + moderación) | **Claude API — claude-haiku-4-5-20251001** | Costo estimado beta: < $5/mes |
| Auth | Sesiones con cookie httpOnly + WebAuthn/passkey | |
| Hosting | **Cloud Run** `southamerica-west1` (escala a cero) | ~$0-10/mes |
| CI/CD | GitHub Actions → deploy a Cloud Run | Repo privado `septimoplano/vera-socialis` |

**Costo total estimado beta: < $25/mes** (host <$20 + Claude API).

---

## 5. Comandos

```
Instalar:      npm install                      (raíz, workspaces)
Dev frontend:  npm run dev -w web               → http://localhost:5173
Dev backend:   npm run dev -w api               → http://localhost:3000
DB local:      docker compose up -d db          (Postgres local para dev)
Migraciones:   npm run db:migrate -w api        (Drizzle)
Seed:          npm run db:seed -w api           (cuenta fundador + categorías + config)
Test:          npm test                         (Vitest, ambos workspaces)
Lint:          npm run lint                     (ESLint + Prettier)
Build:         npm run build
Deploy:        git push a master → GitHub Actions → Cloud Run
```

### 5.1 Colaboración en GitHub — dos equipos en paralelo

Este spec vive en el repo privado **`septimoplano/vera-socialis`** para colaborar en el desarrollo. Trabajan **dos equipos en paralelo**, divididos para minimizar cuellos de botella (ninguno espera a que el otro termine):

- **Equipo A — Producto** (frontend + ux-ui + qa): prototipo, vistas, mecánicas de bienestar, PWA. Trabaja contra **API simulada (mocks)** generada del contrato.
- **Equipo B — Plataforma** (backend + db-datos + devops-infra + seguridad): base de datos, auth, API, tiempo real, score, deploy.

**Clave anti-cuello de botella: contrato primero.** El contrato de API se congela temprano en `docs/arquitectura.md`; A construye contra mocks del contrato y B implementa el contrato real. Se integran sección por sección, no al final. Cambios al contrato = PR sobre `docs/arquitectura.md` aprobado por ambos equipos (vía cto-cio).

**Branches:** `master` protegida (CI verde + revisión para mergear) · ramas por tarea con prefijo de equipo: `a/<tarea>` y `b/<tarea>` · ramas cortas, merge frecuente (nada vive más de unos días) · detalle operativo en `tasks/plan.md` §7.

---

## 6. Estructura del proyecto

```
vera-socialis/
├── docs/
│   ├── spec.md              → este documento (fuente de verdad)
│   ├── arquitectura.md      → modelo de datos completo, contratos API, flujos E2E
│   └── user-journey.md      → recorridos: registro, sesión tipo, empresa
├── tasks/
│   ├── plan.md              → plan técnico (Fase 2)
│   └── todo.md              → tareas con criterios de aceptación (Fase 3)
├── .claude/
│   └── agents/              → agentes de desarrollo (ver §10)
├── web/                     → frontend React + Vite (PWA)
│   ├── src/
│   │   ├── vistas/          → perfil, chat, red, mundial, socialis, comunidad, config
│   │   ├── componentes/     → UI compartida
│   │   ├── mecanicas/       → stop-scrolling, ráfaga ansiosa, métricas personales
│   │   ├── crypto/          → E2E del chat (WebCrypto)
│   │   └── lib/             → api client, ws, estado
│   └── public/
├── api/                     → backend Fastify
│   ├── src/
│   │   ├── rutas/           → auth, perfil, red, posts, chat, score, comunidad, empresas, tickets
│   │   ├── servicios/       → score, sentimiento (Claude), moderación, media (R2)
│   │   ├── db/              → esquema Drizzle, migraciones, seed
│   │   └── ws/              → chat en tiempo real + señalización WebRTC
│   └── Dockerfile
├── prototipo/               → iteración visual HTML (base: VERA/app_web.html)
└── .github/workflows/       → CI/CD
```

---

## 7. Estilo de código

TypeScript estricto. **Español en dominio, inglés en primitivas técnicas.** Parámetros SIEMPRE desde config remota, jamás constantes sueltas:

```ts
// api/src/servicios/score.ts
export async function aplicarComentario(comentario: Comentario, cfg: RemoteConfig) {
  // La clasificación es invisible para el autor (doctrina §2.6)
  const sentimiento = await clasificarSentimiento(comentario.texto); // Claude Haiku
  const delta = sentimiento === 'positivo' ? cfg.SCORE_COMENTARIO_POS : cfg.SCORE_COMENTARIO_NEG;
  await registrarEventoScore({
    usuarioId: comentario.autorId,
    tipo: 'comentario',
    delta: await conTopes(comentario.autorId, comentario.destinatarioId, delta, cfg),
  });
}
```

Convenciones: commits en español, imperativo, sin coautor · copy en español neutro (Chile) · nombres de eventos y tablas en `snake_case` · componentes React en `PascalCase`.

### 7.1 Skills de diseño (obligatorias en todo trabajo visual)

Toda la apariencia de VERA SOCIALIS gira en torno a estas skills de Claude Code. Ningún UI, animación o pantalla se da por listo sin haberlas aplicado:

**Pack de animación/diseño de Emil Kowalski** (instalado global en `~/.claude/skills/` · repo: https://github.com/emilkowalski/skills):
- `emil-design-eng` → filosofía de pulido de UI, detalles invisibles, decisiones de componentes — base de todo trabajo visual
- `animate` → construir cualquier animación web desde cero (propósito, propiedades, curvas, duración, interrupción, salida)
- `find-animation-opportunities` → detectar dónde falta motion (y dónde NO debe haber)
- `improve-animations` / `review-animations` → auditar y corregir motion existente
- `apple-design` → interacciones fluidas y físicas (gestos, springs, sheets, materiales, tipografía)
- `animation-vocabulary` → vocabulario exacto de efectos
- `ask-sonner` → toasts (Sonner) si se usan notificaciones in-app tipo toast
- `animate-expo` → reservada para el futuro port a app nativa

**Skills de diseño frontend:**
- `taste-skill` (design-taste-frontend) → anti-slop: interfaces que no parecen template, dirección de diseño desde el brief
- `impeccable` → diseño/rediseño, jerarquía visual, accesibilidad, estados de error/vacío, micro-interacciones, pulido general

Regla de uso: el agente `ux-ui` y el `frontend` invocan estas skills antes de diseñar o construir cualquier vista; `qa` verifica contra ellas en la revisión visual.

---

## 8. Seguridad y privacidad

- **E2E chat:** claves generadas en el dispositivo (WebCrypto). X25519 para acuerdo de clave por conversación, AES-GCM por mensaje. El servidor solo guarda ciphertext. Beta: un dispositivo por usuario (multi-dispositivo post-beta).
- **Llamadas:** WebRTC P2P — cifrado DTLS-SRTP de fábrica; el servidor solo señaliza.
- **Biometría:** nunca sale del dispositivo (WebAuthn). La selfie de registro se guarda cifrada en R2, solo para aprobación manual, borrable a pedido.
- Contraseñas con argon2id · cookies httpOnly + SameSite · rate limiting global en API · validación de entrada con zod en toda ruta.
- Cumplimiento: Ley 21.719 / 19.628 (Chile). Solo se almacena el hecho "es humano verificado", nunca documentos de identidad.
- Sin secretos en el repo: env vars en Cloud Run / GitHub Secrets.

---

## 9. Estrategia de testing

- **Vitest** en ambos workspaces (`web/`, `api/`).
- Unit obligatorio en la lógica sensible: cálculo de social score (topes, decaimiento, anti-colusión) · escalado de stop scrolling · detección de ráfaga ansiosa · clasificación y aplicación de deltas · reglas de visibilidad (público/privado, empresa no inicia chat).
- Integración: rutas API contra Postgres local (docker).
- E2E manual con checklist por sección antes de cada deploy de beta (playwright disponible para flujos críticos: registro con referido, enviar mensaje E2E, postear en categoría).
- Verificación visual: renderizar con Chromium headless y comparar contra el prototipo antes de dar por listo un UI.

---

## 10. Agentes Claude Code (`.claude/agents/`)

El fundador habla **solo con el CTO-CIO**. El CTO-CIO orquesta al resto.

```
cto-cio          → orquestador. Recibe órdenes del fundador, delega, revisa contra este spec,
                   reporta avance. Único interlocutor humano↔equipo.
frontend         → web/: vistas, componentes, mecánicas de bienestar, PWA
backend          → api/: rutas, servicios, WebSocket, integración Claude API
db-datos         → esquema Drizzle, migraciones, seed, consultas de score
ux-ui            → sistema visual desde el prototipo, user journey, copy español neutro
seguridad        → E2E, auth, WebAuthn, rate limits, cumplimiento datos
devops-infra     → Docker, Cloud Run, Neon, R2, GitHub Actions, monitoreo de costos
qa               → tests, checklists por sección, verificación visual
```

Todos leen este spec antes de trabajar. Salidas coordinadas por cto-cio.

---

## 11. Boundaries

- **Siempre:** leer este spec antes de trabajar · parámetros desde `remote_config` · copy en español neutro (Chile) · tests de lógica sensible antes de commit · verificar checklist de sección antes de deploy · aplicar las skills de diseño de §7.1 en todo trabajo visual.
- **Preguntar primero (al fundador, vía CTO-CIO):** gastar dinero (dominios, cuentas, proveedores, subir tier de Neon/R2) · agregar dependencia pesada nueva · cambiar doctrina o valores de §3 marcados doctrina · abrir la beta a más de 100 usuarios · publicar o difundir URLs · contactar terceros.
- **Nunca:** likes, contadores rojos, streaks, badges FOMO, notificaciones de enganche · algoritmo de recomendación de contenido · mostrar al usuario la clasificación de sus comentarios/reacciones · publicidad fuera de la categoría Empresas · guardar documentos de identidad o biometría en servidor · secretos en el repo · medir éxito con DAU/tiempo en pantalla.

---

## 12. Criterios de éxito (beta lista)

1. Registro completo funciona: código de referido + passkey + selfie → cuenta con medalla y primera conexión automática con el referente.
2. Las 9 secciones operativas en móvil: Perfil · Chat · Mi Red · Contenido mundial · Socialis · Comunidad · Notificaciones · Config · Empresas (perfil demo).
3. Chat: mensajes E2E verificables (servidor solo tiene ciphertext), archivos/audio/ubicación, una llamada y una videollamada exitosas entre dos celulares reales.
4. Social score: comentario positivo/negativo altera el score según §3, con topes y sin que el autor vea la clasificación. Tests unitarios en verde.
5. Stop scrolling aparece a los 2/10/30 min con video o aviso, y "Salir de la app" funciona. Ráfaga ansiosa dispara con el patrón definido.
6. Post en categoría incorrecta: detectado, bajado, ban temporal aplicado, score penalizado.
7. Buscador de usuarios, solicitudes de conexión y grafo de red funcionan.
8. Métricas personales privadas se actualizan tras cada sesión.
9. Desplegado en Cloud Run + Neon + R2, costo mensual < $25, URL abre en frío desde cualquier celular.
10. 10 usuarios reales del círculo cercano completaron registro y una sesión sin asistencia.

---

## 13. Decisiones resueltas (2026-08-24) y pendientes

**Resueltas por el fundador** (ya integradas en §§ correspondientes):
1. **Dominio:** habrá dominio propio; el fundador lo compra y entrega. Necesario antes de activar WebAuthn en producción (requiere HTTPS + dominio estable).
2. **Selfie:** aprobación manual del fundador en beta + algoritmo de validación funcionando desde el día 1 (§2.1).
3. **Ráfaga ansiosa:** respiración guiada 4-6 — inhalar 4 s, exhalar 6 s (§2.11).
4. **Empresas demo:** 1-2 empresas ficticias en beta + sección de login para empresas como botón pequeño (§1).
5. **Comunidad:** votaciones y buzón activos desde el día 1.

**Pendientes:**
1. **Niveles del social score:** nombres borrador (`Inicial → En crecimiento → Confiable → Ejemplar → Referente`) — falta aprobación u otra propuesta del fundador.
2. **Dominio concreto:** a la espera del nombre comprado.
3. **Precios por segmento de empresas** (post-beta).
4. **Videos de 30 s** del stop scrolling: producción del fundador (mientras tanto, aviso de break).
