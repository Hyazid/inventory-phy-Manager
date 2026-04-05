import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',       // Vite regarde dans src/renderer/
  base: './',                 // Chemins relatifs pour Electron (fichier local)
  build: {
    outDir: '../../dist',     // Build → dist/ à la racine
    emptyOutDir: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src/renderer') },
  },
  server: {
    port: 5173,
  },
});