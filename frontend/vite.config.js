import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': process.env.API_TARGET || 'http://localhost:4000' } },
});
