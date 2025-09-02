import { boolean, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { components, componentVersions } from '@/data/components/schema';

export const projects = pgTable('project', {
  id: uuid('id').notNull().primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
});

export const environments = pgTable('environment', {
  id: uuid('id').notNull().primaryKey().defaultRandom(),
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  secure: boolean('secure').notNull().default(false),
  description: text('description'),
});

export const projectComponentConfig = pgTable(
  'project_component_config',
  {
    id: uuid('id').unique().notNull().defaultRandom(),
    environment_id: uuid('environment_id')
      .notNull()
      .references(() => environments.id, { onDelete: 'cascade' }),
    component_id: uuid('component_id')
      .notNull()
      .references(() => components.id, { onDelete: 'cascade' }),
    component_version: uuid('component_version')
      .references(() => componentVersions.id, { onDelete: 'set null'}),
    is_active: boolean('is_active').notNull().default(true),
  },
  (table) => {
    return {
      pk: primaryKey({
        columns: [
          table.environment_id,
          table.component_id,
        ],
      }),
    };
  },
);

export const featureFlags = pgTable('feature_flags', {
  id: uuid('id').notNull().primaryKey().defaultRandom(),
  project_id: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  component_id: uuid('component_id')
    .references(() => components.id, { onDelete: 'cascade' }),
  environment_id: uuid('environment_id')
    .notNull()
    .references(() => environments.id, { onDelete: 'cascade' }),
  flag_name: text('flag_name').notNull(),
  enabled: boolean('enabled').notNull().default(false),
  description: text('description'),
});
