// Build de la app Android (Capacitor): solo la entrada mobile.html → dist-mobile/.
// Uso: pnpm run build:mobile (backend local) | pnpm run build:mobile:prod
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { renameSync } from 'node:fs';

export default defineConfig({
  plugins: [
    react(),
    {
      // Capacitor carga index.html del webDir
      name: 'mobile-index-html',
      closeBundle() {
        renameSync(path.resolve(__dirname, 'dist-mobile/mobile.html'), path.resolve(__dirname, 'dist-mobile/index.html'));
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist-mobile',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: path.resolve(__dirname, 'mobile.html'),
    },
  },
});
