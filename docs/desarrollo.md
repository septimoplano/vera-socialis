# Guía de desarrollo — VERA SOCIALIS

> Cómo levantar el proyecto. Producto y doctrina: `docs/spec.md`. Tareas: `tasks/todo.md` e [issues](https://github.com/septimoplano/vera-socialis/issues).

## Requisitos

- **Node.js ≥ 22** (probado en 22 y 24)
- **Docker** (solo para el Postgres local)
- **Skills de diseño** si vas a tocar UI (spec §7.1):
  `git clone https://github.com/emilkowalski/skills ~/.claude/skills/emil-skills`

## Primeros pasos

```bash
npm install                 # instala los dos workspaces
cp .env.example .env        # ajustar si hace falta
docker compose up -d db     # Postgres local en localhost:5433
```

El Postgres local usa el puerto **5433** del host (no 5432) para no chocar con otras bases
que ya tengas corriendo. Se cambia con `DB_PUERTO` en `.env`; recuerda ajustar también
`DATABASE_URL` si lo mueves.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev -w @vera/api` | API en http://localhost:3000 (recarga en caliente) |
| `npm run dev -w @vera/web` | Frontend en http://localhost:5173 (proxy `/api` → 3000) |
| `npm test` | Tests de ambos workspaces (Vitest) |
| `npm run lint` | ESLint + Prettier en modo verificación |
| `npm run lint:fix` | Arregla lo que se pueda automáticamente |
| `npm run typecheck` | TypeScript estricto, sin emitir |
| `npm run build` | Compila API y frontend |
| `npm run db:migrate` | Aplica las migraciones Drizzle |
| `npm run db:seed` | Carga los datos semilla (idempotente) |
| `npm run db:generate -w @vera/api` | Genera una migración nueva tras cambiar el esquema |
| `npm run db:studio -w @vera/api` | Explorador visual de la base |

Verificación rápida de que la API vive: `curl http://localhost:3000/salud`

## Estructura

```
api/          → backend Fastify (Equipo B)
  src/rutas/       rutas HTTP
  src/servicios/   lógica de dominio (score, sentimiento, moderación, media)
  src/db/          esquema Drizzle, migraciones, seed
  src/ws/          WebSocket: chat y señalización WebRTC
web/          → frontend React + Vite, PWA (Equipo A)
  src/vistas/      las 9 secciones
  src/componentes/ UI compartida
  src/mecanicas/   stop scrolling, ráfaga ansiosa, métricas personales
  src/crypto/      cifrado E2E del chat (WebCrypto)
prototipo/    → iteración visual HTML
docs/         → spec, arquitectura, esta guía
tasks/        → plan y tareas
```

## Reglas que el tooling hace cumplir

- **TypeScript estricto** en ambos workspaces (`noUncheckedIndexedAccess` incluido).
- **Lint y formato**: ESLint 9 (flat config) + Prettier. La CI los corre en cada PR.
- **Tests**: Vitest. La lógica sensible del spec §9 exige cobertura — motor de score, stop scrolling, ráfaga ansiosa, reglas de visibilidad.
- **Parámetros de producto**: van en la tabla `remote_config` (spec §3), nunca como constantes en el código. El entorno (`api/src/config.ts`) es solo infraestructura.
- **Sin secretos en el repo**: `.env` está ignorado; en producción se usan env vars de Cloud Run y GitHub Secrets.

## Base de datos

El esquema vive en `api/src/db/esquema/`, separado por dominio (usuarios, red, contenido, chat, score, actividad, comunidad, config). Flujo para cambiarlo:

1. Editar el archivo de esquema que corresponda.
2. `npm run db:generate -w @vera/api` → genera el SQL en `api/drizzle/`.
3. Revisar el SQL generado y commitearlo junto al cambio de esquema.
4. `npm run db:migrate` para aplicarlo.

**Nunca editar una migración ya aplicada**: se genera una nueva encima.

Los **parámetros de producto** (spec §3) no son constantes del código: viven en la tabla `remote_config` y se ajustan desde el panel admin sin deploy. `api/src/db/parametros.ts` es solo la semilla y la documentación de cada uno; los marcados `esDoctrina` no se editan ni desde el admin.

El seed es **idempotente** (usa `onConflictDoNothing`), así que se puede correr las veces que haga falta. Carga: los 21 parámetros de config, los 5 niveles de score, las 19 categorías, la cuenta del fundador con 10 códigos de referido, 2 empresas demo conectadas a él, 4 piezas de concientización y la primera votación de Comunidad.

### Nota sobre `drizzle-orm` en la raíz

`drizzle-orm` aparece en las devDependencies de la raíz además de en `api/`. No es un descuido: npm hoistea `drizzle-kit` a la raíz pero deja `drizzle-orm` dentro de `api/node_modules`, y así el CLI no logra resolver la librería. Tenerla también en la raíz arregla la resolución. El runtime siempre usa la de `api/`.

## Autenticación

Crear cuenta es **excluyente**: sin código de referido válido no hay cuenta (spec §2.1).

```
POST /auth/registro          código de referido + nombre de usuario + clave
                             → crea la cuenta en `pendiente_verificacion`
                             → quema el código
                             → crea la conexión referido ↔ referente
                             → deja la verificación en cola para el fundador
                             → abre sesión (cookie httpOnly)
POST /auth/login             nombre de usuario + clave
POST /auth/salir             cierra esta sesión
POST /auth/salir-de-todos    cierra todas las sesiones del usuario
GET  /auth/yo                usuario de la sesión actual
GET  /auth/codigos           mis códigos para invitar (requiere cuenta activa)
POST /auth/codigos           emite códigos nuevos (solo admin)

POST /auth/passkey/registro/opciones     alta de passkey (con sesión)
POST /auth/passkey/registro/verificar
POST /auth/passkey/login/opciones        login con huella o rostro
POST /auth/passkey/login/verificar
```

Todo el registro corre dentro de una transacción: o queda la cuenta con su código quemado, su conexión y su verificación en cola, o no queda nada.

**Estados de cuenta.** Una cuenta recién creada está `pendiente_verificacion`: puede ver su estado y cerrar sesión, pero no participar. Pasa a `activa` cuando el fundador aprueba su verificación humana (tarea B4).

**Passkeys.** La biometría nunca sale del dispositivo: al servidor solo llega una clave pública. Los retos se guardan en la base (no en memoria) para que el login siga funcionando cuando Cloud Run escala a cero y levanta otra instancia; se consumen una sola vez y expiran a los 5 minutos.

**Rate limiting.** Registro 5 por 15 min, login 10 por 15 min, passkeys 20 por 15 min. Los tests lo apagan (`limitarPeticiones: false`) porque si no la propia suite se autobloquea; el límite tiene su test dedicado que levanta una app con el límite encendido.

**En producción la API se niega a arrancar** si `COOKIE_SECRET` quedó en el valor de desarrollo, si falta `DATABASE_URL`, o si `WEBAUTHN_RP_ID` sigue siendo `localhost`.

## CI

`.github/workflows/ci.yml` corre en cada PR y push a master: lint → typecheck → tests → build, más un job que construye la imagen Docker de la API. Todo debe estar en verde antes de mergear.

## Docker

```bash
docker compose up -d db          # base de datos local
docker compose down              # apagar (los datos persisten en el volumen)
docker compose down -v           # apagar y borrar los datos

docker build -f api/Dockerfile -t vera-api .   # imagen de producción de la API
```

La imagen es multi-stage sobre `node:22-alpine`, corre como usuario `node` y lee el puerto desde `PORT` (Cloud Run lo inyecta).
