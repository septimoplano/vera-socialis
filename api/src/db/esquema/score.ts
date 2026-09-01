import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tipoEventoScore } from './enums.js';
import { usuarios } from './usuarios.js';

/**
 * Bitácora auditable del social score. Cada fila deja constancia del delta
 * bruto, el efectivamente aplicado y qué tope lo recortó, para que el panel
 * admin pueda explicar cualquier movimiento (spec §3).
 */
export const scoreEventos = pgTable(
  'score_eventos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    /** La otra persona involucrada: sostiene el tope anti-colusión por par. */
    contraparteId: uuid('contraparte_id').references(() => usuarios.id, { onDelete: 'set null' }),
    tipo: tipoEventoScore('tipo').notNull(),
    deltaBruto: integer('delta_bruto').notNull(),
    deltaAplicado: integer('delta_aplicado').notNull(),
    /** null = sin recorte · 'diario' | 'par' cuando un tope lo limitó. */
    topeAplicado: text('tope_aplicado'),
    referenciaId: uuid('referencia_id'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('score_eventos_usuario_idx').on(tabla.usuarioId, tabla.creadoEn),
    index('score_eventos_par_idx').on(tabla.usuarioId, tabla.contraparteId, tabla.creadoEn),
  ],
);

/** Traducción del número interno al nivel cualitativo que se ve en el perfil. */
export const niveles = pgTable(
  'niveles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orden: integer('orden').notNull(),
    nombre: text('nombre').notNull(),
    umbral: integer('umbral').notNull(),
  },
  (tabla) => [uniqueIndex('niveles_orden_idx').on(tabla.orden)],
);
