import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['antd'],
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/icons'],
          charts: ['@nivo/pie', '@nivo/bar', '@nivo/core', 'chart.js', 'react-chartjs-2'],
          export: ['exceljs', 'xlsx', 'docx', 'file-saver'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      '.ngrok.app',
      '.ngrok-free.app',
      '.ngrok.io',
      '.tunnelmole.net',
      '.trycloudflare.com',
      'localhost',
    ],
    proxy: {
      '/backend': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, ''),
      },
    },
  },
});
