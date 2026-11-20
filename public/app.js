const porId = id => document.getElementById(id);
const estadoFormulario = porId('estado-formulario');
const estadoHistorial = porId('estado-historial');
const estadoEmision = porId('estado-emision');
const estadoReportes = porId('estado-reportes');
const formulario = porId('formulario');
const cliente = porId('cliente');
const lineas = porId('lineas');
const guardar = porId('guardar');
const emitir = porId('emitir');
const agregar = porId('agregar');
let productos = [];
let facturaActual;

function nodo(tag, texto) {
  const elemento = document.createElement(tag);
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

async function api(ruta, opciones) {
  const response = await fetch('/api' + ruta, opciones);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.mensaje ?? 'La solicitud falló.');
  return payload;
}

function mostrar(valor) {
  return valor ?? '—';
}

function fila(tabla, valores) {
  const tr = nodo('tr');
  for (const valor of valores) {
    const td = nodo('td');
    td.append(valor instanceof Node ? valor : mostrar(valor));
    tr.append(td);
  }
  tabla.append(tr);
}

function actualizarLineas() {
  agregar.disabled = lineas.children.length >= 100;
  for (const boton of lineas.querySelectorAll('button')) {
    boton.disabled = lineas.children.length === 1;
  }
}

function agregarLinea() {
  const linea = nodo('div');
  linea.className = 'linea';
  const producto = nodo('select');
  producto.name = 'producto';
  producto.required = true;
  producto.setAttribute('aria-label', 'Producto');
  producto.add(new Option('Elegí un producto', ''));
  for (const item of productos) producto.add(new Option(item.nombre, item.id));
  const cantidad = nodo('input');
  cantidad.setAttribute('aria-label', 'Cantidad');
  Object.assign(cantidad, { type: 'number', name: 'cantidad', min: 1, max: 2147483647, value: 1, required: true });
  const etiquetaProducto = nodo('label', 'Producto');
  etiquetaProducto.append(producto);
  const etiquetaCantidad = nodo('label', 'Cantidad');
  etiquetaCantidad.append(cantidad);
  const quitar = nodo('button', 'Quitar');
  Object.assign(quitar, { type: 'button', className: 'secundario' });
  quitar.addEventListener('click', () => {
    linea.remove();
    actualizarLineas();
  });
  linea.append(etiquetaProducto, etiquetaCantidad, quitar);
  lineas.append(linea);
  actualizarLineas();
}

function mostrarDetalle(factura) {
  facturaActual = factura;
  porId('detalle').hidden = false;
  porId('titulo-detalle').textContent = 'Factura #' + factura.id;
  estadoEmision.textContent = factura.error_emision?.mensaje ?? '';
  emitir.hidden = factura.estado !== 'borrador';
  const contenido = porId('contenido-detalle');
  contenido.replaceChildren(nodo('p', factura.cliente + ' · ' + factura.estado));
  const tabla = nodo('table');
  const encabezado = nodo('thead');
  const titulos = nodo('tr');
  for (const titulo of ['Producto', 'Cantidad', 'Unitario', 'Descuento', 'IVA', 'Total']) {
    titulos.append(nodo('th', titulo));
  }
  encabezado.append(titulos);
  const cuerpo = nodo('tbody');
  for (const linea of factura.lineas) {
    const detalle = linea.detalle ?? {};
    fila(cuerpo, [linea.producto, linea.cantidad, detalle.precio_unitario,
      detalle.descuento, detalle.iva, detalle.total]);
  }
  tabla.append(encabezado, cuerpo);
  const desplazamiento = nodo('div');
  desplazamiento.className = 'tabla';
  desplazamiento.append(tabla);
  contenido.append(desplazamiento, nodo('p',
    'Subtotal ' + mostrar(factura.subtotal) + ' · Descuento ' + mostrar(factura.descuento) +
    ' · IVA ' + mostrar(factura.iva) + ' · Total ' + mostrar(factura.total)));
}

async function cargarHistorial() {
  try {
    const facturas = await api('/facturas');
    const cuerpo = porId('facturas');
    cuerpo.replaceChildren();
    estadoHistorial.textContent = facturas.length ? '' : 'Todavía no hay facturas.';
    for (const factura of facturas) {
      const abrir = nodo('button', '#' + factura.id);
      abrir.className = 'enlace';
      abrir.addEventListener('click', async () => {
        abrir.disabled = true;
        try {
          mostrarDetalle(await api('/facturas/' + factura.id));
          porId('titulo-detalle').focus();
        } catch (error) {
          estadoHistorial.textContent = error.message;
        } finally {
          abrir.disabled = false;
        }
      });
      fila(cuerpo, [abrir, factura.cliente, factura.estado, factura.total]);
    }
  } catch (error) {
    estadoHistorial.textContent = error.message;
  }
}

agregar.addEventListener('click', agregarLinea);
agregar.disabled = true;
formulario.addEventListener('submit', async event => {
  event.preventDefault();
  guardar.disabled = true;
  estadoFormulario.textContent = 'Guardando…';
  const borrador = {
    cliente_id: Number(cliente.value),
    lineas: Array.from(lineas.children, linea => ({
      producto_id: Number(linea.querySelector('[name="producto"]').value),
      cantidad: Number(linea.querySelector('[name="cantidad"]').value)
    }))
  };
  try {
    const factura = await api('/facturas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(borrador)
    });
    formulario.reset();
    lineas.replaceChildren();
    agregarLinea();
    mostrarDetalle(factura);
    estadoFormulario.replaceChildren('Borrador guardado. ', nodo('a', 'Ver factura #' + factura.id));
    estadoFormulario.lastChild.href = '#detalle';
    await cargarHistorial();
  } catch (error) {
    estadoFormulario.textContent = error.message;
  } finally {
    guardar.disabled = false;
  }
});

emitir.addEventListener('click', async () => {
  const id = facturaActual.id;
  emitir.disabled = true;
  estadoEmision.textContent = 'Emitiendo…';
  try {
    const factura = await api('/facturas/' + id + '/emitir', { method: 'POST' });
    if (facturaActual.id === id) {
      mostrarDetalle(factura);
      if (factura.estado === 'emitida') estadoEmision.textContent = 'Factura emitida.';
    }
    await cargarHistorial();
  } catch (error) {
    if (facturaActual.id === id) estadoEmision.textContent = error.message;
  } finally {
    emitir.disabled = false;
  }
});

porId('filtros').addEventListener('submit', async event => {
  event.preventDefault();
  const boton = event.currentTarget.querySelector("button");
  const parametros = new URLSearchParams(new FormData(event.currentTarget));
  for (const campo of ['desde', 'hasta']) {
    if (!parametros.get(campo)) parametros.delete(campo);
  }
  const resultados = porId('resultados');
  resultados.replaceChildren();
  if (parametros.has('desde') && parametros.has('hasta') && parametros.get('desde') > parametros.get('hasta')) {
    estadoReportes.textContent = 'La fecha inicial debe ser anterior o igual a la final.';
    return;
  }
  boton.disabled = true;
  estadoReportes.textContent = 'Consultando…';
  try {
    const { resumen, filas } = await api('/reportes?' + parametros);
    const tabla = nodo('table');
    const cuerpo = nodo('tbody');
    for (const item of filas) fila(cuerpo, [item.etiqueta, item.valor]);
    tabla.append(cuerpo);
    resultados.append(nodo('p', 'Emitidas ' + resumen.emitidas + ' · Rechazadas ' +
      resumen.rechazadas + ' · Total emitido ' + resumen.total_emitido), tabla);
    estadoReportes.textContent = '';
  } catch (error) {
    estadoReportes.textContent = error.message;
  } finally {
    boton.disabled = false;
  }
});

cargarHistorial();
try {
  const [catalogo, clientes] = await Promise.all([api('/productos'), api('/clientes')]);
  productos = catalogo;
  cliente.add(new Option('Elegí un cliente', ''));
  for (const item of clientes) cliente.add(new Option(item.nombre + ' · ' + item.identificacion, item.id));
  for (const item of productos) fila(porId('productos'), [item.codigo, item.nombre, item.tipo, item.precio]);
  agregarLinea();
  guardar.disabled = !clientes.length || !productos.length;
  if (guardar.disabled) estadoFormulario.textContent = 'Cargá clientes y productos para crear una factura.';
} catch (error) {
  estadoFormulario.textContent = error.message;
}
