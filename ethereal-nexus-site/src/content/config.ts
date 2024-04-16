import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    api: z.string().optional(),
  }),
});
export const collections = { docs: defineCollection({ schema: docsSchema() }) };
