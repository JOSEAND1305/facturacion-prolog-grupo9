import { readFile } from 'node:fs/promises';
import { crearPool } from './db.js';

const pool = crearPool();
try {
  const schema = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');
  const demo = process.argv.includes('--demo')
    ? await readFile(new URL('../db/demo.sql', import.meta.url), 'utf8')
    : '';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(schema);
    if (demo) await client.query(demo);
    await client.query('COMMIT');
    console.log('Base de datos preparada.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
