import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import tailwind from '@astrojs/tailwind';

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: 'https://diconium.github.io',
  base: 'ethereal-nexus',
  integrations: [starlight({
    components: {
      SiteTitle: './src/components/starlight/SiteTitle.astro',
      Hero: './src/components/starlight/Hero.astro'
    },
    title: 'Ethereal Nexus',
    social: {
      github: 'https://diconium.github.io/ethereal-nexus'
    },
    sidebar: [{
      label: 'Getting Started',
      autogenerate: {
        directory: 'setup'
      }
    }, {
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
    }],
    customCss: ['./src/tailwind.css']
  }), tailwind({
    applyBaseStyles: false
  }), react()]
});
