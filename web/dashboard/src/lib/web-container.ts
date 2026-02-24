import { WebContainer } from '@webcontainer/api';

let webContainerInstance: WebContainer;

export async function getWebContainerInstance() {
  if (!webContainerInstance) {
    webContainerInstance = await WebContainer.boot();
  }

  return webContainerInstance;
}

export const createIndexFileTemplate = (
  componentName: string | undefined,
  fileName: string | undefined,
  componentProps: any,
) =>
  `
        import { StrictMode } from 'react';
        import { createRoot } from 'react-dom/client';
        import './styles.css';
        import ${componentName} from './${fileName}';
        
        const props = ${componentProps};
        const root = createRoot(document.getElementById('root'));
        root.render(
          <StrictMode>
            <${componentName} ${componentProps ? '{...props}' : ''} />
          </StrictMode>
        );
    `;

export const previewTemplate = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import './styles.css';
    
    const root = createRoot(document.getElementById('root'));
    root.render(
      <React.StrictMode>
        <div></div>
      </React.StrictMode>
    );
`;

export const htmlTemplate = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview</title>
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="/index.tsx"></script>
      </body>
    </html>
`;

export const cssTemplate = `
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
`;

export const tailwindConfigTemplate = `
    /** @type {import('tailwindcss').Config} */
    export default {
      content: ['./*.{js,ts,jsx,tsx}'],
      theme: {
        extend: {},
      },
      plugins: [],
    }
`;

export const postcssConfigTemplate = `
    export default {
      plugins: {
        tailwindcss: {},
        autoprefixer: {},
      },
    }
`;

export const viteConfigTemplate = `
    import { defineConfig } from 'vite';
    import react from '@vitejs/plugin-react';
    
    export default defineConfig({
      plugins: [react()],
      server: {
        host: '0.0.0.0',
        port: 5173
      }
    });
`;
