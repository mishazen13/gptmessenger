import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env.VITE_API_URL || 'http://192.168.1.104:4000';
// Или явно укажите IP вашего ПК:
// const apiTarget = 'http://192.168.1.100:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': apiTarget,
      '/uploads': apiTarget,
    },
    host: true,
    port: 5173,
  },
  define: {
    global: 'globalThis',
    'process.env': {},
    Buffer: 'globalThis.Buffer',
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
