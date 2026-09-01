import { describe, expect, it } from 'vitest';
import { ordenarPar } from './pares.js';

describe('ordenarPar', () => {
  it('deja el mismo par sin importar el orden de entrada', () => {
    const a = '11111111-1111-4111-8111-111111111111';
    const b = '22222222-2222-4222-8222-222222222222';

    expect(ordenarPar(a, b)).toEqual(ordenarPar(b, a));
  });

  it('pone el menor primero', () => {
    const par = ordenarPar('b', 'a');
    expect(par).toEqual({ menor: 'a', mayor: 'b' });
  });

  it('rechaza conectar a alguien consigo mismo', () => {
    expect(() => ordenarPar('a', 'a')).toThrow(/consigo mismo/);
  });
});
