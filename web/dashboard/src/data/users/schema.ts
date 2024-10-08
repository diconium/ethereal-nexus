import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const userRolesEnum = pgEnum('roles', ['admin', 'user', 'viewer']);

export const users = pgTable('user', {
  id: uuid('id').notNull().primaryKey().defaultRandom(),
  password: text('password'),
  email: text('email').notNull().unique(),
  email_verified: timestamp('emailVerified', { mode: 'date' }),
  name: text('name'),
  image: text('image'),
  role: userRolesEnum('role').notNull().default('user'),
});

export const apiKeys = pgTable('api_key', {
  id: uuid('id').notNull().primaryKey().defaultRandom(),
  key: uuid('key').notNull().unique().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  alias: text('alias'),
  permissions: jsonb('permissions'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const invites = pgTable('invite', {
  id: uuid('id').notNull().primaryKey().defaultRandom(),
  key: uuid('key').notNull().unique().defaultRandom(),
  email: text('email').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
