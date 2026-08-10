/**
 * CMS Connector type registry: the extensible set of supported connector
 * types, their per-type configuration Zod schemas, and UI metadata.
 *
 * Modeled on `data/ai/provider.ts`. Adding a new CMS means: add a key here,
 * add its config schema, add its connector implementation, and register it in
 * `connectors/index.ts`. No Nexus Core changes required.
 */

import { z } from 'zod';

export const CMS_CONNECTOR_KEYS = [
  'aem',
  'strapi',
  'firstspirit',
  'contentful',
  'datocms',
] as const;

export type CmsConnectorKey = (typeof CMS_CONNECTOR_KEYS)[number];

export const cmsConnectorKeySchema = z.enum(CMS_CONNECTOR_KEYS);

/* ---------------------------- config schemas ---------------------------- */

const authBasic = z.object({
  method: z.literal('basic'),
  username: z.string().min(1),
  password: z.string().min(1),
});

const authOAuth = z.object({
  method: z.literal('oauth'),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
});

export const aemConfigSchema = z.object({
  name: z.string().min(1, 'Connection name is required.'),
  authorUrl: z.string().url('A valid Author URL is required.'),
  auth: z.discriminatedUnion('method', [authBasic, authOAuth]),
  /** The AEM project to scope discovery to, e.g. "stihl" (the /content child). */
  project: z.string().min(1, 'A project is required.'),
  /**
   * Extra /apps resource-type roots to include as shared components, beyond
   * the project's own /apps/<project> tree (manual additions).
   */
  extraAppPaths: z.array(z.string()).optional().default([]),
  /**
   * Extra DAM asset folder paths to include beyond what is inferred from
   * referenced assets (manual additions).
   */
  assetPaths: z.array(z.string()).optional().default([]),
  timeoutMs: z.number().int().positive().optional().default(30000),
  allowSelfSignedSsl: z.boolean().optional().default(false),
});
export type AemConfig = z.infer<typeof aemConfigSchema>;

export const strapiConfigSchema = z.object({
  name: z.string().min(1, 'Connection name is required.'),
  serverUrl: z.string().url('A valid Server URL is required.'),
  apiToken: z.string().min(1, 'An API token is required.'),
});
export type StrapiConfig = z.infer<typeof strapiConfigSchema>;

export const firstSpiritConfigSchema = z.object({
  name: z.string().min(1, 'Connection name is required.'),
  serverUrl: z.string().url('A valid Server URL is required.'),
  username: z.string().min(1),
  password: z.string().min(1),
});
export type FirstSpiritConfig = z.infer<typeof firstSpiritConfigSchema>;

export const contentfulConfigSchema = z.object({
  name: z.string().min(1, 'Connection name is required.'),
  /**
   * Content Delivery API token (read-only). Used for Discovery + Validation
   * against the delivery/preview API. This is a "Content Delivery / Preview
   * API — access token" from Settings → API keys.
   */
  deliveryToken: z.string().min(1, 'A Content Delivery API token is required.'),
  /**
   * Content Management API token (Personal Access Token / OAuth). Only required
   * for Provisioning (writes). Discovery never needs it. Generate one under
   * Settings → CMA tokens → Personal Access Tokens.
   */
  managementToken: z.string().optional().default(''),
  /** Delivery API host (cdn.contentful.com); Preview uses preview.contentful.com. */
  deliveryHost: z
    .string()
    .url('A valid Delivery API host is required.')
    .optional()
    .default('https://cdn.contentful.com'),
  /** Management API host (only used when provisioning). */
  apiHost: z
    .string()
    .url('A valid Management API host is required.')
    .optional()
    .default('https://api.contentful.com'),
  /** When true, discovery reads unpublished content via the Preview API. */
  usePreview: z.boolean().optional().default(false),
  spaceId: z.string().min(1, 'A Space ID is required.'),
  /** Environment within the space (e.g. "master"). */
  environment: z.string().min(1).optional().default('master'),
  timeoutMs: z.number().int().positive().optional().default(30000),
});
export type ContentfulConfig = z.infer<typeof contentfulConfigSchema>;

export const datoCmsConfigSchema = z.object({
  name: z.string().min(1),
  apiToken: z.string().min(1),
});
export type DatoCmsConfig = z.infer<typeof datoCmsConfigSchema>;

/** Map a connector key to its config schema. */
export const cmsConfigSchemas = {
  aem: aemConfigSchema,
  strapi: strapiConfigSchema,
  firstspirit: firstSpiritConfigSchema,
  contentful: contentfulConfigSchema,
  datocms: datoCmsConfigSchema,
} as const satisfies Record<CmsConnectorKey, z.ZodTypeAny>;

/** A discriminated schema for any connector config, tagged with its key. */
export const cmsConnectorConfigSchema = z.union([
  aemConfigSchema,
  strapiConfigSchema,
  firstSpiritConfigSchema,
  contentfulConfigSchema,
  datoCmsConfigSchema,
]);
export type CmsConnectorConfig = z.infer<typeof cmsConnectorConfigSchema>;

export function getCmsConfigSchema(key: CmsConnectorKey) {
  return cmsConfigSchemas[key];
}

/**
 * Top-level config field paths that hold secrets (never returned to the client
 * and preserved on edit when submitted blank). Nested auth secrets are handled
 * via the `auth.*` markers.
 */
export const CMS_SECRET_FIELDS: Record<CmsConnectorKey, string[]> = {
  aem: ['auth.password', 'auth.clientSecret'],
  strapi: ['apiToken'],
  firstspirit: ['password'],
  contentful: ['deliveryToken', 'managementToken'],
  datocms: ['apiToken'],
};

/** Placeholder returned to the UI in place of a stored secret. */
export const SECRET_PLACEHOLDER = '__KEEP__';

/* ------------------------------ UI metadata ----------------------------- */

export type CmsConnectorOption = {
  key: CmsConnectorKey;
  name: string;
  vendor?: string;
  description: string;
  /** Whether an implementation is available/enabled for selection. */
  available: boolean;
};

export const CMS_CONNECTOR_OPTIONS: Record<CmsConnectorKey, CmsConnectorOption> =
  {
    aem: {
      key: 'aem',
      name: 'Adobe Experience Manager',
      vendor: 'Adobe',
      description: 'Connect to AEM Author (Cloud Service or on-prem).',
      available: true,
    },
    strapi: {
      key: 'strapi',
      name: 'Strapi',
      description: 'Connect to a Strapi headless CMS via REST API.',
      available: true,
    },
    firstspirit: {
      key: 'firstspirit',
      name: 'FirstSpirit',
      description: 'Connect to a FirstSpirit server and project.',
      available: false,
    },
    contentful: {
      key: 'contentful',
      name: 'Contentful',
      description: 'Connect to a Contentful space.',
      available: true,
    },
    datocms: {
      key: 'datocms',
      name: 'DatoCMS',
      description: 'Connect to a DatoCMS project.',
      available: false,
    },
  };

export function getCmsConnectorLabel(key: CmsConnectorKey) {
  return CMS_CONNECTOR_OPTIONS[key]?.name ?? key;
}
