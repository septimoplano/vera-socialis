import { z } from 'zod';

/**
 * Configuración de entorno. Nada de secretos en el repo (spec §8):
 * en producción todo viene de Cloud Run env vars / GitHub Secrets.
 *
 * Ojo: los PARÁMETROS DE PRODUCTO (spec §3) NO viven aquí — viven en la tabla
 * `remote_config` de la base de datos para poder ajustarlos sin deploy.
 */
const esquemaEntorno = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().url().optional(),
});

export type Entorno = z.infer<typeof esquemaEntorno>;

export function cargarEntorno(fuente: NodeJS.ProcessEnv = process.env): Entorno {
  const resultado = esquemaEntorno.safeParse(fuente);
  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(' · ');
    throw new Error(`Configuración de entorno inválida — ${detalle}`);
  }
  return resultado.data;
}
