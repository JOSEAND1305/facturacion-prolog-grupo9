import { evaluarFactura } from './prolog.js';

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
              jsonb_build_object(
                'posicion', l.posicion,
                'producto_id', l.producto_id,
                'producto', p.nombre,
                'cantidad', l.cantidad,
                'detalle', l.detalle
              )
              ORDER BY l.posicion
            )
            FROM factura_lineas l
            JOIN productos p ON p.id = l.producto_id
            WHERE l.factura_id = f.id),
            '[]'::jsonb
          ) AS lineas
        FROM facturas f JOIN clientes c ON c.id = f.cliente_id
        WHERE f.id = $1
      `, [id]);

      return rows[0];
    },

    async emitir(id) {
      const db = await pool.connect();

      try {
        await db.query('BEGIN');

        const { rows: [factura] } = await db.query(`
          SELECT f.id, f.estado, f.forma_pago,
                 c.identificacion, c.nombre, c.tipo, c.nivel
          FROM facturas f
          JOIN clientes c ON c.id = f.cliente_id
          WHERE f.id = $1
          FOR UPDATE OF f
        `, [id]);

        if (!factura) {
          throw Object.assign(new Error('La factura no existe.'), {
            status: 404,
            codigo: 'FACTURA_NO_ENCONTRADA'
          });
        }

        if (factura.estado === 'emitida') {
          throw Object.assign(new Error('La factura ya fue emitida.'), {
            status: 409,
            codigo: 'FACTURA_YA_EMITIDA'
          });
        }

        const { rows: productos } = await db.query(`
          SELECT codigo, nombre, categoria, precio, stock
          FROM productos
          WHERE tipo = 'simple'
          ORDER BY codigo
          FOR UPDATE
        `);

        const { rows: kits } = await db.query(`
          SELECT k.codigo,
                 array_agg(p.codigo ORDER BY p.codigo) AS componentes
          FROM componentes_kit ck
          JOIN productos k ON k.id = ck.kit_id
          JOIN productos p ON p.id = ck.producto_id
          CROSS JOIN LATERAL generate_series(1, ck.cantidad)
          GROUP BY k.codigo
        `);

        const { rows: lineas } = await db.query(`
          SELECT l.posicion, p.codigo, l.cantidad
          FROM factura_lineas l
          JOIN productos p ON p.id = l.producto_id
          WHERE l.factura_id = $1
          ORDER BY l.posicion
        `, [id]);

        const resultado = await evaluarFactura({
          productos: productos.map(p =>
            [p.codigo, p.nombre, p.categoria, Number(p.precio), p.stock]
          ),
          kits: kits.map(k => [k.codigo, k.componentes]),
          cliente: [factura.identificacion, factura.nombre, factura.tipo, factura.nivel],
          factura: [id, factura.identificacion, factura.forma_pago],
          lineas: lineas.map(l => [id, l.codigo, l.cantidad])
        });

        const emitida = resultado.estado === 'emitida';
        const errorEmision = emitida ? null : {
          codigo: 'FACTURA_RECHAZADA',
          mensaje: resultado.errores.map(mensajeDeEmision).join(' '),
          motivos: resultado.errores
        };

        await db.query(`
          UPDATE facturas
          SET estado = $2, subtotal = $3, iva = $4, total = $5,
              error_emision = $6::jsonb,
              emitida_en = CASE WHEN $2 = 'emitida' THEN now() ELSE NULL END
          WHERE id = $1
        `, [
          id,
          resultado.estado,
          emitida ? resultado.subtotal : null,
          emitida ? resultado.iva : null,
          emitida ? resultado.total : null,
          errorEmision
        ]);

        if (emitida) {
          if (!Array.isArray(resultado.detalles) ||
              resultado.detalles.length !== lineas.length) {
            throw new Error('El motor devolvió un detalle incompleto.');
          }

          for (const [indice, linea] of lineas.entries()) {
            await db.query(`
              UPDATE factura_lineas
              SET detalle = $3::jsonb
              WHERE factura_id = $1 AND posicion = $2
            `, [id, linea.posicion, resultado.detalles[indice]]);
          }
          
          for (const { codigo, cantidad } of resultado.consumos) {
            const { rowCount } = await db.query(`
              UPDATE productos
              SET stock = stock - $2
              WHERE codigo = $1 AND tipo = 'simple' AND stock >= $2
            `, [codigo, cantidad]);

            if (rowCount !== 1) {
              throw new Error('No se pudo actualizar el stock del producto.');
            }
          }
        }

        const guardada = await this.factura(id, db);
        await db.query('COMMIT');
        return guardada;
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      } finally {
        db.release();
      }
    },

    async crear({ cliente_id, forma_pago, lineas }) {
      const db = await pool.connect();

      try {
        await db.query('BEGIN');

        const { rows: [factura] } = await db.query(
          'INSERT INTO facturas (cliente_id, forma_pago) VALUES ($1, $2) RETURNING id',
          [cliente_id, forma_pago]
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

function mensajeDeEmision(motivo) {
  if (motivo === 'credito_no_permitido') {
    return 'El cliente no puede comprar a crédito.';
  }
  if (motivo === 'sin_lineas') {
    return 'La factura debe tener al menos una línea.';
  }
  if (motivo.startsWith('cantidad_invalida(')) {
    return 'La factura tiene una línea con cantidad inválida.';
  }
  if (motivo.startsWith('sin_stock(')) {
    return 'No hay stock suficiente para completar la factura.';
  }
  return 'La factura no cumple las reglas de emisión.';
}