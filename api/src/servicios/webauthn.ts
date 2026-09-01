import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { BaseDatos } from '../db/cliente.js';
import { credencialesWebauthn, retosWebauthn, usuarios } from '../db/esquema/index.js';

const VIGENCIA_RETO_MS = 5 * 60 * 1000;

export interface ContextoWebauthn {
  /** Dominio sin protocolo ni puerto: 'localhost' o el dominio de producción. */
  rpID: string;
  /** Origen completo que el navegador reporta: 'http://localhost:5173'. */
  origen: string;
  nombreApp: string;
}

async function guardarReto(
  db: BaseDatos,
  reto: string,
  proposito: string,
  usuarioId?: string,
): Promise<void> {
  await db.insert(retosWebauthn).values({
    reto,
    proposito,
    usuarioId: usuarioId ?? null,
    expiraEn: new Date(Date.now() + VIGENCIA_RETO_MS),
  });
}

/**
 * Consume un reto: solo sirve una vez y dentro de su ventana. Es lo que impide
 * repetir una respuesta capturada.
 */
async function consumirReto(db: BaseDatos, reto: string, proposito: string): Promise<boolean> {
  const consumidos = await db
    .update(retosWebauthn)
    .set({ consumidoEn: new Date() })
    .where(
      and(
        eq(retosWebauthn.reto, reto),
        eq(retosWebauthn.proposito, proposito),
        isNull(retosWebauthn.consumidoEn),
        gt(retosWebauthn.expiraEn, new Date()),
      ),
    )
    .returning({ id: retosWebauthn.id });

  return consumidos.length > 0;
}

/**
 * Opciones para dar de alta una passkey. La biometría se queda en el
 * dispositivo: acá solo viaja una clave pública (spec §8).
 */
export async function opcionesRegistroPasskey(
  db: BaseDatos,
  ctx: ContextoWebauthn,
  usuario: { id: string; nombreUsuario: string; nombre: string },
) {
  const yaRegistradas = await db
    .select({ credentialId: credencialesWebauthn.credentialId })
    .from(credencialesWebauthn)
    .where(eq(credencialesWebauthn.usuarioId, usuario.id));

  const opciones = await generateRegistrationOptions({
    rpName: ctx.nombreApp,
    rpID: ctx.rpID,
    userName: usuario.nombreUsuario,
    userDisplayName: usuario.nombre,
    attestationType: 'none',
    excludeCredentials: yaRegistradas.map((c) => ({ id: c.credentialId })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
      // Huella o rostro del propio dispositivo, no una llave externa.
      authenticatorAttachment: 'platform',
    },
  });

  await guardarReto(db, opciones.challenge, 'registro', usuario.id);
  return opciones;
}

export async function verificarRegistroPasskey(
  db: BaseDatos,
  ctx: ContextoWebauthn,
  usuarioId: string,
  respuesta: RegistrationResponseJSON,
  reto: string,
): Promise<boolean> {
  if (!(await consumirReto(db, reto, 'registro'))) return false;

  const verificacion = await verifyRegistrationResponse({
    response: respuesta,
    expectedChallenge: reto,
    expectedOrigin: ctx.origen,
    expectedRPID: ctx.rpID,
    requireUserVerification: true,
  });

  if (!verificacion.verified || !verificacion.registrationInfo) return false;

  const { credential } = verificacion.registrationInfo;

  await db.insert(credencialesWebauthn).values({
    usuarioId,
    credentialId: credential.id,
    clavePublica: Buffer.from(credential.publicKey).toString('base64url'),
    contador: credential.counter,
    transportes: respuesta.response.transports ?? null,
  });

  return true;
}

export async function opcionesLoginPasskey(db: BaseDatos, ctx: ContextoWebauthn) {
  const opciones = await generateAuthenticationOptions({
    rpID: ctx.rpID,
    userVerification: 'required',
  });

  await guardarReto(db, opciones.challenge, 'login');
  return opciones;
}

export interface ResultadoLoginPasskey {
  ok: boolean;
  usuarioId?: string;
}

export async function verificarLoginPasskey(
  db: BaseDatos,
  ctx: ContextoWebauthn,
  respuesta: AuthenticationResponseJSON,
  reto: string,
): Promise<ResultadoLoginPasskey> {
  if (!(await consumirReto(db, reto, 'login'))) return { ok: false };

  const [credencial] = await db
    .select()
    .from(credencialesWebauthn)
    .where(eq(credencialesWebauthn.credentialId, respuesta.id))
    .limit(1);

  if (!credencial) return { ok: false };

  const verificacion = await verifyAuthenticationResponse({
    response: respuesta,
    expectedChallenge: reto,
    expectedOrigin: ctx.origen,
    expectedRPID: ctx.rpID,
    requireUserVerification: true,
    credential: {
      id: credencial.credentialId,
      publicKey: new Uint8Array(Buffer.from(credencial.clavePublica, 'base64url')),
      counter: credencial.contador,
      // La columna guarda texto libre; los transportes válidos los valida la librería.
      transports: (credencial.transportes ?? undefined) as
        AuthenticatorTransportFuture[] | undefined,
    },
  });

  if (!verificacion.verified) return { ok: false };

  // El contador que sube detecta credenciales clonadas.
  await db
    .update(credencialesWebauthn)
    .set({ contador: verificacion.authenticationInfo.newCounter, usadoEn: new Date() })
    .where(eq(credencialesWebauthn.id, credencial.id));

  const [usuario] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.id, credencial.usuarioId))
    .limit(1);

  return usuario ? { ok: true, usuarioId: usuario.id } : { ok: false };
}
