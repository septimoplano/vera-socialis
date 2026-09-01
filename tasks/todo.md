# Tareas — VERA SOCIALIS beta

> Fase 3 del spec-driven development. Deriva de `docs/spec.md` + `tasks/plan.md` (aprobados).
> Rama por tarea: `a/<slug>` o `b/<slug>` → PR → CI verde + revisión → master.
> **Equipo A = Producto** (frontend · ux-ui · qa) · **Equipo B = Plataforma** (backend · db-datos · devops-infra · seguridad). Orquesta: cto-cio.
> Cada tarea tiene su **issue en GitHub** (el `[#N]` del título): https://github.com/septimoplano/vera-socialis/issues · milestones = compuertas CP1-CP4 · labels `equipo-a` / `equipo-b` / `ambos-equipos` / `compuerta` / `bloqueado-fundador`.

---

## Arranque (sin dependencias entre equipos)

- [ ] **B1 · [#1] Monorepo + tooling** (E0)
  - Acceptance: npm workspaces `web/`+`api/`, TS estricto, ESLint+Prettier, Vitest, docker-compose Postgres, Dockerfile api, CI lint+test en PR.
  - Verify: `npm install && npm run lint && npm test` verde en repo limpio.
  - Files: raíz, `api/`, `web/` (esqueletos), `.github/workflows/ci.yml`

- [ ] **A1 · [#2] Prototipo visual actualizado** (E1 → CP1)
  - Acceptance: `prototipo/index.html` desde `VERA/app_web.html` con TODO el spec §2: mundial por categorías + propaganda, stop scrolling (video/aviso + salir), ráfaga con respiración 4-6, métricas personales, tarjetas de categorías en perfil, buscador Mi Red, login con botón empresas, comunidad (votaciones + buzón), notificaciones. Skills §7.1 aplicadas.
  - Verify: **CP1 — fundador aprueba en su celular.** Render headless comparado por qa.
  - Files: `prototipo/index.html`
  - **Estado (2026-08-31):** construido y verificado por qa (render headless 390px y 320px, sin errores de
    consola, sin desborde horizontal, propaganda exacta cada 30 posts). Pase de refinamiento con las skills
    §7.1 `animate` e `impeccable`: contraste WCAG AA en todo el texto, objetivos táctiles de 44 px, nombres
    accesibles en los botones de solo icono, y movimiento con propósito (entrada de vista, salida de hojas,
    solo el mensaje nuevo se anima). **Falta CP1: aprobación del fundador
    en su celular.** El prototipo abre offline: media local en `prototipo/media/` (placeholders con licencia
    mixta, ver `prototipo/media/LEEME.md`, se reemplazan antes de A3).

- [ ] **B2 · [#3] Esquema de datos completo + seed** (E2)
  - Acceptance: Drizzle con las ~20 tablas del plan E2, migraciones, `remote_config` con valores spec §3, seed: fundador, 19 categorías, 2 empresas demo.
  - Verify: `npm run db:migrate && npm run db:seed` contra Postgres docker; consultas smoke.
  - Files: `api/src/db/*`

## Compuerta de contrato (único punto de sincronía temprana)

- [ ] **AB1 · [#4] Contrato API v1** (ambos equipos, cto-cio arbitra)
  - Acceptance: `docs/arquitectura.md`: tipos compartidos, rutas REST por sección, payloads, eventos WS, códigos de error. Paquete de tipos TS compartido.
  - Verify: ambos equipos firman el PR; tipos compilan en `web/` y `api/`.
  - Files: `docs/arquitectura.md`, `contrato/` (tipos)

- [ ] **A2 · [#5] Mock API desde el contrato**
  - Acceptance: MSW + fixtures cubriendo el contrato completo; flag por módulo mock↔real.
  - Verify: `npm run dev -w web` funciona completo sin backend.
  - Files: `web/src/lib/mocks/*`

## Equipo B — Plataforma (secuencia propia)

- [ ] **B3 · [#6] Auth: registro + referido + sesiones + passkey** (E3)
  - Acceptance: registro con código de referido, argon2id, cookie httpOnly, WebAuthn registro/login, primera conexión automática referido↔referente.
  - Verify: tests integración; registro completo vía curl/Playwright API.
  - Files: `api/src/rutas/auth*`, `api/src/servicios/webauthn*`

- [ ] **B4 · [#7] Selfie pipeline + panel admin** (E3)
  - Acceptance: upload selfie a R2 (cifrada), detección de rostro algorítmica como pre-filtro, cola de aprobación; panel admin protegido: aprobar/rechazar, editar remote_config, ver tickets/buzón, eventos de score.
  - Verify: flujo completo en staging; selfie sin rostro → pre-rechazo.
  - Files: `api/src/rutas/admin*`, `api/src/servicios/selfie*`, vista admin mínima

- [ ] **B5 · [#8] Staging temprano: Cloud Run + Neon + R2 + CI/CD** (E8 adelantado; requiere dominio del fundador)
  - Acceptance: deploy automático master → staging; HTTPS con dominio; env vars en secretos.
  - Verify: **CP2 — registro real (referido+passkey+selfie+aprobación) desde un celular en staging.**
  - Files: `.github/workflows/deploy.yml`, `api/Dockerfile`, docs infra

- [ ] **B6 · [#9] Rutas núcleo social** (E4)
  - Acceptance: perfil (privacidad §2.2), conexiones/solicitudes, buscador, posts perfil + mundial, categorías, comentarios, guardados, notificaciones + badge, vistas de categoría (tarjetas + métricas).
  - Verify: tests integración por ruta contra el contrato.
  - Files: `api/src/rutas/*`

- [ ] **B7 · [#10] Sentimiento + motor de score + moderación** (E4)
  - Acceptance: clasificación Claude Haiku (comentarios y posts), deltas §3 con topes diarios y anti-colusión por par, niveles, penalización categoría incorrecta (bajar post + ban temporal + score), eventos auditables.
  - Verify: unit tests exhaustivos (topes, pares, ban); casos límite del prompt.
  - Files: `api/src/servicios/score*`, `api/src/servicios/sentimiento*`, `api/src/servicios/moderacion*`

- [ ] **B8 · [#11] WS: chat ciphertext + media + señalización WebRTC** (E5)
  - Acceptance: WS autenticado, entrega/cola de mensajes (servidor ciego, solo ciphertext), intercambio de claves públicas, media cifrada a R2, reacciones ocultas → score, señalización llamadas, empresa no inicia chat.
  - Verify: tests integración WS; inspección DB = solo ciphertext.
  - Files: `api/src/ws/*`, `api/src/rutas/chat*`

- [ ] **B9 · [#12] Comunidad + empresas + tickets** (E7)
  - Acceptance: votaciones (1 humano = 1 voto), buzón, tickets de ayuda, perfiles empresa (solo categoría Empresas, responden sin iniciar chat).
  - Verify: tests integración; intento de doble voto falla.
  - Files: `api/src/rutas/comunidad*`, `api/src/rutas/empresas*`

- [ ] **B10 · [#13] Hardening + producción** (E8)
  - Acceptance: rate limiting global, zod en toda ruta, checklist OWASP básico, alertas de presupuesto, monitoreo de costos en admin.
  - Verify: revisión del agente seguridad + escaneo dependencias.
  - Files: transversal `api/`

## Equipo A — Producto (secuencia propia, sobre mocks)

- [ ] **A3 · [#14] Base React PWA + sistema visual** (post-CP1)
  - Acceptance: Vite+React+TS, PWA instalable, tokens y componentes base portados del prototipo aprobado, navegación 9 secciones, layout móvil-first. Skills §7.1.
  - Verify: Lighthouse PWA ≥ 90; comparación visual contra prototipo.
  - Files: `web/src/componentes/*`, `web/src/lib/*`

- [ ] **A4 · [#15] Registro/login UI** — referido, passkey, selfie con cámara, estados de espera de aprobación, botón discreto empresas.
  - Verify: flujo completo sobre mocks; luego real contra B3-B5.
  - Files: `web/src/vistas/auth/*`

- [ ] **A5 · [#16] Perfil + métricas personales** — banner, grid, medalla, nivel, tarjetas categorías, público/privado, panel privado de métricas con feedback por sesión.
  - Verify: checklist §2.2; métricas cambian tras sesión simulada.
  - Files: `web/src/vistas/perfil/*`

- [ ] **A6 · [#17] Mi Red** — solicitudes, buscador por nombre, grafo canvas tipo red neuronal.
  - Verify: grafo con 20 nodos fluido en móvil.
  - Files: `web/src/vistas/red/*`

- [ ] **A7 · [#18] Contenido mundial + Socialis** — categorías, scroll por categoría, posteo, propaganda VERA cada 30, feed cronológico de conexiones, guardar.
  - Verify: propaganda aparece exacto cada 30; sin publicidad fuera de Empresas.
  - Files: `web/src/vistas/mundial/*`, `web/src/vistas/socialis/*`

- [ ] **A8 · [#19] Comentarios + notificaciones UI** — comentar (sin ver clasificación), pantalla notificaciones §2.10 con badge verde y navegación por tap.
  - Verify: checklist §2.10 completo.
  - Files: `web/src/vistas/notificaciones/*`, componentes comentarios

- [ ] **A9 · [#20] Chat UI + E2E cliente** — claves WebCrypto en dispositivo, conversaciones, texto/archivos/audio/ubicación, reacciones ocultas.
  - Verify: **CP3 parte 1 — mensaje E2E entre 2 dispositivos reales vía staging.**
  - Files: `web/src/vistas/chat/*`, `web/src/crypto/*`

- [ ] **A10 · [#21] Llamadas WebRTC UI** — llamada y videollamada con señalización WS.
  - Verify: **CP3 parte 2 — videollamada entre 2 celulares reales.**
  - Files: `web/src/vistas/chat/llamadas*`

- [ ] **A11 · [#22] Mecánicas de bienestar** (100% frontend — colchón anti-bloqueo)
  - Acceptance: stop scrolling 2→10→30→cada 30 con video R2 o aviso + "Salir de la app"; ráfaga ansiosa (3ª apertura/10 min, rebotes <15 s) con respiración guiada 4-6 animada (skill `animate`).
  - Verify: unit tests de timers/detección + prueba manual con tiempos acortados.
  - Files: `web/src/mecanicas/*`

- [ ] **A12 · [#23] Comunidad + Config UI** — votaciones, buzón, config completa (§2.9), ayuda con tickets.
  - Verify: checklist §2.8-2.9.
  - Files: `web/src/vistas/comunidad/*`, `web/src/vistas/config/*`

- [ ] **A13 · [#24] QA final + Playwright** — flujos críticos automatizados (registro, mensaje E2E, posteo con categoría), checklist 9 secciones en 2 celulares, verificación visual contra prototipo.
  - Verify: **CP4 — criterios de éxito spec §12 completos.**
  - Files: `e2e/*`, reporte en `docs/`

## Cierre

- [ ] **AB2 · [#25] Beta live** — onboarding de los primeros 10 usuarios del círculo con sus códigos de referido; informe de cierre.
  - Verify: criterio §12.10.
  - Files: `docs/informe-beta.md`
