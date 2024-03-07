import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import icon from "astro-icon";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  integrations: [react({
    experimentalReactChildren: true
  }), tailwind(), icon(), sitemap(),]
});