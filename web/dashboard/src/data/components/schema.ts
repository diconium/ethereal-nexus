import { json, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const assetTypeEnum = pgEnum('asset_type', ['css', 'js', 'chunk', 'server']);

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
  id: uuid('id').unique().notNull().defaultRandom(),
  component_id:  uuid('component_id').notNull().references(() => components.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  dialog: json('dialog'),
  created_at: timestamp("created_at").defaultNow().notNull(),
  readme: text("readme"),
  changelog: text("changelog"),
},
  (table) => {
    return {
      pk: primaryKey({
        columns: [
          table.component_id,
          table.version,
        ],
      }),
    };
  })
export const componentVersionsRelations = relations(componentVersions, ({ one }) => ({
  component: one(components, {
    fields: [componentVersions.component_id],
    references: [components.id],
  }),
}));

export const componentAssets = pgTable("component_assets", {
  id: uuid('id').unique().notNull().defaultRandom(),
  component_id:  uuid('component_id').notNull().references(() => components.id, { onDelete: 'cascade' }),
  version_id: uuid('version_id').notNull().references(() => componentVersions.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  type: assetTypeEnum('type'),
},
  (table) => {
    return {
      pk: primaryKey({
        columns: [
          table.component_id,
          table.version_id,
          table.url,
        ],
      }),
    };
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
