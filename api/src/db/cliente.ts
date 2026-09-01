import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as esquema from './esquema/index.js';

export type BaseDatos = ReturnType<typeof crearBaseDatos>['db'];

/**
 * Cliente Postgres + Drizzle. En producción apunta a Neon; en desarrollo al
 * contenedor de docker-compose. La cadena nunca se hardcodea: viene del entorno.
 */
export function crearBaseDatos(urlConexion: string, opciones: { maxConexiones?: number } = {}) {
  const sql = postgres(urlConexion, {
    max: opciones.maxConexiones ?? 10,
    // Neon exige TLS; el Postgres local no lo tiene.
    ssl: urlConexion.includes('localhost') || urlConexion.includes('127.0.0.1') ? false : 'require',
  });

  const db = drizzle(sql, { schema: esquema });

  return { db, sql, cerrar: () => sql.end({ timeout: 5 }) };
}

export { esquema };
