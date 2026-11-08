// Build de la versión que corre dentro de Claude (Artifact): sin servidor, las rutas del backend
// se ejecutan en el navegador sobre un Prisma en memoria (src/demo). Uso: npm run build:claude
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const shim = p => fileURLToPath(new URL(`./src/demo/${p}`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    'import.meta.env.VITE_DEMO_MODE': JSON.stringify('claude'),
    'import.meta.env.VITE_PUBLIC_URL': JSON.stringify(process.env.PUBLIC_URL || 'https://www.ultimamilla.com.ar/casos/vetcole'),
  },
  resolve: {
    alias: [
      { find: /^@prisma\/client$/, replacement: shim('prisma-memory.js') },
      { find: /^express$/, replacement: shim('shims/express.js') },
      { find: /^jsonwebtoken$/, replacement: shim('shims/jwt.js') },
      { find: /^bcryptjs$/, replacement: shim('shims/bcrypt.js') },
      { find: /^cors$/, replacement: shim('shims/cors.js') },
      { find: /^.*\/content\/colegio\.js$/, replacement: fileURLToPath(new URL('./src/content/colegio.demo.js', import.meta.url)) },
    ],
  },
  build: {
    outDir: 'dist-claude',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000, // logo y demás recursos embebidos (el visor bloquea cargas externas)
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
