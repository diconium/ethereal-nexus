import { jsonb, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import {users} from "@/data/users/schema";

export const eventsTypeEnum = pgEnum('event_type', [
  'component_deactivated',
  'component_activated',
  'component_update',
  'project_component_deactivated',
  'project_component_activated',
  'project_component_version_updated',
  'project_component_added',
  'project_component_removed',
  'project_created',
  'project_updated',
  'project_member_permissions_updated',
  'project_member_added',
  'customEvent']);

export const events = pgTable("event", {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  type: eventsTypeEnum('type'),
  resource_id: uuid('resource_id').notNull(),
  user_id: uuid('user_id').notNull().references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  data: jsonb('data'),
})