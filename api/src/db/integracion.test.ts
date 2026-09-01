import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearBaseDatos, type BaseDatos } from './cliente.js';
import { ordenarPar } from './pares.js';
import {
  categorias,
  conexiones,
  opcionesVotacion,
  remoteConfig,
  usuarios,
  votaciones,
  votos,
} from './esquema/index.js';

/**
 * Tests contra Postgres real. Se saltan si no hay DATABASE_URL para que
 * `npm test` siga corriendo en una máquina sin base levantada; en CI el
 * servicio de Postgres está siempre, así que sí corren.
 */
const urlBase = process.env['DATABASE_URL'];
const describeIntegracion = urlBase ? describe : describe.skip;

describeIntegracion('base de datos (integración)', () => {
  let db: BaseDatos;
  let cerrar: () => Promise<void>;
  const creados: string[] = [];

  beforeAll(() => {
    const conexion = crearBaseDatos(urlBase!, { maxConexiones: 2 });
    db = conexion.db;
    cerrar = async () => {
      await conexion.cerrar();
    };
  });

  afterAll(async () => {
    for (const id of creados) {
      await db.delete(usuarios).where(eq(usuarios.id, id));
    }
    await cerrar();
  });

  async function crearUsuario(sufijo: string): Promise<string> {
    const [usuario] = await db
      .insert(usuarios)
      .values({
        nombreUsuario: `test.${sufijo}.${randomUUID().slice(0, 8)}`,
        nombre: `Prueba ${sufijo}`,
        estado: 'activa',
        esHumanoVerificado: true,
      })
      .returning();
    if (!usuario) throw new Error('No se pudo crear el usuario de prueba');
    creados.push(usuario.id);
    return usuario.id;
  }

  it('el seed dejó las 19 categorías con Empresas como única publicitaria', async () => {
    const filas = await db.select().from(categorias);
    expect(filas).toHaveLength(19);
    expect(filas.filter((c) => c.esEmpresas)).toHaveLength(1);
  });

  it('la config remota tiene los valores del spec §3', async () => {
    const filas = await db.select().from(remoteConfig);
    const valores = Object.fromEntries(filas.map((f) => [f.clave, f.valor]));

    expect(valores['SCORE_TOPE_DIARIO']).toBe(20);
    expect(valores['SCORE_PAR_TOPE_DIA']).toBe(3);
    expect(valores['PROPAGANDA_EVERY_POSTS']).toBe(30);
    expect(valores['STOP_SCROLL_STEPS_MIN']).toEqual([2, 10, 30]);
  });

  it('la doctrina queda marcada como no editable', async () => {
    const doctrina = await db.select().from(remoteConfig).where(eq(remoteConfig.esDoctrina, true));
    const claves = doctrina.map((d) => d.clave);

    expect(claves).toContain('SIN_LIKES');
    expect(claves).toContain('PUBLICIDAD_SOLO_EMPRESAS');
    expect(claves).toContain('SCORE_CLASIFICACION_INVISIBLE');
  });

  it('no permite la misma conexión dos veces, ni invirtiendo el orden', async () => {
    const a = await crearUsuario('a');
    const b = await crearUsuario('b');
    const par = ordenarPar(a, b);

    await db.insert(conexiones).values({ usuarioMenor: par.menor, usuarioMayor: par.mayor });

    // Mismo par en el otro orden: ordenarPar lo normaliza y el índice único lo rechaza.
    const invertido = ordenarPar(b, a);
    await expect(
      db
        .insert(conexiones)
        .values({ usuarioMenor: invertido.menor, usuarioMayor: invertido.mayor }),
    ).rejects.toThrow();
  });

  it('un humano verificado = un voto', async () => {
    const votante = await crearUsuario('votante');

    const [votacion] = await db
      .insert(votaciones)
      .values({ titulo: `Votación de prueba ${randomUUID().slice(0, 8)}`, estado: 'abierta' })
      .returning();
    if (!votacion) throw new Error('No se creó la votación');

    const opcionesCreadas = await db
      .insert(opcionesVotacion)
      .values([
        { votacionId: votacion.id, texto: 'Sí' },
        { votacionId: votacion.id, texto: 'No' },
      ])
      .returning();

    const [primera, segunda] = opcionesCreadas;
    if (!primera || !segunda) throw new Error('No se crearon las opciones');

    await db
      .insert(votos)
      .values({ votacionId: votacion.id, opcionId: primera.id, usuarioId: votante });

    // Segundo voto del mismo usuario en la misma votación: lo bloquea la base.
    await expect(
      db
        .insert(votos)
        .values({ votacionId: votacion.id, opcionId: segunda.id, usuarioId: votante }),
    ).rejects.toThrow();

    await db.delete(votaciones).where(eq(votaciones.id, votacion.id));
  });

  it('la tabla de mensajes no tiene ninguna columna de texto plano', async () => {
    const columnas = await db.execute<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name = 'mensajes'`,
    );
    const nombres = [...columnas].map((c) => c.column_name);

    expect(nombres).toContain('ciphertext');
    expect(nombres).not.toContain('texto');
    expect(nombres).not.toContain('contenido');
    expect(nombres).not.toContain('clave_privada');
  });
});
