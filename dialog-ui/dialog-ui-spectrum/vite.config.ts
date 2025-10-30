import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import {resolve} from 'path';
import path from "node:path";

export default defineConfig(({mode}) => ({
    plugins: [
        react(),
        // Only generate declaration files in build mode, not in dev mode
        ...(mode === 'production' ? [dts({
            insertTypesEntry: true,
        })] : []),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    define: {
        'process.env': {}
    },
    build: {
        lib: {
            entry: {
                index: resolve(__dirname, 'src/index.ts'),
            },
            name: 'EtherealNexusUISpectrum',
            formats: ['umd'],
            fileName: (format, entryName) => `${entryName}.esm.js`,
        },
        sourcemap: false, // Enable source maps for debugging
        minify: true, // Do not minify JS for easier debugging
        rollupOptions: {
            // Don't externalize anything - bundle everything for standalone web components
            external: [],
            output: {
                globals: {},
            },
        },
    },
}));
