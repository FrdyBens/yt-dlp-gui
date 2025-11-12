import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: path.resolve(process.cwd(), 'client'),
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://0.0.0.0:5000',
      '/dl': 'http://0.0.0.0:5000',
    },
  },
  build: {
    outDir: path.resolve(process.cwd(), 'client/dist'),
    emptyOutDir: true,
  },
});
