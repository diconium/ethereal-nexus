import { z } from 'zod';
import {
  LIBRARY_KINDS,
  LIBRARY_STATUSES,
  NEXUS_FIELD_TYPES,
  REGION_LOCATIONS,
} from './types';

const nexusDialogEntrySchema: z.ZodType = z.lazy(() =>
  z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.enum(NEXUS_FIELD_TYPES),
      label: z.string(),
      required: z.boolean().optional(),
      tooltip: z.string().optional(),
      multiple: z.boolean().optional(),
      values: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
      fields: z.array(nexusDialogEntrySchema).optional(),
    })
    .passthrough(),
);

export const nexusDialogSchema = z.object({
  dialog: z.array(nexusDialogEntrySchema),
});

export const metaRegionSchema = z.object({
  key: z.string(),
  name: z.string(),
  location: z.enum(REGION_LOCATIONS),
  allowedComponentKeys: z.array(z.string()),
});

export const layoutCompositionSchema = z.object({
  regions: z.array(metaRegionSchema),
  usesComponentKeys: z.array(z.string()),
});

export const librarySourceHintSchema = z.object({
  cms: z.string().optional(),
  blueprintDefinitionId: z.string().optional(),
  externalId: z.string().optional(),
  resourceType: z.string().optional(),
});

export const libraryDefinitionViewSchema = z.object({
  id: z.string(),
  libraryId: z.string(),
  kind: z.enum(LIBRARY_KINDS),
  key: z.string(),
  name: z.string(),
  group: z.string().nullable(),
  status: z.enum(LIBRARY_STATUSES),
  description: z.string().nullable(),
  tags: z.array(z.string()),
  dialog: nexusDialogSchema,
  composition: layoutCompositionSchema.nullable(),
  sourceHint: librarySourceHintSchema.nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});
export type LibraryDefinitionView = z.infer<typeof libraryDefinitionViewSchema>;

export const nexusLibraryViewSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  definitions: z.array(libraryDefinitionViewSchema),
});
export type NexusLibraryView = z.infer<typeof nexusLibraryViewSchema>;

export const seedResultSchema = z.object({
  libraryId: z.string(),
  created: z.number(),
  updated: z.number(),
  byKind: z.record(z.string(), z.number()),
});
export type SeedResult = z.infer<typeof seedResultSchema>;
