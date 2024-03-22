import { defineConfig } from 'astro/config';
import mdx from "@astrojs/mdx";
import react from '@astrojs/react';
import icon from "astro-icon";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  integrations: [mdx({
    syntaxHighlight: "shiki",
    shikiConfig: { theme: "github-dark-dimmed" },
    gfm: true,
  }),
    react({
    experimentalReactChildren: true
  }),
    tailwind(),
    icon(),
    sitemap(),
  ]
});