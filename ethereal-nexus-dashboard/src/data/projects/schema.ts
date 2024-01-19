import { pgTable, text } from 'drizzle-orm/pg-core';
import { components } from '@/data/components/schema';

export const projects = pgTable('project', {
  id: text('id').notNull().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
});

export const projectComponents = pgTable('projectComponents', {
  id: text('id').notNull().primaryKey(),
  projectId: text('projectId')
    .notNull()
    .references(() => projects.id),
  componentId: text('componentId')
    .notNull()
    .references(() => components.id),
});
