# Tienda Inteligente

**Compara mejor. Compra inteligentemente.** Plataforma de abastecimiento para bodegas y proveedores. Permite consultar catálogo y ofertas, comparar costos conocidos y gestionar compras, favoritos, alertas y reportes con persistencia PostgreSQL.

El estado y límites funcionales están documentados en [estado de implementación](docs/estado.md), la arquitectura en [implementación integrada](docs/implementacion-maestra.md), los cálculos en [motor de comparación](docs/algoritmo-comparacion.md) y las funciones comprador en [reportes y registros](docs/buyer-workspace.md).

## Tecnologías

- Angular 22, TypeScript estricto, formularios y standalone components.
- NestJS 11, REST, validación DTO, Swagger y Helmet.
- PostgreSQL 16 + PostGIS mediante Docker Compose; Prisma 6 para persistencia relacional.
- Argon2id para contraseñas y JWT de acceso.

## Requisitos

Node.js 22.22.3+, 24.15+ o 26+, npm y Docker Compose. Estas versiones cumplen los requisitos actuales de Angular 22.

## Desarrollo local

```sh
cp .env.example .env
docker compose up -d db
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Web: <http://localhost:4200>. API: <http://localhost:3000/api>. Swagger: <http://localhost:3000/api/docs>. Health: <http://localhost:3000/api/health>.

Al registrar una cuenta se elige tienda o distribuidora y se solicitan RUC, razón social, nombre comercial, teléfono, ubicación y datos de acceso. La tienda registra su giro; la distribuidora añade rubros, pedido mínimo, horario, medios de pago y cobertura de entrega. El RUC se valida por longitud y dígito verificador; su vigencia y titularidad requieren una consulta SUNAT que aún no está integrada. Al iniciar sesión, cada rol entra a su espacio. El administrador inicial se crea mediante el script seguro descrito abajo. La API también está disponible en Swagger. No se crea un administrador predeterminado.

Espacios web: comprador <http://localhost:4200/app>, proveedor <http://localhost:4200/proveedor> y administrador <http://localhost:4200/admin>. Las cotizaciones cuentan con API; correo y WhatsApp no están integrados.

La migración inicial está versionada. `db:migrate` crea/revisa migraciones de desarrollo; `db:migrate:deploy` aplica las existentes en despliegue. `npm run admin:create` crea el primer administrador usando `ADMIN_EMAIL`, `ADMIN_NAME` y `ADMIN_PASSWORD` del entorno; requiere una contraseña de 14 caracteres o más, falla si ya hay un administrador y no establece una cuenta predeterminada. Elimina esas variables después de usarlo.

## Datos de demostración

No se insertan datos demo automáticamente. Para crear veinte productos en cinco categorías y sesenta ofertas distribuidas entre tres proveedores de prueba, configurar explícitamente `DEMO_SEED=true` en `.env` y ejecutar `npm run db:seed`. El escenario de arroz de 50 kg usa precios ficticios S/ 185, S/ 178 y S/ 180 con entregas de S/ 15, S/ 10 y S/ 25. Los nombres y ubicaciones se identifican con DEMO; no son proveedores ni precios reales de Cajamarca. El seed es repetible y solo debe activarse para desarrollo.

Para preparar capturas con el catálogo amplio, ejecutar `DEMO_SEED=true npm run db:seed:showcase`. Esta operación **vacía todos los registros existentes de la base local `tienda_inteligente`** y carga una tienda, 50 proveedores, 100 productos y 5,000 ofertas, junto con ubicaciones, precios históricos, promociones y una lista de compra. Las cuentas y negocios llevan la marca DEMO y los datos son ficticios. Contraseña compartida de demostración: `TiendaDemo#2026`; tienda `bodega.demo@tiendainteligente.test`; proveedor 01 `distribuidora.demo@tiendainteligente.test`. El script rechaza URLs que no apunten a la base local permitida.

La página de ubicaciones muestra en un mapa Leaflet/OpenStreetMap las sucursales verificadas con coordenadas. Cada cuenta puede elegir su tipo de negocio, ubicar sucursales haciendo clic en el mapa o autorizar el GPS y guardar la dirección; la tienda guardada se usa como origen de distancia en el comparador. Los enlaces de cada proveedor abren Google Maps para consultar el recorrido vial. El mapa usa teselas públicas de OpenStreetMap y no requiere una clave de Google.

Las distancias del comparador son en línea recta. Entregas desconocidas no se convierten en costo cero ni compiten como un total confirmado. Las compras reportadas deben ser confirmadas por el usuario y no representan órdenes ni comprobantes fiscales.

## Seguridad y configuración

Establece un `JWT_SECRET` aleatorio y de alta entropía antes de cualquier despliegue. No reutilices los valores locales de ejemplo. `WEB_ORIGIN` debe apuntar al origen exacto de la web. No se incluyen cuentas administrador predeterminadas. El script de creación inicial no reemplaza las futuras herramientas de recuperación administrativa.

## Comandos

```sh
npm run dev
npm run build
npm test
docker compose up -d db
```

## Estructura

```text
apps/web/       Angular: features/store, supplier, admin, public y auth
apps/api/       NestJS: módulos por dominio, core e infraestructura
packages/       Reservado para contratos compartidos versionados
docs/           Arquitectura, algoritmos y estado del producto
infrastructure/ Reservado para configuración de despliegue
```

La separación por áreas, las dependencias y las reglas para agregar funciones están en [arquitectura](docs/arquitectura.md#organización-del-código).
