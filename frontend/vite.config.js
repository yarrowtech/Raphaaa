import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  define: {
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  base: '/',
  server: {
    host: true,
  },
  build: {
    outDir: 'dist',
  },
});
