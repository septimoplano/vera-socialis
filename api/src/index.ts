import { construirApp } from './app.js';
import { cargarEntorno } from './config.js';
import { crearBaseDatos } from './db/cliente.js';
import {
  crearAlmacenamientoLocal,
  crearAlmacenamientoR2,
  type Almacenamiento,
} from './servicios/almacenamiento.js';
import { crearValidadorBasico, crearValidadorClaude } from './servicios/selfie.js';

const entorno = cargarEntorno();

const conexion = entorno.DATABASE_URL ? crearBaseDatos(entorno.DATABASE_URL) : null;

const almacenamiento: Almacenamiento =
  entorno.R2_ACCOUNT_ID &&
  entorno.R2_ACCESS_KEY_ID &&
  entorno.R2_SECRET_ACCESS_KEY &&
  entorno.R2_BUCKET
    ? crearAlmacenamientoR2({
        accountId: entorno.R2_ACCOUNT_ID,
        accessKeyId: entorno.R2_ACCESS_KEY_ID,
        secretAccessKey: entorno.R2_SECRET_ACCESS_KEY,
        bucket: entorno.R2_BUCKET,
      })
    : crearAlmacenamientoLocal(entorno.CARPETA_ARCHIVOS_LOCAL);

const validadorSelfie = entorno.CLAUDE_API_KEY
  ? crearValidadorClaude(entorno.CLAUDE_API_KEY)
  : crearValidadorBasico();

const app = await construirApp({ entorno, db: conexion?.db, almacenamiento, validadorSelfie });

if (!conexion) {
  app.log.warn('Sin DATABASE_URL: la API arranca solo con la sonda de salud.');
}
if (!entorno.R2_BUCKET) {
  app.log.warn('Sin R2: los archivos van a disco local. Solo sirve para desarrollo.');
}
if (!entorno.CLAUDE_API_KEY) {
  app.log.warn('Sin CLAUDE_API_KEY: las selfies pasan enteras a revisión manual.');
}

try {
  await app.listen({ port: entorno.PORT, host: entorno.HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(senal, () => {
    app
      .close()
      .then(() => conexion?.cerrar())
      .then(
        () => process.exit(0),
        () => process.exit(1),
      );
  });
}
