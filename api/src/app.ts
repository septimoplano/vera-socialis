import Fastify, { type FastifyInstance } from 'fastify';
import type { Entorno } from './config.js';
import { registrarRutasSalud } from './rutas/salud.js';

export interface OpcionesApp {
  entorno: Entorno;
}

/**
 * Fábrica de la app. Se construye sin escuchar puerto para que los tests
 * la levanten con `app.inject()` sin abrir sockets.
 */
export async function construirApp({ entorno }: OpcionesApp): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      entorno.NODE_ENV === 'test'
        ? false
        : {
            level: entorno.LOG_LEVEL,
            // Nunca loguear ciphertext, material de clave ni PII (spec §8).
            redact: ['req.headers.authorization', 'req.headers.cookie'],
          },
  });

  await app.register(registrarRutasSalud);

  return app;
}
