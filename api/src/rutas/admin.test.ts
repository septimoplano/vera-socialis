import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { construirApp } from '../app.js';
import { cargarEntorno } from '../config.js';
import { crearBaseDatos, type BaseDatos } from '../db/cliente.js';
import { remoteConfig, usuarios, verificaciones } from '../db/esquema/index.js';
import { emitirCodigos } from '../servicios/registro.js';
import { crearAlmacenamientoLocal } from '../servicios/almacenamiento.js';
import { crearValidadorBasico } from '../servicios/selfie.js';

const urlBase = process.env['DATABASE_URL'];
const describeAdmin = urlBase ? describe : describe.skip;

/** JPEG mínimo pero con peso suficiente para pasar el chequeo de tamaño. */
function imagenFalsa(): Buffer {
  const cabecera = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  return Buffer.concat([cabecera, Buffer.alloc(60_000, 0x42)]);
}

function cuerpoMultipart(imagen: Buffer): { payload: Buffer; headers: Record<string, string> } {
  const limite = '----veratest';
  const cabecera = Buffer.from(
    `--${limite}\r\n` +
      `Content-Disposition: form-data; name="selfie"; filename="selfie.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n`,
  );
  const cierre = Buffer.from(`\r\n--${limite}--\r\n`);

  return {
    payload: Buffer.concat([cabecera, imagen, cierre]),
    headers: { 'content-type': `multipart/form-data; boundary=${limite}` },
  };
}

describeAdmin('verificación humana y panel admin', () => {
  let app: FastifyInstance;
  let db: BaseDatos;
  let cerrar: () => Promise<void>;
  let carpeta: string;
  let adminCookie: string;
  let referenteId: string;
  const creados: string[] = [];

  async function crearCuentaPendiente(): Promise<{ id: string; cookie: string }> {
    const [codigo] = await emitirCodigos(db, referenteId, 1);
    const respuesta = await app.inject({
      method: 'POST',
      url: '/auth/registro',
      payload: {
        codigoReferido: codigo,
        nombreUsuario: `pendiente.${randomUUID().slice(0, 8)}`,
        nombre: 'Persona Pendiente',
        clave: 'una clave larga y decente',
      },
    });

    const id = respuesta.json().usuarioId;
    creados.push(id);
    return { id, cookie: String(respuesta.headers['set-cookie']).split(';')[0] ?? '' };
  }

  beforeAll(async () => {
    carpeta = await mkdtemp(join(tmpdir(), 'vera-admin-'));
    const conexion = crearBaseDatos(urlBase!, { maxConexiones: 3 });
    db = conexion.db;
    cerrar = async () => {
      await conexion.cerrar();
    };

    const [admin] = await db
      .insert(usuarios)
      .values({
        nombreUsuario: `admin.${randomUUID().slice(0, 8)}`,
        nombre: 'Fundador',
        rol: 'admin',
        estado: 'activa',
        esHumanoVerificado: true,
        claveHash: null,
      })
      .returning();
    if (!admin) throw new Error('No se creó el admin');
    referenteId = admin.id;
    creados.push(admin.id);

    app = await construirApp({
      entorno: cargarEntorno({ NODE_ENV: 'test', LOG_LEVEL: 'fatal' }),
      db,
      almacenamiento: crearAlmacenamientoLocal(carpeta),
      validadorSelfie: crearValidadorBasico(),
    });

    // Sesión del admin: se arma directo porque no tiene clave.
    const { crearSesion, NOMBRE_COOKIE_SESION } = await import('../servicios/sesiones.js');
    const token = await crearSesion(db, admin.id);
    adminCookie = `${NOMBRE_COOKIE_SESION}=${token}`;
  });

  afterAll(async () => {
    await app.close();
    if (creados.length > 0) {
      await db.delete(usuarios).where(inArray(usuarios.id, creados));
    }
    await cerrar();
    await rm(carpeta, { recursive: true, force: true });
  });

  it('sube una selfie y la deja en cola', async () => {
    const cuenta = await crearCuentaPendiente();
    const { payload, headers } = cuerpoMultipart(imagenFalsa());

    const respuesta = await app.inject({
      method: 'POST',
      url: '/verificacion/selfie',
      headers: { ...headers, cookie: cuenta.cookie },
      payload,
    });

    expect(respuesta.statusCode).toBe(201);
    expect(respuesta.json().estado).toBe('pendiente');
  });

  it('el panel admin no existe para quien no es admin', async () => {
    const cuenta = await crearCuentaPendiente();

    for (const url of ['/admin/verificaciones', '/admin/config', '/admin/resumen']) {
      const respuesta = await app.inject({
        method: 'GET',
        url,
        headers: { cookie: cuenta.cookie },
      });
      expect(respuesta.statusCode).toBe(404);
    }
  });

  it('aprobar una verificación activa la cuenta y le da la medalla', async () => {
    const cuenta = await crearCuentaPendiente();
    const { payload, headers } = cuerpoMultipart(imagenFalsa());
    await app.inject({
      method: 'POST',
      url: '/verificacion/selfie',
      headers: { ...headers, cookie: cuenta.cookie },
      payload,
    });

    const cola = await app.inject({
      method: 'GET',
      url: '/admin/verificaciones',
      headers: { cookie: adminCookie },
    });
    expect(cola.statusCode).toBe(200);

    const pendiente = cola
      .json()
      .verificaciones.find((v: { usuarioId: string }) => v.usuarioId === cuenta.id);
    expect(pendiente).toBeTruthy();
    // La selfie se entrega como URL temporal, nunca como ruta cruda.
    expect(pendiente.selfieUrl).toBeTruthy();

    const aprobacion = await app.inject({
      method: 'POST',
      url: `/admin/verificaciones/${pendiente.id}`,
      headers: { cookie: adminCookie },
      payload: { decision: 'aprobar' },
    });
    expect(aprobacion.statusCode).toBe(200);

    const [actualizado] = await db.select().from(usuarios).where(eq(usuarios.id, cuenta.id));
    expect(actualizado?.estado).toBe('activa');
    expect(actualizado?.esHumanoVerificado).toBe(true);
    expect(actualizado?.verificadoEn).toBeTruthy();
  });

  it('rechazar deja la cuenta sin activar y guarda el motivo', async () => {
    const cuenta = await crearCuentaPendiente();
    const { payload, headers } = cuerpoMultipart(imagenFalsa());
    await app.inject({
      method: 'POST',
      url: '/verificacion/selfie',
      headers: { ...headers, cookie: cuenta.cookie },
      payload,
    });

    const cola = await app.inject({
      method: 'GET',
      url: '/admin/verificaciones',
      headers: { cookie: adminCookie },
    });
    const pendiente = cola
      .json()
      .verificaciones.find((v: { usuarioId: string }) => v.usuarioId === cuenta.id);

    await app.inject({
      method: 'POST',
      url: `/admin/verificaciones/${pendiente.id}`,
      headers: { cookie: adminCookie },
      payload: { decision: 'rechazar', motivo: 'No se distingue el rostro.' },
    });

    const [actualizado] = await db.select().from(usuarios).where(eq(usuarios.id, cuenta.id));
    expect(actualizado?.estado).toBe('pendiente_verificacion');
    expect(actualizado?.esHumanoVerificado).toBe(false);

    const [verificacion] = await db
      .select()
      .from(verificaciones)
      .where(eq(verificaciones.id, pendiente.id));
    expect(verificacion?.estado).toBe('rechazada');
    expect(verificacion?.motivoRechazo).toBe('No se distingue el rostro.');
  });

  it('la persona puede consultar el estado de su verificación', async () => {
    const cuenta = await crearCuentaPendiente();

    const respuesta = await app.inject({
      method: 'GET',
      url: '/verificacion/estado',
      headers: { cookie: cuenta.cookie },
    });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().cuenta).toBe('pendiente_verificacion');
  });

  it('rechaza un archivo que no es imagen sin guardarlo', async () => {
    const cuenta = await crearCuentaPendiente();
    const limite = '----veratest';
    const payload = Buffer.from(
      `--${limite}\r\n` +
        `Content-Disposition: form-data; name="selfie"; filename="doc.pdf"\r\n` +
        `Content-Type: application/pdf\r\n\r\n` +
        'x'.repeat(60_000) +
        `\r\n--${limite}--\r\n`,
    );

    const respuesta = await app.inject({
      method: 'POST',
      url: '/verificacion/selfie',
      headers: { 'content-type': `multipart/form-data; boundary=${limite}`, cookie: cuenta.cookie },
      payload,
    });

    expect(respuesta.statusCode).toBe(422);
    expect(respuesta.json().error).toBe('selfie_rechazada');
  });

  it('deja editar un parámetro normal de la config', async () => {
    const respuesta = await app.inject({
      method: 'PUT',
      url: '/admin/config/PROPAGANDA_EVERY_POSTS',
      headers: { cookie: adminCookie },
      payload: { valor: 25 },
    });

    expect(respuesta.statusCode).toBe(200);

    const [fila] = await db
      .select()
      .from(remoteConfig)
      .where(eq(remoteConfig.clave, 'PROPAGANDA_EVERY_POSTS'));
    expect(fila?.valor).toBe(25);

    // Se deja como estaba para no ensuciar la base compartida.
    await db
      .update(remoteConfig)
      .set({ valor: 30 })
      .where(eq(remoteConfig.clave, 'PROPAGANDA_EVERY_POSTS'));
  });

  it('NO deja tocar la doctrina, ni siendo admin', async () => {
    for (const clave of [
      'SIN_LIKES',
      'PUBLICIDAD_SOLO_EMPRESAS',
      'SCORE_CLASIFICACION_INVISIBLE',
    ]) {
      const respuesta = await app.inject({
        method: 'PUT',
        url: `/admin/config/${clave}`,
        headers: { cookie: adminCookie },
        payload: { valor: false },
      });

      expect(respuesta.statusCode).toBe(403);
      expect(respuesta.json().error).toBe('parametro_de_doctrina');
    }

    const [fila] = await db.select().from(remoteConfig).where(eq(remoteConfig.clave, 'SIN_LIKES'));
    expect(fila?.valor).toBe(true);
  });

  it('el resumen informa el cupo de la beta', async () => {
    const respuesta = await app.inject({
      method: 'GET',
      url: '/admin/resumen',
      headers: { cookie: adminCookie },
    });

    expect(respuesta.statusCode).toBe(200);
    const cuerpo = respuesta.json();
    expect(cuerpo.cupoBeta).toBe(100);
    expect(cuerpo.cuentas).toBeGreaterThan(0);
  });
});
