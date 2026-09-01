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

  /** Firma las cookies. En producción es obligatorio y debe venir del entorno. */
  COOKIE_SECRET: z.string().min(32).default('desarrollo-local-cambiar-en-produccion-32+'),

  /**
   * WebAuthn exige un dominio estable con HTTPS. En desarrollo es localhost;
   * en producción se completa cuando el fundador entregue el dominio (tarea B5).
   */
  WEBAUTHN_RP_ID: z.string().default('localhost'),
  WEBAUTHN_ORIGEN: z.string().url().default('http://localhost:5173'),

  /** Pre-filtro de selfies y, más adelante, sentimiento y moderación. */
  CLAUDE_API_KEY: z.string().optional(),

  /** Cloudflare R2. Sin estas variables se usa disco local (solo desarrollo). */
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  CARPETA_ARCHIVOS_LOCAL: z.string().default('.archivos-locales'),
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

  const entorno = resultado.data;

  // En producción no se arranca con los valores de desarrollo puestos.
  if (entorno.NODE_ENV === 'production') {
    if (entorno.COOKIE_SECRET.startsWith('desarrollo-local')) {
      throw new Error('COOKIE_SECRET no puede quedar en el valor de desarrollo en producción.');
    }
    if (!entorno.DATABASE_URL) {
      throw new Error('DATABASE_URL es obligatoria en producción.');
    }
    if (entorno.WEBAUTHN_RP_ID === 'localhost') {
      throw new Error('WEBAUTHN_RP_ID debe ser el dominio real en producción.');
    }
    // Guardar selfies en el disco de un contenedor efímero las perdería.
    if (!entorno.R2_BUCKET) {
      throw new Error('R2 es obligatorio en producción: el disco local no persiste.');
    }
  }

  return entorno;
}
