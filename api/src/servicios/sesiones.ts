import { and, eq, gt, lt } from 'drizzle-orm';
import type { BaseDatos } from '../db/cliente.js';
import { sesiones, usuarios } from '../db/esquema/index.js';
import { generarTokenSesion, hashearToken } from './claves.js';

export const NOMBRE_COOKIE_SESION = 'vera_sesion';
const DURACION_SESION_DIAS = 30;

export interface UsuarioSesion {
  id: string;
  nombreUsuario: string;
  nombre: string;
  rol: 'persona' | 'empresa' | 'admin';
  estado: 'pendiente_verificacion' | 'activa' | 'suspendida';
  esHumanoVerificado: boolean;
}

export async function crearSesion(db: BaseDatos, usuarioId: string): Promise<string> {
  const token = generarTokenSesion();
  const expiraEn = new Date(Date.now() + DURACION_SESION_DIAS * 24 * 60 * 60 * 1000);

  await db.insert(sesiones).values({ usuarioId, tokenHash: hashearToken(token), expiraEn });

  return token;
}

/** Devuelve al usuario de una sesión vigente, o null. No revela por qué falla. */
export async function usuarioDeSesion(
  db: BaseDatos,
  token: string | undefined,
): Promise<UsuarioSesion | null> {
  if (!token) return null;

  const filas = await db
    .select({
      id: usuarios.id,
      nombreUsuario: usuarios.nombreUsuario,
      nombre: usuarios.nombre,
      rol: usuarios.rol,
      estado: usuarios.estado,
      esHumanoVerificado: usuarios.esHumanoVerificado,
    })
    .from(sesiones)
    .innerJoin(usuarios, eq(sesiones.usuarioId, usuarios.id))
    .where(and(eq(sesiones.tokenHash, hashearToken(token)), gt(sesiones.expiraEn, new Date())))
    .limit(1);

  return filas[0] ?? null;
}

export async function cerrarSesion(db: BaseDatos, token: string | undefined): Promise<void> {
  if (!token) return;
  await db.delete(sesiones).where(eq(sesiones.tokenHash, hashearToken(token)));
}

/** Cierra TODAS las sesiones de un usuario: para "salir de todos los dispositivos". */
export async function cerrarTodasLasSesiones(db: BaseDatos, usuarioId: string): Promise<void> {
  await db.delete(sesiones).where(eq(sesiones.usuarioId, usuarioId));
}

export async function limpiarSesionesVencidas(db: BaseDatos): Promise<void> {
  await db.delete(sesiones).where(lt(sesiones.expiraEn, new Date()));
}

/** Cookie de sesión: httpOnly, SameSite lax y Secure fuera de desarrollo (spec §8). */
export function opcionesCookie(produccion: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: produccion,
    path: '/',
    maxAge: DURACION_SESION_DIAS * 24 * 60 * 60,
  };
}
