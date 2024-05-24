import { defineConfig } from "tsup"

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["bin/index.ts"],
  format: ["esm"],
  sourcemap: true,
  minify: false,
  target: "esnext",
  outDir: "dist",
})