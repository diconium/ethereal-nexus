import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://diconium.github.io',
  base: 'ethereal-nexus',
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
        autogenerate: {
          directory: 'setup'
        }
      },
      {
        label: 'Authentication',
        autogenerate: {
          directory: 'authentication'
        },
        badge: {
          text: 'New',
          variant: 'tip'
        }
      },
      {
        label: 'Connectors',
        autogenerate: {
          directory: 'connectors'
        }
      }, {
        label: 'Dashboard',
        autogenerate: {
          directory: 'dashboard'
        }
      }, {
        label: 'Reference',
        autogenerate: {
          directory: 'reference'
        }
      },{
        label: 'Dialogs',
        autogenerate: {
          directory: 'dialogs'
        }
      }],
    customCss: ['./src/tailwind.css']
  }), react()],

  vite: {
    plugins: [tailwindcss({})]
  }
});
