// Estado de sesión (Zustand, igual que el authStore de Psicole).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const safeStorage = { getItem: k => { try { return localStorage.getItem(k); } catch { return null; } }, setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } }, removeItem: k => { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } } };

export const useAuth = create(
  persist(
    set => ({
      token: null,
      user: null,
      clinicId: null,
      login: (token, user) => set({ token, user, clinicId: null }),
      logout: () => set({ token: null, user: null, clinicId: null }),
      setClinic: clinicId => set({ clinicId }),
    }),
    { name: 'colvet-auth', storage: createJSONStorage(() => safeStorage) },
  ),
);

export const homeFor = rol => ({ VET: '/vet', ADMIN: '/admin', MUNICIPIO: '/muni', TUTOR: '/tutor' }[rol] || '/');
