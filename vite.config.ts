import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://192.168.0.106:4000',
      '/uploads': 'http://192.168.0.106:4000',
      // Убираем прокси для socket.io, так как теперь подключаемся напрямую
    },
    host: true,
    port: 5173,
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
      process: 'process/browser',
      util: 'util/',
    },
  },
  optimizeDeps: {
    include: ['buffer', 'process', 'util'],
  },
});