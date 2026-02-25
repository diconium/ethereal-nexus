import { pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { users } from '@/data/users/schema';
import { relations } from 'drizzle-orm';

export const members = pgTable(
  'member',
  {
    id: uuid('id').notNull().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    resource: uuid('resource').notNull(),
    permissions: text('permissions').notNull().default('read'),
    role: text('role').notNull().default('user'),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.user_id, table.resource] }),
    };
  },
);
export const membersRelations = relations(members, ({ one }) => ({
  user: one(users, {
    fields: [members.user_id],
    references: [users.id],
  }),
}));
