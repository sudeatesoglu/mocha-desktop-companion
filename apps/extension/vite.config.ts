import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { extensionManifest } from './src/manifest.ts';

const { version } = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
  version: string;
};

// Writes manifest.json from src/manifest.ts, with the package's version, and
// takes Mocha's app icon, so the extension always looks like the app.
const manifestAndIcon: Plugin = {
  name: 'mocha-manifest-and-icon',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'manifest.json',
      source: `${JSON.stringify(extensionManifest(version), null, 2)}\n`,
    });
    this.emitFile({
      type: 'asset',
      fileName: 'icon.png',
      source: readFileSync(resolve('../desktop/resources/icon.png')),
    });
  },
};

export default defineConfig({
  root: 'src',
  base: './',
  plugins: [manifestAndIcon],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Chrome loads the extension's files as they are: no polyfills, nothing
    // inlined, stable names that the manifest can point to.
    modulePreload: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        background: resolve('src/background.ts'),
        options: resolve('src/options.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
