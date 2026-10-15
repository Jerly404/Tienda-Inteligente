# Estado de implementación

## Flujos disponibles

- Aplicación Angular responsive y API NestJS modular, con PostgreSQL/Prisma, migraciones versionadas y Docker Compose.
- Inicio de sesión y registro de tiendas/proveedores con roles; el usuario, rol y versión de sesión se vuelven a validar en el servidor.
- Registro empresarial solicita RUC, razón social, nombre comercial, contacto, dirección, departamento/provincia/distrito; aplica checksum del RUC y guarda la sede estructurada. El checksum no verifica estado ni titularidad en SUNAT.
- El alta de tiendas captura su giro comercial. El alta de distribuidoras captura rubros, pedido mínimo, horario, medios de pago y disponibilidad/cobertura de entrega; estos campos se guardan en el perfil empresarial.
- Espacios diferenciados: comprador (`/app`), proveedor (`/proveedor`) y administración (`/admin`), protegidos por guards de rol y membresía.
- Catálogo maestro con presentaciones, ofertas activas de proveedores verificados, comparación por precio/cantidad/stock/entrega conocida y criterios de distancia.
- Comparador de listas, favoritos, alertas generadas con historial disponible, preferencias persistidas, compras registradas por confirmación del usuario y reportes/CSV.
- Panel proveedor para su negocio, sucursales, ofertas, promociones y solicitudes de productos. Panel administrativo para usuarios, negocios, catálogo y publicaciones.
- Mapa Leaflet/OpenStreetMap y búsqueda de sucursales ubicadas. Las distancias se rotulan como línea recta; indicaciones viales abren un servicio externo.
- Landing pública, búsqueda global y navegación compartida. Documentación de arquitectura en `docs/implementacion-maestra.md`, ahorro/reportes en `docs/buyer-workspace.md` y cálculo en `docs/algoritmo-comparacion.md`.

## Datos, dinero y demostración

La migración `20261014210641_expand_workspace` agrega favoritos, preferencias, notificaciones, comparaciones guardadas, compras, promociones y solicitudes de producto. Los importes se calculan en céntimos. El ahorro sobre compras solo se estima cuando existe una comparación propia con la misma presentación, cantidad y costos completos; no se reporta como ahorro realizado.

El seed es opt-in mediante `DEMO_SEED=true` y usa proveedores/productos de demostración identificados como tales. No se presentan como comercios ni precios reales de Cajamarca.

## Límites conocidos

- La recuperación de contraseña necesita un proveedor de correo configurado; no se finge el envío de mensajes.
- No se conectan SUNAT, correo, WhatsApp ni pagos. Las compras guardadas son declaraciones del usuario, no pedidos, ventas verificadas ni documentos fiscales.
- Las alertas se generan al consultar el panel, sin cron ni envío periódico. No hay historial de stock suficiente para alertas confiables de reposición.
- El mapa usa coordenadas registradas, teselas públicas OSM y distancia Haversine; no ofrece geocodificación, rutas ni tiempos dentro de la plataforma.
- El proveedor configura cobertura y tarifas mediante datos disponibles; las visitas de perfil no se cuentan. La administración pagina localmente registros limitados según el módulo.
- Los informes PDF dependen de imprimir desde el navegador. Las reseñas, estadísticas comerciales externas e IA predictiva no están habilitadas.
- Se recomienda completar una revisión de seguridad, pruebas E2E y configuración de despliegue antes de usar información comercial real.

## Validación de este corte

- `npm run build`: compilación NestJS y Angular aprobada.
- `npm test`: 9 suites y 39 pruebas aprobadas.
- `npm run db:migrate:deploy`: no hay migraciones pendientes.
- API `/api/health` respondió `200` y Angular en `:4200` respondió `200` durante el inicio.
