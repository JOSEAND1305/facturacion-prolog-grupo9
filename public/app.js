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

function actualizarSubtotal() {
  const salida = porId('subtotal-estimado');
  let subtotal = 0;

  for (const linea of lineas.children) {
    const productoId = Number(linea.querySelector('[name="producto"]').value);
    const cantidad = Number(linea.querySelector('[name="cantidad"]').value);
    const producto = productos.find(item => Number(item.id) === productoId);

    if (!producto || !Number.isInteger(cantidad) || cantidad < 1) continue;

    if (producto.precio == null) {
      salida.textContent = 'Se calcula al emitir porque la factura incluye un kit.';
      return;
    }

    subtotal += Number(producto.precio) * cantidad;
  }

  salida.textContent = subtotal.toLocaleString('es-CR', {
    style: 'currency',
    currency: 'CRC'
  });
}

function actualizarLineas() {
  agregar.disabled = lineas.children.length >= 100;
  for (const boton of lineas.querySelectorAll('button')) {
    boton.disabled = lineas.children.length === 1;
  }
  actualizarSubtotal();
}

function agregarLinea() {
  const linea = nodo('div');
  linea.className = 'linea';
  const producto = nodo('select');
  producto.name = 'producto';
  producto.required = true;
  producto.setAttribute('aria-label', 'Producto');
  producto.add(new Option('Elegí un producto', ''));

for (const item of productos) {
  producto.add(new Option(item.nombre, item.id));
}

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
  producto.addEventListener('change', actualizarSubtotal);
  cantidad.addEventListener('input', actualizarSubtotal);
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
  for (const titulo of ['Producto', 'Cantidad', 'Unitario', 'Descuento', 'Base', 'IVA', 'Total']) {
    titulos.append(nodo('th', titulo));
  }
  encabezado.append(titulos);
  const cuerpo = nodo('tbody');
  for (const linea of factura.lineas) {
    const detalle = linea.detalle ?? {};
    fila(cuerpo, [
  linea.producto,
  linea.cantidad,
  detalle.precio_unitario,
  detalle.descuento,
  detalle.base,
  detalle.iva,
  detalle.total
]);
  }
  tabla.append(encabezado, cuerpo);
  const desplazamiento = nodo('div');
  desplazamiento.className = 'tabla';
  desplazamiento.append(tabla);
  const lineasFactura = factura.lineas ?? [];
const tieneDescuentosPorLinea = lineasFactura.length > 0 &&
  lineasFactura.every(linea => linea.detalle?.descuento != null);

const descuentoTotal = factura.descuento ?? (
  factura.estado === 'emitida' && tieneDescuentosPorLinea
    ? lineasFactura.reduce((suma, linea) => suma + Number(linea.detalle.descuento), 0)
    : null
);
  contenido.append(desplazamiento, nodo('p',
    'Subtotal con descuento ' + mostrar(factura.subtotal) + ' · Descuento ' + mostrar(descuentoTotal) +
    ' · IVA ' + mostrar(factura.iva) + ' · Total ' + mostrar(factura.total)));
}

async function cargarHistorial() {
  try {
    const todas = await api('/facturas');
    const clienteId = porId('historial-cliente').value;
    const estado = porId('historial-estado').value;

    const facturas = todas.filter(factura =>
      (!clienteId || String(factura.cliente_id) === clienteId) &&
      (!estado || factura.estado === estado)
    );

    const cuerpo = porId('facturas');
    cuerpo.replaceChildren();

    estadoHistorial.textContent = facturas.length
      ? ''
      : 'No hay facturas que coincidan con los filtros.';

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
    forma_pago: porId('forma_pago').value,
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
        const { resumen, filas, producto_mas_vendido } =
      await api('/reportes?' + parametros);

    const moneda = new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC'
    });

    resultados.append(
      nodo('p', `Emitidas: ${resumen.emitidas} · Rechazadas: ${resumen.rechazadas}`),
      nodo('p', `Ventas totales: ${moneda.format(Number(resumen.total_emitido))}`),
      nodo('p', `IVA por pagar: ${moneda.format(Number(resumen.iva_por_pagar))}`)
    );

    if (producto_mas_vendido) {
      const { nombre, unidades } = producto_mas_vendido;
      resultados.append(nodo('p', `Más vendido: ${nombre} · Unidades: ${unidades}`));
    }

    resultados.append(nodo('h3', 'Ventas por día'));

    if (filas.length === 0) {
      resultados.append(nodo('p', 'No hay ventas en el período consultado.'));
    } else {
      const maximo = filas.reduce(
        (mayor, item) => Math.max(mayor, Number(item.valor)),
        1
      );

      const grafico = nodo('div');
      grafico.className = 'grafico-ventas';

      for (const item of filas) {
        const monto = Number(item.valor);
        const fechaYMonto = `${item.etiqueta} · ${moneda.format(monto)}`;
        const barra = nodo('meter');
        barra.min = 0;
        barra.max = maximo;
        barra.value = monto;
        barra.setAttribute('aria-label', fechaYMonto);

        const dia = nodo('div');
        dia.append(nodo('div', fechaYMonto), barra);
        grafico.append(dia);
      }

      resultados.append(grafico);
    }

    estadoReportes.textContent = '';
  } catch (error) {
    estadoReportes.textContent = error.message;
  } finally {
    boton.disabled = false;
  }
});

porId('historial-cliente').addEventListener('change', cargarHistorial);
porId('historial-estado').addEventListener('change', cargarHistorial);
cargarHistorial();
try {
  const [catalogo, clientes] = await Promise.all([api('/productos'), api('/clientes')]);
  productos = catalogo;
  cliente.add(new Option('Elegí un cliente', ''));
  for (const item of clientes) cliente.add(new Option(item.nombre + ' · ' + item.identificacion, item.id));
  for (const item of clientes) {
    porId('historial-cliente').add(new Option(item.nombre, item.id));
  }
  agregarLinea();
  guardar.disabled = !clientes.length || !productos.length;
  if (guardar.disabled) estadoFormulario.textContent = 'Cargá clientes y productos para crear una factura.';
} catch (error) {
  estadoFormulario.textContent = error.message;
}
