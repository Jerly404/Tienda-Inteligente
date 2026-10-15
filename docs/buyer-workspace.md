# Comprador: registros, seguimiento y reportes

El módulo `BuyerModule` expone `/api/buyer`. Requiere JWT y rol `OWNER`. Toda consulta de datos privados utiliza el identificador del usuario autenticado; las referencias de proveedores y presentaciones se validan en PostgreSQL.

## Funciones

- `/app/favoritos`: productos por presentación y proveedores; precio objetivo por paquete. Favoritos sin duplicados mediante índices únicos.
- `/app/notificaciones`: alertas de cambios de precio del historial posteriores al favorito y promociones vigentes/próximas a vencer. Eventos deduplicados con `eventKey`; estado leído persistente. Se generan al consultar notificaciones, sin proceso cron ni correo externo.
- `/app/preferencias`: radio, orden, resultados por página y alertas, guardados en PostgreSQL. Moneda PEN. La generación de alertas respeta preferencias. Los filtros de otras pantallas deben consumir estas preferencias para aplicarlas como valores iniciales.
- `/app/compras`: compra multiproducto con confirmación explícita, proveedor, fecha, paquetes, precios reales y gastos adicionales. No produce pedidos ni procesa pagos. El servidor calcula todos los importes en céntimos y rechaza cantidades fraccionarias de paquetes, fechas futuras y presentaciones duplicadas.
- `/app/reportes`: filtros de fecha, proveedor y categoría; montos, gasto mensual, productos, proveedores y categorías. CSV con neutralización de fórmulas e impresión/PDF mediante navegador. La exportación conserva los filtros aplicados, aun cuando el formulario tenga cambios pendientes.

## Comparaciones y ahorro

`POST /api/buyer/comparisons` recibe título y parámetros de comparación, no resultados. Recalcula mediante `ComparisonService` y guarda una instantánea de entrada y salida. Una compra puede referenciar una comparación propia para estimar ahorro. La referencia requiere una sola presentación idéntica, igual cantidad de paquetes y al menos dos alternativas con costo total conocido. La base es el mayor costo comparable guardado, nunca un precio de referencia enviado por el cliente. Una compra con gastos adicionales no se compara con un escenario de recojo sin gastos.

El filtro de categoría suma exclusivamente las líneas de esa categoría. No reparte gastos de entrega ni ahorro entre categorías. Sin comparación válida, el ahorro es `null`, no un cero que sugiera medición. Los gráficos se construyen exclusivamente a partir de compras registradas.

## Límites actuales

No hay envío periódico de correo ni historial de disponibilidad para generar alertas de reposición. La impresión depende del diálogo PDF del navegador. Las compras son declaraciones del usuario, no ventas verificadas ni documentos fiscales. El reporte es por cuenta de comprador; la instancia actual presupone un negocio comprador principal por cuenta.

## Pruebas

`npm run test --workspace=@tienda/api -- --runTestsByPath src/modules/buyer/money.spec.ts src/modules/buyer/buyer.service.spec.ts`

Cubre aritmética monetaria, overflow, cantidades inválidas, seguridad CSV, referencias ajenas, aislamiento de favoritos/notificaciones, instantáneas calculadas en servidor, duplicados y reportes vacíos sin ahorro inventado.
