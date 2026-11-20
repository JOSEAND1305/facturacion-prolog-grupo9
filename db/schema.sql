CREATE TABLE IF NOT EXISTS productos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('simple', 'kit')),
  precio numeric(14,2) CHECK (precio >= 0),
  CHECK ((tipo = 'simple' AND precio IS NOT NULL) OR (tipo = 'kit' AND precio IS NULL))
);

CREATE TABLE IF NOT EXISTS componentes_kit (
  kit_id integer NOT NULL REFERENCES productos(id),
  producto_id integer NOT NULL REFERENCES productos(id),
  cantidad integer NOT NULL CHECK (cantidad > 0),
  PRIMARY KEY (kit_id, producto_id),
  CHECK (kit_id <> producto_id)
);

CREATE TABLE IF NOT EXISTS clientes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identificacion text NOT NULL UNIQUE,
  nombre text NOT NULL
);

CREATE TABLE IF NOT EXISTS facturas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id integer NOT NULL REFERENCES clientes(id),
  estado text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'emitida', 'rechazada')),
  creada_en timestamptz NOT NULL DEFAULT now(),
  emitida_en timestamptz,
  subtotal numeric(18,2),
  descuento numeric(18,2),
  iva numeric(18,2),
  total numeric(18,2),
  error_emision jsonb
);

CREATE TABLE IF NOT EXISTS factura_lineas (
  factura_id integer NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  posicion integer NOT NULL CHECK (posicion > 0),
  producto_id integer NOT NULL REFERENCES productos(id),
  cantidad integer NOT NULL CHECK (cantidad > 0),
  detalle jsonb,
  PRIMARY KEY (factura_id, posicion)
);

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'general'
    CHECK (categoria IN ('general', 'medicamento', 'canasta', 'exento')),
  ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0
    CHECK (stock >= 0);

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'consumidor_final'
    CHECK (tipo IN ('contribuyente', 'consumidor_final', 'exonerado')),
  ADD COLUMN IF NOT EXISTS nivel text NOT NULL DEFAULT 'regular'
    CHECK (nivel IN ('oro', 'plata', 'regular'));

ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS forma_pago text NOT NULL DEFAULT 'contado'
    CHECK (forma_pago IN ('contado', 'credito'));
