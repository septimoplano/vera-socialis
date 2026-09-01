import { describe, expect, it } from 'vitest';
import {
  compararSeguro,
  generarTokenSesion,
  hashearClave,
  hashearToken,
  verificarClave,
} from './claves.js';

describe('hasheo de claves', () => {
  it('produce un hash argon2id verificable', async () => {
    const hash = await hashearClave('una clave larga y decente');

    expect(hash.startsWith('$argon2id$')).toBe(true);
    await expect(verificarClave(hash, 'una clave larga y decente')).resolves.toBe(true);
  });

  it('rechaza la clave equivocada', async () => {
    const hash = await hashearClave('la correcta');
    await expect(verificarClave(hash, 'la otra')).resolves.toBe(false);
  });

  it('nunca guarda la clave en claro', async () => {
    const hash = await hashearClave('secreto visible');
    expect(hash).not.toContain('secreto visible');
  });

  it('sala distinto cada vez', async () => {
    const [uno, dos] = await Promise.all([hashearClave('misma'), hashearClave('misma')]);
    expect(uno).not.toBe(dos);
  });

  it('devuelve false ante un hash corrupto en vez de reventar', async () => {
    await expect(verificarClave('no-es-un-hash', 'lo que sea')).resolves.toBe(false);
  });
});

describe('tokens de sesión', () => {
  it('genera tokens distintos y suficientemente largos', () => {
    const uno = generarTokenSesion();
    const dos = generarTokenSesion();

    expect(uno).not.toBe(dos);
    expect(uno.length).toBeGreaterThanOrEqual(43);
  });

  it('el hash es estable y no revela el token', () => {
    const token = generarTokenSesion();

    expect(hashearToken(token)).toBe(hashearToken(token));
    expect(hashearToken(token)).not.toContain(token);
  });
});

describe('compararSeguro', () => {
  it('reconoce iguales y distintos', () => {
    expect(compararSeguro('abc', 'abc')).toBe(true);
    expect(compararSeguro('abc', 'abd')).toBe(false);
  });

  it('no revienta con largos distintos', () => {
    expect(compararSeguro('corto', 'muchísimo más largo')).toBe(false);
  });
});
