/**
 * DESIGN DOMAIN — the Nexus Library.
 *
 * The canonical, CMS-independent content model the user owns: Nexus
 * Components, Content Types and Layouts, expressed in Nexus's native `dialog`
 * schema (the same shape stored in `component_version.dialog`).
 *
 * This domain is completely independent of Discovery (Blueprint) and of any
 * connection. Nothing here references CMS-specific concepts — connectors and
 * the Blueprint live in the Discovery domain (`data/cms`). The Mapping domain
 * is the only thing that links a Blueprint to this Library.
 */

/* -------------------------- Nexus dialog schema ----------------------- */

/** Canonical Nexus dialog field types (mirrors `@ethereal-nexus/dialog-ui-core`). */
export const NEXUS_FIELD_TYPES = [
  'textfield',
  'richtexteditor',
  'checkbox',
  'select',
  'calendar',
  'media',
  'multifield',
  'group',
  'object',
  'tags',
  'pathbrowser',
  'datasource',
  'datamodel',
  'navigation',
] as const;
export type NexusFieldType = (typeof NEXUS_FIELD_TYPES)[number];

/**
 * A single entry in a Nexus dialog. Structurally identical to what the
 * `lib/core` dialog builder emits via `_parse()` and what the dashboard stores
 * in `component_version.dialog` — but we depend only on the JSON shape, not the
 * builder, so this domain has no runtime dependency on `lib/core`.
 */
export interface NexusDialogEntry {
  id: string;
  name: string;
  type: NexusFieldType;
  label: string;
  required?: boolean;
  tooltip?: string;
  /** For select. */
  multiple?: boolean;
  values?: { value: string; label: string }[];
  /** For multifield/group/object — nested fields. */
  fields?: NexusDialogEntry[];
  /** Free-form per-type extras (defaultValue, placeholder, etc.). */
  [key: string]: unknown;
}

export interface NexusDialogJson {
  dialog: NexusDialogEntry[];
}

/* ------------------------------- layouts ------------------------------ */

/** A CMS-independent page region (a slot in a Layout). */
export const REGION_LOCATIONS = [
  'global',
  'top',
  'container',
  'content',
  'right',
  'left',
  'bottom',
] as const;
export type RegionLocation = (typeof REGION_LOCATIONS)[number];

export interface MetaRegion {
  key: string;
  name: string;
  location: RegionLocation;
  /** Library component keys allowed in this region. */
  allowedComponentKeys: string[];
}

/**
 * Composition of a Layout (Meta Template): its regions and the component
 * definitions it uses. CMS-independent — realized differently per target
 * connector (AEM editable template, Contentful page content type, …).
 */
export interface LayoutComposition {
  regions: MetaRegion[];
  usesComponentKeys: string[];
}

/* --------------------------- library definitions ---------------------- */

export const LIBRARY_KINDS = ['component', 'contentType', 'layout'] as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[number];

/** Curation/maturity status of a Library definition. */
export const LIBRARY_STATUSES = ['canonical', 'generated', 'review'] as const;
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

/**
 * Where a Library definition was seeded from (a Blueprint node), purely
 * informational — the Library never depends on the Blueprint.
 */
export interface LibrarySourceHint {
  cms?: string;
  blueprintDefinitionId?: string;
  externalId?: string;
  resourceType?: string;
}

/** A canonical definition in the Nexus Library. */
export interface LibraryDefinition {
  id: string;
  libraryId: string;
  kind: LibraryKind;
  /** Stable, human key unique within (library, kind), e.g. "hero". */
  key: string;
  name: string;
  group?: string;
  status: LibraryStatus;
  description?: string;
  tags: string[];
  /** Fields for component/contentType (empty for layouts). */
  dialog: NexusDialogJson;
  /** Composition for layouts (undefined for component/contentType). */
  composition?: LayoutComposition;
  sourceHint?: LibrarySourceHint;
}

export interface NexusLibrary {
  id: string;
  projectId: string;
  name: string;
}
