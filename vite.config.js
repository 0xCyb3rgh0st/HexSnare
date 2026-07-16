import { defineConfig } from 'vite';

// HexSnare is a pure static SPA - no backend, no runtime deps.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});
