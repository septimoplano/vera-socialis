# Plan técnico — VERA SOCIALIS beta

> Fase 2 del spec-driven development. Deriva de `docs/spec.md` v1.0 (aprobado 2026-08-24).
> Aprobación del fundador: pendiente.

---

## 1. Componentes mayores y dependencias

```
                    ┌─────────────────────────────┐
                    │  E0 Fundaciones (monorepo)  │
                    └──────┬──────────────┬───────┘
       ┌───────────────────┤              │
       ▼                   ▼              ▼
┌─────────────┐   ┌──────────────┐  ┌───────────────┐
│ E1 Prototipo│   │ E2 Base de   │  │ agentes       │
│ visual HTML │   │ datos + cfg  │  │ .claude/agents│
└──────┬──────┘   └──────┬───────┘  └───────────────┘
       │                 ▼
       │          ┌──────────────┐
       │          │ E3 Auth +    │
       │          │ verificación │
       │          └──────┬───────┘
       ▼                 ▼
┌──────────────────────────────────┐
│ E4 Núcleo social (perfil, red,   │
│ posts, comentarios, score,       │
│ socialis, mundial, notifs)       │
└──────┬──────────────┬────────────┘
       ▼              ▼
┌─────────────┐  ┌────────────────────┐
│ E5 Chat E2E │  │ E6 Bienestar +     │
│ + llamadas  │  │ métricas personales│
└──────┬──────┘  └─────────┬──────────┘
       ▼                   ▼
┌──────────────────────────────────┐
│ E7 Comunidad + Empresas + Config │
└────────────────┬─────────────────┘
                 ▼
┌──────────────────────────────────┐
│ E8 Deploy + hardening + beta     │
└──────────────────────────────────┘
```

## 2. Etapas en orden de construcción

### E0 · Fundaciones
Monorepo npm workspaces (`web/`, `api/`) · TypeScript estricto · ESLint + Prettier · Vitest ambos lados · `docker-compose.yml` con Postgres local · Dockerfile de `api/` · repo privado GitHub `septimoplano/vera-socialis` · esqueleto CI (lint + test en PR) · **los 8 agentes en `.claude/agents/`** (cto-cio + 7 especialistas, según spec §10).

### E1 · Prototipo visual (en paralelo con E0/E2)
Copiar `VERA/app_web.html` → `prototipo/` y actualizarlo con TODO lo nuevo del spec: contenido mundial por categorías + propaganda, stop scrolling (pantalla video/aviso + salir), ráfaga ansiosa (respiración 4-6), métricas personales, tarjetas de categorías en perfil, buscador en Mi Red, login con botón empresas, comunidad con votaciones + buzón.
**El fundador aprueba el prototipo visual ANTES de construir las vistas React** (trabaja visualmente — esta compuerta evita retrabajo).

### E2 · Base de datos + config remota
Esquema Drizzle completo: `usuarios`, `verificaciones`, `conexiones`, `solicitudes_conexion`, `posts` (perfil y mundial), `categorias`, `comentarios`, `reacciones_chat`, `conversaciones`, `mensajes` (ciphertext), `score_eventos`, `niveles`, `notificaciones`, `votaciones`, `votos`, `buzon`, `tickets`, `empresas`, `vistas_categoria` (para tarjetas + métricas), `remote_config` (valores §3 del spec).
Migraciones + seed (fundador, categorías, config, 2 empresas demo).

### E3 · Auth + verificación humana
Registro con código de referido → passkey/WebAuthn → selfie a R2 → **algoritmo de validación** (detección de rostro en la imagen; librería liviana en el server) → cola de **aprobación manual** en panel admin → cuenta activa con medalla + primera conexión automática referido↔referente.
Sesiones cookie httpOnly · login normal + **botón discreto de acceso empresas**.
**Panel admin del fundador** (ruta protegida): aprobar selfies, ver tickets/buzón, moderación, editar `remote_config`.
⚠️ WebAuthn en producción necesita el **dominio definitivo** — pedirlo al fundador al inicio de esta etapa. En dev funciona con localhost.

### E4 · Núcleo social
Perfil (banner, grid, medalla, nivel, conexiones, tarjetas de categorías, público/privado) · Mi Red (solicitudes, buscador por nombre, grafo canvas) · posts de perfil → feed Socialis cronológico · Contenido mundial (categorías, posteo, scroll, propaganda cada 30) · comentarios → clasificación de sentimiento (Claude Haiku) → **motor de social score** (deltas, topes diarios, anti-colusión por par, niveles) · moderación automática al publicar + penalización por categoría incorrecta (bajar post, ban temporal, -score) · notificaciones (lista, badge verde, tap navega).

### E5 · Chat E2E + llamadas
WebSocket (conexión autenticada) · generación de claves en dispositivo (WebCrypto: X25519 + AES-GCM), intercambio de claves públicas vía servidor, servidor solo guarda ciphertext · texto, archivos/audios (cifrados, a R2), ubicación · reacciones ocultas a mensajes → score · llamadas y videollamadas WebRTC con señalización por el mismo WS · restricción: empresa no inicia chat.

### E6 · Bienestar + métricas personales
Stop scrolling: contador de scroll por sesión, escala 2→10→30→cada 30 min, pantalla completa con video de R2 (o aviso de break si no hay videos) + botón "Salir de la app" · ráfaga ansiosa: detección de aperturas repetidas (3ª en 10 min, estancias <15 s) → respiración guiada 4-6 · métricas personales privadas: resumen por sesión, tendencias, contenido más visto, alertas/felicitaciones.

### E7 · Comunidad + Empresas + Config
Votaciones (1 humano = 1 voto) + buzón de bugs/sugerencias (activos día 1) · perfiles de empresa (postean solo en categoría Empresas, responden chats sin iniciarlos) · Config completa (perfil, app, cuenta, seguridad, privacidad, apariencia) + Ayuda con tickets.

### E8 · Deploy + hardening + beta
Cloud Run `southamerica-west1` + Neon + R2 producción · dominio + HTTPS · GitHub Actions deploy · rate limiting global · revisión de seguridad (checklist OWASP básico) · Playwright en flujos críticos (registro, mensaje E2E, posteo) · checklist manual de las 9 secciones en 2 celulares reales · onboarding de los primeros 10 usuarios del círculo.

## 3. Paralelo vs secuencial

- **Paralelo:** E1 (prototipo) corre junto a E0+E2. Dentro de E4, frontend y backend avanzan en paralelo por sección una vez cerrado el contrato API (se documenta en `docs/arquitectura.md` al inicio de E4).
- **Secuencial estricto:** E0 → E2 → E3 → E4. E5-E7 requieren E4. E8 al final (aunque el deploy de staging a Cloud Run se hace desde E3 para probar WebAuthn con dominio real).

## 4. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| WebSocket + Cloud Run escala-a-cero: desconexiones en frío | Reconexión automática con backoff en el cliente + cola de mensajes pendientes; si molesta en beta, `min-instances=1` (~$5-8/mes extra, pedir aprobación) |
| WebRTC falla en redes NAT estrictas sin TURN | Beta acepta el fallo con mensaje claro; TURN post-beta (costo) |
| WebAuthn exige dominio HTTPS estable | Pedir dominio al fundador en E3; staging temprano |
| E2E multi-pestaña/dispositivo pierde mensajes | Beta: 1 dispositivo por usuario (spec §8); aviso al iniciar sesión en otro dispositivo |
| Clasificación de sentimiento abusable o errónea | Rate limits §3 + eventos de score auditables en panel admin + prompt con casos límite y tests |
| Algoritmo de selfie da falsos rechazos | Solo pre-filtra; la decisión final siempre es manual del fundador en beta |
| Costo se sale de $25/mes | Panel admin muestra contadores de uso R2/Neon/Claude; alertas de presupuesto en GCP |
| Alcance enorme para beta | Compuertas CP1-CP4; nada se construye fuera del spec; cambios → actualizar spec primero |

## 5. Checkpoints de verificación (compuertas con el fundador)

- **CP1** (fin E1): prototipo visual aprobado por el fundador en su celular.
- **CP2** (fin E3): registro completo real — referido + passkey + selfie + aprobación en panel admin — funcionando en staging con dominio.
- **CP3** (fin E5): chat E2E + una videollamada entre 2 celulares reales; servidor demostrado ciego (solo ciphertext).
- **CP4** (fin E8): checklist de criterios de éxito §12 completo → se invita al círculo cercano.

## 6. Colaboración: dos equipos, branches, cero cuellos de botella

**Equipos** (spec §5.1):

| | Equipo A — Producto | Equipo B — Plataforma |
|---|---|---|
| Agentes | frontend · ux-ui · qa | backend · db-datos · devops-infra · seguridad |
| Territorio | `prototipo/`, `web/` | `api/`, `.github/`, infra |
| Etapas | E1, vistas de E4-E7, E6 completo | E0, E2, E3, servicios de E4-E5-E7, E8 |

**Mecanismo anti-bloqueo:**
1. **Contrato primero:** al cerrar E2, ambos equipos acuerdan el contrato API v1 en `docs/arquitectura.md` (tipos, rutas, payloads, eventos WS). Es la frontera entre territorios.
2. **Mocks:** Equipo A genera una API simulada desde el contrato (fixtures + MSW) y construye TODAS las vistas sin esperar al backend.
3. **Integración por sección:** cuando B termina las rutas de una sección, A cambia esa sección de mock a real (flag por módulo). Nunca "big bang" al final.
4. **Territorios exclusivos:** A no toca `api/`, B no toca `web/`. Archivos compartidos (`docs/arquitectura.md`, tipos del contrato) cambian solo por PR aprobado por ambos (cto-cio arbitra).
5. **E6 (bienestar) y E1 (prototipo)** son 100% frontend → A avanza ahí cuando espera algo de B.

**Branches:**
- `master` protegida: merge solo por PR con CI verde (lint + tests) + revisión del otro equipo o cto-cio.
- Ramas por tarea: `a/<slug>` (Equipo A) · `b/<slug>` (Equipo B). Ejemplo: `a/vista-perfil`, `b/motor-score`.
- Vida corta: rama → PR → merge en días, no semanas. Rebase sobre master antes del PR.
- Sin rama `develop`: master siempre deployable a staging.

## 7. Qué NO entra en esta beta

Apps nativas / tiendas · cobro a empresas · KYC con proveedor · multi-dispositivo E2E · TURN server · notificaciones push del sistema operativo (solo in-app) · algoritmo de "novedades de categoría" más allá del contador simple.
