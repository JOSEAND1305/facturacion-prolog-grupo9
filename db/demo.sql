INSERT INTO productos (codigo, nombre, tipo, precio) VALUES
  ('CUAD', 'Cuaderno', 'simple', 1500.00),
  ('LAP', 'Lápiz', 'simple', 300.00),
  ('KIT', 'Kit escolar', 'kit', NULL)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO componentes_kit (kit_id, producto_id, cantidad)
SELECT kit.id, producto.id, componentes.cantidad
FROM (VALUES ('CUAD', 1), ('LAP', 2)) AS componentes(codigo, cantidad)
JOIN productos producto ON producto.codigo = componentes.codigo
JOIN productos kit ON kit.codigo = 'KIT'
ON CONFLICT (kit_id, producto_id) DO NOTHING;

INSERT INTO clientes (identificacion, nombre) VALUES
  ('DEMO-01', 'Ana Mora'),
  ('DEMO-02', 'Luis Rojas')
ON CONFLICT (identificacion) DO NOTHING;
