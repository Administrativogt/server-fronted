import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['antd'],
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      '.ngrok.app',
      '.ngrok-free.app',
      '.ngrok.io',
      '.tunnelmole.net',
      'localhost',
    ],
  },
});
