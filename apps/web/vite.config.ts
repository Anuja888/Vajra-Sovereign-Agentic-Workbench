import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // VITE_CSP_BACKEND_ORIGIN is substituted into index.html's CSP meta tag via
  // Vite's HTML env replacement (%VITE_CSP_BACKEND_ORIGIN%). Ensure it always
  // has a value so the placeholder is never left literal in the built output.
  // In Vercel: set this env var to your backend origin, e.g. https://your-backend.railway.app
  // Locally: defaults to the dev proxy target.
  if (!process.env['VITE_CSP_BACKEND_ORIGIN']) {
    process.env['VITE_CSP_BACKEND_ORIGIN'] = 'http://127.0.0.1:3000';
  }

  return {
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
  };
});
