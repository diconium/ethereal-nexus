import { defineConfig } from 'tsup'

export default defineConfig({
  target: 'esnext',
  format: ['cjs', 'esm'],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  outDir: './dist',
})