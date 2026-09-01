import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { signoReaccion, tipoMensaje } from './enums.js';
import { usuarios } from './usuarios.js';

/**
 * Claves públicas X25519 publicadas por cada dispositivo. El servidor solo
 * distribuye claves PÚBLICAS: el material privado jamás sale del dispositivo
 * y no existe columna donde pudiera guardarse (spec §8).
 * Beta: un dispositivo por usuario.
 */
export const clavesDispositivo = pgTable(
  'claves_dispositivo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    clavePublica: text('clave_publica').notNull(),
    etiquetaDispositivo: text('etiqueta_dispositivo'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    revocadoEn: timestamp('revocado_en', { withTimezone: true }),
  },
  (tabla) => [index('claves_dispositivo_usuario_idx').on(tabla.usuarioId)],
);

export const conversaciones = pgTable('conversaciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  ultimoMensajeEn: timestamp('ultimo_mensaje_en', { withTimezone: true }),
});

export const participantesConversacion = pgTable(
  'participantes_conversacion',
  {
    conversacionId: uuid('conversacion_id')
      .notNull()
      .references(() => conversaciones.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    /** Quién abrió la conversación: una empresa nunca puede ser la iniciadora (spec §2.3). */
    esIniciador: text('es_iniciador'),
    leidoHasta: timestamp('leido_hasta', { withTimezone: true }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    primaryKey({ columns: [tabla.conversacionId, tabla.usuarioId] }),
    index('participantes_usuario_idx').on(tabla.usuarioId),
  ],
);

/**
 * SOLO ciphertext. El servidor es ciego: no hay columna de texto plano ni de
 * material de descifrado, y los logs no registran el contenido (spec §8).
 */
export const mensajes = pgTable(
  'mensajes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversacionId: uuid('conversacion_id')
      .notNull()
      .references(() => conversaciones.id, { onDelete: 'cascade' }),
    autorId: uuid('autor_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    tipo: tipoMensaje('tipo').notNull().default('texto'),
    ciphertext: text('ciphertext').notNull(),
    nonce: text('nonce').notNull(),
    /** Los adjuntos van cifrados a R2; aquí solo la referencia. */
    mediaR2Key: text('media_r2_key'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    entregadoEn: timestamp('entregado_en', { withTimezone: true }),
  },
  (tabla) => [index('mensajes_conversacion_idx').on(tabla.conversacionId, tabla.creadoEn)],
);

/**
 * Reacción positiva/negativa a un mensaje. INVISIBLE para el otro: quien recibe
 * jamás sabe que fue reaccionado ni cómo. Solo alimenta el social score (spec §2.6).
 */
export const reaccionesMensaje = pgTable(
  'reacciones_mensaje',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mensajeId: uuid('mensaje_id')
      .notNull()
      .references(() => mensajes.id, { onDelete: 'cascade' }),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    signo: signoReaccion('signo').notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [uniqueIndex('reacciones_mensaje_unica_idx').on(tabla.mensajeId, tabla.usuarioId)],
);
