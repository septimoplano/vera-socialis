import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { estadoCuenta, estadoVerificacion, rolUsuario, segmentoEmpresa } from './enums.js';

export const usuarios = pgTable(
  'usuarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nombreUsuario: text('nombre_usuario').notNull(),
    nombre: text('nombre').notNull(),
    bio: text('bio'),
    fotoR2Key: text('foto_r2_key'),
    bannerR2Key: text('banner_r2_key'),
    rol: rolUsuario('rol').notNull().default('persona'),
    estado: estadoCuenta('estado').notNull().default('pendiente_verificacion'),

    /**
     * Único dato de identidad que se guarda: el HECHO de ser humano verificado.
     * Nunca documentos ni plantillas biométricas (spec §8).
     */
    esHumanoVerificado: boolean('es_humano_verificado').notNull().default(false),
    verificadoEn: timestamp('verificado_en', { withTimezone: true }),

    /** Público = todo visible como si hubiera conexión; se cambia cuando quiera (spec §2.2). */
    perfilPublico: boolean('perfil_publico').notNull().default(true),

    /** Numérico interno; en el perfil solo se muestra el nivel cualitativo (spec §2.6). */
    scoreActual: integer('score_actual').notNull().default(0),

    referidoPor: uuid('referido_por'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    uniqueIndex('usuarios_nombre_usuario_idx').on(tabla.nombreUsuario),
    index('usuarios_estado_idx').on(tabla.estado),
  ],
);

export const usuariosRelaciones = relations(usuarios, ({ one }) => ({
  referente: one(usuarios, {
    fields: [usuarios.referidoPor],
    references: [usuarios.id],
    relationName: 'referente',
  }),
}));

/** Passkeys WebAuthn. La biometría nunca sale del dispositivo (spec §8). */
export const credencialesWebauthn = pgTable(
  'credenciales_webauthn',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    credentialId: text('credential_id').notNull(),
    clavePublica: text('clave_publica').notNull(),
    contador: integer('contador').notNull().default(0),
    transportes: jsonb('transportes').$type<string[]>(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    usadoEn: timestamp('usado_en', { withTimezone: true }),
  },
  (tabla) => [
    uniqueIndex('credenciales_webauthn_credential_id_idx').on(tabla.credentialId),
    index('credenciales_webauthn_usuario_idx').on(tabla.usuarioId),
  ],
);

/**
 * Cola de verificación humana. La selfie va cifrada en R2 y se borra a pedido;
 * el algoritmo solo pre-filtra, la decisión final es manual (spec §2.1).
 */
export const verificaciones = pgTable(
  'verificaciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    selfieR2Key: text('selfie_r2_key'),
    resultadoAlgoritmo: jsonb('resultado_algoritmo').$type<Record<string, unknown>>(),
    estado: estadoVerificacion('estado').notNull().default('pendiente'),
    motivoRechazo: text('motivo_rechazo'),
    revisadoPor: uuid('revisado_por').references(() => usuarios.id, { onDelete: 'set null' }),
    revisadoEn: timestamp('revisado_en', { withTimezone: true }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [index('verificaciones_estado_idx').on(tabla.estado)],
);

/** Crear cuenta exige un código de referido válido: es excluyente (spec §2.1). */
export const codigosReferido = pgTable(
  'codigos_referido',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codigo: text('codigo').notNull(),
    emisorId: uuid('emisor_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    usadoPor: uuid('usado_por').references(() => usuarios.id, { onDelete: 'set null' }),
    usadoEn: timestamp('usado_en', { withTimezone: true }),
    expiraEn: timestamp('expira_en', { withTimezone: true }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    uniqueIndex('codigos_referido_codigo_idx').on(tabla.codigo),
    index('codigos_referido_emisor_idx').on(tabla.emisorId),
  ],
);

export const sesiones = pgTable(
  'sesiones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    /** Solo el hash del token; el valor plano vive en la cookie httpOnly. */
    tokenHash: text('token_hash').notNull(),
    expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    uniqueIndex('sesiones_token_hash_idx').on(tabla.tokenHash),
    index('sesiones_usuario_idx').on(tabla.usuarioId),
  ],
);

/** Perfiles de empresa: publican solo en la categoría Empresas y no inician chats (spec §2.3). */
export const empresas = pgTable('empresas', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  razonSocial: text('razon_social').notNull(),
  segmento: segmentoEmpresa('segmento').notNull(),
  sitioWeb: text('sitio_web'),
  /** El cobro llega post-beta; en beta se crean a mano sin cobro (spec §1). */
  suscripcionActiva: boolean('suscripcion_activa').notNull().default(false),
  creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
});
