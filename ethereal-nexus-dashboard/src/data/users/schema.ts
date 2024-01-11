import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable("user", {
  id: text("id").notNull().primaryKey(),
  password: text("password"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  name: text("name"),
  image: text("image"),
})

