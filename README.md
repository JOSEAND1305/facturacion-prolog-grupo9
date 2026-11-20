# Facturación · Grupo 9

Entrega de Ricardo para revisión. Incluye la base de datos en PostgreSQL para Neon, los endpoints de catálogo, clientes y borradores de facturas, GitHub Actions para plunit y la interfaz web.

## Probar la interfaz con datos de ejemplo

Con Node.js 22 o posterior, ejecutá desde esta carpeta:

```sh
node src/server.js --demo
```

Abrí http://localhost:3000. Elegí un cliente, agregá uno o varios productos, guardá el borrador y abrilo desde Historial. Los borradores de esta modalidad se guardan en memoria hasta detener el servidor.

## Ejecutar con Neon

1. Instalá las dependencias con `npm ci`.
2. Copiá `.env.example` a `.env` y configurá `DATABASE_URL` con la cadena de conexión de Neon. Usá una base de desarrollo y conservá la conexión cifrada. Si la URL tiene `sslmode=require`, podés usar `sslmode=verify-full` para verificar el certificado y el nombre del servidor.
3. Aplicá el esquema con `npm run db:setup`. Para cargar también el catálogo y los clientes de ejemplo, usá `npm run db:setup -- --demo`.
4. Ejecutá `npm start` y abrí http://localhost:3000.

Los datos de ejemplo permiten probar el flujo mientras el grupo prepara el catálogo oficial. Los scripts de preparación se pueden ejecutar de nuevo sin duplicar ese catálogo.

## API y coordinación con José Andrés

| Método y ruta | Resultado |
| --- | --- |
| GET `/api/productos` | Catálogo |
| GET `/api/clientes` | Clientes disponibles |
| GET `/api/facturas` | Historial |
| GET `/api/facturas/:id` | Factura y líneas ordenadas |
| POST `/api/facturas` | Crea un borrador con sus líneas y retorna 201 |
| POST `/api/facturas/:id/emitir` | Punto de integración para la emisión |
| GET `/api/reportes` | Punto de integración para reportes |

```json
{
  "cliente_id": 1,
  "lineas": [
    { "producto_id": 1, "cantidad": 2 },
    { "producto_id": 3, "cantidad": 1 }
  ]
}
```

La pantalla de detalle ya muestra el estado, los totales, los importes por línea y el mensaje de rechazo que devuelva la integración. Emisión y reportes responden 501 hasta que se conecte el motor. El [contrato propuesto](docs/contrato-prolog.md) describe las respuestas que consume la web.

GitHub Actions busca suites `.plt` en `prolog/tests/` en cada PR. Mientras el motor se desarrolla, el workflow muestra un aviso si la carpeta está vacía. Al integrar las pruebas conviene exigir que exista al menos una suite para que una ruta mal configurada falle en CI.

## Organización acordada

1. Primer PR de Ricardo con Neon, endpoints base y GitHub Actions.
2. Segundo PR de Ricardo con catálogo, formulario, detalle, historial y pantallas de emisión y reportes.

La emisión real, los reportes del motor y la colección Postman quedan a cargo de José Andrés. La validación conjunta con los datos oficiales y el cierre de la versión siguen después de la integración.
