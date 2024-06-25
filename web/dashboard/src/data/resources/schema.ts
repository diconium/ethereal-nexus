
import { pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';

export const resources = pgTable('resources', {
  id: uuid('id').notNull().primaryKey().defaultRandom(),
  resource_id: text('resource_id').notNull(),
  type: text('type').notNull(),
});