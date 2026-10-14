import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: el build funciona tanto en la raíz (dev) como en
  // GitHub Pages bajo /rockstreet/ sin configurar nada más.
  base: './',
  server: { port: 5173, open: true },
  build: { chunkSizeWarningLimit: 2000 },
});
