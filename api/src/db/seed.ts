import { randomUUID } from 'node:crypto';
import { cargarEntorno } from '../config.js';
import { crearBaseDatos } from './cliente.js';
import { CATEGORIAS } from './categorias-semilla.js';
import { NIVELES, PARAMETROS } from './parametros.js';
import {
  categorias,
  conexiones,
  codigosReferido,
  empresas,
  niveles,
  piezasConcientizacion,
  remoteConfig,
  usuarios,
  votaciones,
  opcionesVotacion,
} from './esquema/index.js';
import { ordenarPar } from './pares.js';

const entorno = cargarEntorno();
if (!entorno.DATABASE_URL) throw new Error('Falta DATABASE_URL para el seed.');

const { db, cerrar } = crearBaseDatos(entorno.DATABASE_URL, { maxConexiones: 1 });

/** Código legible para invitar: sin caracteres ambiguos. */
function generarCodigo(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(
    { length: 8 },
    () => alfabeto[Math.floor(Math.random() * alfabeto.length)],
  ).join('');
}

try {
  // ── Config remota (spec §3) ────────────────────────────────────────────────
  for (const parametro of PARAMETROS) {
    await db
      .insert(remoteConfig)
      .values({
        clave: parametro.clave,
        valor: parametro.valor,
        descripcion: parametro.descripcion,
        esDoctrina: parametro.esDoctrina,
      })
      .onConflictDoNothing();
  }

  // ── Niveles del social score ───────────────────────────────────────────────
  const umbrales = PARAMETROS.find((p) => p.clave === 'NIVELES_UMBRAL')?.valor as number[];
  for (const [indice, nombre] of NIVELES.entries()) {
    await db
      .insert(niveles)
      .values({ orden: indice, nombre, umbral: umbrales[indice] ?? 0 })
      .onConflictDoNothing();
  }

  // ── Categorías del contenido mundial ───────────────────────────────────────
  for (const [indice, categoria] of CATEGORIAS.entries()) {
    await db
      .insert(categorias)
      .values({
        slug: categoria.slug,
        nombre: categoria.nombre,
        descripcion: categoria.descripcion,
        orden: indice,
        esEmpresas: categoria.esEmpresas ?? false,
      })
      .onConflictDoNothing();
  }

  // ── Cuenta del fundador: semilla del grafo, sin referido (spec §2.1) ───────
  const idFundador = randomUUID();
  const [fundador] = await db
    .insert(usuarios)
    .values({
      id: idFundador,
      nombreUsuario: 'francisco',
      nombre: 'Francisco',
      bio: 'Fundador de VERA SOCIALIS.',
      rol: 'admin',
      estado: 'activa',
      esHumanoVerificado: true,
      verificadoEn: new Date(),
      perfilPublico: true,
    })
    .onConflictDoNothing()
    .returning();

  const fundadorId = fundador?.id ?? idFundador;

  // Códigos de referido para invitar al círculo cercano de la beta.
  for (let i = 0; i < 10; i += 1) {
    await db
      .insert(codigosReferido)
      .values({ codigo: generarCodigo(), emisorId: fundadorId })
      .onConflictDoNothing();
  }

  // ── Empresas demo (spec §1: sin cobro durante la beta) ─────────────────────
  const empresasDemo = [
    { usuario: 'cafe.altura', nombre: 'Café Altura', segmento: 'chica' as const },
    { usuario: 'taller.norte', nombre: 'Taller Norte', segmento: 'mediana' as const },
  ];

  for (const demo of empresasDemo) {
    const [cuenta] = await db
      .insert(usuarios)
      .values({
        nombreUsuario: demo.usuario,
        nombre: demo.nombre,
        bio: `Perfil de empresa demo para probar la categoría Empresas.`,
        rol: 'empresa',
        estado: 'activa',
        esHumanoVerificado: false,
        perfilPublico: true,
        referidoPor: fundadorId,
      })
      .onConflictDoNothing()
      .returning();

    if (cuenta) {
      await db
        .insert(empresas)
        .values({
          usuarioId: cuenta.id,
          razonSocial: demo.nombre,
          segmento: demo.segmento,
          suscripcionActiva: false,
        })
        .onConflictDoNothing();

      const par = ordenarPar(fundadorId, cuenta.id);
      await db
        .insert(conexiones)
        .values({ usuarioMenor: par.menor, usuarioMayor: par.mayor, origen: 'referido' })
        .onConflictDoNothing();
    }
  }

  // ── Piezas de concientización ──────────────────────────────────────────────
  // Sin videos todavía: mientras no existan, el stop scrolling muestra el aviso
  // de texto y el botón de salir (spec §2.11).
  await db
    .insert(piezasConcientizacion)
    .values([
      {
        tipo: 'propaganda',
        titulo: 'El scroll no devuelve el tiempo',
        texto:
          'Cada rato que pasas mirando es un rato que no vuelve. ¿Hay alguien a quien podrías escribirle ahora?',
        orden: 0,
      },
      {
        tipo: 'propaganda',
        titulo: 'Las conexiones se cuidan, no se acumulan',
        texto:
          'Aquí no hay seguidores ni cifras que inflar. Hay personas reales, y son las que tú elegiste.',
        orden: 1,
      },
      {
        tipo: 'propaganda',
        titulo: 'La ansiedad también se aprende a soltar',
        texto:
          'Si entraste sin saber bien a qué, respira: inhala en cuatro tiempos, exhala en seis. Después decides.',
        orden: 2,
      },
      {
        tipo: 'video_stop_scroll',
        titulo: 'Llevas un buen rato scrolleando',
        texto: 'Tómate un break. Estira, toma agua, mira por la ventana. La app te va a esperar.',
        duracionS: 30,
        orden: 0,
      },
    ])
    .onConflictDoNothing();

  // ── Primera votación de Comunidad (activa desde el día 1, spec §2.8) ───────
  const [votacion] = await db
    .insert(votaciones)
    .values({
      titulo: '¿Qué categoría falta en el contenido mundial?',
      descripcion:
        'La lista de categorías es un borrador. Elige la que más falta te hace y la agregamos.',
      estado: 'abierta',
      creadoPor: fundadorId,
    })
    .returning();

  if (votacion) {
    await db.insert(opcionesVotacion).values([
      { votacionId: votacion.id, texto: 'Crianza y familia' },
      { votacionId: votacion.id, texto: 'Historia' },
      { votacionId: votacion.id, texto: 'Espiritualidad' },
      { votacionId: votacion.id, texto: 'Ninguna, están bien así' },
    ]);
  }

  console.warn('Seed aplicado: config, niveles, categorías, fundador, empresas demo y votación.');
} finally {
  await cerrar();
}
