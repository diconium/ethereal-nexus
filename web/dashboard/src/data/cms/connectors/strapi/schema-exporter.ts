/**
 * StrapiSchemaExporter — generates a Strapi v5-compatible `update-schema`
 * payload from a CMS-independent ProvisionPlan.
 *
 * Background:
 * Strapi v5's Content-Type Builder write operations (POST/PUT) require an
 * admin session JWT. They are protected by the `isDevelopmentMode` middleware
 * and the `admin::hasPermissions` policy — both of which block API tokens.
 *
 * The exported file uses the exact format consumed by:
 *   POST /api/content-type-builder/update-schema  (when called with admin JWT)
 *
 * Format (from @strapi/content-type-builder validation/schema.js):
 * {
 *   "data": {
 *     "components": [
 *       {
 *         "action": "create",
 *         "uid": "shared.hero",
 *         "displayName": "Hero",
 *         "category": "shared",
 *         "attributes": [
 *           { "action": "create", "name": "title", "properties": { "type": "string" } }
 *         ]
 *       }
 *     ],
 *     "contentTypes": [
 *       {
 *         "action": "create",
 *         "uid": "api::article.article",
 *         "displayName": "Article",
 *         "singularName": "article",
 *         "pluralName": "articles",
 *         "kind": "collectionType",
 *         "draftAndPublish": true,
 *         "attributes": [
 *           { "action": "create", "name": "title", "properties": { "type": "string" } }
 *         ]
 *       }
 *     ]
 *   }
 * }
 *
 * The user applies this via:
 *   1. Strapi admin UI → Content-Type Builder → Import (paste JSON)
 *   2. Or via curl with a valid admin JWT:
 *      POST /api/content-type-builder/update-schema
 */

import {
  provisionRoleToStrapiKind,
  keyToContentTypeUid,
  keyToComponentUid,
  keyToStrapiNames,
} from './mapper';
import type {
  ProvisionContentType,
  ProvisionField,
  ProvisionPlan,
  ProvisionOperation,
  ProvisionResult,
} from '@/data/meta/provision/types';

/* ----------------------------- output types ----------------------------- */

/** A single attribute action in the update-schema format. */
interface StrapiAttributeAction {
  action: 'create';
  name: string;
  properties: Record<string, unknown>;
}

/** A component creation action in the update-schema format. */
interface StrapiCreateComponentAction {
  action: 'create';
  uid: string;
  displayName: string;
  description?: string;
  category: string;
  attributes: StrapiAttributeAction[];
}

/** A content type creation action in the update-schema format. */
interface StrapiCreateContentTypeAction {
  action: 'create';
  uid: string;
  displayName: string;
  description?: string;
  singularName: string;
  pluralName: string;
  kind: 'collectionType' | 'singleType';
  draftAndPublish: boolean;
  pluginOptions?: Record<string, unknown>;
  options?: Record<string, unknown>;
  attributes: StrapiAttributeAction[];
}

export interface StrapiUpdateSchemaPayload {
  data: {
    components: StrapiCreateComponentAction[];
    contentTypes: StrapiCreateContentTypeAction[];
  };
}

/* ----------------------------- exporter --------------------------------- */

export class StrapiSchemaExporter {
  generate(plan: ProvisionPlan): {
    payload: StrapiUpdateSchemaPayload;
    operations: ProvisionOperation[];
  } {
    const i18nEnabled = (plan.locales?.length ?? 0) > 0;
    const layoutStrategy =
      (plan.options as Record<string, unknown> | undefined)?.['layoutStrategy'] === 'singleType'
        ? 'singleType' as const
        : 'collectionType' as const;

    const components: StrapiCreateComponentAction[] = [];
    const contentTypes: StrapiCreateContentTypeAction[] = [];
    const operations: ProvisionOperation[] = [];

    for (const ct of plan.contentTypes) {
      if (ct.role === 'component') {
        const { action, op } = buildComponentAction(ct, i18nEnabled);
        components.push(action);
        operations.push(op);
      } else {
        const { action, op } = buildContentTypeAction(ct, i18nEnabled, layoutStrategy);
        contentTypes.push(action);
        operations.push(op);
      }
    }

    return {
      payload: { data: { components, contentTypes } },
      operations,
    };
  }
}

/* ----------------------------- builders --------------------------------- */

function buildComponentAction(
  ct: ProvisionContentType,
  i18nEnabled: boolean,
): { action: StrapiCreateComponentAction; op: ProvisionOperation } {
  const uid = keyToComponentUid(ct.key);
  const names = keyToStrapiNames(ct.key);
  const attributes = ct.fields.map((f) => buildAttributeAction(f, 'component', i18nEnabled));

  const action: StrapiCreateComponentAction = {
    action: 'create',
    uid,
    displayName: names.displayName,
    ...(ct.description ? { description: ct.description } : {}),
    category: 'shared',
    attributes,
  };

  return {
    action,
    op: {
      key: ct.key,
      targetId: uid,
      status: 'created',
      fields: ct.fields.map((f) => ({ key: f.key, status: 'created' as const })),
      message: `Component → ${uid}`,
    },
  };
}

function buildContentTypeAction(
  ct: ProvisionContentType,
  i18nEnabled: boolean,
  layoutStrategy: 'collectionType' | 'singleType',
): { action: StrapiCreateContentTypeAction; op: ProvisionOperation } {
  const uid = keyToContentTypeUid(ct.key);
  const names = keyToStrapiNames(ct.key);
  const kind = provisionRoleToStrapiKind(ct.role, layoutStrategy);
  const modelType = kind === 'singleType' ? 'singleType' : 'collectionType';

  const attributes: StrapiAttributeAction[] = ct.fields.map((f) =>
    buildAttributeAction(f, modelType, i18nEnabled),
  );

  // Synthesize component slots for layout composition
  if (ct.role === 'layout' && ct.usesTypeKeys && ct.usesTypeKeys.length > 0) {
    if (!ct.fields.some((f) => f.key === 'components')) {
      attributes.push({
        action: 'create',
        name: 'components',
        properties: {
          type: 'relation',
          relation: 'oneToMany',
          target: keyToContentTypeUid(ct.usesTypeKeys[0]),
        },
      });
    }
  }

  const action: StrapiCreateContentTypeAction = {
    action: 'create',
    uid,
    displayName: names.displayName,
    ...(ct.description ? { description: ct.description } : {}),
    singularName: names.singularName,
    pluralName: names.pluralName,
    kind,
    draftAndPublish: ct.publish !== false,
    ...(i18nEnabled ? { pluginOptions: { i18n: { localized: true } } } : {}),
    attributes,
  };

  return {
    action,
    op: {
      key: ct.key,
      targetId: uid,
      status: 'created',
      fields: ct.fields.map((f) => ({ key: f.key, status: 'created' as const })),
      message: `${kind === 'singleType' ? 'Single Type' : 'Collection Type'} → ${uid}`,
    },
  };
}

function buildAttributeAction(
  field: ProvisionField,
  modelType: 'collectionType' | 'singleType' | 'component',
  i18nEnabled: boolean,
): StrapiAttributeAction {
  return {
    action: 'create',
    name: field.key,
    properties: buildProperties(field, modelType, i18nEnabled),
  };
}

function buildProperties(
  field: ProvisionField,
  modelType: 'collectionType' | 'singleType' | 'component',
  i18nEnabled: boolean,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    required: field.required === true,
    private: false,
  };

  if (i18nEnabled && field.localized) {
    base.pluginOptions = { i18n: { localized: true } };
  }

  switch (field.kind) {
    case 'text':
      return { ...base, type: 'string' };

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
        const relation = field.multiple ? 'oneToMany' : 'oneToOne';
        // Components can only use oneWay / manyWay (represented as oneToOne/oneToMany without targetAttribute)
        return {
          ...base,
          type: 'relation',
          relation,
          target: keyToContentTypeUid(field.linkContentTypeKeys[0]),
        };
      }
      return { ...base, type: 'json' };
    }

    default:
      return { ...base, type: 'string' };
  }
}

/* ----------------------------- public API ------------------------------- */

/**
 * Generate a Strapi update-schema payload from a ProvisionPlan.
 *
 * Returns a ProvisionResult where:
 *  - Every operation has status 'created'
 *  - result.message contains the JSON payload (for download / copy-paste)
 */
export function generateStrapiSchema(plan: ProvisionPlan): ProvisionResult {
  const exporter = new StrapiSchemaExporter();
  const { payload, operations } = exporter.generate(plan);
  const json = JSON.stringify(payload, null, 2);

  return {
    ok: true,
    created: operations.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    operations,
    dryRun: false,
    message: json,
  };
}
