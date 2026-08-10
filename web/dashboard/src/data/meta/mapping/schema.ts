import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from '@/data/projects/schema';
import { cmsConnections } from '@/data/cms/schema';
import { nexusLibraries, nexusLibraryDefinitions } from '@/data/meta/design/schema';

/**
 * MAPPING DOMAIN tables — the bridge between Discovery and Design.
 *
 * A mapping is project-owned; it references a Blueprint definition (source), a
 * Nexus Library (target), and an optional target connection (the intended
 * output CMS). Multiple mappings are allowed per (project, blueprint).
 */
export const nexusMappings = pgTable(
  'nexus_mapping',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /** Source blueprint definition id (Discovery domain — not FK'd to keep domains loose). */
    blueprint_definition_id: uuid('blueprint_definition_id').notNull(),
    library_id: uuid('library_id')
      .notNull()
      .references(() => nexusLibraries.id, { onDelete: 'cascade' }),
    target_connection_id: uuid('target_connection_id').references(
      () => cmsConnections.id,
      { onDelete: 'set null' },
    ),
    name: text('name').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('nexus_mapping_project_idx').on(table.project_id),
    index('nexus_mapping_blueprint_idx').on(table.blueprint_definition_id),
  ],
);

/** One link per source item: Blueprint node → Library definition. */
export const nexusMappingLinks = pgTable(
  'nexus_mapping_link',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    mapping_id: uuid('mapping_id')
      .notNull()
      .references(() => nexusMappings.id, { onDelete: 'cascade' }),
    blueprint_kind: text('blueprint_kind').notNull(),
    blueprint_node_key: text('blueprint_node_key').notNull(),
    blueprint_node_name: text('blueprint_node_name').notNull(),
    target_definition_id: uuid('target_definition_id').references(
      () => nexusLibraryDefinitions.id,
      { onDelete: 'set null' },
    ),
    status: text('status').notNull().default('missing'),
    confidence: integer('confidence').notNull().default(0),
    field_map: jsonb('field_map').notNull().default(sql`'[]'::jsonb`),
    transform: jsonb('transform').notNull().default(sql`'{}'::jsonb`),
    note: text('note'),
    /** How this item was mapped: 'clone' | 'existing' | 'advanced' */
    mapping_type: text('mapping_type'),
    /** User id who last set status to 'mapped'. */
    mapped_by: uuid('mapped_by'),
    /** Display name of the user who mapped (denormalised for read performance). */
    mapped_by_name: text('mapped_by_name'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('nexus_mapping_link_mapping_idx').on(table.mapping_id),
    uniqueIndex('nexus_mapping_link_unique_idx').on(
      table.mapping_id,
      table.blueprint_kind,
      table.blueprint_node_key,
    ),
  ],
);
