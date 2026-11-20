const productos = [
  { id: 1, codigo: 'CUAD', nombre: 'Cuaderno', tipo: 'simple', precio: '1500.00' },
  { id: 2, codigo: 'LAP', nombre: 'Lápiz', tipo: 'simple', precio: '300.00' },
  { id: 3, codigo: 'KIT', nombre: 'Kit escolar', tipo: 'kit', precio: null }
];
const clientes = [
  { id: 1, identificacion: 'DEMO-01', nombre: 'Ana Mora' },
  { id: 2, identificacion: 'DEMO-02', nombre: 'Luis Rojas' }
];

export function repositorioDemo() {
  const facturas = new Map();
  return {
    productos: () => productos,
    clientes: () => clientes,
    facturas: () => Array.from(facturas.values(), ({ lineas, ...factura }) => factura).reverse(),
    factura: id => facturas.get(id),
    crear({ cliente_id, lineas }) {
      const cliente = clientes.find(item => item.id === cliente_id);
      const referencias = lineas.map(linea => productos.find(item => item.id === linea.producto_id));
      if (!cliente || referencias.includes(undefined)) {
        throw Object.assign(new Error('Referencia inválida'), { code: '23503' });
      }
      const factura = {
        id: facturas.size + 1,
        cliente_id,
        cliente: cliente.nombre,
        estado: 'borrador',
        creada_en: new Date().toISOString(),
        emitida_en: null,
        subtotal: null,
        descuento: null,
        iva: null,
        total: null,
        error_emision: null,
        lineas: lineas.map(({ producto_id, cantidad }, index) => ({
          posicion: index + 1,
          producto_id,
          producto: referencias[index].nombre,
          cantidad,
          detalle: null
        }))
      };
      facturas.set(factura.id, factura);
      return factura;
    }
  };
}
