import { defineConfig } from 'vite'
import ethereal from '@ethereal-nexus/vite-plugin-ethereal-nexus';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    ethereal({
      exposes: {
        ReactHelloWorld: './src/components/ReactHelloWorld/ReactHelloWorld.tsx',
        SimpleReactHelloWorld: './src/components/SimpleReactHelloWorld/SimpleReactHelloWorld.tsx',
        EventExample: './src/components/EventExample/EventExample.tsx',
        DropdownExample: './src/components/DropdownExample/DropdownExample.tsx',
      },
      server: true,
    })
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
    outDir: 'build',
    minify: true
  },
})
