INSERT INTO productos (codigo, nombre, tipo, precio, categoria, stock) VALUES
  ('p1', 'Arroz 1 kg',    'simple',   1200, 'canasta',     200),
  ('p2', 'Laptop',        'simple', 450000, 'general',      15),
  ('p3', 'Paracetamol',   'simple',   1500, 'medicamento', 500),
  ('p4', 'Mouse',         'simple',   8500, 'general',      80),
  ('p5', 'Hora soporte',  'simple',  25000, 'general',    9999),
  ('p6', 'Libro de texto','simple',  12000, 'exento',       30),
  ('p7', 'Teclado',       'simple',  18000, 'general',      40),
  ('k1', 'Kit oficina',   'kit',      NULL, 'general',       0),
  ('k2', 'Kit oficina con soporte', 'kit', NULL, 'general',  0)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO componentes_kit (kit_id, producto_id, cantidad)
SELECT kit.id, producto.id, 1
FROM (VALUES
  ('k1', 'p2'),
  ('k1', 'p4'),
  ('k1', 'p7'),
  ('k2', 'k1'),
  ('k2', 'p5')
) AS componente(codigo_kit, codigo_producto)
JOIN productos kit ON kit.codigo = componente.codigo_kit
JOIN productos producto ON producto.codigo = componente.codigo_producto
ON CONFLICT (kit_id, producto_id) DO NOTHING;

INSERT INTO clientes (identificacion, nombre, tipo, nivel) VALUES
  ('c1', 'Tienda Sol',          'contribuyente',    'oro'),
  ('c2', 'Juan Pérez',          'consumidor_final', 'regular'),
  ('c3', 'Fundación Esperanza', 'exonerado',        'plata'),
  ('c4', 'Comercial Luna',      'contribuyente',    'regular')
ON CONFLICT (identificacion) DO NOTHING;