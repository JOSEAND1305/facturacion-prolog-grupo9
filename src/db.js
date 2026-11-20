import pg from 'pg';

export function crearPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Configurá DATABASE_URL en .env.');
  return new pg.Pool({ connectionString });
}
