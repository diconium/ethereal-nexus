import { z } from 'zod';

export const highlightSchema = z.object({
  title: z.string(),
  description: z.string(),
});

export const catalogueItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  features: z.array(z.string()).default([]),
  highlights: z.array(highlightSchema).default([]),
  asset_url: z.string().nullable().default(null),
  attributes: z
    .record(z.string(), z.union([z.string(), z.array(z.string()), z.null()]))
    .default({}),
});

export const facetValueSchema = z.object({
  value: z.string(),
  count: z.number(),
});

export const facetsSchema = z.record(z.string(), z.array(facetValueSchema));

export const catalogueDataSchema = z.object({
  items: z.array(catalogueItemSchema),
  facets: facetsSchema,
});

export type CatalogueItem = z.infer<typeof catalogueItemSchema>;
export type CatalogueData = z.infer<typeof catalogueDataSchema>;
export type FacetValue = z.infer<typeof facetValueSchema>;

export type CatalogueVersionSummary = {
  id: string;
  created_at: string;
  item_count: number;
};

export const EMPTY_CATALOGUE_DATA: CatalogueData = {
  items: [],
  facets: {},
};
