import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';

// Each window has its own preload and page: the reminder gets only the
// reminder API, not the overlay's (least privilege).
export default defineConfig({
  main: {},
  // Sandboxed preload scripts cannot load ES modules or other files of
  // ours, so each one is emitted as a single standalone CommonJS file.
  preload: {
    build: {
      isolatedEntries: true,
      rollupOptions: {
        input: {
          index: resolve('src/preload/index.ts'),
          reminder: resolve('src/preload/reminder.ts'),
          settings: resolve('src/preload/settings.ts'),
          tower: resolve('src/preload/tower.ts'),
        },
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html'),
          reminder: resolve('src/renderer/reminder.html'),
          settings: resolve('src/renderer/settings.html'),
          tower: resolve('src/renderer/tower.html'),
        },
      },
    },
  },
});
