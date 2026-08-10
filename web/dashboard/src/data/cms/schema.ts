import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects, environments } from '@/data/projects/schema';

/** Catalogue of available connector types (mirrors the code registry). */
export const cmsProviders = pgTable('cms_provider', {
  id: uuid('id').notNull().primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  version: text('version').notNull().default('1.0.0'),
  icon: text('icon'),
  description: text('description'),
  available: boolean('available').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * A configured connector instance, e.g. "STIHL AEM Production".
 * `configuration` = AES-GCM-encrypted JSON. `capabilities`/`health` are cached
 * from Capability Discovery for dashboards.
 */
export const cmsConnections = pgTable(
  'cms_connection',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    environment_id: uuid('environment_id').references(() => environments.id, {
      onDelete: 'cascade',
    }),
    provider: text('provider').notNull(),
    name: text('name').notNull(),
    configuration: text('configuration').notNull(),
    status: text('status').notNull().default('draft'),
    /** Connection role: source (read/discover) | target (write/provision) | general (undesignated). */
    role: text('role').notNull().default('general'),
    /** Cached discovered capabilities: Capability[] as JSON. */
    capabilities: jsonb('capabilities').notNull().default(sql`'[]'::jsonb`),
    /** Cached health object. */
    health: jsonb('health'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('cms_connection_project_idx').on(table.project_id),
    index('cms_connection_project_env_idx').on(
      table.project_id,
      table.environment_id,
    ),
  ],
);

/** One row per validation task run for a connection. */
export const connectionValidations = pgTable(
  'cms_connection_validation',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    connection_id: uuid('connection_id')
      .notNull()
      .references(() => cmsConnections.id, { onDelete: 'cascade' }),
    task: text('task').notNull(),
    status: text('status').notNull(),
    message: text('message'),
    duration_ms: integer('duration_ms'),
    executed_at: timestamp('executed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('cms_connection_validation_connection_idx').on(table.connection_id),
  ],
);

/**
 * Blueprint Definition: the STABLE structure of a CMS (components, templates,
 * models, relationships). One per connection (+ optional project). Changes
 * rarely; snapshots reference it.
 */
export const blueprintDefinitions = pgTable(
  'cms_blueprint_definition',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    connection_id: uuid('connection_id')
      .notNull()
      .references(() => cmsConnections.id, { onDelete: 'cascade' }),
    project_ref: text('project_ref'),
    name: text('name').notNull(),
    discovered_by: text('discovered_by'),
    description: text('description'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('cms_bp_def_connection_idx').on(table.connection_id),
  ],
);

/**
 * Blueprint Snapshot: the discovered STATE at a point in time (Git-like).
 * Versioned per Definition. Holds nodes/edges + a computed change set.
 */
export const blueprintSnapshots = pgTable(
  'cms_blueprint_snapshot',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    definition_id: uuid('definition_id')
      .notNull()
      .references(() => blueprintDefinitions.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    discovered_by: text('discovered_by'),
    /** Totals by node kind for quick stats: Record<NodeKind, number>. */
    stats: jsonb('stats').notNull().default(sql`'{}'::jsonb`),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('cms_bp_snapshot_definition_idx').on(table.definition_id),
  ],
);

/** A node in the Blueprint knowledge graph (belongs to a snapshot). */
export const blueprintNodes = pgTable(
  'cms_blueprint_node',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    snapshot_id: uuid('snapshot_id')
      .notNull()
      .references(() => blueprintSnapshots.id, { onDelete: 'cascade' }),
    /** 'definition' | 'snapshot' — which layer this node belongs to. */
    layer: text('layer').notNull().default('snapshot'),
    kind: text('kind').notNull(),
    external_id: text('external_id').notNull(),
    name: text('name').notNull(),
    attributes: jsonb('attributes').notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [
    index('cms_bp_node_snapshot_idx').on(table.snapshot_id),
    index('cms_bp_node_kind_idx').on(table.snapshot_id, table.kind),
  ],
);

/** A typed edge in the Blueprint knowledge graph (belongs to a snapshot). */
export const blueprintEdges = pgTable(
  'cms_blueprint_edge',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    snapshot_id: uuid('snapshot_id')
      .notNull()
      .references(() => blueprintSnapshots.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    from_external_id: text('from_external_id').notNull(),
    to_external_id: text('to_external_id').notNull(),
  },
  (table) => [index('cms_bp_edge_snapshot_idx').on(table.snapshot_id)],
);

/** A computed change between a snapshot and its predecessor. */
export const blueprintChanges = pgTable(
  'cms_blueprint_change',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    snapshot_id: uuid('snapshot_id')
      .notNull()
      .references(() => blueprintSnapshots.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // added | removed | changed
    target: text('target').notNull(), // node | edge
    node_kind: text('node_kind'),
    edge_type: text('edge_type'),
    external_id: text('external_id').notNull(),
    name: text('name'),
  },
  (table) => [index('cms_bp_change_snapshot_idx').on(table.snapshot_id)],
);

/** A discovery run against a connection that produces a snapshot. */
export const discoveryJobs = pgTable(
  'cms_discovery_job',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    connection_id: uuid('connection_id')
      .notNull()
      .references(() => cmsConnections.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
    progress: integer('progress').notNull().default(0),
    scope: jsonb('scope').notNull().default(sql`'[]'::jsonb`),
    snapshot_id: uuid('snapshot_id'),
    started_at: timestamp('started_at', { withTimezone: true }),
    finished_at: timestamp('finished_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('cms_discovery_job_connection_idx').on(table.connection_id),
  ],
);
