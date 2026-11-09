// Cliente HTTP (mismo patrón que Psicole: axios + JWT en interceptor).
import axios from 'axios';
import { BASE, CLAUDE } from './base.js';
import { useAuth } from './store.js';
import { useCallback, useEffect, useState } from 'react';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || `${BASE}/api/v1` });
// Versión para Claude: la API la atiende el servidor dentro del navegador (src/demo). En el build normal este bloque no existe.
if (CLAUDE) api.defaults.adapter = cfg => import('../demo/adapter.js').then(m => m.localAdapter(cfg));

api.interceptors.request.use(cfg => {
  const { token, clinicId, muniId, user } = useAuth.getState();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  if (clinicId) cfg.headers['X-Establecimiento'] = clinicId;
  if (muniId && user?.rol === 'ADMIN') cfg.headers['X-Municipio'] = muniId;
  return cfg;
});
api.interceptors.response.use(
  r => r.data?.data ?? r.data,
  err => {
    if (err.response?.status === 401 && useAuth.getState().token) useAuth.getState().logout();
    const msg = err.response?.data?.message || err.message || 'Error de conexión';
    return Promise.reject(Object.assign(new Error(msg), { status: err.response?.status }));
  },
);

// Hook de lectura con recarga: const { data, loading, error, reload } = useApi('/public/vets', [deps])
export function useApi(path, deps = []) {
  const [state, set] = useState({ data: null, loading: !!path, error: null });
  const load = useCallback(async () => {
    if (!path) return;
    set(s => ({ ...s, loading: true, error: null }));
    try { set({ data: await api.get(path), loading: false, error: null }); }
    catch (e) { set({ data: null, loading: false, error: e.message }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load, setData: data => set(s => ({ ...s, data })) };
}
