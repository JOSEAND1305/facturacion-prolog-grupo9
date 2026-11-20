import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { repositorio } from './facturas.js';
import { crearApi } from './api.js';

const demo = process.argv.includes('--demo');
const repo = demo
  ? (await import('./demo.js')).repositorioDemo()
  : repositorio((await import('./db.js')).crearPool());
const api = crearApi(repo);
const archivos = new Map([
  ['/', ['index.html', 'text/html']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/styles.css', ['styles.css', 'text/css']]
]);

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const archivo = req.method === 'GET' && archivos.get(url.pathname);
  if (!archivo) return api(req, res, url);
  try {
    const [nombre, tipo] = archivo;
    const contenido = await readFile(new URL('../public/' + nombre, import.meta.url));
    res.writeHead(200, { 'Content-Type': tipo + '; charset=utf-8' });
    res.end(contenido);
  } catch {
    res.writeHead(500).end('No se pudo cargar la página.');
  }
}).listen(Number(process.env.PORT ?? 3000), '127.0.0.1', () => {
  console.log('Facturación disponible en http://localhost:' + (process.env.PORT ?? 3000));
});
