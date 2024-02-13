import { json, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const assetTypeEnum = pgEnum('asset_type', ['css', 'js']);

export const components = pgTable("component", {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  slug: text('slug').unique(),
  name: text("name").notNull(),
  title: text("title"),
  description: text("description"),
})
export const componentsRelations = relations(components, ({ many }) => ({
  versions:  many(componentVersions),
}));

export const componentVersions = pgTable("component_version", {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  component_id:  uuid('component_id').references(() => components.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  dialog: json('dialog'),
  created_at: timestamp("created_at").defaultNow().notNull(),
})
export const componentVersionsRelations = relations(componentVersions, ({ one }) => ({
  component: one(components, {
    fields: [componentVersions.component_id],
    references: [components.id],
  }),
}));

export const componentAssets = pgTable("component_assets", {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  component_id:  uuid('component_id').references(() => components.id, { onDelete: 'cascade' }),
  version_id: uuid('version_id').references(() => componentVersions.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  type: assetTypeEnum('type'),
})
export const componentAssetsRelations = relations(componentAssets, ({ one }) => ({
  version: one(componentVersions, {
    fields: [componentAssets.version_id],
    references: [componentVersions.id],
  }),
  component: one(components, {
    fields: [componentAssets.component_id],
    references: [components.id],
  }),
}));
