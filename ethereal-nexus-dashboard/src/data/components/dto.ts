import { createSelectSchema } from 'drizzle-zod';
import {
  componentAssets,
  components,
  componentVersions,
} from './schema';
import { z } from 'zod';

export const componentsSchema = createSelectSchema(components);

export const componentAssetsSchema = createSelectSchema(componentAssets);

export const componentVersionsSchema = createSelectSchema(componentVersions);

export const componentsWithVersions = componentsSchema.extend({
  versions: z.array(componentVersionsSchema.pick({version: true}))
})