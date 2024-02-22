#!/usr/bin/env node

import { existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = resolve(process.cwd());

const componentsDir = resolve(rootDir, 'src/components/ethereal-nexus');

function convertCamelCaseToDashCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

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
      const entry = resolve(componentsDir, join(componentName, `${componentName}.tsx`));
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
  const assetName = convertCamelCaseToDashCase(lib.componentName);

  await build({
    plugins: [
      react(),
    ],
    build: {
      rollupOptions: {
        input: {
          [assetName]: lib.entry,
        },
        output: {
          entryFileNames: `${assetName}.js`,
          assetFileNames: `${assetName}.[ext]`,
        }
      },
      target: 'esnext',
      outDir: `./dist/ethereal-nexus/${assetName}`,
      emptyOutDir: false,
      minify:false
    },
  });
}
