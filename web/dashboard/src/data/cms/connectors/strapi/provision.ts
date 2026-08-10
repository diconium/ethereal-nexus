/**
 * StrapiProvisionService — materializes a CMS-independent ProvisionPlan into
 * Strapi v5 content types and components via the Content-Type Builder Admin API.
 *
 * Supports:
 *  - Create components (role: 'component') → Strapi components
 *  - Create collection types (role: 'contentType') → collectionType
 *  - Create single types or collection types (role: 'layout', configurable)
 *  - Create fields (scalar, media, relations)
 *  - Dynamic zones (synthesized from reference fields with multiple targets)
 *  - i18n fields (when locales are present + plugin detected)
 *  - Idempotent: running the same plan twice skips or updates existing types
 *
 * Does NOT create entries. Does NOT upload assets (that is Migration).
 *
 * Ordering: components are provisioned before content types that use them
 * (topological sort). Cycles are broken by falling back to declaration order.
 *
 * Note on Strapi v5 schema rebuild: the Content-Type Builder automatically
 * triggers a server restart / schema rebuild on create/update. No explicit
 * publish step is required (unlike Contentful).
 */

import type { StrapiConfig } from '../../config';
import {
  createContentType,
  createComponent,
  updateContentType,
  updateComponent,
  listContentTypes,
  listComponents,
  StrapiError,
  type CreateContentTypePayload,
  type CreateComponentPayload,
  type ContentTypeAttributePayload,
} from './client';
import {
  provisionFieldToStrapi,
  provisionRoleToStrapiKind,
  keyToContentTypeUid,
  keyToComponentUid,
  keyToStrapiNames,
} from './mapper';
import type {
  ProvisionContentType,
  ProvisionOperation,
  ProvisionPlan,
  ProvisionResult,
} from '@/data/meta/provision/types';

/* ----------------------------- public API ------------------------------ */

export class StrapiProvisionService {
  constructor(private readonly config: StrapiConfig) {}

  async run(plan: ProvisionPlan): Promise<ProvisionResult> {
    const dryRun = plan.options?.dryRun === true;
    const onConflict = plan.options?.onConflict ?? 'update';
    const i18nEnabled = (plan.locales?.length ?? 0) > 0;
    const layoutStrategy =
      (plan.options as Record<string, unknown> | undefined)?.['layoutStrategy'] === 'singleType'
        ? 'singleType' as const
        : 'collectionType' as const;

    // Separate components from content types (components must be provisioned first)
    const componentTypes = plan.contentTypes.filter((ct) => ct.role === 'component');
    const contentTypes = plan.contentTypes.filter((ct) => ct.role !== 'component');
    const orderedContentTypes = topoSort(contentTypes);

    // Fetch existing types once to detect conflicts
    let existingContentTypeUids = new Set<string>();
    let existingComponentUids = new Set<string>();

    if (!dryRun) {
      try {
        const [cts, comps] = await Promise.all([
          listContentTypes(this.config),
          listComponents(this.config),
        ]);
        existingContentTypeUids = new Set(cts.map((c) => c.uid));
        existingComponentUids = new Set(comps.map((c) => c.uid));
      } catch (error) {
        return failPlan(plan, error);
      }
    }

    const operations: ProvisionOperation[] = [];

    // 1. Provision components first
    for (const ct of componentTypes) {
      const op = await this.provisionComponent(ct, {
        dryRun,
        onConflict,
        i18nEnabled,
        existing: existingComponentUids,
      });
      operations.push(op);
    }

    // 2. Provision content types
    for (const ct of orderedContentTypes) {
      const op = await this.provisionContentType(ct, {
        dryRun,
        onConflict,
        i18nEnabled,
        layoutStrategy,
        existing: existingContentTypeUids,
      });
      operations.push(op);
    }

    const created = operations.filter((o) => o.status === 'created').length;
    const updated = operations.filter((o) => o.status === 'updated').length;
    const skipped = operations.filter((o) => o.status === 'skipped').length;
    const failed = operations.filter((o) => o.status === 'failed').length;

    return {
      ok: failed === 0,
      created,
      updated,
      skipped,
      failed,
      operations,
      dryRun,
      message: dryRun
        ? `Dry run: ${plan.contentTypes.length} type(s) would be provisioned.`
        : `Provisioned ${created} created, ${updated} updated, ${skipped} skipped, ${failed} failed.`,
    };
  }

  /* ---------------------- component provisioning ---------------------- */

  private async provisionComponent(
    ct: ProvisionContentType,
    opts: {
      dryRun: boolean;
      onConflict: 'skip' | 'update' | 'fail';
      i18nEnabled: boolean;
      existing: Set<string>;
    },
  ): Promise<ProvisionOperation> {
    const uid = keyToComponentUid(ct.key);
    const names = keyToStrapiNames(ct.key);
    const fieldStatuses = ct.fields.map((f) => ({ key: f.key, status: 'created' as const }));

    if (opts.dryRun) {
      return {
        key: ct.key,
        targetId: uid,
        status: 'created',
        fields: fieldStatuses,
        message: 'Dry run — not written.',
      };
    }

    const alreadyExists = opts.existing.has(uid);

    if (alreadyExists) {
      if (opts.onConflict === 'skip') {
        return { key: ct.key, targetId: uid, status: 'skipped', message: 'Component already exists.' };
      }
      if (opts.onConflict === 'fail') {
        return { key: ct.key, targetId: uid, status: 'failed', message: 'Component already exists (onConflict=fail).' };
      }
    }

    const attributes = buildAttributeMap(ct, opts.i18nEnabled);

    try {
      if (alreadyExists) {
        await updateComponent(this.config, uid, { component: { attributes } });
      } else {
        const payload: CreateComponentPayload = {
          component: {
            category: 'shared',
            info: {
              displayName: names.displayName,
              description: ct.description,
            },
            attributes,
          },
        };
        await createComponent(this.config, payload);
      }

      return {
        key: ct.key,
        targetId: uid,
        status: alreadyExists ? 'updated' : 'created',
        fields: fieldStatuses,
      };
    } catch (error) {
      return {
        key: ct.key,
        targetId: uid,
        status: 'failed',
        fields: fieldStatuses.map((f) => ({ ...f, status: 'failed' as const })),
        message: errorMessage(error),
      };
    }
  }

  /* ------------------- content type provisioning -------------------- */

  private async provisionContentType(
    ct: ProvisionContentType,
    opts: {
      dryRun: boolean;
      onConflict: 'skip' | 'update' | 'fail';
      i18nEnabled: boolean;
      layoutStrategy: 'collectionType' | 'singleType';
      existing: Set<string>;
    },
  ): Promise<ProvisionOperation> {
    const uid = keyToContentTypeUid(ct.key);
    const names = keyToStrapiNames(ct.key);
    const strapiKind = provisionRoleToStrapiKind(ct.role, opts.layoutStrategy);
    const fieldStatuses = ct.fields.map((f) => ({ key: f.key, status: 'created' as const }));

    if (opts.dryRun) {
      return {
        key: ct.key,
        targetId: uid,
        status: 'created',
        fields: fieldStatuses,
        message: 'Dry run — not written.',
      };
    }

    const alreadyExists = opts.existing.has(uid);

    if (alreadyExists) {
      if (opts.onConflict === 'skip') {
        return { key: ct.key, targetId: uid, status: 'skipped', message: 'Content type already exists.' };
      }
      if (opts.onConflict === 'fail') {
        return { key: ct.key, targetId: uid, status: 'failed', message: 'Content type already exists (onConflict=fail).' };
      }
    }

    const attributes = buildAttributeMap(ct, opts.i18nEnabled);

    // Synthesize a components reference field for layout composition slots
    if (ct.role === 'layout' && ct.usesTypeKeys && ct.usesTypeKeys.length > 0) {
      if (!ct.fields.some((f) => f.key === 'components')) {
        attributes['components'] = {
          type: 'relation',
          relation: 'oneToMany',
          target: ct.usesTypeKeys[0],
        };
      }
    }

    try {
      if (alreadyExists) {
        await updateContentType(this.config, uid, {
          contentType: {
            info: {
              displayName: names.displayName,
              singularName: names.singularName,
              pluralName: names.pluralName,
              description: ct.description,
            },
            attributes,
          },
        });
      } else {
        const payload: CreateContentTypePayload = {
          contentType: {
            kind: strapiKind,
            info: {
              displayName: names.displayName,
              singularName: names.singularName,
              pluralName: names.pluralName,
              description: ct.description,
              collectionName: names.pluralName,
            },
            options: {
              draftAndPublish: ct.publish !== false,
            },
            ...(opts.i18nEnabled ? { pluginOptions: { i18n: { localized: true } } } : {}),
            attributes,
          },
        };
        await createContentType(this.config, payload);
      }

      return {
        key: ct.key,
        targetId: uid,
        status: alreadyExists ? 'updated' : 'created',
        fields: fieldStatuses,
        published: ct.publish !== false,
      };
    } catch (error) {
      return {
        key: ct.key,
        targetId: uid,
        status: 'failed',
        fields: fieldStatuses.map((f) => ({ ...f, status: 'failed' as const })),
        message: errorMessage(error),
      };
    }
  }
}

/* ----------------------------- helpers --------------------------------- */

/**
 * Build the Strapi attributes map from the provision fields.
 * Adds an `entryTitle` field as display field if none of the fields cover it.
 */
function buildAttributeMap(
  ct: ProvisionContentType,
  i18nEnabled: boolean,
): Record<string, ContentTypeAttributePayload> {
  const attributes: Record<string, ContentTypeAttributePayload> = {};

  for (const field of ct.fields) {
    attributes[field.key] = provisionFieldToStrapi(field, { i18nEnabled });
  }

  // Ensure there is at least one string field for Strapi's display field requirement
  if (ct.displayFieldKey && !attributes[ct.displayFieldKey]) {
    attributes[ct.displayFieldKey] = { type: 'string', required: false };
  }

  return attributes;
}

/**
 * Topologically sort content types so types that are referenced by others
 * are provisioned first. Components are handled separately and are not included.
 * Falls back to declaration order on cycles.
 */
export function topoSort(types: ProvisionContentType[]): ProvisionContentType[] {
  const byKey = new Map(types.map((t) => [t.key, t]));
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const result: ProvisionContentType[] = [];

  const deps = (t: ProvisionContentType): string[] => {
    const set = new Set<string>();
    for (const f of t.fields) {
      if (f.kind === 'reference' && f.linkContentTypeKeys) {
        for (const k of f.linkContentTypeKeys) set.add(k);
      }
    }
    for (const k of t.usesTypeKeys ?? []) set.add(k);
    return [...set].filter((k) => k !== t.key && byKey.has(k));
  };

  const visit = (t: ProvisionContentType) => {
    if (visited.has(t.key)) return;
    if (inStack.has(t.key)) return; // cycle — break
    inStack.add(t.key);
    for (const depKey of deps(t)) {
      const dep = byKey.get(depKey);
      if (dep) visit(dep);
    }
    inStack.delete(t.key);
    visited.add(t.key);
    result.push(t);
  };

  for (const t of types) visit(t);
  return result;
}

function errorMessage(error: unknown): string {
  if (error instanceof StrapiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Failed to provision.';
}

function failPlan(plan: ProvisionPlan, error: unknown): ProvisionResult {
  const message = errorMessage(error);
  return {
    ok: false,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: plan.contentTypes.length,
    operations: plan.contentTypes.map((ct) => ({
      key: ct.key,
      status: 'failed' as const,
      message,
    })),
    message,
  };
}
