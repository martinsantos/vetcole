// Estado de sesión (Zustand, igual que el authStore de Psicole).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
    { name: 'colvet-auth' },
  ),
);

export const homeFor = rol => ({ VET: '/vet', ADMIN: '/admin', MUNICIPIO: '/muni', TUTOR: '/tutor' }[rol] || '/');
