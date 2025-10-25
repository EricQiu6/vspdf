import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // Main process entry
        entry: path.resolve(__dirname, 'main/index.ts'),
        vite: {
          build: {
            outDir: path.resolve(__dirname, '../../dist/main'),
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      {
        // Preload script
        entry: path.resolve(__dirname, 'preload/index.ts'),
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: path.resolve(__dirname, '../../dist/preload'),
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: 'index.cjs',
              },
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'renderer'),
      '@vspdf/types': path.resolve(__dirname, '../../packages/types'),
      '@vspdf/utils': path.resolve(__dirname, '../../packages/utils'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../../dist/renderer'),
  },
  root: path.resolve(__dirname, 'renderer'),
});
