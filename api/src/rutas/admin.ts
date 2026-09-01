import type { FastifyInstance } from 'fastify';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { BaseDatos } from '../db/cliente.js';
import {
  buzon,
  remoteConfig,
  scoreEventos,
  tickets,
  usuarios,
  verificaciones,
} from '../db/esquema/index.js';
import type { Almacenamiento } from '../servicios/almacenamiento.js';

export interface OpcionesRutasAdmin {
  db: BaseDatos;
  almacenamiento: Almacenamiento;
}

/**
 * Panel del fundador. Todas las rutas exigen rol admin y responden 404 a
 * cualquier otro: el panel no confirma su existencia (spec §8).
 */
export async function registrarRutasAdmin(
  app: FastifyInstance,
  opciones: OpcionesRutasAdmin,
): Promise<void> {
  const { db, almacenamiento } = opciones;

  app.addHook('onRequest', app.exigirAdmin);

  // ── Cola de verificación humana ────────────────────────────────────────────

  app.get('/admin/verificaciones', async (peticion, respuesta) => {
    const filtro = z
      .object({ estado: z.enum(['pendiente', 'aprobada', 'rechazada']).default('pendiente') })
      .safeParse(peticion.query);

    const estado = filtro.success ? filtro.data.estado : 'pendiente';

    const filas = await db
      .select({
        id: verificaciones.id,
        estado: verificaciones.estado,
        resultadoAlgoritmo: verificaciones.resultadoAlgoritmo,
        creadoEn: verificaciones.creadoEn,
        selfieR2Key: verificaciones.selfieR2Key,
        usuarioId: usuarios.id,
        nombreUsuario: usuarios.nombreUsuario,
        nombre: usuarios.nombre,
        referidoPor: usuarios.referidoPor,
      })
      .from(verificaciones)
      .innerJoin(usuarios, eq(verificaciones.usuarioId, usuarios.id))
      .where(eq(verificaciones.estado, estado))
      .orderBy(desc(verificaciones.creadoEn))
      .limit(100);

    // La selfie se entrega como URL temporal, nunca como ruta permanente.
    const conUrl = await Promise.all(
      filas.map(async ({ selfieR2Key, ...fila }) => ({
        ...fila,
        selfieUrl: selfieR2Key ? await almacenamiento.urlTemporal(selfieR2Key, 300) : null,
      })),
    );

    return respuesta.send({ verificaciones: conUrl });
  });

  const esquemaResolucion = z.object({
    decision: z.enum(['aprobar', 'rechazar']),
    motivo: z.string().max(500).optional(),
  });

  /**
   * Aprobar activa la cuenta y le pone la medalla de humano verificado.
   * Rechazar la deja pendiente para que pueda intentar de nuevo.
   */
  app.post('/admin/verificaciones/:id', async (peticion, respuesta) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(peticion.params);
    const cuerpo = esquemaResolucion.safeParse(peticion.body);

    if (!params.success || !cuerpo.success) {
      return respuesta.code(400).send({ error: 'datos_invalidos' });
    }

    const [verificacion] = await db
      .select()
      .from(verificaciones)
      .where(and(eq(verificaciones.id, params.data.id), eq(verificaciones.estado, 'pendiente')))
      .limit(1);

    if (!verificacion) return respuesta.code(404).send({ error: 'no_encontrada' });

    const aprobada = cuerpo.data.decision === 'aprobar';

    await db.transaction(async (tx) => {
      await tx
        .update(verificaciones)
        .set({
          estado: aprobada ? 'aprobada' : 'rechazada',
          motivoRechazo: aprobada ? null : (cuerpo.data.motivo ?? 'Sin motivo indicado.'),
          revisadoPor: peticion.usuario!.id,
          revisadoEn: new Date(),
        })
        .where(eq(verificaciones.id, verificacion.id));

      if (aprobada) {
        await tx
          .update(usuarios)
          .set({
            estado: 'activa',
            esHumanoVerificado: true,
            verificadoEn: new Date(),
            actualizadoEn: new Date(),
          })
          .where(eq(usuarios.id, verificacion.usuarioId));
      }
    });

    return respuesta.send({ ok: true, estado: aprobada ? 'aprobada' : 'rechazada' });
  });

  /** Borrar la selfie: se guarda solo mientras hace falta para revisarla (spec §8). */
  app.delete('/admin/verificaciones/:id/selfie', async (peticion, respuesta) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(peticion.params);
    if (!params.success) return respuesta.code(400).send({ error: 'datos_invalidos' });

    const [verificacion] = await db
      .select()
      .from(verificaciones)
      .where(eq(verificaciones.id, params.data.id))
      .limit(1);

    if (!verificacion?.selfieR2Key) return respuesta.code(404).send({ error: 'no_encontrada' });

    await almacenamiento.borrar(verificacion.selfieR2Key);
    await db
      .update(verificaciones)
      .set({ selfieR2Key: null })
      .where(eq(verificaciones.id, verificacion.id));

    return respuesta.send({ ok: true });
  });

  // ── Config remota ──────────────────────────────────────────────────────────

  app.get('/admin/config', async (_peticion, respuesta) => {
    const filas = await db.select().from(remoteConfig).orderBy(remoteConfig.clave);
    return respuesta.send({ config: filas });
  });

  /**
   * Editar un parámetro. La doctrina no se toca: ni desde acá (spec §3).
   */
  app.put('/admin/config/:clave', async (peticion, respuesta) => {
    const params = z.object({ clave: z.string().min(1).max(64) }).safeParse(peticion.params);
    const cuerpo = z.object({ valor: z.unknown() }).safeParse(peticion.body);

    if (!params.success || !cuerpo.success) {
      return respuesta.code(400).send({ error: 'datos_invalidos' });
    }

    const [parametro] = await db
      .select()
      .from(remoteConfig)
      .where(eq(remoteConfig.clave, params.data.clave))
      .limit(1);

    if (!parametro) return respuesta.code(404).send({ error: 'parametro_desconocido' });

    if (parametro.esDoctrina) {
      return respuesta.code(403).send({
        error: 'parametro_de_doctrina',
        mensaje: 'Este parámetro es doctrina del producto y no se edita desde el panel.',
      });
    }

    await db
      .update(remoteConfig)
      .set({ valor: cuerpo.data.valor, actualizadoEn: new Date() })
      .where(eq(remoteConfig.clave, parametro.clave));

    return respuesta.send({ ok: true, clave: parametro.clave, valor: cuerpo.data.valor });
  });

  // ── Buzón y tickets ────────────────────────────────────────────────────────

  app.get('/admin/buzon', async (_peticion, respuesta) => {
    const filas = await db
      .select({
        id: buzon.id,
        tipo: buzon.tipo,
        texto: buzon.texto,
        estado: buzon.estado,
        creadoEn: buzon.creadoEn,
        nombreUsuario: usuarios.nombreUsuario,
      })
      .from(buzon)
      .innerJoin(usuarios, eq(buzon.usuarioId, usuarios.id))
      .orderBy(desc(buzon.creadoEn))
      .limit(100);

    return respuesta.send({ buzon: filas });
  });

  app.get('/admin/tickets', async (_peticion, respuesta) => {
    const filas = await db
      .select({
        id: tickets.id,
        asunto: tickets.asunto,
        texto: tickets.texto,
        estado: tickets.estado,
        creadoEn: tickets.creadoEn,
        nombreUsuario: usuarios.nombreUsuario,
      })
      .from(tickets)
      .innerJoin(usuarios, eq(tickets.usuarioId, usuarios.id))
      .orderBy(desc(tickets.creadoEn))
      .limit(100);

    return respuesta.send({ tickets: filas });
  });

  // ── Auditoría del social score ─────────────────────────────────────────────

  /**
   * Bitácora de movimientos de score. Sirve para explicar por qué cambió el
   * nivel de alguien y para detectar intentos de inflarlo entre dos cuentas.
   */
  app.get('/admin/score/eventos', async (peticion, respuesta) => {
    const filtro = z
      .object({ usuarioId: z.string().uuid().optional() })
      .safeParse(peticion.query ?? {});

    const consulta = db
      .select({
        id: scoreEventos.id,
        tipo: scoreEventos.tipo,
        deltaBruto: scoreEventos.deltaBruto,
        deltaAplicado: scoreEventos.deltaAplicado,
        topeAplicado: scoreEventos.topeAplicado,
        creadoEn: scoreEventos.creadoEn,
        nombreUsuario: usuarios.nombreUsuario,
      })
      .from(scoreEventos)
      .innerJoin(usuarios, eq(scoreEventos.usuarioId, usuarios.id))
      .orderBy(desc(scoreEventos.creadoEn))
      .limit(200);

    const filas =
      filtro.success && filtro.data.usuarioId
        ? await consulta.where(eq(scoreEventos.usuarioId, filtro.data.usuarioId))
        : await consulta;

    return respuesta.send({ eventos: filas });
  });

  // ── Resumen de la beta ─────────────────────────────────────────────────────

  app.get('/admin/resumen', async (_peticion, respuesta) => {
    const [conteos] = await db
      .select({
        cuentas: sql<number>`count(*)::int`,
        activas: sql<number>`count(*) filter (where ${usuarios.estado} = 'activa')::int`,
        pendientes: sql<number>`count(*) filter (where ${usuarios.estado} = 'pendiente_verificacion')::int`,
        verificadas: sql<number>`count(*) filter (where ${usuarios.esHumanoVerificado})::int`,
      })
      .from(usuarios);

    // La beta es de menos de 100 personas: el número importa (spec §11).
    return respuesta.send({
      ...conteos,
      cupoBeta: 100,
      cupoDisponible: Math.max(0, 100 - (conteos?.cuentas ?? 0)),
    });
  });
}
