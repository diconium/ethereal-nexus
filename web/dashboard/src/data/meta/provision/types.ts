/**
 * PROVISION DOMAIN — the Provision Plan.
 *
 * A `ProvisionPlan` is the CMS-INDEPENDENT description of the structure to
 * create in a target CMS. It is produced from the Nexus Meta Model (the Design
 * domain's Library, selected via the Mapping domain) and consumed by a
 * connector's `provision(ctx, plan)` method.
 *
 * A connector receives ONLY a ProvisionPlan — it knows nothing about the source
 * CMS (AEM), the Blueprint, or the Mapping. This keeps Nexus Core CMS-agnostic:
 * every connector materializes the same plan into its own native concepts
 * (Contentful content types, AEM templates, …).
 *
 * NOTE: This domain describes STRUCTURE only (content types + fields). It does
 * NOT describe entries, assets, or content — that is Migration, which is out of
 * scope. The shapes are intentionally extensible so Entry/Asset migration and
 * Experiences can be layered on later.
 */

import type { NexusFieldType } from '@/data/meta/design/types';

/* ------------------------------- fields ------------------------------- */

/**
 * The kind of a provision field, abstracted away from any concrete CMS. A
 * connector maps each to a native field type (e.g. `reference` →
 * Contentful `Link<Entry>`, `asset` → `Link<Asset>`).
 */
export const PROVISION_FIELD_KINDS = [
  'text',
  'richText',
  'number',
  'boolean',
  'date',
  'select',
  'tags',
  'location',
  'json',
  'asset',
  'reference',
] as const;
export type ProvisionFieldKind = (typeof PROVISION_FIELD_KINDS)[number];

/** A validation to apply to a provisioned field (CMS-neutral). */
export interface ProvisionValidation {
  /** e.g. 'required', 'unique', 'in', 'range', 'size', 'linkContentType'. */
  rule: string;
  /** Rule-specific payload (allowed values, min/max, linked type keys, …). */
  params?: Record<string, unknown>;
  message?: string;
}

/** A single field to create on a provisioned content type. */
export interface ProvisionField {
  /** Stable key unique within the content type (maps to CMS field id). */
  key: string;
  name: string;
  kind: ProvisionFieldKind;
  required?: boolean;
  localized?: boolean;
  /** Whether the field accepts a list of values (array field). */
  multiple?: boolean;
  /** Original Nexus dialog field type, retained for round-tripping. */
  nexusType?: NexusFieldType;
  /**
   * For `reference` fields: the content-type keys this field may link to.
   * Empty ⇒ any entry. Realized as Contentful `linkContentType` validation.
   */
  linkContentTypeKeys?: string[];
  /** For `select`/`tags`: allowed values. */
  allowedValues?: string[];
  validations?: ProvisionValidation[];
  helpText?: string;
}

/* --------------------------- content types ---------------------------- */

/**
 * What role a provisioned type plays. Connectors may treat these differently
 * (e.g. Contentful realizes a `layout` as a "page" content type).
 */
export const PROVISION_TYPE_ROLES = [
  'component',
  'contentType',
  'layout',
] as const;
export type ProvisionTypeRole = (typeof PROVISION_TYPE_ROLES)[number];

/** A content type to create in the target CMS. */
export interface ProvisionContentType {
  /** Stable key unique within the plan (maps to CMS content-type id). */
  key: string;
  name: string;
  role: ProvisionTypeRole;
  description?: string;
  /** The field whose value best represents an entry (Contentful displayField). */
  displayFieldKey?: string;
  fields: ProvisionField[];
  /**
   * For layouts: content-type keys used as page composition slots. Realized as
   * reference fields where not already present.
   */
  usesTypeKeys?: string[];
  /** Whether to publish the content type after creating it. */
  publish?: boolean;
}

/* ------------------------------- plan --------------------------------- */

export interface ProvisionPlan {
  /** Plan identity (usually the mapping id it was generated from). */
  id: string;
  name: string;
  /** Project this plan targets (for auditing / logging). */
  projectId: string;
  /** Content types to create, in dependency-safe order where possible. */
  contentTypes: ProvisionContentType[];
  /** Locales expected to exist in the target (informational; not created). */
  locales?: string[];
  /** Provision behaviour flags. */
  options?: ProvisionOptions;
}

export interface ProvisionOptions {
  /** When true, do not write — only report what would be created. */
  dryRun?: boolean;
  /** Publish content types after creation (default true). */
  publish?: boolean;
  /** How to handle a content type that already exists in the target. */
  onConflict?: 'skip' | 'update' | 'fail';
}

/* ------------------------------ context ------------------------------- */

/**
 * Runtime context handed to `provision()`. Mirrors `ConnectorContext` from the
 * Discovery side (decrypted config + auth), plus provision-specific options.
 * Declared here so the Provision domain is self-describing; the connector layer
 * re-exports a compatible shape.
 */
export interface ProvisionContext {
  connectionId: string;
  config: Record<string, unknown>;
  auth?: { ok: boolean; token?: string };
  options?: ProvisionOptions;
}

/* ------------------------------- result ------------------------------- */

export type ProvisionOperationStatus = 'created' | 'updated' | 'skipped' | 'failed';

/** The outcome of provisioning a single content type (and its fields). */
export interface ProvisionOperation {
  /** The content-type key this operation applies to. */
  key: string;
  /** The target CMS id assigned/used (e.g. Contentful content type id). */
  targetId?: string;
  status: ProvisionOperationStatus;
  /** Field-level detail. */
  fields?: { key: string; status: ProvisionOperationStatus; message?: string }[];
  published?: boolean;
  message?: string;
}

export interface ProvisionResult {
  ok: boolean;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  operations: ProvisionOperation[];
  /** True when the plan was executed as a dry run (nothing written). */
  dryRun?: boolean;
  message?: string;
}
