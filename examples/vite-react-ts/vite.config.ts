import { defineConfig } from 'vite'
import ethereal from '@ethereal-nexus/rollup-plugin-ethereal-nexus';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    ethereal({
      exposes: {
        ReactHelloWorld: './src/components/ReactHelloWorld/ReactHelloWorld.tsx'
      },
    }),
  ],
  build: {
    rollupOptions: {
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
})