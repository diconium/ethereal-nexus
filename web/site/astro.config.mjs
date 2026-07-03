import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://diconium.github.io',
  base: 'ethereal-nexus',
  // Astro 7 default is 'jsx' whitespace (strips spaces between inline elements).
  // Keep 'true' (HTML-aware) to preserve spacing in components like Hero.
  compressHTML: true,
  integrations: [starlight({
    components: {
      SiteTitle: './src/components/starlight/SiteTitle.astro',
      Hero: './src/components/starlight/Hero.astro'
    },
    title: 'Ethereal Nexus Repo',
    social: [
      {
        label: 'GitHub',
        href: 'https://github.com/diconium/ethereal-nexus',
        icon: 'github'
      }
    ],
    sidebar: [
      {
        label: 'Getting Started',
        // Starlight 0.39+: autogenerate must be wrapped in items array
        items: [{ autogenerate: { directory: 'setup' } }]
      },
      {
        label: 'Authentication',
        items: [{ autogenerate: { directory: 'authentication' } }],
        badge: {
          text: 'New',
          variant: 'tip'
        }
      },
      {
        label: 'Connectors',
        items: [
          'connectors/connectors',
          'connectors/strapi',
          {
            label: 'AEM',
            items: [
              'connectors/aem',
              'connectors/aem/ssr',
            ]
          },
        ]
      },
      {
        label: 'Dashboard',
        items: [{ autogenerate: { directory: 'dashboard' } }]
      },
      {
        label: 'Reference',
        items: [{ autogenerate: { directory: 'reference' } }]
      },
      {
        label: 'Dialogs',
        items: [{ autogenerate: { directory: 'dialogs' } }]
      }
    ],
    customCss: ['./src/tailwind.css']
  }), react()],

  vite: {
    plugins: [tailwindcss({})]
  }
});
