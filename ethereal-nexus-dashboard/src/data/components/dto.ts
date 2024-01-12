import { createSelectSchema } from 'drizzle-zod';
import {
  componentAssets,
  componentDialogProperties,
  components,
} from '@/data/components/schema';

export const componentsSchema = createSelectSchema(components);

export const componentAssetsSchema = createSelectSchema(componentAssets);

export const componentDialogPropertiesSchema = createSelectSchema(
  componentDialogProperties,
);
