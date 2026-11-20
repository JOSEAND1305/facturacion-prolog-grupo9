export function repositorio(pool) {
  const seleccionarFacturas = `
    SELECT f.*, c.nombre AS cliente
    FROM facturas f JOIN clientes c ON c.id = f.cliente_id
  `;
  return {
    async productos() {
      return (await pool.query('SELECT * FROM productos ORDER BY id')).rows;
    },
    async clientes() {
      return (await pool.query('SELECT * FROM clientes ORDER BY id')).rows;
    },
    async facturas() {
      return (await pool.query(seleccionarFacturas + ' ORDER BY f.id DESC')).rows;
    },
    async factura(id, db = pool) {
      const { rows } = await db.query(`
        SELECT f.*, c.nombre AS cliente,
          COALESCE(
            (SELECT jsonb_agg(
              jsonb_build_object('posicion', l.posicion, 'producto_id', l.producto_id,
                'producto', p.nombre, 'cantidad', l.cantidad, 'detalle', l.detalle)
              ORDER BY l.posicion)
            FROM factura_lineas l JOIN productos p ON p.id = l.producto_id
            WHERE l.factura_id = f.id),
            '[]'::jsonb
          ) AS lineas
        FROM facturas f JOIN clientes c ON c.id = f.cliente_id
        WHERE f.id = $1
      `, [id]);
      return rows[0];
    },
    async crear({ cliente_id, lineas }) {
      const db = await pool.connect();
      try {
        await db.query('BEGIN');
        const { rows: [factura] } = await db.query(
          'INSERT INTO facturas (cliente_id) VALUES ($1) RETURNING id', [cliente_id]
        );
        await db.query(`
          INSERT INTO factura_lineas (factura_id, posicion, producto_id, cantidad)
          SELECT $1, posicion, producto_id, cantidad
          FROM unnest($2::integer[], $3::integer[])
            WITH ORDINALITY AS lineas(producto_id, cantidad, posicion)
        `, [factura.id, lineas.map(l => l.producto_id), lineas.map(l => l.cantidad)]);
        const resultado = await this.factura(factura.id, db);
        await db.query('COMMIT');
        return resultado;
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      } finally {
        db.release();
      }
    }
  };
}
