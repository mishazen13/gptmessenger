import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

const apiTarget = process.env.VITE_API_URL || 'http://192.168.0.100:4000';

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
  ],

  server: {
    https: true,
    host: true,
    port: 5173,

    proxy: {
      '/api': apiTarget,
      '/uploads': apiTarget,
    },
  },
});