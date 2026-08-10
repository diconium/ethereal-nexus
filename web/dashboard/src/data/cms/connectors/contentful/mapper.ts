/**
 * ContentfulMapper — translates between Contentful CMA objects and Nexus.
 *
 * Discovery direction (Contentful → Nexus graph):
 *   Space        → workspace (recorded in node metadata)
 *   Environment  → blueprint source (the discovery scope / projectId)
 *   Content Type → `model` node (+ `field` attributes)
 *   Field        → FieldDef (+ `references`/`asset` edges for links)
 *   Asset        → `asset` node
 *   Locale       → `language` node
 *
 * Provision direction (Nexus Meta → Contentful field):
 *   see `nexusTypeToContentfulField` / `provisionFieldToContentful`.
 *
 * Contentful-specific facts are preserved under `metadata.contentful` (stored
 * as flattened `contentful.*` node attributes, since attribute values are
 * primitives/arrays).
 */

import type { FieldDef, GraphEdge, ScopeOutput } from '../../types';
import type {
  ContentfulAssetMeta,
  ContentfulContentType,
  ContentfulField,
  ContentfulLocale,
} from './client';
import type {
  ProvisionField,
  ProvisionFieldKind,
} from '@/data/meta/provision/types';
import type { NexusFieldType } from '@/data/meta/design/types';

type Node = ScopeOutput['nodes'][number];

/** Stable external id helpers (keep identity consistent across runs). */
export const ids = {
  contentType: (id: string) => `contentType:${id}`,
  field: (typeId: string, fieldId: string) => `field:${typeId}.${fieldId}`,
  asset: (id: string) => `asset:${id}`,
  locale: (code: string) => `locale:${code}`,
};

/* --------------------- Contentful field → Nexus type ------------------ */

/**
 * Map a Contentful field to a friendly Nexus field type label (for the
 * Blueprint's FieldDef.type). Link fields become reference/asset labels.
 */
export function contentfulFieldToNexusType(field: ContentfulField): string {
  switch (field.type) {
    case 'Symbol':
      return 'Text';
    case 'Text':
      return 'Long Text';
    case 'RichText':
      return 'Rich Text';
    case 'Integer':
    case 'Number':
      return 'Number';
    case 'Date':
      return 'Date';
    case 'Boolean':
      return 'Boolean';
    case 'Location':
      return 'Location';
    case 'Object':
      return 'JSON';
    case 'Link':
      return field.linkType === 'Asset' ? 'Reference (Asset)' : 'Reference (Entry)';
    case 'Array': {
      const itemType = field.items?.type;
      if (itemType === 'Link') {
        return field.items?.linkType === 'Asset'
          ? 'List (Assets)'
          : 'List (Entries)';
      }
      return 'List';
    }
    default:
      return field.type;
  }
}

/** Content-type keys a link (or array of links) field targets, if constrained. */
export function linkContentTypes(field: ContentfulField): string[] {
  const validations =
    field.type === 'Array'
      ? field.items?.validations
      : field.validations;
  const link = validations?.find((v) => Array.isArray(v.linkContentType));
  return (link?.linkContentType as string[] | undefined) ?? [];
}

function isAssetLink(field: ContentfulField): boolean {
  if (field.type === 'Link') return field.linkType === 'Asset';
  if (field.type === 'Array') return field.items?.linkType === 'Asset';
  return false;
}

function isEntryLink(field: ContentfulField): boolean {
  if (field.type === 'Link') return field.linkType === 'Entry';
  if (field.type === 'Array') return field.items?.linkType === 'Entry';
  return false;
}

/* --------------------- Discovery: content type node ------------------- */

/**
 * Build a `model` node + its `references`/`uses` edges from a Contentful
 * content type. Reference fields become edges to the linked content types
 * (Relationship); asset links are recorded as edges to a synthetic asset scope.
 */
export function contentTypeToNode(ct: ContentfulContentType): {
  node: Node;
  edges: GraphEdge[];
} {
  const fields: FieldDef[] = ct.fields
    .filter((f) => !f.omitted)
    .map((f) => ({
      name: f.id,
      type: contentfulFieldToNexusType(f),
      required: f.required === true,
    }));

  const node: Node = {
    kind: 'model',
    externalId: ids.contentType(ct.sys.id),
    name: ct.name,
    layer: 'definition',
    attributes: {
      fields,
      'contentful.id': ct.sys.id,
      'contentful.displayField': ct.displayField ?? '',
      'contentful.fieldCount': ct.fields.length,
      'contentful.type': 'ContentType',
    },
  };

  const edges: GraphEdge[] = [];
  for (const f of ct.fields) {
    if (isEntryLink(f)) {
      const targets = linkContentTypes(f);
      if (targets.length === 0) {
        // Unconstrained entry link — no specific target to reference.
        continue;
      }
      for (const t of targets) {
        edges.push({
          fromExternalId: ids.contentType(ct.sys.id),
          toExternalId: ids.contentType(t),
          type: 'references',
        });
      }
    }
  }

  return { node, edges };
}

/** Does the content type reference any asset link (used to flag asset usage)? */
export function usesAssets(ct: ContentfulContentType): boolean {
  return ct.fields.some(isAssetLink);
}

export function localeToNode(locale: ContentfulLocale): Node {
  return {
    kind: 'language',
    externalId: ids.locale(locale.code),
    name: locale.name,
    layer: 'snapshot',
    attributes: {
      'contentful.code': locale.code,
      'contentful.default': locale.default,
      'contentful.fallbackCode': locale.fallbackCode ?? '',
    },
  };
}

export function assetToNode(asset: ContentfulAssetMeta, defaultLocale: string): Node {
  const title = asset.fields?.title?.[defaultLocale];
  const file = asset.fields?.file?.[defaultLocale];
  return {
    kind: 'asset',
    externalId: ids.asset(asset.sys.id),
    name: title ?? file?.fileName ?? asset.sys.id,
    layer: 'snapshot',
    attributes: {
      'contentful.id': asset.sys.id,
      'contentful.fileName': file?.fileName ?? '',
      'contentful.contentType': file?.contentType ?? '',
    },
  };
}

/* ------------- Provision: Nexus Meta → Contentful field --------------- */

/** Map a provision field kind → the Contentful field spec. */
/**
 * Sanitize a field key into a valid Contentful field ID.
 * Contentful requires: starts with a letter, contains only [a-zA-Z0-9_].
 * Dots, hyphens and spaces become underscores; leading digits get a prefix.
 * Takes the last dot-segment to strip AEM path prefixes like "b2x.cta.dialog.".
 */
export function toContentfulFieldId(key: string): string {
  // Take the last segment after dots (strips AEM dialog path prefixes)
  const lastSegment = key.split('.').pop() ?? key;
  // Replace any non-alphanumeric/underscore characters with underscore
  let id = lastSegment.replace(/[^a-zA-Z0-9_]/g, '_');
  // Ensure it starts with a letter
  if (/^[^a-zA-Z]/.test(id)) id = `f_${id}`;
  // Truncate to Contentful's 64-char limit
  return id.slice(0, 64);
}

export function provisionFieldToContentful(field: ProvisionField): ContentfulField {
  const base = {
    id: toContentfulFieldId(field.key),
    name: field.name,
    required: field.required === true,
    localized: field.localized === true,
  };

  const withValidations = (
    cf: ContentfulField,
  ): ContentfulField => {
    const validations: ContentfulField['validations'] = [];
    if (field.allowedValues && field.allowedValues.length > 0) {
      validations.push({ in: field.allowedValues });
    }
    if (validations.length > 0) cf.validations = validations;
    return cf;
  };

  switch (field.kind) {
    case 'text':
      return withValidations({ ...base, type: 'Symbol' });
    case 'richText':
      return { ...base, type: 'RichText' };
    case 'number':
      return { ...base, type: 'Number' };
    case 'boolean':
      return { ...base, type: 'Boolean' };
    case 'date':
      return { ...base, type: 'Date' };
    case 'select':
      return withValidations({ ...base, type: 'Symbol' });
    case 'location':
      return { ...base, type: 'Location' };
    case 'json':
      return { ...base, type: 'Object' };
    case 'tags':
      return {
        ...base,
        type: 'Array',
        items: { type: 'Symbol' },
      };
    case 'asset':
      return field.multiple
        ? {
            ...base,
            type: 'Array',
            items: { type: 'Link', linkType: 'Asset' },
          }
        : { ...base, type: 'Link', linkType: 'Asset' };
    case 'reference': {
      // linkContentTypeKeys reference content type IDs — must also be sanitized
      const sanitizedTypeKeys = field.linkContentTypeKeys?.map((k) => {
        let id = k.replace(/[^a-zA-Z0-9_]/g, '_');
        if (/^[^a-zA-Z]/.test(id)) id = `t_${id}`;
        return id.slice(0, 64);
      });
      const linkValidations =
        sanitizedTypeKeys && sanitizedTypeKeys.length > 0
          ? [{ linkContentType: sanitizedTypeKeys }]
          : undefined;
      return field.multiple
        ? {
            ...base,
            type: 'Array',
            items: {
              type: 'Link',
              linkType: 'Entry',
              validations: linkValidations,
            },
          }
        : {
            ...base,
            type: 'Link',
            linkType: 'Entry',
            validations: linkValidations,
          };
    }
    default:
      return { ...base, type: 'Symbol' };
  }
}

/**
 * Map a Nexus dialog field type → a provision field kind. Used when generating
 * a ProvisionPlan from the Library (kept here so the CMS-specific knowledge of
 * "which Nexus type becomes which Contentful field" lives in the connector).
 */
export function nexusTypeToProvisionKind(type: NexusFieldType): ProvisionFieldKind {
  switch (type) {
    case 'textfield':
      return 'text';
    case 'richtexteditor':
      return 'richText';
    case 'checkbox':
      return 'boolean';
    case 'select':
      return 'select';
    case 'calendar':
      return 'date';
    case 'media':
    case 'pathbrowser':
      return 'asset';
    case 'tags':
      return 'tags';
    case 'datasource':
    case 'datamodel':
    case 'navigation':
      return 'reference';
    case 'multifield':
    case 'group':
    case 'object':
      return 'json';
    default:
      return 'text';
  }
}
