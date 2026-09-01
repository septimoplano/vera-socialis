import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { estadoBuzon, estadoTicket, estadoVotacion, tipoBuzon } from './enums.js';
import { usuarios } from './usuarios.js';

/** Votaciones democráticas de funciones, activas desde el día 1 (spec §2.8). */
export const votaciones = pgTable(
  'votaciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    titulo: text('titulo').notNull(),
    descripcion: text('descripcion'),
    estado: estadoVotacion('estado').notNull().default('abierta'),
    creadoPor: uuid('creado_por').references(() => usuarios.id, { onDelete: 'set null' }),
    abreEn: timestamp('abre_en', { withTimezone: true }).notNull().defaultNow(),
    cierraEn: timestamp('cierra_en', { withTimezone: true }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [index('votaciones_estado_idx').on(tabla.estado, tabla.cierraEn)],
);

export const opcionesVotacion = pgTable(
  'opciones_votacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    votacionId: uuid('votacion_id')
      .notNull()
      .references(() => votaciones.id, { onDelete: 'cascade' }),
    texto: text('texto').notNull(),
  },
  (tabla) => [index('opciones_votacion_idx').on(tabla.votacionId)],
);

/**
 * Un humano verificado = un voto. El índice único sobre (votacion, usuario) es
 * lo que hace cumplir la regla a nivel de base de datos (spec §2.8).
 */
export const votos = pgTable(
  'votos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    votacionId: uuid('votacion_id')
      .notNull()
      .references(() => votaciones.id, { onDelete: 'cascade' }),
    opcionId: uuid('opcion_id')
      .notNull()
      .references(() => opcionesVotacion.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [uniqueIndex('votos_un_humano_un_voto_idx').on(tabla.votacionId, tabla.usuarioId)],
);

/** Buzón de bugs y sugerencias de la sección Comunidad. */
export const buzon = pgTable(
  'buzon',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    tipo: tipoBuzon('tipo').notNull(),
    texto: text('texto').notNull(),
    estado: estadoBuzon('estado').notNull().default('abierto'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [index('buzon_estado_idx').on(tabla.estado, tabla.creadoEn)],
);

/** Tickets de asistencia técnica de Config → Ayuda (spec §2.9). */
export const tickets = pgTable(
  'tickets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    asunto: text('asunto').notNull(),
    texto: text('texto').notNull(),
    estado: estadoTicket('estado').notNull().default('abierto'),
    respuesta: text('respuesta'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    resueltoEn: timestamp('resuelto_en', { withTimezone: true }),
  },
  (tabla) => [index('tickets_estado_idx').on(tabla.estado, tabla.creadoEn)],
);
