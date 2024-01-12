import {
  pgTable,
  text,
  foreignKey,
  serial,
  integer,
} from 'drizzle-orm/pg-core';
import { components } from '@/data/components/schema';

export const projects = pgTable('project', {
  id: serial('id').notNull().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  components: integer('components')
    .array()
    .notNull()
    .references(() => components.id),
});
