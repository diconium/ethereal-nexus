import { pgTable, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { members } from '@/data/member/schema';

export const projects = pgTable("project", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
})
export const projectsRelations = relations(projects, ({ many }) => ({
  components: many(projectComponentConfig),
  members:  many(members),
}));

export const projectComponentConfig = pgTable("project_component_config", {
  id: text("id").notNull().primaryKey(),
  project_id: text("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  component_id: text("component_id").notNull(),
})
export const projectComponentConfigRelations = relations(projectComponentConfig, ({ one }) => ({
  project: one(projects, {
      fields: [projectComponentConfig.project_id],
      references: [projects.id],
    }),
}));
