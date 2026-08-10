import { z } from 'zod';

export const PROVISION_JOB_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed',
] as const;
export type ProvisionJobStatus = (typeof PROVISION_JOB_STATUSES)[number];

const provisionOperationSchema = z.object({
  key: z.string(),
  targetId: z.string().optional(),
  status: z.enum(['created', 'updated', 'skipped', 'failed']),
  fields: z
    .array(
      z.object({
        key: z.string(),
        status: z.enum(['created', 'updated', 'skipped', 'failed']),
        message: z.string().optional(),
      }),
    )
    .optional(),
  published: z.boolean().optional(),
  message: z.string().optional(),
});

const provisionResultSchema = z.object({
  ok: z.boolean(),
  created: z.number(),
  updated: z.number(),
  skipped: z.number(),
  failed: z.number(),
  operations: z.array(provisionOperationSchema),
  dryRun: z.boolean().optional(),
  message: z.string().optional(),
});

/** A provision (migration) job for the UI. */
export const provisionJobViewSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  mappingId: z.string(),
  targetConnectionId: z.string().nullable(),
  targetConnectionName: z.string().nullable(),
  targetProvider: z.string().nullable(),
  name: z.string(),
  status: z.enum(PROVISION_JOB_STATUSES),
  progress: z.number(),
  contentTypeCount: z.number(),
  result: provisionResultSchema.nullable(),
  operations: z.array(provisionOperationSchema),
  error: z.string().nullable(),
  started_at: z.date().nullable(),
  finished_at: z.date().nullable(),
  created_at: z.date(),
});
export type ProvisionJobView = z.infer<typeof provisionJobViewSchema>;

/** Lightweight row for the jobs list. */
export const provisionJobSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  targetConnectionName: z.string().nullable(),
  targetProvider: z.string().nullable(),
  status: z.enum(PROVISION_JOB_STATUSES),
  progress: z.number(),
  contentTypeCount: z.number(),
  created: z.number(),
  updated: z.number(),
  failed: z.number(),
  created_at: z.date(),
  finished_at: z.date().nullable(),
});
export type ProvisionJobSummary = z.infer<typeof provisionJobSummarySchema>;
