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
export type ComponentVersion = z.infer<typeof componentVersionsSchema>;

export const componentsWithVersions = componentsSchema.extend({
  versions: z.array(componentVersionsSchema.pick({version: true}))
})

export const componentVersionsCreateSchema = createInsertSchema(
  componentVersions,
)
  .omit({ id: true })
  .required({ component_id: true, version: true });

export const componentAssetsCreateSchema = createInsertSchema(componentAssets)
  .omit({ id: true })
  .required({ component_id: true, version_id: true, url: true, type: true });

export const componentWithVersionSchema = componentsSchema.extend({
  version: componentVersionsSchema.pick({ version: true, dialog: true }),
});
export type ComponentWithVersion = z.infer<typeof componentWithVersionSchema>;

export const componentsUpsertSchema = createInsertSchema(components)
  .omit({ id: true })
  .required({ name: true })
  .extend(componentVersionsSchema.pick({ version: true, dialog: true }).shape)
  .transform((val) => ({
    ...val,
    slug: val.slug ?? val.name.toLowerCase().replaceAll(' ', '_'),
  }));
export type ComponentToUpsert = z.infer<typeof componentsUpsertSchema>;