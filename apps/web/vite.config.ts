import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
  // Only inject VITE_API_URL at build time (not during test/dev where Vite
  // handles env vars natively and React runs in development mode).
  define: mode === 'production'
    ? { 'import.meta.env.VITE_API_URL': JSON.stringify(process.env['VITE_API_URL'] ?? '') }
    : {},
}));
