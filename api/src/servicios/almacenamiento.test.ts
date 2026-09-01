import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { claveSelfie, crearAlmacenamientoLocal } from './almacenamiento.js';

describe('almacenamiento local', () => {
  let carpeta: string;

  beforeAll(async () => {
    carpeta = await mkdtemp(join(tmpdir(), 'vera-archivos-'));
  });

  afterAll(async () => {
    await rm(carpeta, { recursive: true, force: true });
  });

  it('guarda, lee y borra', async () => {
    const almacenamiento = crearAlmacenamientoLocal(carpeta);
    const contenido = Buffer.from('una imagen de prueba');

    await almacenamiento.guardar('verificaciones/uno.jpg', contenido, 'image/jpeg');
    expect((await almacenamiento.leer('verificaciones/uno.jpg')).toString()).toBe(
      'una imagen de prueba',
    );

    await almacenamiento.borrar('verificaciones/uno.jpg');
    await expect(almacenamiento.leer('verificaciones/uno.jpg')).rejects.toThrow();
  });

  it('no deja salirse de la carpeta base con ../', async () => {
    const almacenamiento = crearAlmacenamientoLocal(carpeta);

    await expect(
      almacenamiento.guardar('../fuera.txt', Buffer.from('x'), 'text/plain'),
    ).rejects.toThrow(/inválida/);
  });

  it('borrar algo que no existe no revienta', async () => {
    const almacenamiento = crearAlmacenamientoLocal(carpeta);
    await expect(almacenamiento.borrar('verificaciones/fantasma.jpg')).resolves.toBeUndefined();
  });
});

describe('claveSelfie', () => {
  it('no revela de quién es la selfie', () => {
    const usuarioId = '11111111-1111-4111-8111-111111111111';
    const clave = claveSelfie(usuarioId);

    expect(clave).toMatch(/^verificaciones\/[0-9a-f]{32}\.jpg$/);
    expect(clave).not.toContain(usuarioId);
  });

  it('genera una clave distinta cada vez, aunque sea el mismo usuario', () => {
    const usuarioId = '11111111-1111-4111-8111-111111111111';
    expect(claveSelfie(usuarioId)).not.toBe(claveSelfie(usuarioId));
  });
});
