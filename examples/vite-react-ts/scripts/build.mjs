#!/usr/bin/env node

import { build } from 'vite';

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
