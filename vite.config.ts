import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['antd'], // ✅ fuerza a Vite a preoptimizar Ant Design
  },
  server: {
    host: true, // 👈 permite conexiones externas (necesario para ngrok)
    port: 5173, // 👈 tu puerto local
    allowedHosts: ['.ngrok-free.app'], // 👈 permite cualquier subdominio ngrok
  },
});
