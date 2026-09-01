import { construirApp } from './app.js';
import { cargarEntorno } from './config.js';
import { crearBaseDatos } from './db/cliente.js';

const entorno = cargarEntorno();

const conexion = entorno.DATABASE_URL ? crearBaseDatos(entorno.DATABASE_URL) : null;
const app = await construirApp({ entorno, db: conexion?.db });

if (!conexion) {
  app.log.warn('Sin DATABASE_URL: la API arranca solo con la sonda de salud.');
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
