import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import type { Entorno } from './config.js';
import type { BaseDatos } from './db/cliente.js';
import { pluginAutenticacion } from './plugins/autenticacion.js';
import { registrarRutasSalud } from './rutas/salud.js';
import { registrarRutasAuth } from './rutas/auth.js';
import { registrarRutasVerificacion } from './rutas/verificacion.js';
import { registrarRutasAdmin } from './rutas/admin.js';
import type { Almacenamiento } from './servicios/almacenamiento.js';
import type { ValidadorSelfie } from './servicios/selfie.js';

export interface OpcionesApp {
  entorno: Entorno;
  /** Sin base de datos la app levanta igual, pero solo con la sonda de salud. */
  db?: BaseDatos;
  almacenamiento?: Almacenamiento;
  validadorSelfie?: ValidadorSelfie;
  /**
   * Los tests apagan el rate limiting: si no, la propia suite se autobloquea al
   * registrar varias cuentas seguidas. El límite tiene su test dedicado, que
   * levanta una app con esto en true.
   */
  limitarPeticiones?: boolean;
}

/**
 * Fábrica de la app. Se construye sin escuchar puerto para que los tests
 * la levanten con `app.inject()` sin abrir sockets.
 */
export async function construirApp({
  entorno,
  db,
  almacenamiento,
  validadorSelfie,
  limitarPeticiones = entorno.NODE_ENV !== 'test',
}: OpcionesApp): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      entorno.NODE_ENV === 'test'
        ? false
        : {
            level: entorno.LOG_LEVEL,
            // Nunca loguear ciphertext, material de clave ni PII (spec §8).
            redact: ['req.headers.authorization', 'req.headers.cookie'],
          },
    trustProxy: entorno.NODE_ENV === 'production',
  });

  await app.register(cookie, { secret: entorno.COOKIE_SECRET });

  await app.register(multipart, {
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  });

  if (limitarPeticiones) {
    await app.register(rateLimit, {
      global: false,
      max: 120,
      timeWindow: '1 minute',
    });
  }

  await app.register(registrarRutasSalud);

  if (db) {
    await app.register(pluginAutenticacion, { db });
    await app.register(registrarRutasAuth, {
      db,
      produccion: entorno.NODE_ENV === 'production',
      webauthn: {
        rpID: entorno.WEBAUTHN_RP_ID,
        origen: entorno.WEBAUTHN_ORIGEN,
        nombreApp: 'VERA SOCIALIS',
      },
    });

    if (almacenamiento && validadorSelfie) {
      await app.register(registrarRutasVerificacion, {
        db,
        almacenamiento,
        validador: validadorSelfie,
      });
      await app.register(registrarRutasAdmin, { db, almacenamiento });
    }
  }

  return app;
}
