/**
 * StrapiMapper — translates between Strapi v5 objects and the Nexus graph.
 *
 * Discovery direction (Strapi → Nexus graph):
 *   Collection Type  → `model` node   (kind metadata stored in attributes)
 *   Single Type      → `template` node
 *   Component        → `component` node
 *   Attribute        → `field` node  (contains edge from parent)
 *   Relation         → `reference` node + `references` edge
 *   Media            → `asset` node  + `uses` edge
 *   Dynamic Zone     → `template` node tagged strapiType=dynamicZone
 *   Locale           → `language` node
 *
 * Provision direction (Nexus Meta → Strapi attribute):
 *   ProvisionFieldKind → ContentTypeAttributePayload
 *   ProvisionContentType role → Strapi kind
 *
 * Strapi-specific facts are stored under `attributes['strapi.*']` so they
 * are preserved across snapshot diffs without polluting the generic graph.
 */

import type { FieldDef, GraphEdge, ScopeOutput } from '../../types';
import type {
  StrapiAttribute,
  StrapiAttributeType,
  StrapiComponent,
  StrapiContentType,
  StrapiLocale,
  ContentTypeAttributePayload,
} from './client';
import type { NexusFieldType } from '@/data/meta/design/types';
import type {
  ProvisionField,
  ProvisionFieldKind,
  ProvisionTypeRole,
} from '@/data/meta/provision/types';
import type { StrapiContentTypeKind } from './client';

type Node = ScopeOutput['nodes'][number];

/* ----------------------- stable externalId helpers ----------------------- */

/**
 * Stable, connector-consistent external IDs.
 * These are used as graph node identities across snapshot diffs — never change
 * the format once nodes are persisted.
 */
export const ids = {
  contentType: (uid: string) => `contentType:${uid}`,
  component:   (uid: string) => `component:${uid}`,
  field:       (parentUid: string, name: string) => `field:${parentUid}.${name}`,
  locale:      (code: string) => `locale:${code}`,
  assetFolder: () => 'assetFolder:media',
  dynamicZone: (parentUid: string, name: string) => `dynamicZone:${parentUid}.${name}`,
};

/* -------------------- Strapi attribute → Nexus field type --------------- */

/**
 * Map a Strapi attribute type to a human-readable Nexus field type label.
 * Stored as `FieldDef.type` inside node attributes for the Blueprint viewer.
 */
export function strapiAttributeToNexusLabel(attr: StrapiAttribute): string {
  switch (attr.type) {
    case 'string':
    case 'uid':
    case 'email':
    case 'password':
      return 'Text';
    case 'text':
      return 'Long Text';
    case 'richtext':
      return 'Rich Text';
    case 'integer':
    case 'biginteger':
    case 'float':
    case 'decimal':
      return 'Number';
    case 'boolean':
      return 'Boolean';
    case 'date':
      return 'Date';
    case 'datetime':
      return 'Date & Time';
    case 'time':
      return 'Time';
    case 'enumeration':
      return 'Enumeration';
    case 'json':
      return 'JSON';
    case 'media':
      return attr.multiple ? 'Media (multiple)' : 'Media';
    case 'relation':
      return `Relation (${attr.relation ?? 'unknown'})`;
    case 'component':
      return attr.repeatable ? 'Component (repeatable)' : 'Component';
    case 'dynamiczone':
      return 'Dynamic Zone';
    default:
      return attr.type;
  }
}

/* -------------------- Strapi attribute → ProvisionFieldKind ------------- */

/**
 * Map a Strapi attribute type to the CMS-neutral ProvisionFieldKind.
 * Used when building a ProvisionPlan from a Blueprint (round-trip).
 */
export function strapiAttributeToProvisionKind(
  attr: StrapiAttribute,
): ProvisionFieldKind {
  switch (attr.type) {
    case 'string':
    case 'email':
    case 'password':
    case 'uid':
      return 'text';
    case 'text':
    case 'richtext':
      return 'richText';
    case 'integer':
    case 'biginteger':
    case 'float':
    case 'decimal':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
    case 'datetime':
    case 'time':
      return 'date';
    case 'enumeration':
      return 'select';
    case 'json':
      return 'json';
    case 'media':
      return 'asset';
    case 'relation':
    case 'component':
    case 'dynamiczone':
      return 'reference';
    default:
      return 'text';
  }
}

/* -------------------- Nexus dialog type → ProvisionFieldKind ------------ */

/**
 * Map a Nexus dialog field type to a CMS-neutral ProvisionFieldKind.
 * Kept in the Strapi connector so Strapi-specific knowledge stays isolated.
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

/* -------------------- ProvisionFieldKind → Strapi attribute ------------- */

/**
 * Map a CMS-neutral ProvisionField to a Strapi ContentTypeAttributePayload.
 * Used by StrapiProvisionService when building the request body.
 */
export function provisionFieldToStrapi(
  field: ProvisionField,
  options: { i18nEnabled?: boolean } = {},
): ContentTypeAttributePayload {
  const pluginOptions = options.i18nEnabled && field.localized
    ? { i18n: { localized: true } }
    : undefined;

  const base: ContentTypeAttributePayload = {
    type: provisionKindToStrapiType(field),
    required: field.required === true,
    private: false,
    ...(pluginOptions ? { pluginOptions } : {}),
  };

  switch (field.kind) {
    case 'text':
      return {
        ...base,
        type: 'string',
        ...(field.allowedValues?.length ? { enum: field.allowedValues } : {}),
      };

    case 'richText':
      return { ...base, type: 'richtext' };

    case 'number':
      return { ...base, type: 'integer' };

    case 'boolean':
      return { ...base, type: 'boolean' };

    case 'date':
      return { ...base, type: 'datetime' };

    case 'select':
      return {
        ...base,
        type: 'enumeration',
        enum: field.allowedValues ?? [],
      };

    case 'tags':
      return { ...base, type: 'json' };

    case 'location':
      return { ...base, type: 'json' };

    case 'json':
      return { ...base, type: 'json' };

    case 'asset':
      return {
        ...base,
        type: 'media',
        multiple: field.multiple === true,
        allowedTypes: ['images', 'videos', 'files'],
      };

    case 'reference': {
      if (field.linkContentTypeKeys && field.linkContentTypeKeys.length > 0) {
        return {
          ...base,
          type: 'relation',
          relation: field.multiple ? 'oneToMany' : 'oneToOne',
          target: field.linkContentTypeKeys[0],
        };
      }
      return { ...base, type: 'json' };
    }

    default:
      return { ...base, type: 'string' };
  }
}

function provisionKindToStrapiType(field: ProvisionField): StrapiAttributeType {
  switch (field.kind) {
    case 'text':    return 'string';
    case 'richText': return 'richtext';
    case 'number':  return 'integer';
    case 'boolean': return 'boolean';
    case 'date':    return 'datetime';
    case 'select':  return 'enumeration';
    case 'tags':    return 'json';
    case 'location': return 'json';
    case 'json':    return 'json';
    case 'asset':   return 'media';
    case 'reference': return 'relation';
    default:        return 'string';
  }
}

/* ------------ ProvisionTypeRole → Strapi content type kind ------------- */

/**
 * Map a Nexus provision type role to a Strapi content type kind.
 * `component` role → handled separately via the Components API.
 * `layout` defaults to collectionType unless overridden.
 */
export function provisionRoleToStrapiKind(
  role: ProvisionTypeRole,
  layoutStrategy: 'collectionType' | 'singleType' = 'collectionType',
): StrapiContentTypeKind {
  switch (role) {
    case 'contentType':
      return 'collectionType';
    case 'layout':
      return layoutStrategy;
    default:
      return 'collectionType';
  }
}

/* -------------------- Discovery: content type → graph node ------------- */

/**
 * Map a Strapi content type to a Nexus graph node + field nodes + edges.
 * Collection types → `model` nodes (definition layer).
 * Single types     → `template` nodes (definition layer).
 */
export function contentTypeToNodes(ct: StrapiContentType): {
  nodes: Node[];
  edges: GraphEdge[];
} {
  const kind = ct.kind === 'collectionType' ? 'model' : 'template';
  const ctExternalId = ids.contentType(ct.uid);

  const fields: FieldDef[] = [];
  const nodes: Node[] = [];
  const edges: GraphEdge[] = [];

  for (const [attrName, attr] of Object.entries(ct.attributes)) {
    // Skip system / private / internal attributes
    if (attrName.startsWith('localizations') || attrName === 'locale') continue;

    const fieldExternalId = ids.field(ct.uid, attrName);

    if (attr.type === 'dynamiczone') {
      // Dynamic zones become template nodes
      const dzId = ids.dynamicZone(ct.uid, attrName);
      nodes.push({
        kind: 'template',
        externalId: dzId,
        name: attrName,
        layer: 'definition',
        attributes: {
          'strapi.type': 'dynamicZone',
          'strapi.components': (attr.components ?? []).join(','),
          'strapi.parentUid': ct.uid,
        },
      });
      edges.push({ fromExternalId: ctExternalId, toExternalId: dzId, type: 'contains' });

      // Edges to component nodes that are allowed in this DZ
      for (const compUid of attr.components ?? []) {
        edges.push({
          fromExternalId: dzId,
          toExternalId: ids.component(compUid),
          type: 'uses',
        });
      }
      continue;
    }

    if (attr.type === 'relation') {
      // Relations become reference nodes
      nodes.push({
        kind: 'reference',
        externalId: fieldExternalId,
        name: attrName,
        layer: 'definition',
        attributes: {
          'strapi.relationType': attr.relation ?? '',
          'strapi.target': attr.target ?? '',
          'strapi.required': attr.required === true,
        },
      });
      edges.push({ fromExternalId: ctExternalId, toExternalId: fieldExternalId, type: 'contains' });
      if (attr.target) {
        edges.push({
          fromExternalId: ctExternalId,
          toExternalId: ids.contentType(attr.target),
          type: 'references',
        });
      }
      continue;
    }

    if (attr.type === 'media') {
      // Media attributes point to the asset folder
      nodes.push({
        kind: 'asset',
        externalId: fieldExternalId,
        name: attrName,
        layer: 'definition',
        attributes: {
          'strapi.multiple': attr.multiple === true,
          'strapi.allowedTypes': (attr.allowedTypes ?? []).join(','),
        },
      });
      edges.push({ fromExternalId: ctExternalId, toExternalId: fieldExternalId, type: 'contains' });
      edges.push({ fromExternalId: ctExternalId, toExternalId: ids.assetFolder(), type: 'uses' });
      continue;
    }

    if (attr.type === 'component') {
      // Component references point to the component node
      nodes.push({
        kind: 'field',
        externalId: fieldExternalId,
        name: attrName,
        layer: 'definition',
        attributes: {
          'strapi.type': 'component',
          'strapi.component': attr.component ?? '',
          'strapi.repeatable': attr.repeatable === true,
        },
      });
      edges.push({ fromExternalId: ctExternalId, toExternalId: fieldExternalId, type: 'contains' });
      if (attr.component) {
        edges.push({
          fromExternalId: ctExternalId,
          toExternalId: ids.component(attr.component),
          type: 'uses',
        });
      }
      continue;
    }

    // Scalar / standard field
    fields.push({
      name: attrName,
      type: strapiAttributeToNexusLabel(attr),
      required: attr.required === true,
    });
  }

  const ctNode: Node = {
    kind,
    externalId: ctExternalId,
    name: ct.info.displayName,
    layer: 'definition',
    attributes: {
      fields,
      'strapi.uid': ct.uid,
      'strapi.apiId': ct.apiID,
      'strapi.kind': ct.kind,
      'strapi.draftAndPublish': ct.options?.draftAndPublish === true,
      'strapi.i18n': !!(ct.pluginOptions as Record<string, unknown> | undefined)?.[
        'i18n'
      ],
    },
  };

  return { nodes: [ctNode, ...nodes], edges };
}

/* -------------------- Discovery: component → graph node ---------------- */

/**
 * Map a Strapi component to a Nexus `component` graph node + field nodes + edges.
 */
export function componentToNodes(comp: StrapiComponent): {
  nodes: Node[];
  edges: GraphEdge[];
} {
  const compExternalId = ids.component(comp.uid);
  const fields: FieldDef[] = [];
  const nodes: Node[] = [];
  const edges: GraphEdge[] = [];

  for (const [attrName, attr] of Object.entries(comp.attributes)) {
    if (attr.type === 'relation') {
      const fieldId = ids.field(comp.uid, attrName);
      nodes.push({
        kind: 'reference',
        externalId: fieldId,
        name: attrName,
        layer: 'definition',
        attributes: {
          'strapi.relationType': attr.relation ?? '',
          'strapi.target': attr.target ?? '',
        },
      });
      edges.push({ fromExternalId: compExternalId, toExternalId: fieldId, type: 'contains' });
      if (attr.target) {
        edges.push({
          fromExternalId: compExternalId,
          toExternalId: ids.contentType(attr.target),
          type: 'references',
        });
      }
      continue;
    }

    if (attr.type === 'media') {
      const fieldId = ids.field(comp.uid, attrName);
      nodes.push({
        kind: 'asset',
        externalId: fieldId,
        name: attrName,
        layer: 'definition',
        attributes: {
          'strapi.multiple': attr.multiple === true,
        },
      });
      edges.push({ fromExternalId: compExternalId, toExternalId: fieldId, type: 'contains' });
      edges.push({ fromExternalId: compExternalId, toExternalId: ids.assetFolder(), type: 'uses' });
      continue;
    }

    fields.push({
      name: attrName,
      type: strapiAttributeToNexusLabel(attr),
      required: attr.required === true,
    });
  }

  const compNode: Node = {
    kind: 'component',
    externalId: compExternalId,
    name: comp.info.displayName,
    layer: 'definition',
    attributes: {
      fields,
      'strapi.uid': comp.uid,
      'strapi.apiId': comp.apiID,
      'strapi.category': comp.category,
    },
  };

  return { nodes: [compNode, ...nodes], edges };
}

/* -------------------- Discovery: locale → graph node ------------------- */

export function localeToNode(locale: StrapiLocale): Node {
  return {
    kind: 'language',
    externalId: ids.locale(locale.code),
    name: locale.name,
    layer: 'snapshot',
    attributes: {
      'strapi.code': locale.code,
      'strapi.isDefault': locale.isDefault,
    },
  };
}

/* -------------------- Provision: key → Strapi UID ---------------------- */

/**
 * Convert a provision plan content-type key to a valid Strapi API UID.
 * Strapi UIDs for application types follow the pattern: `api::<singularName>.<singularName>`
 * For components: `<category>.<apiId>`
 */
export function keyToContentTypeUid(key: string): string {
  const safe = key.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return `api::${safe}.${safe}`;
}

export function keyToComponentUid(key: string, category = 'shared'): string {
  const safe = key.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return `${category}.${safe}`;
}

/**
 * Convert a provision key to a Strapi singularName / pluralName / displayName.
 */
export function keyToStrapiNames(key: string): {
  displayName: string;
  singularName: string;
  pluralName: string;
} {
  const safe = key.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  // Simple plural: append 's' (good enough for schema keys; not user-visible).
  return {
    displayName: key.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    singularName: safe,
    pluralName: `${safe}s`,
  };
}
