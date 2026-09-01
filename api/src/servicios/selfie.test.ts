import { describe, expect, it } from 'vitest';
import { crearValidadorBasico, interpretar, revisarFormato } from './selfie.js';

const imagenValida = Buffer.alloc(50_000, 1);

describe('revisarFormato', () => {
  it('deja pasar JPG, PNG y WEBP de tamaño razonable', () => {
    for (const tipo of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(revisarFormato(imagenValida, tipo)).toBeNull();
    }
  });

  it('rechaza formatos que no son imagen', () => {
    const resultado = revisarFormato(imagenValida, 'application/pdf');
    expect(resultado?.aceptable).toBe(false);
    expect(resultado?.motivo).toContain('Formato no admitido');
  });

  it('rechaza imágenes demasiado grandes o demasiado chicas', () => {
    expect(revisarFormato(Buffer.alloc(9 * 1024 * 1024), 'image/jpeg')?.aceptable).toBe(false);
    expect(revisarFormato(Buffer.alloc(1000), 'image/jpeg')?.aceptable).toBe(false);
  });
});

describe('interpretar la lectura del modelo', () => {
  it('descarta cuando no hay rostro', () => {
    const resultado = interpretar({ hayRostro: false });
    expect(resultado.aceptable).toBe(false);
    expect(resultado.requiereRevisionHumana).toBe(false);
  });

  it('descarta ilustraciones y avatares', () => {
    expect(interpretar({ hayRostro: true, pareceIlustracionOAvatar: true }).aceptable).toBe(false);
  });

  it('descarta la foto de una pantalla', () => {
    expect(interpretar({ hayRostro: true, pareceFotoDePantalla: true }).aceptable).toBe(false);
  });

  it('manda a revisión humana cuando aparece más de una persona', () => {
    const resultado = interpretar({ hayRostro: true, cantidadRostros: 2 });
    expect(resultado.aceptable).toBe(true);
    expect(resultado.requiereRevisionHumana).toBe(true);
  });

  it('manda a revisión humana si no parece tomada en el momento', () => {
    const resultado = interpretar({
      hayRostro: true,
      cantidadRostros: 1,
      pareceSelfieEnVivo: false,
    });
    expect(resultado.requiereRevisionHumana).toBe(true);
  });

  it('acepta una selfie normal sin marcarla para revisión extra', () => {
    const resultado = interpretar({
      hayRostro: true,
      cantidadRostros: 1,
      pareceSelfieEnVivo: true,
      pareceFotoDePantalla: false,
      pareceIlustracionOAvatar: false,
      motivo: 'Se ve una persona mirando a la cámara.',
    });

    expect(resultado.aceptable).toBe(true);
    expect(resultado.requiereRevisionHumana).toBe(false);
  });
});

describe('validador básico (sin CLAUDE_API_KEY)', () => {
  it('solo revisa el formato y deja todo lo demás al fundador', async () => {
    const validador = crearValidadorBasico();
    const resultado = await validador.validar(imagenValida, 'image/jpeg');

    expect(resultado.aceptable).toBe(true);
    expect(resultado.requiereRevisionHumana).toBe(true);
  });

  it('igual rechaza un formato inválido', async () => {
    const validador = crearValidadorBasico();
    const resultado = await validador.validar(imagenValida, 'text/plain');

    expect(resultado.aceptable).toBe(false);
  });
});
