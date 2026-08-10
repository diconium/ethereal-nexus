import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import {
  blueprintDefinitions,
  blueprintSnapshots,
  cmsConnections,
  connectionValidations,
  discoveryJobs,
} from './schema';
import { cmsConnectorConfigSchema, cmsConnectorKeySchema } from './config';
import {
  CAPABILITY_KEYS,
  DISCOVERY_SCOPES,
  EDGE_TYPES,
  NODE_KINDS,
} from './types';

/* --------------------------- connections ------------------------------ */

export const capabilitySchema = z.object({
  key: z.enum(CAPABILITY_KEYS),
  supported: z.boolean(),
  detail: z.string().optional(),
});

export const connectionHealthSchema = z.object({
  score: z.number(),
  warnings: z.number(),
  missingCapabilities: z.number(),
  authExpiresInDays: z.number().optional(),
  status: z.enum(['healthy', 'warning', 'error']),
});
export type ConnectionHealthDto = z.infer<typeof connectionHealthSchema>;

export const cmsConnectionSchema = createSelectSchema(cmsConnections).extend({
  provider: cmsConnectorKeySchema,
});
export type CmsConnection = z.infer<typeof cmsConnectionSchema>;

/** Connection returned to the UI (config stripped; capabilities/health typed). */
export const cmsConnectionViewSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  environment_id: z.string().nullable(),
  provider: cmsConnectorKeySchema,
  name: z.string(),
  /** Normalised validation status (mapped from DB values: draft→unvalidated, active→valid, error→invalid). */
  status: z
    .string()
    .transform((s) => {
      if (s === 'active') return 'valid' as const;
      if (s === 'error') return 'invalid' as const;
      return 'unvalidated' as const; // draft or any unknown value
    }),
  /** Connection role: source (read/discover) | target (write/provision) | general (undesignated). */
  role: z.enum(['source', 'target', 'general']).default('general'),
  capabilities: z.array(capabilitySchema),
  health: connectionHealthSchema.nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});
export type CmsConnectionView = z.infer<typeof cmsConnectionViewSchema>;

export const cmsConnectionInputSchema = z.object({
  id: z.string().optional(),
  project_id: z.string(),
  environment_id: z.string().nullable().optional(),
  provider: cmsConnectorKeySchema,
  /** Connection role declared at creation time. */
  role: z.enum(['source', 'target', 'general']).default('general'),
  config: cmsConnectorConfigSchema,
});
export type CmsConnectionInput = z.infer<typeof cmsConnectionInputSchema>;

export const connectionValidationSchema =
  createSelectSchema(connectionValidations);
export type ConnectionValidation = z.infer<typeof connectionValidationSchema>;

export const discoveryJobSchema = createSelectSchema(discoveryJobs);
export type DiscoveryJob = z.infer<typeof discoveryJobSchema>;

/* ----------------------------- validation ----------------------------- */

export const validationRunSchema = z.object({
  ok: z.boolean(),
  tasks: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      status: z.enum(['success', 'error', 'warning', 'skipped']),
      message: z.string().optional(),
      durationMs: z.number().optional(),
    }),
  ),
});
export type ValidationRun = z.infer<typeof validationRunSchema>;

/** Capability discovery result. */
export const capabilityRunSchema = z.object({
  capabilities: z.array(capabilitySchema),
});
export type CapabilityRun = z.infer<typeof capabilityRunSchema>;

/* ------------------------------- graph -------------------------------- */

export const graphNodeSchema = z.object({
  externalId: z.string(),
  kind: z.enum(NODE_KINDS),
  name: z.string(),
  layer: z.enum(['definition', 'snapshot']),
  attributes: z.record(z.string(), z.unknown()),
});
export type GraphNodeDto = z.infer<typeof graphNodeSchema>;

export const graphEdgeSchema = z.object({
  fromExternalId: z.string(),
  toExternalId: z.string(),
  type: z.enum(EDGE_TYPES),
});
export type GraphEdgeDto = z.infer<typeof graphEdgeSchema>;

export const blueprintChangeSchema = z.object({
  kind: z.enum(['added', 'removed', 'changed']),
  target: z.enum(['node', 'edge']),
  nodeKind: z.enum(NODE_KINDS).optional(),
  edgeType: z.enum(EDGE_TYPES).optional(),
  externalId: z.string(),
  name: z.string().optional(),
});
export type BlueprintChangeDto = z.infer<typeof blueprintChangeSchema>;

/* ---------------------- blueprint builder result ---------------------- */

export const buildRunSchema = z.object({
  ok: z.boolean(),
  definitionId: z.string(),
  snapshotId: z.string(),
  version: z.number(),
  projectId: z.string(),
  tasks: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      scope: z.enum(DISCOVERY_SCOPES),
      status: z.enum(['success', 'error', 'skipped']),
      nodeCount: z.number().optional(),
      message: z.string().optional(),
      durationMs: z.number().optional(),
    }),
  ),
  nodeTotal: z.number(),
  changeCount: z.number(),
});
export type BuildRun = z.infer<typeof buildRunSchema>;

/* --------------------------- read views ------------------------------- */

/** A per-kind stat group with delta (for cards / structure list). */
export const kindGroupSchema = z.object({
  kind: z.enum(NODE_KINDS),
  count: z.number(),
  delta: z.number().nullable(),
});
export type KindGroup = z.infer<typeof kindGroupSchema>;

export const blueprintDefinitionSchema =
  createSelectSchema(blueprintDefinitions);
export const blueprintSnapshotSchema = createSelectSchema(blueprintSnapshots);

/** Blueprint list-view row (definition + latest snapshot summary). */
export const blueprintViewSchema = z.object({
  definitionId: z.string(),
  snapshotId: z.string(),
  name: z.string(),
  version: z.number(),
  created_at: z.date(),
  discoveredBy: z.string().nullable(),
  connectionId: z.string(),
  connectionName: z.string(),
  provider: cmsConnectorKeySchema,
  environment: z.string().nullable(),
  status: z.enum(['ready', 'discovering', 'warning', 'error']),
  totalItems: z.number(),
  groups: z.array(kindGroupSchema),
});
export type BlueprintView = z.infer<typeof blueprintViewSchema>;

/** A single discovered node surfaced in tables / tree / recent feed. */
export const blueprintItemSchema = z.object({
  externalId: z.string(),
  name: z.string(),
  kind: z.enum(NODE_KINDS),
  layer: z.enum(['definition', 'snapshot']),
  attributes: z.record(z.string(), z.unknown()),
});
export type BlueprintItem = z.infer<typeof blueprintItemSchema>;

/** Full detail view for a single Blueprint (definition + latest snapshot). */
export const blueprintDetailSchema = z.object({
  definitionId: z.string(),
  snapshotId: z.string(),
  name: z.string(),
  version: z.number(),
  created_at: z.date(),
  discoveredBy: z.string().nullable(),
  description: z.string().nullable(),
  connectionId: z.string(),
  connectionName: z.string(),
  provider: cmsConnectorKeySchema,
  totalItems: z.number(),
  groups: z.array(kindGroupSchema),
  items: z.array(blueprintItemSchema),
  edges: z.array(graphEdgeSchema),
  changes: z.array(blueprintChangeSchema),
});
export type BlueprintDetail = z.infer<typeof blueprintDetailSchema>;
