import { createSelectSchema } from 'drizzle-zod';
import {
  componentAssets,
  components,
  componentVersions,
} from './schema';

export const componentsSchema = createSelectSchema(components);

export const componentAssetsSchema = createSelectSchema(componentAssets);

export const componentVersionsSchema = createSelectSchema(componentVersions);
