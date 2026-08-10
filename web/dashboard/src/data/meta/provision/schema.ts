import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { projects } from '@/data/projects/schema';
import { cmsConnections } from '@/data/cms/schema';

/**
 * PROVISION DOMAIN table — Migration Jobs.
 *
 * A provision job materializes a Mapping (via its generated ProvisionPlan) into
 * a target connection. It runs "fire-and-poll": created as `pending`, executed
 * by the job-detail page, and polled until `completed`/`failed`. Structure only
 * (content types) — never entries or assets.
 */
export const nexusProvisionJobs = pgTable(
  'nexus_provision_job',
  {
    id: uuid('id').notNull().primaryKey().defaultRandom(),
    project_id: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /** The mapping this job was generated from (Mapping domain — not FK'd). */
    mapping_id: uuid('mapping_id').notNull(),
    /** The target connection to provision into. */
    target_connection_id: uuid('target_connection_id').references(
      () => cmsConnections.id,
      { onDelete: 'set null' },
    ),
    name: text('name').notNull(),
    /** pending | running | completed | failed */
    status: text('status').notNull().default('pending'),
    progress: integer('progress').notNull().default(0),
    /** The CMS-independent ProvisionPlan snapshot executed by this job. */
    plan: jsonb('plan').notNull().default(sql`'{}'::jsonb`),
    /** ProvisionResult summary (counts + flags). */
    result: jsonb('result'),
    /** Per-content-type ProvisionOperation[] detail. */
    operations: jsonb('operations').notNull().default(sql`'[]'::jsonb`),
    error: text('error'),
    started_at: timestamp('started_at', { withTimezone: true }),
    finished_at: timestamp('finished_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('nexus_provision_job_project_idx').on(table.project_id),
    index('nexus_provision_job_mapping_idx').on(table.mapping_id),
  ],
);
