# Implementación integrada de Tienda Inteligente

## Arquitectura acordada

Se conserva el monorepo npm existente (`apps/web`, `apps/api`) y PostgreSQL con Prisma. No se reconstruyen los flujos ya funcionales. El backend es un monolito modular por dominio; cada ampliación expone su propio módulo, controladores, DTOs y pruebas. El frontend usa componentes standalone agrupados por funcionalidad.

- Acceso: comprador `/app`, proveedor `/proveedor`, administrador `/admin`. Los alias anteriores `/panel` redirigen a comprador.
- Autorización: JWT validado contra usuario activo y versión de sesión en PostgreSQL. Roles en servidor y guards de navegación; las escrituras comerciales también requieren membresía del negocio.
- Catálogo: productos maestros y presentaciones. Ofertas pertenecen a proveedor y sucursal; el comprador guarda favoritos/listas, no modifica inventarios ajenos.
- Dinero: valores Decimal en PostgreSQL; cálculo en céntimos; cantidades compradas incluyen paquetes completos y mínimos. Promociones deben tener vigencia y referencia verificable. Entrega desconocida nunca se convierte en total confirmado.
- Compras: registros explícitamente confirmados por el usuario, con instantáneas de precios y cantidades. Reportes diferencian ahorro potencial y estimado sobre compra registrada.
- Notificaciones, favoritos, preferencias y comparaciones: persistidos por usuario, nunca exclusivamente en almacenamiento del navegador.
- Mapas: Leaflet/OSM y Haversine rotulado como línea recta. Enlaces de indicaciones externos; sin tiempos de viaje fabricados.

## Componentes compartidos

Layout de espacio de trabajo y navegación por rol, encabezado de página, tarjetas métricas, estados de carga/error/vacío, paginación, gráfico de historial y tokens visuales comunes. Formularios usan controles etiquetados y estados de guardado. Tablas y tarjetas consumen endpoints del dominio.

## Orden y validación

1. Migración aditiva y fundamentos de acceso/roles.
2. Catálogo, administración y publicaciones de proveedor.
3. Comparador, descuentos, listas e historial/mapa.
4. Favoritos, preferencias, notificaciones, compras y reportes.
5. Integración de paneles y rutas; página pública y registro.
6. Compilación, pruebas monetarias y permisos, flujos reales API/navegador, documentación de instalación y límites.

Cada flujo se verifica con datos DEMO identificados. La implementación no se considera completa por tener solo una pantalla. Las limitaciones e integraciones pendientes se registran en `docs/estado.md` al cerrar la validación.
