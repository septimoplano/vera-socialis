import { describe, expect, it } from 'vitest';
import { cargarEntorno } from './config.js';

describe('cargarEntorno', () => {
  it('aplica valores por defecto', () => {
    const entorno = cargarEntorno({});
    expect(entorno).toMatchObject({ NODE_ENV: 'development', PORT: 3000, HOST: '0.0.0.0' });
  });

  it('convierte PORT a número', () => {
    expect(cargarEntorno({ PORT: '8080' }).PORT).toBe(8080);
  });

  it('rechaza un entorno inválido', () => {
    expect(() => cargarEntorno({ NODE_ENV: 'staging' })).toThrow(/Configuración de entorno/);
  });

  it('rechaza una DATABASE_URL que no es URL', () => {
    expect(() => cargarEntorno({ DATABASE_URL: 'no-es-una-url' })).toThrow();
  });
});
