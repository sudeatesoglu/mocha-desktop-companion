import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: {},
  // Sandboxed preload scripts cannot load ES modules, so emit CommonJS.
  preload: {
    build: {
      rollupOptions: {
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {},
});
