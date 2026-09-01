import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { crearBaseDatos } from './cliente.js';
import { cargarEntorno } from '../config.js';

const entorno = cargarEntorno();
if (!entorno.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL para migrar.');
}

const carpetaMigraciones = resolve(dirname(fileURLToPath(import.meta.url)), '../../drizzle');
const { db, cerrar } = crearBaseDatos(entorno.DATABASE_URL, { maxConexiones: 1 });

try {
  await migrate(db, { migrationsFolder: carpetaMigraciones });
  console.warn('Migraciones aplicadas.');
} finally {
  await cerrar();
}
