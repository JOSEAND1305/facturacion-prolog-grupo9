import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const ejecutar = promisify(execFile);
const archivo = fileURLToPath(
  new URL('../reglas/facturacion_cli.pl', import.meta.url)
);

export async function evaluarFacturaDeEjemplo(id) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new TypeError('El ID de la factura debe ser un entero positivo.');
  }

  const { stdout } = await ejecutar(
    'swipl',
    ['-q', '-s', archivo, '--', String(id)],
    { timeout: 5000 }
  );

  return JSON.parse(stdout);
}

const archivoEntrada = fileURLToPath(
  new URL('../reglas/facturacion_entrada.pl', import.meta.url)
);

export async function evaluarFactura(datos) {
  const entrada = JSON.stringify(datos);
  const proceso = ejecutar(
    'swipl',
    ['-q', '-s', archivoEntrada],
    { timeout: 5000 }
  );

  proceso.child.stdin.on('error', error => {
    proceso.child.kill();
  });
  proceso.child.stdin.end(entrada);

  const { stdout } = await proceso;
  return JSON.parse(stdout);
}