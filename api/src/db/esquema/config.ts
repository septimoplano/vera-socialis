import { boolean, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Config remota: los parámetros de producto del spec §3 viven acá, no en el
 * código, para poder ajustarlos desde el panel admin sin deploy.
 *
 * `es_doctrina` marca lo que NO se toca ni desde el admin: la existencia del
 * tope, la ausencia de likes, las clasificaciones invisibles, la publicidad
 * solo en Empresas, y que el stop scrolling y la ráfaga ansiosa existan.
 */
export const remoteConfig = pgTable('remote_config', {
  clave: text('clave').primaryKey(),
  valor: jsonb('valor').notNull(),
  descripcion: text('descripcion').notNull(),
  esDoctrina: boolean('es_doctrina').notNull().default(false),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
});
