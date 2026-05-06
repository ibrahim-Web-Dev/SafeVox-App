import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/demo/',
  optimizeDeps: {},
  worker: {
    format: 'es',
    plugins: () => [],
  },
  build: {
    target: 'esnext',
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
});
