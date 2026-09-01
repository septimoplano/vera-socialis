import type { FastifyInstance } from 'fastify';

/** Sonda de salud para Cloud Run y para el smoke test de CI. */
export async function registrarRutasSalud(app: FastifyInstance): Promise<void> {
  app.get('/salud', async () => ({
    estado: 'ok',
    servicio: 'vera-socialis-api',
    ts: new Date().toISOString(),
  }));
}
