import { z } from 'zod';
import { MAPPING_STATUSES } from './types';
import { cmsConnectorKeySchema } from '@/data/cms/config';

export const fieldMapEntrySchema = z.object({
  sourceField: z.string(),
  targetField: z.string(),
  transform: z.string().optional(),
});
export type FieldMapEntry = z.infer<typeof fieldMapEntrySchema>;

export const suggestionScoreSchema = z.object({
  definitionId: z.string(),
  key: z.string(),
  name: z.string(),
  confidence: z.number(),
  reason: z.string(),
});

export const mappingRowSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  blueprintDefinitionId: z.string(),
  libraryId: z.string(),
  targetConnectionId: z.string().nullable(),
  name: z.string(),
});
export type MappingRow = z.infer<typeof mappingRowSchema>;

/** A source item + its current link + ranked suggestions (workbench row). */
export const mappingItemSchema = z.object({
  kind: z.string(),
  key: z.string(),
  name: z.string(),
  group: z.string().nullable(),
  sourceFields: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean().optional(),
    }),
  ),
  status: z.enum(MAPPING_STATUSES),
  confidence: z.number(),
  targetDefinitionId: z.string().nullable(),
  fieldMap: z.array(fieldMapEntrySchema),
  transform: z.record(z.string(), z.unknown()),
  note: z.string().nullable(),
  mappedBy: z.string().nullable(),
  mappedByName: z.string().nullable(),
  updatedAt: z.date().nullable(),
  mappingType: z.string().nullable(),
  suggestions: z.array(suggestionScoreSchema),
  /** `kind:key` of other items this item requires (layout → components it uses). */
  dependsOn: z.array(z.string()),
});
export type MappingItem = z.infer<typeof mappingItemSchema>;

export const mappingStatsSchema = z.object({
  total: z.number(),
  mapped: z.number(),
  needsReview: z.number(),
  missing: z.number(),
  conflict: z.number(),
  skipped: z.number(),
  percent: z.number(),
});
export type MappingStats = z.infer<typeof mappingStatsSchema>;

/** Full workbench payload for a mapping. */
export const mappingWorkbenchSchema = z.object({
  mapping: mappingRowSchema,
  blueprintName: z.string(),
  provider: cmsConnectorKeySchema,
  targetConnectionName: z.string().nullable(),
  items: z.array(mappingItemSchema),
  stats: mappingStatsSchema,
});
export type MappingWorkbench = z.infer<typeof mappingWorkbenchSchema>;

/** Lightweight mapping summary for lists / pickers. */
export const mappingSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  blueprintDefinitionId: z.string(),
  targetConnectionId: z.string().nullable(),
  stats: mappingStatsSchema,
});
export type MappingSummary = z.infer<typeof mappingSummarySchema>;
