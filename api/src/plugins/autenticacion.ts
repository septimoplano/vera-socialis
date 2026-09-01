import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { BaseDatos } from '../db/cliente.js';
import {
  NOMBRE_COOKIE_SESION,
  usuarioDeSesion,
  type UsuarioSesion,
} from '../servicios/sesiones.js';

declare module 'fastify' {
  interface FastifyRequest {
    usuario: UsuarioSesion | null;
  }
  interface FastifyInstance {
    exigirSesion: (peticion: FastifyRequest, respuesta: FastifyReply) => Promise<void>;
    exigirCuentaActiva: (peticion: FastifyRequest, respuesta: FastifyReply) => Promise<void>;
    exigirAdmin: (peticion: FastifyRequest, respuesta: FastifyReply) => Promise<void>;
  }
}

export interface OpcionesAutenticacion {
  db: BaseDatos;
}

async function plugin(app: FastifyInstance, opciones: OpcionesAutenticacion): Promise<void> {
  app.decorateRequest('usuario', null);

  // Resolver la sesión una sola vez por petición.
  app.addHook('onRequest', async (peticion) => {
    const token = peticion.cookies[NOMBRE_COOKIE_SESION];
    peticion.usuario = await usuarioDeSesion(opciones.db, token);
  });

  app.decorate('exigirSesion', async (peticion: FastifyRequest, respuesta: FastifyReply) => {
    if (!peticion.usuario) {
      await respuesta.code(401).send({ error: 'sin_sesion', mensaje: 'Necesitas iniciar sesión.' });
    }
  });

  /**
   * Una cuenta recién creada existe pero todavía no participa: espera la
   * aprobación de su verificación humana (spec §2.1). Puede ver su estado y
   * cerrar sesión, nada más.
   */
  app.decorate('exigirCuentaActiva', async (peticion: FastifyRequest, respuesta: FastifyReply) => {
    if (!peticion.usuario) {
      await respuesta.code(401).send({ error: 'sin_sesion', mensaje: 'Necesitas iniciar sesión.' });
      return;
    }

    if (peticion.usuario.estado !== 'activa') {
      await respuesta.code(403).send({
        error: 'cuenta_no_activa',
        estado: peticion.usuario.estado,
        mensaje:
          peticion.usuario.estado === 'pendiente_verificacion'
            ? 'Tu cuenta espera la revisión de tu verificación humana.'
            : 'Tu cuenta está suspendida.',
      });
    }
  });

  app.decorate('exigirAdmin', async (peticion: FastifyRequest, respuesta: FastifyReply) => {
    if (!peticion.usuario || peticion.usuario.rol !== 'admin') {
      // Mismo 404 que una ruta inexistente: el panel admin no se anuncia.
      await respuesta.code(404).send({ error: 'no_encontrado' });
    }
  });
}

export const pluginAutenticacion = fp(plugin, { name: 'autenticacion' });
