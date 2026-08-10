/**
 * Core, CMS-independent domain types for the CMS Connector architecture.
 *
 * A Blueprint is a KNOWLEDGE GRAPH: Nodes + typed Edges, split into a stable
 * Definition and versioned Snapshots (see AGENTS.md §0, §5). No CMS-specific
 * knowledge lives here — connectors translate a concrete CMS into these shapes.
 */

/* ----------------------------- task results --------------------------- */

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'warning'
  | 'skipped';

export interface TaskResult {
  status: Extract<TaskStatus, 'success' | 'error' | 'warning'>;
  message?: string;
  data?: unknown;
}

export interface ValidationResult {
  ok: boolean;
  tasks: Array<{
    id: string;
    name: string;
    description?: string;
    status: Extract<TaskStatus, 'success' | 'error' | 'warning' | 'skipped'>;
    message?: string;
    durationMs?: number;
  }>;
}

export interface AuthResult {
  ok: boolean;
  message?: string;
  token?: string;
  expiresAt?: string;
}

/* --------------------------- capabilities ----------------------------- */

/** Capability keys a connection may support (discovered live). */
export const CAPABILITY_KEYS = [
  'cloud',
  'on-prem',
  'graphql',
  'rest',
  'assets',
  'content-fragments',
  'editable-templates',
  'translation',
  'publishing',
  'workflow',
] as const;
export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

/** A single discovered capability of a connection. */
export interface Capability {
  key: CapabilityKey;
  supported: boolean;
  detail?: string;
}

/**
 * A rich feature a connector exposes (replaces the old flat Capability[]).
 * Lets engines choose exporters/importers based on real support.
 */
export interface Feature {
  id: string;
  name: string;
  supported: boolean;
  readOnly?: boolean;
  version?: string;
  /** Other feature ids this feature depends on. */
  requires?: string[];
}

/** Aggregate connection health for dashboards. */
export interface ConnectionHealth {
  score: number; // 0..100
  warnings: number;
  missingCapabilities: number;
  authExpiresInDays?: number;
  status: 'healthy' | 'warning' | 'error';
}

/** Normalized CMS "project" concept (AEM site, FirstSpirit project, …). */
export interface Project {
  id: string;
  name: string;
  description?: string;
}

/* ------------------------------ the graph ----------------------------- */

/** Node kinds in the Blueprint knowledge graph. */
export const NODE_KINDS = [
  'site',
  'page',
  'component',
  'field',
  'asset',
  'assetFolder',
  'model',
  'template',
  'editableTemplate',
  'policy',
  'dialog',
  'language',
  'reference',
  'resourceType',
  'graphqlSchema',
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

/** Typed edges in the Blueprint knowledge graph. */
export const EDGE_TYPES = [
  'contains',
  'references',
  'inherits',
  'uses',
  'extends',
  'belongsTo',
  'localizedAs',
  'generatedFrom',
] as const;
export type EdgeType = (typeof EDGE_TYPES)[number];

/** A field on a component / content model. */
export interface FieldDef {
  name: string;
  type: string;
  required?: boolean;
}

/**
 * Node attribute values. Primitives for simple facts (path, resourceType) plus
 * structured values for richer detail (fields, allowed children/parents).
 */
export type NodeAttributeValue =
  | string
  | number
  | boolean
  | undefined
  | FieldDef[]
  | string[];

/** A graph node emitted by a connector. */
export interface GraphNode {
  /** Connector-stable identity within the graph (usually the external id). */
  externalId: string;
  kind: NodeKind;
  name: string;
  attributes?: Record<string, NodeAttributeValue>;
}

/** A graph edge referencing nodes by their externalId. */
export interface GraphEdge {
  fromExternalId: string;
  toExternalId: string;
  type: EdgeType;
}

/** Whether a node/edge belongs to the stable Definition or a Snapshot. */
export type GraphLayer = 'definition' | 'snapshot';

/**
 * Output of running one discovery scope: nodes + edges + which layer they
 * belong to. The Builder persists these into the graph.
 */
export interface ScopeOutput {
  nodes: Array<GraphNode & { layer: GraphLayer }>;
  edges: GraphEdge[];
  /** Server-side totals per node kind (may exceed captured nodes). */
  totals?: Partial<Record<NodeKind, number>>;
}

/** Generic, CMS-neutral discovery scopes (see AGENTS.md §4). */
export const DISCOVERY_SCOPES = [
  'structure',
  'content-types',
  'relationships',
  'assets',
  'metadata',
  'languages',
  'permissions',
] as const;
export type DiscoveryScope = (typeof DISCOVERY_SCOPES)[number];

/* --------------------------- diff / changes --------------------------- */

export type ChangeKind = 'added' | 'removed' | 'changed';

export interface BlueprintChange {
  kind: ChangeKind;
  target: 'node' | 'edge';
  nodeKind?: NodeKind;
  edgeType?: EdgeType;
  externalId: string;
  name?: string;
}

/* --------------------- NexusTree (export/import) ---------------------- */

export interface NexusNode {
  id: string;
  type: string;
  name: string;
  fields: Record<string, unknown>;
  children?: NexusNode[];
}

export interface NexusTree {
  connection: string;
  blueprint: string;
  root: NexusNode;
}

export interface ExportOptions {
  projectId: string;
  include?: DiscoveryScope[];
  languages?: string[];
}

export interface ImportResult {
  ok: boolean;
  created: number;
  updated: number;
  failed: number;
  message?: string;
}

/** Static connector metadata (independent of any connection). */
export interface CMSMetadata {
  key: string;
  name: string;
  version: string;
  description?: string;
  vendor?: string;
}
