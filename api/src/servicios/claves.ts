import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * argon2id con los parámetros recomendados por OWASP (spec §8).
 * 19 MiB de memoria y 2 iteraciones: caro para quien ataca, imperceptible aquí.
 */
const OPCIONES_ARGON = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashearClave(clave: string): Promise<string> {
  return hash(clave, OPCIONES_ARGON);
}

export async function verificarClave(hashGuardado: string, clave: string): Promise<boolean> {
  try {
    return await verify(hashGuardado, clave, OPCIONES_ARGON);
  } catch {
    // Un hash corrupto o de otro algoritmo no debe tumbar el login.
    return false;
  }
}

/** Token de sesión en claro: va a la cookie httpOnly y nunca se guarda así. */
export function generarTokenSesion(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * De la sesión solo se guarda el hash. Si alguien lee la base, no puede
 * suplantar a nadie con lo que encuentre ahí.
 */
export function hashearToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Comparación en tiempo constante para no filtrar información por timing. */
export function compararSeguro(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
