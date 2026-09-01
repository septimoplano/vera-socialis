import { describe, expect, it } from 'vitest';
import { NIVELES, PARAMETROS, obtenerParametro } from './parametros.js';
import { CATEGORIAS } from './categorias-semilla.js';

/**
 * Estos tests fijan los valores del spec §3. Si alguien cambia un número acá
 * sin actualizar el spec, el test lo delata: los parámetros de producto son
 * decisión del fundador, no del código.
 */
describe('parámetros de producto (spec §3)', () => {
  it('tiene los valores iniciales del spec', () => {
    const valores = Object.fromEntries(PARAMETROS.map((p) => [p.clave, p.valor]));

    expect(valores['STOP_SCROLL_STEPS_MIN']).toEqual([2, 10, 30]);
    expect(valores['STOP_VIDEO_S']).toBe(30);
    expect(valores['PROPAGANDA_EVERY_POSTS']).toBe(30);
    expect(valores['RAFAGA_VENTANA_MIN']).toBe(10);
    expect(valores['RAFAGA_APERTURAS']).toBe(3);
    expect(valores['RAFAGA_REBOTE_S']).toBe(15);
    expect(valores['RAFAGA_RESPIRACION']).toEqual({ inhalarS: 4, exhalarS: 6 });
    expect(valores['BAN_CATEGORIA_HORAS']).toBe(72);
    expect(valores['SCORE_COMENTARIO_POS']).toBe(2);
    expect(valores['SCORE_COMENTARIO_NEG']).toBe(-3);
    expect(valores['SCORE_REACCION_POS']).toBe(1);
    expect(valores['SCORE_REACCION_NEG']).toBe(-2);
    expect(valores['SCORE_TOPE_DIARIO']).toBe(20);
    expect(valores['SCORE_PAR_TOPE_DIA']).toBe(3);
    expect(valores['NIVELES_UMBRAL']).toEqual([0, 50, 200, 600, 1500]);
  });

  it('marca como doctrina lo que no se puede editar ni desde el admin', () => {
    const doctrina = PARAMETROS.filter((p) => p.esDoctrina).map((p) => p.clave);

    expect(doctrina).toEqual(
      expect.arrayContaining([
        'SIN_LIKES',
        'SIN_ALGORITMO_RECOMENDACION',
        'PUBLICIDAD_SOLO_EMPRESAS',
        'SCORE_CLASIFICACION_INVISIBLE',
        'STOP_SCROLL_EXISTE',
        'RAFAGA_EXISTE',
      ]),
    );
  });

  it('no tiene claves duplicadas', () => {
    const claves = PARAMETROS.map((p) => p.clave);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it('tiene un nivel por cada umbral', () => {
    const umbrales = obtenerParametro('NIVELES_UMBRAL').valor as number[];
    expect(NIVELES).toHaveLength(umbrales.length);
  });

  it('los umbrales de nivel van en orden creciente', () => {
    const umbrales = obtenerParametro('NIVELES_UMBRAL').valor as number[];
    const ordenados = [...umbrales].sort((a, b) => a - b);
    expect(umbrales).toEqual(ordenados);
  });

  it('falla ruidosamente ante un parámetro inexistente', () => {
    expect(() => obtenerParametro('NO_EXISTE')).toThrow(/Parámetro desconocido/);
  });
});

describe('categorías semilla (spec §2.5)', () => {
  it('trae las 19 categorías del borrador', () => {
    expect(CATEGORIAS).toHaveLength(19);
  });

  it('Empresas es la única categoría marcada con publicidad', () => {
    const conPublicidad = CATEGORIAS.filter((c) => c.esEmpresas);
    expect(conPublicidad).toHaveLength(1);
    expect(conPublicidad[0]?.slug).toBe('empresas');
  });

  it('no repite slugs', () => {
    const slugs = CATEGORIAS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
