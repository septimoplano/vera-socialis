import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { construirApp } from '../app.js';
import { cargarEntorno } from '../config.js';
import { crearBaseDatos, type BaseDatos } from '../db/cliente.js';
import { codigosReferido, conexiones, usuarios, verificaciones } from '../db/esquema/index.js';
import { ordenarPar } from '../db/pares.js';
import { emitirCodigos } from '../servicios/registro.js';

const urlBase = process.env['DATABASE_URL'];
const describeAuth = urlBase ? describe : describe.skip;

describeAuth('rutas de autenticación', () => {
  let app: FastifyInstance;
  let db: BaseDatos;
  let cerrar: () => Promise<void>;
  let referenteId: string;
  const creados: string[] = [];

  /** Cada test usa su propio código: quemar uno no debe afectar a los demás. */
  async function codigoFresco(): Promise<string> {
    const [codigo] = await emitirCodigos(db, referenteId, 1);
    if (!codigo) throw new Error('No se pudo emitir el código');
    return codigo;
  }

  function datosDe(codigo: string) {
    const sufijo = randomUUID().slice(0, 8);
    return {
      codigoReferido: codigo,
      nombreUsuario: `nuevo.${sufijo}`,
      nombre: 'Persona Nueva',
      clave: 'una clave larga y decente',
    };
  }

  beforeAll(async () => {
    const conexion = crearBaseDatos(urlBase!, { maxConexiones: 3 });
    db = conexion.db;
    cerrar = async () => {
      await conexion.cerrar();
    };

    const [referente] = await db
      .insert(usuarios)
      .values({
        nombreUsuario: `referente.${randomUUID().slice(0, 8)}`,
        nombre: 'Quien Invita',
        estado: 'activa',
        esHumanoVerificado: true,
      })
      .returning();
    if (!referente) throw new Error('No se creó el referente');
    referenteId = referente.id;
    creados.push(referente.id);

    app = await construirApp({
      entorno: cargarEntorno({ NODE_ENV: 'test', LOG_LEVEL: 'fatal' }),
      db,
    });
  });

  afterAll(async () => {
    await app.close();
    if (creados.length > 0) {
      await db.delete(usuarios).where(inArray(usuarios.id, creados));
    }
    await cerrar();
  });

  it('registra con código válido, deja la cuenta pendiente y conecta con quien invitó', async () => {
    const datos = datosDe(await codigoFresco());

    const respuesta = await app.inject({ method: 'POST', url: '/auth/registro', payload: datos });
    expect(respuesta.statusCode).toBe(201);

    const cuerpo = respuesta.json();
    creados.push(cuerpo.usuarioId);

    // La cuenta existe pero todavía no participa: espera la verificación humana.
    expect(cuerpo.estado).toBe('pendiente_verificacion');

    // La primera conexión nace sola (spec §2.1).
    const par = ordenarPar(cuerpo.usuarioId, referenteId);
    const [conexion] = await db
      .select()
      .from(conexiones)
      .where(eq(conexiones.usuarioMenor, par.menor))
      .limit(1);

    expect(conexion?.usuarioMayor).toBe(par.mayor);
    expect(conexion?.origen).toBe('referido');

    // Y queda una verificación en cola para que el fundador la revise.
    const pendientes = await db
      .select()
      .from(verificaciones)
      .where(eq(verificaciones.usuarioId, cuerpo.usuarioId));
    expect(pendientes[0]?.estado).toBe('pendiente');

    // La sesión queda abierta con cookie httpOnly.
    const cookie = respuesta.headers['set-cookie'];
    expect(String(cookie)).toContain('HttpOnly');
  });

  it('no deja crear cuenta sin código de referido válido', async () => {
    const respuesta = await app.inject({
      method: 'POST',
      url: '/auth/registro',
      payload: datosDe('NOEXISTE1'),
    });

    expect(respuesta.statusCode).toBe(409);
    expect(respuesta.json().error).toBe('codigo_invalido');
  });

  it('no permite reusar un código ya quemado', async () => {
    const codigo = await codigoFresco();

    const primera = await app.inject({
      method: 'POST',
      url: '/auth/registro',
      payload: datosDe(codigo),
    });
    expect(primera.statusCode).toBe(201);
    creados.push(primera.json().usuarioId);

    const segunda = await app.inject({
      method: 'POST',
      url: '/auth/registro',
      payload: datosDe(codigo),
    });

    expect(segunda.statusCode).toBe(409);
    expect(segunda.json().error).toBe('codigo_usado');
  });

  it('rechaza un nombre de usuario ya tomado sin quemar el código', async () => {
    const codigo = await codigoFresco();
    const datos = datosDe(codigo);

    const primera = await app.inject({ method: 'POST', url: '/auth/registro', payload: datos });
    expect(primera.statusCode).toBe(201);
    creados.push(primera.json().usuarioId);

    const otroCodigo = await codigoFresco();
    const segunda = await app.inject({
      method: 'POST',
      url: '/auth/registro',
      payload: { ...datos, codigoReferido: otroCodigo },
    });

    expect(segunda.statusCode).toBe(409);
    expect(segunda.json().error).toBe('nombre_usuario_ocupado');

    // El segundo código sigue disponible: la transacción se revirtió entera.
    const [fila] = await db
      .select()
      .from(codigosReferido)
      .where(eq(codigosReferido.codigo, otroCodigo))
      .limit(1);
    expect(fila?.usadoPor).toBeNull();
  });

  it('rechaza claves cortas y nombres de usuario con caracteres raros', async () => {
    const cortita = await app.inject({
      method: 'POST',
      url: '/auth/registro',
      payload: { ...datosDe(await codigoFresco()), clave: 'corta' },
    });
    expect(cortita.statusCode).toBe(400);

    const rara = await app.inject({
      method: 'POST',
      url: '/auth/registro',
      payload: { ...datosDe(await codigoFresco()), nombreUsuario: 'con espacio' },
    });
    expect(rara.statusCode).toBe(400);
  });

  it('inicia sesión con la clave correcta y la rechaza cuando no lo es', async () => {
    const datos = datosDe(await codigoFresco());
    const registro = await app.inject({ method: 'POST', url: '/auth/registro', payload: datos });
    creados.push(registro.json().usuarioId);

    const buena = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { nombreUsuario: datos.nombreUsuario, clave: datos.clave },
    });
    expect(buena.statusCode).toBe(200);

    const mala = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { nombreUsuario: datos.nombreUsuario, clave: 'otra clave larga cualquiera' },
    });
    expect(mala.statusCode).toBe(401);
    expect(mala.json().error).toBe('credenciales_invalidas');
  });

  it('no revela si una cuenta existe: mismo error para usuario inexistente', async () => {
    const inexistente = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { nombreUsuario: 'nadie.por.aqui', clave: 'una clave larga y decente' },
    });

    expect(inexistente.statusCode).toBe(401);
    expect(inexistente.json().error).toBe('credenciales_invalidas');
  });

  it('/auth/yo responde según haya sesión o no', async () => {
    const sinSesion = await app.inject({ method: 'GET', url: '/auth/yo' });
    expect(sinSesion.statusCode).toBe(401);

    const datos = datosDe(await codigoFresco());
    const registro = await app.inject({ method: 'POST', url: '/auth/registro', payload: datos });
    creados.push(registro.json().usuarioId);
    const cookie = registro.headers['set-cookie'];

    const conSesion = await app.inject({
      method: 'GET',
      url: '/auth/yo',
      headers: { cookie: String(cookie).split(';')[0] ?? '' },
    });

    expect(conSesion.statusCode).toBe(200);
    expect(conSesion.json().usuario.nombreUsuario).toBe(datos.nombreUsuario);
  });

  it('una cuenta pendiente de verificación no puede pedir códigos para invitar', async () => {
    const datos = datosDe(await codigoFresco());
    const registro = await app.inject({ method: 'POST', url: '/auth/registro', payload: datos });
    creados.push(registro.json().usuarioId);
    const cookie = String(registro.headers['set-cookie']).split(';')[0] ?? '';

    const respuesta = await app.inject({
      method: 'GET',
      url: '/auth/codigos',
      headers: { cookie },
    });

    expect(respuesta.statusCode).toBe(403);
    expect(respuesta.json().error).toBe('cuenta_no_activa');
  });

  it('el panel de emisión de códigos no se anuncia a quien no es admin', async () => {
    const datos = datosDe(await codigoFresco());
    const registro = await app.inject({ method: 'POST', url: '/auth/registro', payload: datos });
    creados.push(registro.json().usuarioId);
    const cookie = String(registro.headers['set-cookie']).split(';')[0] ?? '';

    const respuesta = await app.inject({
      method: 'POST',
      url: '/auth/codigos',
      headers: { cookie },
      payload: { cantidad: 5 },
    });

    // 404, no 403: una ruta de admin no confirma su existencia.
    expect(respuesta.statusCode).toBe(404);
  });

  it('cerrar sesión invalida la cookie', async () => {
    const datos = datosDe(await codigoFresco());
    const registro = await app.inject({ method: 'POST', url: '/auth/registro', payload: datos });
    creados.push(registro.json().usuarioId);
    const cookie = String(registro.headers['set-cookie']).split(';')[0] ?? '';

    await app.inject({ method: 'POST', url: '/auth/salir', headers: { cookie } });

    const despues = await app.inject({ method: 'GET', url: '/auth/yo', headers: { cookie } });
    expect(despues.statusCode).toBe(401);
  });

  it('entrega opciones de passkey con el reto y el dominio esperados', async () => {
    const opciones = await app.inject({ method: 'POST', url: '/auth/passkey/login/opciones' });

    expect(opciones.statusCode).toBe(200);
    const cuerpo = opciones.json();
    expect(cuerpo.challenge).toBeTruthy();
    expect(cuerpo.rpId).toBe('localhost');
    expect(cuerpo.userVerification).toBe('required');
  });

  it('rechaza una respuesta de passkey con un reto inventado', async () => {
    const respuesta = await app.inject({
      method: 'POST',
      url: '/auth/passkey/login/verificar',
      payload: { reto: 'reto-que-nadie-emitio', respuesta: { id: 'x' } },
    });

    expect(respuesta.statusCode).toBe(401);
  });

  it('corta a la sexta creación de cuenta seguida desde la misma IP', async () => {
    // App aparte con el rate limiting encendido: el resto de la suite lo apaga
    // para no autobloquearse, así que el límite necesita su propia prueba.
    const conLimite = await construirApp({
      entorno: cargarEntorno({ NODE_ENV: 'test', LOG_LEVEL: 'fatal' }),
      db,
      limitarPeticiones: true,
    });

    const codigos: string[] = [];
    for (let i = 0; i < 6; i += 1) codigos.push(await codigoFresco());

    const estados: number[] = [];
    for (const codigo of codigos) {
      const respuesta = await conLimite.inject({
        method: 'POST',
        url: '/auth/registro',
        payload: datosDe(codigo),
      });
      estados.push(respuesta.statusCode);
      if (respuesta.statusCode === 201) creados.push(respuesta.json().usuarioId);
    }

    expect(estados.slice(0, 5).every((e) => e === 201)).toBe(true);
    expect(estados[5]).toBe(429);

    await conLimite.close();
  });
});
