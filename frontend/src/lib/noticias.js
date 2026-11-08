// Noticias del sitio: en la versión con servidor, las publicadas en el sitio vigente del Colegio;
// en la versión de Claude, las de la base de la demo.
import { useApi } from './api.js';
import { COLEGIO } from '../content/colegio.js';
import { BASE } from './base.js';

export const imgColegio = p => `${BASE}/colegio/${p}`;

export function useNoticias(take = 50) {
  const { data } = useApi(COLEGIO ? null : `/public/noticias?take=${take}`);
  if (COLEGIO) return COLEGIO.noticias.slice(0, take).map((n, i) => ({ ...n, id: `web-${i}`, img: n.img ? imgColegio(n.img) : null }));
  return data;
}
