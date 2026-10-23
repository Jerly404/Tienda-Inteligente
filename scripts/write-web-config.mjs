import { writeFileSync } from 'node:fs';

const input = process.env.API_ORIGIN?.trim();
if (!input) throw new Error('Configura API_ORIGIN con la URL HTTPS pública de la API, sin /api.');
const url = new URL(input);
if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
  throw new Error('API_ORIGIN debe ser un origen HTTPS, por ejemplo https://tu-api.onrender.com (sin /api ni credenciales).');
}

// Write only to the build output: local development keeps its /api proxy.
writeFileSync(new URL('../apps/web/dist/web/browser/config.js', import.meta.url),
  `window.__TIENDA_CONFIG__ = ${JSON.stringify({ apiOrigin: url.origin })};\n`);
