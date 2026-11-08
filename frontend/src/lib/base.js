// Ruta base de la app. En la raíz es '' ; publicada en www.ultimamilla.com.ar/casos/vetcole/ es '/casos/vetcole'.
// Se define al compilar con la variable BASE_PATH (ver vite.config.js).
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = path => `${BASE}${path}`;
