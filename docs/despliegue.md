# Despliegue gratuito con Render y Neon

El repositorio está configurado para crear una web Angular estática y una API NestJS en Render mediante `render.yaml`. La base PostgreSQL se crea en Neon. Después de conectar Render con GitHub, cada `push` a `main` activa la compilación y el despliegue de ambos servicios. Un `commit` local todavía no publica nada.

## 1. Subir la configuración a GitHub

Revisa `git diff` y sube los archivos de este cambio a la rama `main`. El remoto del proyecto es `git@github.com:Jerly404/Tienda-Inteligente.git`.

```sh
git add package.json render.yaml scripts/write-web-config.mjs apps/api/src/main.ts apps/web/public/config.js apps/web/src/index.html apps/web/src/app/core/auth/auth.interceptor.ts README.md docs/despliegue.md
git commit -m "Configura despliegue automatico con Render y Neon"
git push origin main
```

## 2. Crear PostgreSQL en Neon

1. Entra en <https://console.neon.tech> y crea un proyecto con el plan **Free** y PostgreSQL 16. Elige una región próxima a la API de Render.
2. En **Connect**, copia la conexión PostgreSQL **directa**, desactivando el pooling. Conserva `sslmode=require` y los demás parámetros entregados por Neon. Se usa la conexión directa también para las migraciones de Prisma.
3. Introduce esa conexión únicamente en `DATABASE_URL` de Render. No la pegues en el código ni en GitHub.

La base comienza vacía. Las migraciones crean las tablas; los datos de tu computadora no se trasladan automáticamente. Las migraciones actuales no requieren habilitar PostGIS, aunque el Docker local lo incluye.

## 3. Crear el Blueprint en Render

1. Entra en <https://dashboard.render.com>, conecta tu cuenta de GitHub y autoriza el repositorio **Jerly404/Tienda-Inteligente**.
2. Selecciona **New → Blueprint**, elige ese repositorio y la rama `main`. Render leerá `render.yaml`.
3. Comprueba que la API está en **Free** y la web es un **Static Site**. No se crea una base de datos de pago en Render.
4. Render solicitará estos valores:

| Servicio | Variable | Valor |
| --- | --- | --- |
| API | `DATABASE_URL` | Conexión directa y privada de Neon. |
| API | `WEB_ORIGIN` | URL HTTPS de la web Angular, sin barra final. |
| Web | `API_ORIGIN` | URL HTTPS de la API, sin barra final y **sin `/api`**. |

Si aún no conoces las URLs asignadas, usa provisionalmente `https://example.invalid` para los dos orígenes. Esto permite crear los servicios, pero **la aplicación no estará conectada hasta reemplazarlos**. No adivines los subdominios: Render puede añadir un sufijo al nombre.

5. Tras crear los servicios, copia sus URLs públicas desde el panel. En **Environment** de la API, actualiza `WEB_ORIGIN` con la URL real de la web y guarda desplegando de nuevo. En **Environment** de la web, actualiza `API_ORIGIN` con la URL real de la API y guarda con una nueva compilación/despliegue. `API_ORIGIN` se incorpora durante la compilación.
6. Render genera `JWT_SECRET` automáticamente. Déjalo estable entre despliegues. `DEMO_SEED` queda desactivado.

El Blueprint fija Node 22.22.3, instala las dependencias necesarias para compilar, genera Prisma y aplica `prisma migrate deploy` antes de iniciar la API. Si una migración falla, no se inicia la nueva versión. No se ejecutan semillas ni se vacía la base. Las migraciones futuras deben ser compatibles con la versión que todavía está atendiendo peticiones durante el despliegue.

La web carga su URL pública de API desde `config.js`; ese archivo no contiene secretos. Las rutas de Angular vuelven a `index.html` para que recargar páginas como `/panel` funcione.

## 4. Crear el primer administrador

El plan gratuito de Render no incluye una consola de shell. Ejecuta el comando desde tu computadora contra Neon. Crea un archivo local `.env.production` (ya ignorado por Git) con:

```dotenv
DATABASE_URL=CONEXION_DIRECTA_DE_NEON
ADMIN_EMAIL=tu-correo@example.com
ADMIN_NAME=Tu nombre
ADMIN_PASSWORD=UNA_CONTRASENA_UNICA_DE_AL_MENOS_14_CARACTERES
```

Después de que las migraciones del primer despliegue hayan terminado:

```sh
npm run db:generate
node --env-file=.env.production node_modules/tsx/dist/cli.mjs apps/api/src/prisma/create-admin.ts
```

El comando solo crea el primer administrador y rechaza reemplazar uno existente. Elimina `ADMIN_PASSWORD` del archivo después de usarlo. No ejecutes el seed showcase contra la base publicada.

## 5. Verificar y actualizar

- Abre `https://TU-API.onrender.com/api/health` y comprueba que responde correctamente.
- Abre la URL de la web, inicia sesión y recarga una ruta interna.
- Comprueba que las peticiones `/api` apuntan al servicio de API. Si aparece un error CORS, revisa que `WEB_ORIGIN` coincida exactamente con la URL de la web.
- Sube un cambio con `git push origin main` y revisa **Events** en ambos servicios: debe aparecer un despliegue con el nuevo commit.

No necesitas configurar GitHub Actions para este flujo: Render escucha los cambios del repositorio conectado. Si cambias el esquema Prisma, genera y sube también la migración SQL con `npm run db:migrate` en desarrollo. Desplegar código no crea migraciones nuevas automáticamente.

## Límites gratuitos

La API de Render se suspende tras 15 minutos sin tráfico y puede tardar alrededor de un minuto en responder al volver a usarla. La web estática sigue disponible. Render tiene cuotas de horas, tráfico y compilaciones; Neon tiene cuotas de almacenamiento y cómputo. Esta configuración es adecuada para demostraciones y pruebas, sin garantizar disponibilidad continua. No guardes archivos subidos en el disco de la API: es efímero.

Consulta las condiciones vigentes: [Render Free](https://render.com/docs/free), [Neon Free](https://neon.com/pricing), [Blueprints](https://render.com/docs/blueprint-spec) y [despliegues automáticos](https://render.com/docs/deploys).
