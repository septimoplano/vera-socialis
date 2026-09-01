import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Almacenamiento de archivos. En producción es Cloudflare R2 (S3-compatible);
 * en desarrollo y tests, disco local, para no depender de credenciales de nube
 * mientras el fundador todavía no crea las cuentas.
 */
export interface Almacenamiento {
  guardar(clave: string, contenido: Buffer, tipoMime: string): Promise<void>;
  leer(clave: string): Promise<Buffer>;
  borrar(clave: string): Promise<void>;
  /** URL temporal para que el panel admin vea el archivo sin exponerlo al público. */
  urlTemporal(clave: string, segundos?: number): Promise<string>;
}

export interface ConfigR2 {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export function crearAlmacenamientoR2(config: ConfigR2): Almacenamiento {
  const cliente = new S3Client({
    region: 'auto',
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    async guardar(clave, contenido, tipoMime) {
      await cliente.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: clave,
          Body: contenido,
          ContentType: tipoMime,
        }),
      );
    },

    async leer(clave) {
      const respuesta = await cliente.send(
        new GetObjectCommand({ Bucket: config.bucket, Key: clave }),
      );
      const cuerpo = respuesta.Body;
      if (!cuerpo) throw new Error(`El objeto ${clave} no tiene contenido.`);
      return Buffer.from(await cuerpo.transformToByteArray());
    },

    async borrar(clave) {
      await cliente.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: clave }));
    },

    async urlTemporal(clave, segundos = 300) {
      return getSignedUrl(cliente, new GetObjectCommand({ Bucket: config.bucket, Key: clave }), {
        expiresIn: segundos,
      });
    },
  };
}

/** Alternativa local: mismo contrato, archivos en disco. Solo desarrollo y tests. */
export function crearAlmacenamientoLocal(carpetaBase: string): Almacenamiento {
  const base = resolve(carpetaBase);

  function rutaDe(clave: string): string {
    const destino = resolve(join(base, clave));
    // Una clave con '../' no debe poder salirse de la carpeta base.
    if (!destino.startsWith(base)) throw new Error('Clave de archivo inválida.');
    return destino;
  }

  return {
    async guardar(clave, contenido) {
      const ruta = rutaDe(clave);
      await mkdir(dirname(ruta), { recursive: true });
      await writeFile(ruta, contenido);
    },

    async leer(clave) {
      return readFile(rutaDe(clave));
    },

    async borrar(clave) {
      await unlink(rutaDe(clave)).catch(() => undefined);
    },

    async urlTemporal(clave) {
      return `/admin/archivo/${encodeURIComponent(clave)}`;
    },
  };
}

/**
 * Las selfies se guardan bajo una clave impredecible: quien no la conozca no
 * puede adivinarla, y la ruta no revela de quién es (spec §8).
 */
export function claveSelfie(usuarioId: string): string {
  const sal = randomUUID();
  const opaco = createHash('sha256').update(`${usuarioId}:${sal}`).digest('hex').slice(0, 32);
  return `verificaciones/${opaco}.jpg`;
}
