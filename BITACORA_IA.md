# Bitácora de uso de IA

## Aporte de Ricardo

- Usé Codex para revisar el estado inicial del repositorio y preparar el esquema para Neon, la API base, el workflow de plunit y la interfaz de facturación.
- Se preparó una modalidad de prueba con datos de ejemplo y una propuesta de contrato para que José Andrés pueda conectar la emisión y los reportes de Prolog.
- Queda pendiente la revisión del compañero, confirmar el contrato con las reglas del curso y validar el flujo completo con los datos oficiales.

## Aportes de José Andrés Cruz Pérez

### Reglas de facturación en Prolog

- **Solicitud a la IA.** Pedí ayuda para implementar el cálculo de precios de kits anidados, descuentos, IVA y validaciones de facturas.
- **Respuesta.** La IA propuso separar las reglas de precios, el motor y los reportes, y reutilizar los datos de ejemplo del profesor.
- **Ajuste y verificación.** Comprobé los totales de las facturas 2 y 3 con los valores de la guía. También probé los rechazos por crédito y stock y agregué 17 pruebas con `plunit`.

### Ejecución de pruebas en GitHub Actions

- **Solicitud a la IA.** Pedí ayuda para revisar por qué el check aparecía en verde.
- **Hallazgo.** El workflow buscaba archivos `.plt` en `prolog/tests/`. Al no encontrarlos, terminaba con éxito sin ejecutar las pruebas.
- **Corrección y verificación.** Cambié el comando para cargar `reglas/facturacion_tests.pl`. El registro del PR #6 confirmó que pasaron las 17 pruebas.

### Emisión e inventario en Neon

- **Solicitud a la IA.** Pedí ayuda para conectar la API con Prolog, guardar el detalle de la factura y descontar el stock.
- **Respuesta inicial.** La primera versión guardaba el estado y los totales. El detalle por línea y el descuento de inventario se incorporaron en pasos posteriores.
- **Corrección y verificación.** Guardé el detalle y el descuento de stock dentro de la transacción de emisión. En Postman comprobé que una factura emitida reduce el stock, una rechazada lo conserva y volver a emitir la misma factura devuelve `409` sin descontar unidades otra vez.