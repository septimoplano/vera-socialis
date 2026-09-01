import { index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { estadoSolicitud, origenConexion } from './enums.js';
import { usuarios } from './usuarios.js';

/**
 * Conexiones (nunca "seguidores"): relación simétrica.
 * Se guarda una sola fila por par, con usuario_menor < usuario_mayor para que
 * el índice único impida duplicados en cualquier orden.
 */
export const conexiones = pgTable(
  'conexiones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioMenor: uuid('usuario_menor')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    usuarioMayor: uuid('usuario_mayor')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    /** La primera conexión de toda cuenta nace del referido (spec §2.1). */
    origen: origenConexion('origen').notNull().default('solicitud'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    uniqueIndex('conexiones_par_idx').on(tabla.usuarioMenor, tabla.usuarioMayor),
    index('conexiones_menor_idx').on(tabla.usuarioMenor),
    index('conexiones_mayor_idx').on(tabla.usuarioMayor),
  ],
);

export const solicitudesConexion = pgTable(
  'solicitudes_conexion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    emisorId: uuid('emisor_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    receptorId: uuid('receptor_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    estado: estadoSolicitud('estado').notNull().default('pendiente'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    resueltoEn: timestamp('resuelto_en', { withTimezone: true }),
  },
  (tabla) => [
    uniqueIndex('solicitudes_par_idx').on(tabla.emisorId, tabla.receptorId),
    index('solicitudes_receptor_idx').on(tabla.receptorId, tabla.estado),
  ],
);
