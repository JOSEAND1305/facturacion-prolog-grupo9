# Contrato propuesto entre la API, Prolog y la web

## Datos para el motor

Al emitir, el adaptador de José Andrés consulta el borrador en Neon. Arma la entrada con el identificador y los datos del cliente, las líneas ordenadas con `posicion`, `producto_id` y `cantidad`, y los datos oficiales que requiere el motor. El esquema incluye productos simples con precio base y kits con sus componentes en `componentes_kit`. Prolog define sus términos de entrada y allí aplica las reglas de precio, descuentos, IVA y validación.

La pantalla consume JSON. Pueden conservar este contrato aunque el motor use otros nombres internamente.

## Emisión

`POST /api/facturas/:id/emitir` llama a `motor.emitir(id)` cuando se pasa el adaptador a `crearApi(repo, motor)` en `src/server.js`. La respuesta 200 es la representación persistida, con el mismo formato que `GET /api/facturas/:id`. Ejemplo de aceptación, con importes únicamente ilustrativos:

```json
{
  "id": 1,
  "cliente_id": 1,
  "cliente": "Ana Mora",
  "estado": "emitida",
  "creada_en": "2026-11-20T15:00:00Z",
  "emitida_en": "2026-11-20T15:02:00Z",
  "subtotal": "3000.00",
  "descuento": "0.00",
  "iva": "390.00",
  "total": "3390.00",
  "error_emision": null,
  "lineas": [
    {
      "posicion": 1,
      "producto_id": 1,
      "producto": "Cuaderno",
      "cantidad": 2,
      "detalle": {
        "precio_unitario": "1500.00",
        "subtotal": "3000.00",
        "descuento": "0.00",
        "iva": "390.00",
        "total": "3390.00"
      }
    }
  ]
}
```

Un rechazo de negocio persistido también retorna 200. La factura lleva `estado: "rechazada"`, `emitida_en: null` y `error_emision: { "codigo": "…", "mensaje": "…" }`. El código identifica la regla y el mensaje se muestra al usuario. Los importes pendientes permanecen en `null`. La API devuelve errores de solicitud o infraestructura en la forma `{ "error": { "codigo": "…", "mensaje": "…" } }`.

Dentro de la integración, guardar el estado, los totales y el detalle por posición en una única transacción. Bloquear la factura durante la transición o condicionarla al estado borrador para que una solicitud repetida o concurrente no duplique la emisión. Una vez persistido un resultado, devolver ese mismo resultado al repetir la solicitud.

## Reportes

`GET /api/reportes?desde=2026-11-01&hasta=2026-11-30` llama a `motor.reportes(searchParams)`. Las fechas son opcionales, inclusivas y se expresan como `AAAA-MM-DD`. Se consulta sin límite para el extremo omitido. El adaptador acuerda con el grupo la zona horaria para los límites de fecha.

```json
{
  "resumen": {
    "emitidas": 1,
    "rechazadas": 0,
    "total_emitido": "3390.00"
  },
  "filas": [
    { "etiqueta": "2026-11-20", "valor": "3390.00" }
  ]
}
```

Cada fila contiene una etiqueta y un valor. Cuando no haya registros, retornar contadores en cero, `total_emitido: "0.00"` y `filas: []`.
