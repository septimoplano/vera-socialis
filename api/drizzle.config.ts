import { defineConfig } from 'drizzle-kit';

const url = process.env['DATABASE_URL'];
if (!url) {
  throw new Error('Falta DATABASE_URL. Copia .env.example a .env o expórtala en el entorno.');
}

export default defineConfig({
  schema: './src/db/esquema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  casing: 'snake_case',
  verbose: true,
  strict: true,
});
