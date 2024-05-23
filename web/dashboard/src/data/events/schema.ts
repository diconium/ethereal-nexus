import { json, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import {users} from "@/data/users/schema";

export const eventsTypeEnum = pgEnum('event_type', ['component_deactivated','component_activated','component_update','custom']);

export const events = pgTable("event", {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  type: eventsTypeEnum('type'),
  user_id: text('user_id').notNull().references(() => users.id,{onDelete: 'cascade'}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  data: json('data'),
})
