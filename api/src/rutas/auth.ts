import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { BaseDatos } from '../db/cliente.js';
import { usuarios } from '../db/esquema/index.js';
import { verificarClave } from '../servicios/claves.js';
import {
  ErrorRegistro,
  buscarPorNombreUsuario,
  codigosDisponibles,
  emitirCodigos,
  registrarUsuario,
} from '../servicios/registro.js';
import {
  NOMBRE_COOKIE_SESION,
  cerrarSesion,
  cerrarTodasLasSesiones,
  crearSesion,
  opcionesCookie,
} from '../servicios/sesiones.js';
import {
  opcionesLoginPasskey,
  opcionesRegistroPasskey,
  verificarLoginPasskey,
  verificarRegistroPasskey,
  type ContextoWebauthn,
} from '../servicios/webauthn.js';

const esquemaRegistro = z.object({
  codigoReferido: z.string().min(4).max(32),
  nombreUsuario: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9._]+$/, 'Solo letras, números, punto y guion bajo.'),
  nombre: z.string().min(2).max(80),
  clave: z.string().min(10).max(200),
});

const esquemaLogin = z.object({
  nombreUsuario: z.string().min(1).max(30),
  clave: z.string().min(1).max(200),
});

const esquemaVerificarPasskey = z.object({
  reto: z.string().min(10),
  respuesta: z.record(z.unknown()),
});

export interface OpcionesRutasAuth {
  db: BaseDatos;
  webauthn: ContextoWebauthn;
  produccion: boolean;
}

export async function registrarRutasAuth(
  app: FastifyInstance,
  opciones: OpcionesRutasAuth,
): Promise<void> {
  const { db, webauthn, produccion } = opciones;
  const cookie = opcionesCookie(produccion);

  /**
   * Registro. Exige código de referido válido; la cuenta nace pendiente de que
   * el fundador apruebe la verificación humana (spec §2.1).
   */
  app.post(
    '/auth/registro',
    { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
    async (peticion, respuesta) => {
      const datos = esquemaRegistro.safeParse(peticion.body);
      if (!datos.success) {
        return respuesta.code(400).send({
          error: 'datos_invalidos',
          detalle: datos.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        });
      }

      try {
        const resultado = await registrarUsuario(db, datos.data);
        const token = await crearSesion(db, resultado.usuarioId);

        return respuesta.setCookie(NOMBRE_COOKIE_SESION, token, cookie).code(201).send({
          usuarioId: resultado.usuarioId,
          estado: 'pendiente_verificacion',
          verificacionId: resultado.verificacionId,
          mensaje:
            'Cuenta creada. Falta tu verificación humana para que puedas participar. Ya quedaste conectado con quien te invitó.',
        });
      } catch (error) {
        if (error instanceof ErrorRegistro) {
          return respuesta.code(409).send({ error: error.codigo, mensaje: error.message });
        }
        throw error;
      }
    },
  );

  app.post(
    '/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (peticion, respuesta) => {
      const datos = esquemaLogin.safeParse(peticion.body);
      if (!datos.success) {
        return respuesta.code(400).send({ error: 'datos_invalidos' });
      }

      const usuario = await buscarPorNombreUsuario(db, datos.data.nombreUsuario);

      // Mismo mensaje si el usuario no existe o si la clave está mala:
      // no se le confirma a nadie qué cuentas existen.
      const credencialesMalas = { error: 'credenciales_invalidas' as const };

      if (!usuario?.claveHash) return respuesta.code(401).send(credencialesMalas);
      if (!(await verificarClave(usuario.claveHash, datos.data.clave))) {
        return respuesta.code(401).send(credencialesMalas);
      }
      if (usuario.estado === 'suspendida') {
        return respuesta.code(403).send({ error: 'cuenta_suspendida' });
      }

      const token = await crearSesion(db, usuario.id);

      return respuesta.setCookie(NOMBRE_COOKIE_SESION, token, cookie).send({
        usuarioId: usuario.id,
        nombreUsuario: usuario.nombreUsuario,
        estado: usuario.estado,
      });
    },
  );

  app.post('/auth/salir', async (peticion, respuesta) => {
    await cerrarSesion(db, peticion.cookies[NOMBRE_COOKIE_SESION]);
    return respuesta.clearCookie(NOMBRE_COOKIE_SESION, { path: '/' }).send({ ok: true });
  });

  app.post(
    '/auth/salir-de-todos',
    { onRequest: [app.exigirSesion] },
    async (peticion, respuesta) => {
      await cerrarTodasLasSesiones(db, peticion.usuario!.id);
      return respuesta.clearCookie(NOMBRE_COOKIE_SESION, { path: '/' }).send({ ok: true });
    },
  );

  app.get('/auth/yo', async (peticion, respuesta) => {
    if (!peticion.usuario) return respuesta.code(401).send({ error: 'sin_sesion' });
    return respuesta.send({ usuario: peticion.usuario });
  });

  // ── Passkeys ───────────────────────────────────────────────────────────────

  app.post(
    '/auth/passkey/registro/opciones',
    { onRequest: [app.exigirSesion] },
    async (peticion, respuesta) => {
      const opcionesPasskey = await opcionesRegistroPasskey(db, webauthn, peticion.usuario!);
      return respuesta.send(opcionesPasskey);
    },
  );

  app.post(
    '/auth/passkey/registro/verificar',
    { onRequest: [app.exigirSesion] },
    async (peticion, respuesta) => {
      const datos = esquemaVerificarPasskey.safeParse(peticion.body);
      if (!datos.success) return respuesta.code(400).send({ error: 'datos_invalidos' });

      const ok = await verificarRegistroPasskey(
        db,
        webauthn,
        peticion.usuario!.id,
        // El tipo exacto lo valida @simplewebauthn al verificar.
        datos.data.respuesta as never,
        datos.data.reto,
      );

      if (!ok) return respuesta.code(400).send({ error: 'passkey_no_verificada' });
      return respuesta.send({ ok: true });
    },
  );

  app.post(
    '/auth/passkey/login/opciones',
    { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } },
    async (_peticion, respuesta) => {
      return respuesta.send(await opcionesLoginPasskey(db, webauthn));
    },
  );

  app.post(
    '/auth/passkey/login/verificar',
    { config: { rateLimit: { max: 20, timeWindow: '15 minutes' } } },
    async (peticion, respuesta) => {
      const datos = esquemaVerificarPasskey.safeParse(peticion.body);
      if (!datos.success) return respuesta.code(400).send({ error: 'datos_invalidos' });

      const resultado = await verificarLoginPasskey(
        db,
        webauthn,
        datos.data.respuesta as never,
        datos.data.reto,
      );

      if (!resultado.ok || !resultado.usuarioId) {
        return respuesta.code(401).send({ error: 'credenciales_invalidas' });
      }

      const [usuario] = await db
        .select({ estado: usuarios.estado, nombreUsuario: usuarios.nombreUsuario })
        .from(usuarios)
        .where(eq(usuarios.id, resultado.usuarioId))
        .limit(1);

      if (usuario?.estado === 'suspendida') {
        return respuesta.code(403).send({ error: 'cuenta_suspendida' });
      }

      const token = await crearSesion(db, resultado.usuarioId);

      return respuesta.setCookie(NOMBRE_COOKIE_SESION, token, cookie).send({
        usuarioId: resultado.usuarioId,
        nombreUsuario: usuario?.nombreUsuario,
        estado: usuario?.estado,
      });
    },
  );

  // ── Códigos de referido ────────────────────────────────────────────────────

  app.get('/auth/codigos', { onRequest: [app.exigirCuentaActiva] }, async (peticion, respuesta) => {
    const codigos = await codigosDisponibles(db, peticion.usuario!.id);
    return respuesta.send({
      codigos: codigos.map((c) => ({ codigo: c.codigo, usado: c.usadoPor !== null })),
    });
  });

  app.post('/auth/codigos', { onRequest: [app.exigirAdmin] }, async (peticion, respuesta) => {
    const datos = z
      .object({ cantidad: z.number().int().min(1).max(50) })
      .safeParse(peticion.body ?? {});

    if (!datos.success) return respuesta.code(400).send({ error: 'datos_invalidos' });

    const generados = await emitirCodigos(db, peticion.usuario!.id, datos.data.cantidad);
    return respuesta.code(201).send({ codigos: generados });
  });
}
