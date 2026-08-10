import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from '@/data/projects/schema';

/**
 * DESIGN DOMAIN tables — the Nexus Library.
 *
 * User-owned canonical content model, project-scoped. Independent of the
 * Discovery domain (`cms_blueprint_*`) and of the production `component`
 * tables. Nothing here is mutated by discovery.
 */

/** A project's Nexus Library (canonical model container). */
export const nexusLibraries = pgTable(
  'nexus_library',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('nexus_library_project_idx').on(table.project_id)],
);

/**
 * A canonical definition: Component / Content Type / Layout.
 * `dialog` holds the Nexus dialog schema (fields) for components & content
 * types; `composition` holds the region/component-slot layout for layouts.
 */
export const nexusLibraryDefinitions = pgTable(
  'nexus_library_definition',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    library_id: uuid('library_id')
      .notNull()
      .references(() => nexusLibraries.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // component | contentType | layout
    key: text('key').notNull(),
    name: text('name').notNull(),
    group: text('group'),
    /** canonical | generated | review — maturity/curation status. */
    status: text('status').notNull().default('generated'),
    description: text('description'),
    tags: jsonb('tags').notNull().default(sql`'[]'::jsonb`),
    dialog: jsonb('dialog').notNull().default(sql`'{"dialog":[]}'::jsonb`),
    composition: jsonb('composition'),
    source_hint: jsonb('source_hint'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('nexus_lib_def_library_idx').on(table.library_id),
    uniqueIndex('nexus_lib_def_unique_idx').on(
      table.library_id,
      table.kind,
      table.key,
    ),
  ],
);
