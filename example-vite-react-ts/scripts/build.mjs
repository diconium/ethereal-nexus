#!/usr/bin/env node

import { existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = resolve(process.cwd());

const componentsDir = resolve(rootDir, 'src/components/ethereal-nexus');

const getDirectories = (source) =>
  readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

const componentLibs = getDirectories(componentsDir).reduce(
  (libs, componentName) => {
    const libPackageJsonPath = resolve(
      componentsDir,
      join(componentName, 'package.json'),
    );
    if (!existsSync(libPackageJsonPath)) {
      const entry = resolve(componentsDir, join(componentName, 'index.ts'));
      return [
        ...libs,
        {
          componentName,
          entry,
        },
      ];
    }
  },
  [],
);

for (const lib of componentLibs) {
  console.log(`building ${lib.componentName} ${lib.entry}...`);
  await build({
    plugins: [
      react(),
    ],
    build: {
      rollupOptions: {
        input: {
          [lib.componentName]: lib.entry,
        },
        output: {
          entryFileNames: `${lib.componentName}.js`,
          assetFileNames: `${lib.componentName}.[ext]`,
        }
      },
      target: 'esnext',
      outDir: `./dist/ethereal-nexus/${lib.componentName}`,
      emptyOutDir: false,
      minify:false
    },
  });
}
