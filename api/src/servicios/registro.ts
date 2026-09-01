import { and, eq, isNull, or, sql } from 'drizzle-orm';
import type { BaseDatos } from '../db/cliente.js';
import { codigosReferido, conexiones, usuarios, verificaciones } from '../db/esquema/index.js';
import { ordenarPar } from '../db/pares.js';
import { hashearClave } from './claves.js';

export class ErrorRegistro extends Error {
  constructor(
    message: string,
    readonly codigo:
      'codigo_invalido' | 'codigo_usado' | 'codigo_vencido' | 'nombre_usuario_ocupado',
  ) {
    super(message);
    this.name = 'ErrorRegistro';
  }
}

export interface DatosRegistro {
  codigoReferido: string;
  nombreUsuario: string;
  nombre: string;
  clave: string;
}

export interface ResultadoRegistro {
  usuarioId: string;
  referenteId: string;
  verificacionId: string;
}

/**
 * Crear cuenta es EXCLUYENTE: sin código de referido válido no hay cuenta (spec §2.1).
 *
 * Todo ocurre dentro de una transacción, así que o queda la cuenta con su código
 * quemado, su conexión inicial y su verificación en cola, o no queda nada. La
 * cuenta nace en `pendiente_verificacion`: se activa cuando el fundador aprueba
 * la selfie (tarea B4).
 */
export async function registrarUsuario(
  db: BaseDatos,
  datos: DatosRegistro,
): Promise<ResultadoRegistro> {
  const codigo = datos.codigoReferido.trim().toUpperCase();
  const nombreUsuario = datos.nombreUsuario.trim().toLowerCase();
  const claveHash = await hashearClave(datos.clave);

  return db.transaction(async (tx) => {
    const [referido] = await tx
      .select()
      .from(codigosReferido)
      .where(eq(codigosReferido.codigo, codigo))
      .limit(1);

    if (!referido)
      throw new ErrorRegistro('Ese código de invitación no existe.', 'codigo_invalido');
    if (referido.usadoPor) throw new ErrorRegistro('Ese código ya fue usado.', 'codigo_usado');
    if (referido.expiraEn && referido.expiraEn < new Date()) {
      throw new ErrorRegistro('Ese código ya venció.', 'codigo_vencido');
    }

    const [ocupado] = await tx
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.nombreUsuario, nombreUsuario))
      .limit(1);

    if (ocupado) {
      throw new ErrorRegistro('Ese nombre de usuario ya está tomado.', 'nombre_usuario_ocupado');
    }

    const [nuevo] = await tx
      .insert(usuarios)
      .values({
        nombreUsuario,
        nombre: datos.nombre.trim(),
        claveHash,
        rol: 'persona',
        estado: 'pendiente_verificacion',
        esHumanoVerificado: false,
        referidoPor: referido.emisorId,
      })
      .returning({ id: usuarios.id });

    if (!nuevo) throw new Error('No se pudo crear la cuenta.');

    // Quemar el código solo si sigue libre: si dos personas lo canjean a la vez,
    // la segunda no actualiza ninguna fila y la transacción se cae.
    const quemado = await tx
      .update(codigosReferido)
      .set({ usadoPor: nuevo.id, usadoEn: new Date() })
      .where(and(eq(codigosReferido.id, referido.id), isNull(codigosReferido.usadoPor)))
      .returning({ id: codigosReferido.id });

    if (quemado.length === 0) {
      throw new ErrorRegistro('Ese código ya fue usado.', 'codigo_usado');
    }

    // La primera conexión nace sola: referido ↔ referente (spec §2.1).
    const par = ordenarPar(nuevo.id, referido.emisorId);
    await tx
      .insert(conexiones)
      .values({ usuarioMenor: par.menor, usuarioMayor: par.mayor, origen: 'referido' })
      .onConflictDoNothing();

    const [verificacion] = await tx
      .insert(verificaciones)
      .values({ usuarioId: nuevo.id, estado: 'pendiente' })
      .returning({ id: verificaciones.id });

    return {
      usuarioId: nuevo.id,
      referenteId: referido.emisorId,
      verificacionId: verificacion?.id ?? '',
    };
  });
}

/** Busca por nombre de usuario, sin distinguir mayúsculas. */
export async function buscarPorNombreUsuario(db: BaseDatos, nombreUsuario: string) {
  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.nombreUsuario, nombreUsuario.trim().toLowerCase()))
    .limit(1);

  return usuario ?? null;
}

/** Genera códigos de referido nuevos para que alguien invite a su gente. */
export async function emitirCodigos(
  db: BaseDatos,
  emisorId: string,
  cantidad: number,
): Promise<string[]> {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const generados: string[] = [];

  for (let i = 0; i < cantidad; i += 1) {
    const codigo = Array.from(
      { length: 8 },
      () => alfabeto[Math.floor(Math.random() * alfabeto.length)],
    ).join('');

    const [fila] = await db
      .insert(codigosReferido)
      .values({ codigo, emisorId })
      .onConflictDoNothing()
      .returning({ codigo: codigosReferido.codigo });

    if (fila) generados.push(fila.codigo);
  }

  return generados;
}

export async function codigosDisponibles(db: BaseDatos, emisorId: string) {
  return db
    .select({ codigo: codigosReferido.codigo, usadoPor: codigosReferido.usadoPor })
    .from(codigosReferido)
    .where(
      and(
        eq(codigosReferido.emisorId, emisorId),
        or(isNull(codigosReferido.expiraEn), sql`${codigosReferido.expiraEn} > now()`),
      ),
    );
}
