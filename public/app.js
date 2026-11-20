const porId = id => document.getElementById(id);
const estadoFormulario = porId('estado-formulario');
const formulario = porId('formulario');
const cliente = porId('cliente');
const lineas = porId('lineas');
const guardar = porId('guardar');
const agregar = porId('agregar');
let productos = [];

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
  producto.add(new Option('Elegí un producto', ''));
  for (const item of productos) producto.add(new Option(item.nombre, item.id));
  const cantidad = nodo('input');
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
    estadoFormulario.textContent = 'Borrador guardado. Factura #' + factura.id;
  } catch (error) {
    estadoFormulario.textContent = error.message;
  } finally {
    guardar.disabled = false;
  }
});

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
