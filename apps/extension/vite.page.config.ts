import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// The page-activity script runs inside web pages, where Chrome loads it as
// a classic script: no modules, no shared chunks. It is built on its own,
// as one self-contained file, after the main build.
export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: false,
    lib: {
      entry: resolve('src/page-activity.ts'),
      formats: ['iife'],
      name: 'mochaPageActivity',
      fileName: () => 'page-activity.js',
    },
  },
});
