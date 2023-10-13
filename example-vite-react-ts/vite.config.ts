import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import federation from '@originjs/vite-plugin-federation';

const componentsDir = resolve(__dirname, 'src/lib');

const getDirectories = (source) =>
  readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

const componentLibs = getDirectories(componentsDir).reduce((libs, fileName) => {
  const libPackageJsonPath = resolve(
    componentsDir,
    join(fileName, 'package.json'),
  );
  if (!existsSync(libPackageJsonPath)) {
    const filePath = resolve(componentsDir, join(fileName, 'index.ts'));
    return [
      ...libs,
      {
        entry: filePath,
        fileName: fileName,
      },
    ];
  }
}, []);

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'remote-components',
      filename: 'remote-component.js',
      exposes: {
        ...componentLibs.reduce((exposes, lib) => {
          return {
            ...exposes,
            [`./${lib.fileName}`]: lib.entry,
          };
        }, {}),
      },
      // FIXME: Add @r2wc/react-to-web-component to the shared dependencies
      shared: ['react', 'react-dom'],
    }),
  ],
  build: {
    modulePreload: false,
    target: 'esnext',
    emptyOutDir: false,
  },
});
