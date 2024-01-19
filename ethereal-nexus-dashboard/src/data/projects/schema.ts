import { pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { relations, } from 'drizzle-orm';
import { members } from '@/data/member/schema';
import { components } from '@/data/components/schema';

export const projects = pgTable("project", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
})
export const projectsRelations = relations(projects, ({ many }) => ({
  components: many(projectComponentConfig),
  members:  many(members),
}));

export const projectComponentConfig = pgTable("project_component_config", {
  id: uuid('id').notNull().defaultRandom(),
  project_id: uuid("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  component_id: uuid("component_id").notNull().references(() => components.id ),
},(table) => {
  return {
    pk: primaryKey({ columns: [table.project_id, table.component_id] })
  };
})
export const projectComponentConfigRelations = relations(projectComponentConfig, ({ one }) => ({
  project: one(projects, {
      fields: [projectComponentConfig.project_id],
      references: [projects.id],
    }),
  component: one(components, {
    fields: [projectComponentConfig.component_id],
    references: [components.id],
  })
}));
