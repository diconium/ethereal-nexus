import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import {
  componentAssets,
  components,
  componentVersions,
} from './schema';
import { z } from 'zod';


export const componentsSchema = createSelectSchema(components);
export type Component = z.infer<typeof componentsSchema>;
export const newComponentsSchema = createInsertSchema(components).transform(val => ({
  ...val,
  slug: val.slug ?? val.name.toLowerCase().replaceAll(' ', '_')
}));
export type NewComponent = z.infer<typeof newComponentsSchema>;

export const componentAssetsSchema = createSelectSchema(componentAssets);

export const componentVersionsSchema = createSelectSchema(componentVersions);

export const componentsWithVersions = componentsSchema.extend({
  versions: z.array(componentVersionsSchema.pick({version: true}))
})