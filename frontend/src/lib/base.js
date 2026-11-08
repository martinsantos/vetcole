// Ruta base de la app. En la raíz es '' ; publicada en www.ultimamilla.com.ar/casos/vetcole/ es '/casos/vetcole'.
// Se define al compilar con la variable BASE_PATH (ver vite.config.js).
// En la versión para Claude (VITE_DEMO_MODE=claude) no hay servidor ni rutas en la URL: la app navega en memoria.
export const CLAUDE = import.meta.env.VITE_DEMO_MODE === 'claude';
export const BASE = CLAUDE ? '' : import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = path => (CLAUDE ? '#' : `${BASE}${path}`);
// Dirección pública que llevan los QR (en Claude apuntan a la versión publicada en el servidor).
export const PUBLIC_ORIGIN = import.meta.env.VITE_PUBLIC_URL || null;
