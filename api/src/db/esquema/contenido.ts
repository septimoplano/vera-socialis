import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { ambitoPublicacion, estadoPublicacion, sentimiento, tipoPieza } from './enums.js';
import { usuarios } from './usuarios.js';

export const categorias = pgTable(
  'categorias',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    orden: integer('orden').notNull().default(0),
    /** La categoría Empresas es la ÚNICA con publicidad (doctrina spec §2.5). */
    esEmpresas: boolean('es_empresas').notNull().default(false),
    activa: boolean('activa').notNull().default(true),
  },
  (tabla) => [uniqueIndex('categorias_slug_idx').on(tabla.slug)],
);

export const publicaciones = pgTable(
  'publicaciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    autorId: uuid('autor_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    /** perfil = solo conexiones · mundial = foro de una categoría (spec §2.2 y §2.5). */
    ambito: ambitoPublicacion('ambito').notNull(),
    categoriaId: uuid('categoria_id').references(() => categorias.id, { onDelete: 'set null' }),
    texto: text('texto').notNull(),
    media: jsonb('media').$type<{ r2Key: string; tipo: string }[]>(),
    estado: estadoPublicacion('estado').notNull().default('visible'),
    /** Se llena cuando la moderación la baja (categoría incorrecta, etc.). */
    motivoBaja: text('motivo_baja'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('publicaciones_autor_idx').on(tabla.autorId, tabla.creadoEn),
    index('publicaciones_categoria_idx').on(tabla.categoriaId, tabla.estado, tabla.creadoEn),
    index('publicaciones_ambito_idx').on(tabla.ambito, tabla.creadoEn),
  ],
);

/** No existen likes: la interacción con una publicación es el comentario (spec §2.6). */
export const comentarios = pgTable(
  'comentarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicacionId: uuid('publicacion_id')
      .notNull()
      .references(() => publicaciones.id, { onDelete: 'cascade' }),
    autorId: uuid('autor_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    texto: text('texto').notNull(),
    /**
     * Clasificación IA hacia quien publica. NUNCA se expone al autor del
     * comentario: no debe salir en ninguna respuesta de la API (doctrina §11).
     */
    sentimiento: sentimiento('sentimiento').notNull().default('pendiente'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [
    index('comentarios_publicacion_idx').on(tabla.publicacionId, tabla.creadoEn),
    index('comentarios_autor_idx').on(tabla.autorId, tabla.creadoEn),
  ],
);

export const guardados = pgTable(
  'guardados',
  {
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    publicacionId: uuid('publicacion_id')
      .notNull()
      .references(() => publicaciones.id, { onDelete: 'cascade' }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [primaryKey({ columns: [tabla.usuarioId, tabla.publicacionId] })],
);

export const menciones = pgTable(
  'menciones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicacionId: uuid('publicacion_id').references(() => publicaciones.id, {
      onDelete: 'cascade',
    }),
    comentarioId: uuid('comentario_id').references(() => comentarios.id, { onDelete: 'cascade' }),
    mencionadoId: uuid('mencionado_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [index('menciones_mencionado_idx').on(tabla.mencionadoId, tabla.creadoEn)],
);

/** Ban temporal de posteo por publicar en categoría incorrecta (spec §2.5). */
export const bansPosteo = pgTable(
  'bans_posteo',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    usuarioId: uuid('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    motivo: text('motivo').notNull(),
    publicacionId: uuid('publicacion_id').references(() => publicaciones.id, {
      onDelete: 'set null',
    }),
    hasta: timestamp('hasta', { withTimezone: true }).notNull(),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [index('bans_posteo_usuario_idx').on(tabla.usuarioId, tabla.hasta)],
);

/**
 * Piezas propias de VERA: la propaganda de concientización que se intercala cada
 * PROPAGANDA_EVERY_POSTS y los videos de 30 s del stop scrolling (spec §2.5 y §2.11).
 */
export const piezasConcientizacion = pgTable(
  'piezas_concientizacion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tipo: tipoPieza('tipo').notNull(),
    titulo: text('titulo').notNull(),
    texto: text('texto'),
    mediaR2Key: text('media_r2_key'),
    duracionS: integer('duracion_s'),
    orden: integer('orden').notNull().default(0),
    activa: boolean('activa').notNull().default(true),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabla) => [index('piezas_tipo_idx').on(tabla.tipo, tabla.activa, tabla.orden)],
);
