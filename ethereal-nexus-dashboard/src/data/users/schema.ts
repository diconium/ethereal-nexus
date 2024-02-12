import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable("user", {
  id: text("id").notNull().primaryKey(),
  password: text("password"),
  email: text("email").notNull().unique(),
  email_verified: timestamp("emailVerified", { mode: "date" }),
  name: text("name"),
  image: text("image"),
})

export const apiKeys = pgTable("api_key", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  user_id: text("user_id").notNull().references(() => users.id),
  resources: text("resources").array(),
  created_at: timestamp("created_at").defaultNow().notNull(),
})