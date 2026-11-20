class ErrorHttp extends Error {
  constructor(status, codigo, mensaje) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
  }
}

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

function enteroPositivo(value) {
  return Number.isInteger(value) && value > 0 && value <= 2147483647;
}

async function leerBorrador(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length;
    if (bytes > 65536) {
      req.resume();
      throw new ErrorHttp(413, 'CUERPO_GRANDE', 'La solicitud supera 64 KB.');
    }
    chunks.push(chunk);
  }
  let data;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ErrorHttp(400, 'JSON_INVALIDO', 'Enviá un objeto JSON válido.');
  }
  if (!enteroPositivo(data?.cliente_id) ||
      !Array.isArray(data.lineas) || data.lineas.length < 1 || data.lineas.length > 100 ||
      data.lineas.some(l => !enteroPositivo(l?.producto_id) || !enteroPositivo(l?.cantidad))) {
    throw new ErrorHttp(400, 'FACTURA_INVALIDA',
      'Elegí un cliente y agregá de 1 a 100 líneas con producto y cantidad entera positiva.');
  }
  return data;
}

export function crearApi(repo, motor = {}) {
  return async (req, res, url) => {
    try {
      const { pathname } = url;
      if (req.method === 'GET') {
        if (pathname === '/api/productos') return json(res, 200, await repo.productos());
        if (pathname === '/api/clientes') return json(res, 200, await repo.clientes());
        if (pathname === '/api/facturas') return json(res, 200, await repo.facturas());
      }
      if (req.method === 'POST' && pathname === '/api/facturas') {
        const factura = await repo.crear(await leerBorrador(req));
        res.setHeader('Location', '/api/facturas/' + factura.id);
        return json(res, 201, factura);
      }
      const detalle = /^\/api\/facturas\/(\d+)$/.exec(pathname);
      if (req.method === 'GET' && detalle) {
        const id = Number(detalle[1]);
        const factura = enteroPositivo(id) && await repo.factura(id);
        if (!factura) throw new ErrorHttp(404, 'FACTURA_NO_ENCONTRADA', 'La factura no existe.');
        return json(res, 200, factura);
      }
      const emision = /^\/api\/facturas\/(\d+)\/emitir$/.exec(pathname);
      if (req.method === 'POST' && emision) {
        const id = Number(emision[1]);
        if (!enteroPositivo(id) || !await repo.factura(id)) {
          throw new ErrorHttp(404, 'FACTURA_NO_ENCONTRADA', 'La factura no existe.');
        }
        if (motor.emitir) return json(res, 200, await motor.emitir(id));
        throw new ErrorHttp(501, 'MOTOR_PENDIENTE', 'La emisión estará disponible cuando se conecte Prolog.');
      }
      if (req.method === 'GET' && pathname === '/api/reportes') {
        if (motor.reportes) return json(res, 200, await motor.reportes(url.searchParams));
        throw new ErrorHttp(501, 'MOTOR_PENDIENTE', 'Los reportes estarán disponibles cuando se conecte Prolog.');
      }
      throw new ErrorHttp(404, 'RUTA_NO_ENCONTRADA', 'La ruta no existe.');
    } catch (error) {
      if (error.code === '23503') {
        return json(res, 400, { error: { codigo: 'REFERENCIA_INVALIDA', mensaje: 'El cliente o algún producto no existe.' } });
      }
      if (!error.status) console.error('Error de API:', error.code ?? error.name);
      json(res, error.status ?? 500, {
        error: {
          codigo: error.codigo ?? 'ERROR_INTERNO',
          mensaje: error.status ? error.message : 'Ocurrió un error interno.'
        }
      });
    }
  };
}
