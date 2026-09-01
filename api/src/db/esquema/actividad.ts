import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { tipoNotificacion } from './enums.js';
import { categorias } from './contenido.js';
import { usuarios } from './usuarios.js';

/** Badge verde, nunca rojo (doctrina spec §2.10). */
export const notificaciones = pgTable(
  'notificaciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    tipo: tipoNotificacion('tipo').notNull(),
    texto: text('texto').notNull(),
    /** Cita del comentario o vista previa del mensaje; se muestra en cursiva. */
    detalle: text('detalle'),
    actorId: uuid('actor_id').references(() => usuarios.id, { onDelete: 'cascade' }),
    /** Sección a la que navega el tap: socialis | perfil | chats | comunidad | red. */
    destinoSeccion: text('destino_seccion').notNull(),
    destinoId: uuid('destino_id'),
    leida: boolean('leida').notNull().default(false),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [index('notificaciones_usuario_idx').on(tabla.usuarioId, tabla.leida, tabla.creadoEn)],
);

/**
 * Contador de vistas por categoría. Alimenta dos cosas distintas:
 * las tarjetas PÚBLICAS de preferencias del perfil (spec §2.2) y las
 * métricas PRIVADAS de uso del propio usuario.
 */
export const vistasCategoria = pgTable(
  'vistas_categoria',
  {
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    categoriaId: uuid('categoria_id')
      .notNull()
      .references(() => categorias.id, { onDelete: 'cascade' }),
    vistas: integer('vistas').notNull().default(0),
    ultimaVistaEn: timestamp('ultima_vista_en', { withTimezone: true }),
  },
  (tabla) => [
    primaryKey({ columns: [tabla.usuarioId, tabla.categoriaId] }),
    index('vistas_categoria_usuario_idx').on(tabla.usuarioId, tabla.vistas),
  ],
);

/**
 * Sesión de uso de la app. Base de las métricas personales privadas, de la
 * detección de ráfaga ansiosa (aperturas cortas seguidas) y del escalado del
 * stop scrolling (spec §2.11). Nunca se usa para medir "éxito" del producto:
 * DAU y tiempo en pantalla están prohibidos como métrica (doctrina §11).
 */
export const sesionesApp = pgTable(
  'sesiones_app',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    inicioEn: timestamp('inicio_en', { withTimezone: true }).notNull().defaultNow(),
    finEn: timestamp('fin_en', { withTimezone: true }),
    segundosScroll: integer('segundos_scroll').notNull().default(0),
    /** Cuántas veces se mostró el stop scrolling en esta sesión. */
    stopsMostrados: integer('stops_mostrados').notNull().default(0),
    /** true si la sesión duró menos que RAFAGA_REBOTE_S: insumo de la ráfaga ansiosa. */
    fueRebote: boolean('fue_rebote').notNull().default(false),
    rafagaDetectada: boolean('rafaga_detectada').notNull().default(false),
    resumen: jsonb('resumen').$type<Record<string, unknown>>(),
  },
  (tabla) => [index('sesiones_app_usuario_idx').on(tabla.usuarioId, tabla.inicioEn)],
);
