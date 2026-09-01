import { construirApp } from './app.js';
import { cargarEntorno } from './config.js';

const entorno = cargarEntorno();
const app = await construirApp({ entorno });

try {
  await app.listen({ port: entorno.PORT, host: entorno.HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

for (const senal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(senal, () => {
    app.close().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });
}
