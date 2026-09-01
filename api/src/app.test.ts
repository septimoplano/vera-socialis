import { describe, expect, it } from 'vitest';
import { construirApp } from './app.js';
import { cargarEntorno } from './config.js';

const entornoTest = cargarEntorno({ NODE_ENV: 'test', LOG_LEVEL: 'fatal' });

describe('app', () => {
  it('responde la sonda de salud', async () => {
    const app = await construirApp({ entorno: entornoTest });
    const respuesta = await app.inject({ method: 'GET', url: '/salud' });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toMatchObject({ estado: 'ok', servicio: 'vera-socialis-api' });

    await app.close();
  });

  it('devuelve 404 en ruta desconocida', async () => {
    const app = await construirApp({ entorno: entornoTest });
    const respuesta = await app.inject({ method: 'GET', url: '/no-existe' });

    expect(respuesta.statusCode).toBe(404);

    await app.close();
  });
});
