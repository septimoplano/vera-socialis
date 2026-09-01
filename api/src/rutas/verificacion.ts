import type { FastifyInstance } from 'fastify';
import { desc, eq } from 'drizzle-orm';
import type { BaseDatos } from '../db/cliente.js';
import { verificaciones } from '../db/esquema/index.js';
import { claveSelfie, type Almacenamiento } from '../servicios/almacenamiento.js';
import type { ValidadorSelfie } from '../servicios/selfie.js';

export interface OpcionesRutasVerificacion {
  db: BaseDatos;
  almacenamiento: Almacenamiento;
  validador: ValidadorSelfie;
}

export async function registrarRutasVerificacion(
  app: FastifyInstance,
  opciones: OpcionesRutasVerificacion,
): Promise<void> {
  const { db, almacenamiento, validador } = opciones;

  /**
   * Subir la selfie de registro. Pasa por el pre-filtro algorítmico y queda en
   * cola: la decisión final es del fundador (spec §2.1).
   */
  app.post(
    '/verificacion/selfie',
    {
      onRequest: [app.exigirSesion],
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    },
    async (peticion, respuesta) => {
      const archivo = await peticion.file();
      if (!archivo) {
        return respuesta.code(400).send({ error: 'falta_imagen' });
      }

      const imagen = await archivo.toBuffer();
      const resultado = await validador.validar(imagen, archivo.mimetype);

      if (!resultado.aceptable) {
        // Ni siquiera se guarda: no tiene sentido almacenar lo que ya se descartó.
        return respuesta.code(422).send({
          error: 'selfie_rechazada',
          mensaje: resultado.motivo,
        });
      }

      const clave = claveSelfie(peticion.usuario!.id);
      await almacenamiento.guardar(clave, imagen, archivo.mimetype);

      const [verificacion] = await db
        .insert(verificaciones)
        .values({
          usuarioId: peticion.usuario!.id,
          selfieR2Key: clave,
          estado: 'pendiente',
          resultadoAlgoritmo: {
            motivo: resultado.motivo,
            requiereRevisionHumana: resultado.requiereRevisionHumana,
            ...resultado.detalle,
          },
        })
        .returning({ id: verificaciones.id });

      return respuesta.code(201).send({
        verificacionId: verificacion?.id,
        estado: 'pendiente',
        mensaje: 'Recibimos tu foto. Te avisamos cuando revisemos tu verificación.',
      });
    },
  );

  /** Estado de mi verificación. Accesible con la cuenta aún pendiente. */
  app.get(
    '/verificacion/estado',
    { onRequest: [app.exigirSesion] },
    async (peticion, respuesta) => {
      const [ultima] = await db
        .select({
          estado: verificaciones.estado,
          motivoRechazo: verificaciones.motivoRechazo,
          creadoEn: verificaciones.creadoEn,
          revisadoEn: verificaciones.revisadoEn,
        })
        .from(verificaciones)
        .where(eq(verificaciones.usuarioId, peticion.usuario!.id))
        .orderBy(desc(verificaciones.creadoEn))
        .limit(1);

      return respuesta.send({
        cuenta: peticion.usuario!.estado,
        verificacion: ultima ?? null,
      });
    },
  );
}
