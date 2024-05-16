import { defineConfig } from 'astro/config';
import mdx from "@astrojs/mdx";
import react from '@astrojs/react';
import icon from "astro-icon";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://diconium.github.io',
  base:"ethereal-nexus",
  integrations: [
    starlight({
      title: 'My delightful docs site',
      customCss: [
        // Path to your Tailwind base styles:
        './src/styles/globals.css',
      ],
    }),
    react({
    experimentalReactChildren: true
  }),
    tailwind({
      applyBaseStyles: false,
    }),
    icon(),
    sitemap(),
  ]
});
