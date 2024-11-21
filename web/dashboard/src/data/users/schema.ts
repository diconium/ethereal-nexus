import { jsonb, pgEnum, pgTable, text, timestamp, uuid, primaryKey, integer } from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from "next-auth/adapters"

export const userRolesEnum = pgEnum('roles', ['admin', 'user', 'viewer']);

export const users = pgTable('user', {
  id: uuid('id').notNull().primaryKey().defaultRandom(),
  password: text('password'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
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

export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
)

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => ({
    compositePk: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  })
)
