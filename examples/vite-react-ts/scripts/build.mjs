#!/usr/bin/env node
import ethereal from '@ethereal-nexus/rollup-plugin-ethereal-nexus';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

await build({
    plugins: [
      ethereal(),
      react(),
    ],
    build: {
      rollupOptions: {
        input: './src/index',
        output: {
          chunkFileNames: "[hash:16].js",
          manualChunks: {
            react: ['react']
          }
        }
      },
      target: 'esnext',
      outDir: `./dist`,
      emptyOutDir: false,
      minify: false,
    },
  });
