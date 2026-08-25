# VERA SOCIALIS

Red social gratuita donde cada cuenta es un humano verificado. Sin likes, sin algoritmo de recomendación, sin publicidad (salvo la categoría Empresas). Compite por confianza y bienestar, no por tiempo en pantalla.

**Estado:** spec y plan aprobados · beta cerrada (<100 usuarios) en construcción.

## Documentos

| Archivo | Qué es |
|---|---|
| [`docs/spec.md`](docs/spec.md) | **Fuente de verdad** del producto y del desarrollo. Leer primero, siempre. |
| [`tasks/plan.md`](tasks/plan.md) | Plan técnico: etapas E0-E8, dos equipos, riesgos, compuertas CP1-CP4 |
| [`tasks/todo.md`](tasks/todo.md) | Tareas con criterios de aceptación (A* = Producto, B* = Plataforma) |
| `docs/arquitectura.md` | Contrato API y modelo de datos (se crea en la tarea AB1) |
| `.claude/agents/` | Los 8 agentes de desarrollo (cto-cio orquesta; el fundador habla solo con él) |

## Cómo colaborar

Dos equipos en paralelo, sin cuellos de botella (detalle en `tasks/plan.md` §6):

- **Equipo A — Producto**: `prototipo/`, `web/` · ramas `a/<slug>`
- **Equipo B — Plataforma**: `api/`, infra · ramas `b/<slug>`

1. Clonar y leer `docs/spec.md`.
2. **Instalar las skills de diseño** (requisito, spec §7.1): `git clone https://github.com/emilkowalski/skills ~/.claude/skills/emil-skills` — Claude las instala solo si faltan.
3. Trabajar SIEMPRE a través de los agentes de `.claude/agents/` (spec §5.1): las órdenes entran por `cto-cio`, que delega. Nada se desarrolla a mano fuera de los agentes.
4. Tomar una tarea de `tasks/todo.md`.
5. Rama por tarea (`a/...` o `b/...`) → PR a `master` → CI verde + revisión del otro equipo o cto-cio.
6. El contrato (`docs/arquitectura.md`) solo cambia por PR aprobado por ambos equipos.

## Reglas del repo

- Commits en español, imperativo, sin coautor.
- Sin secretos ni llaves en el repo, nunca.
- La doctrina del spec §11 no se negocia en código: sin likes, sin contadores rojos, sin FOMO, sin algoritmo de recomendación, clasificaciones invisibles, publicidad solo en Empresas.
- Dinero y exposición pública los decide solo el fundador (vía cto-cio).
