import { pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { users } from '@/data/users/schema';
import { projects } from '@/data/projects/schema';
import { relations } from 'drizzle-orm';

export const members = pgTable('member', {
    id: uuid('id').notNull().defaultRandom(),
    user_id: text('user_id').notNull().references(() => users.id),
    resource: uuid('resource').notNull()
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.user_id, table.resource] })
    };
  }
);
export const membersRelations = relations(members, ({ one }) => ({
  user: one(users, {
    fields: [members.user_id],
    references: [users.id]
  }),
  resource: one(projects, {
    fields: [members.resource],
    references: [projects.id]
  })
}));

