import { pgTable, serial, text } from 'drizzle-orm/pg-core';

export const components = pgTable('component', {
  id: text('id').notNull().primaryKey(),
  name: text('name').notNull(),
  version: text('version').notNull(),
  assets: serial('assets')
    .notNull()
    .references(() => componentAssets.id),
  dialogProperties: serial('dialogProperties')
    .notNull()
    .references(() => componentDialogProperties.id),
});

export const componentAssets = pgTable('componentAsset', {
  id: serial('id').notNull().primaryKey(),
  type: text('type').notNull(),
  path: text('path').notNull(),
});

export const componentDialogProperties = pgTable('componentDialogProperty', {
  id: serial('id').notNull().primaryKey(),
  type: text('type').notNull(),
  placeholder: text('placeholder').notNull(),
  label: text('label').notNull(),
});
