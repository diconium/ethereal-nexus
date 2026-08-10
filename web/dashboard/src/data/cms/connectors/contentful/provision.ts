/**
 * ContentfulProvisionService — materializes a CMS-independent ProvisionPlan into
 * Contentful content types.
 *
 * Supports: create content types, create fields, apply validations, create
 * references (Link<Entry>), assets as Link<Asset>, and publish content types.
 *
 * Does NOT create entries and does NOT upload assets (that is Migration).
 *
 * Ordering: content types are created in dependency-safe order (a type is
 * created before the types that reference it) so that `linkContentType`
 * validations resolve. Cycles are broken by falling back to declaration order.
 */

import type { ContentfulConfig } from '../../config';
import {
  listContentTypes,
  putContentType,
  publishContentType,
  ContentfulError,
  type ContentfulContentType,
  type ContentfulField,
} from './client';
import { provisionFieldToContentful, toContentfulFieldId } from './mapper';
import type {
  ProvisionContentType,
  ProvisionOperation,
  ProvisionPlan,
  ProvisionResult,
} from '@/data/meta/provision/types';

/**
 * Sanitize a content type key into a valid Contentful content type ID.
 * Same rules as field IDs: [a-zA-Z][a-zA-Z0-9_]*, max 64 chars.
 * Hyphens become underscores; leading digits get a prefix.
 */
function toContentfulTypeId(key: string): string {
  let id = key.replace(/[^a-zA-Z0-9_]/g, '_');
  if (/^[^a-zA-Z]/.test(id)) id = `t_${id}`;
  return id.slice(0, 64);
}

const WRAPPER_TYPE_KEY = 'etherealNexusWrapper';

export class ContentfulProvisionService {
  constructor(private readonly config: ContentfulConfig) {}

  async run(plan: ProvisionPlan): Promise<ProvisionResult> {
    const dryRun = plan.options?.dryRun === true;
    const publish = plan.options?.publish !== false; // default true
    const onConflict = plan.options?.onConflict ?? 'update';

    // Provisioning writes require a Management token (CMA). Discovery uses the
    // delivery token, but writes cannot be done with it.
    if (!dryRun && !this.config.managementToken?.trim()) {
      return failPlan(
        plan,
        new ContentfulError(
          'Provisioning requires a Contentful Management token (Personal Access Token). ' +
            'Add one to the connection to create content types.',
          403,
          'forbidden',
        ),
      );
    }

    const { contentTypes, wrapperSkipped } = applyWrapperStrategy(plan.contentTypes);
    const ordered = topoSort(contentTypes);

    // Fetch existing content types once (to detect conflicts + versions), via
    // the Management API (the delivery API omits drafts).
    let existing = new Map<string, ContentfulContentType>();
    if (!dryRun) {
      try {
        const cts = await listContentTypes(this.config, { api: 'management' });
        existing = new Map(cts.map((c) => [c.sys.id, c]));
      } catch (error) {
        // If we cannot even list, surface a single failure for the whole plan.
        return failPlan(plan, error);
      }
    }

    const operations: ProvisionOperation[] = [...wrapperSkipped];

    for (const ct of ordered) {
      const op = await this.provisionType(ct, {
        dryRun,
        publish: publish && ct.publish !== false,
        onConflict,
        existing,
      });
      operations.push(op);
    }

    const created = operations.filter((o) => o.status === 'created').length;
    const updated = operations.filter((o) => o.status === 'updated').length;
    const skipped = operations.filter((o) => o.status === 'skipped').length;
    const failed = operations.filter((o) => o.status === 'failed').length;

    const wrapperMode = wrapperSkipped.length > 0;

    return {
      ok: failed === 0,
      created,
      updated,
      skipped,
      failed,
      operations,
      dryRun,
      message: dryRun
        ? `Dry run: ${ordered.length} content type(s) would be provisioned.`
        : `Provisioned ${created} created, ${updated} updated, ${skipped} skipped, ${failed} failed.${
            wrapperMode
              ? ` Contentful wrapper mode: ${wrapperSkipped.length} component type(s) mapped to ${WRAPPER_TYPE_KEY}.`
              : ''
          }`,
    };
  }

  private async provisionType(
    ct: ProvisionContentType,
    opts: {
      dryRun: boolean;
      publish: boolean;
      onConflict: 'skip' | 'update' | 'fail';
      existing: Map<string, ContentfulContentType>;
    },
  ): Promise<ProvisionOperation> {
    const typeId = toContentfulTypeId(ct.key);
    const fields = this.buildFields(ct);
    const fieldStatuses = fields.map((f) => ({
      key: f.id,
      status: 'created' as const,
    }));

    if (opts.dryRun) {
      return {
        key: ct.key,
        targetId: typeId,
        status: 'created',
        fields: fieldStatuses,
        published: false,
        message: 'Dry run — not written.',
      };
    }

    const prior = opts.existing.get(typeId);
    if (prior) {
      if (opts.onConflict === 'skip') {
        return {
          key: ct.key,
          targetId: typeId,
          status: 'skipped',
          message: 'Content type already exists.',
        };
      }
      if (opts.onConflict === 'fail') {
        return {
          key: ct.key,
          targetId: typeId,
          status: 'failed',
          message: 'Content type already exists (onConflict=fail).',
        };
      }
    }

    try {
      const payload = {
        name: ct.name,
        description: ct.description,
        displayField: this.resolveDisplayField(ct, fields),
        fields,
      };
      const saved = await putContentType(
        this.config,
        typeId,
        payload,
        prior?.sys.version,
      );

      let published = false;
      if (opts.publish && typeof saved.sys.version === 'number') {
        try {
          await publishContentType(this.config, typeId, saved.sys.version);
          published = true;
        } catch (error) {
          return {
            key: ct.key,
            targetId: typeId,
            status: prior ? 'updated' : 'created',
            fields: fieldStatuses,
            published: false,
            message:
              error instanceof ContentfulError
                ? `Created but publish failed: ${error.message}`
                : 'Created but publish failed.',
          };
        }
      }

      return {
        key: ct.key,
        targetId: typeId,
        status: prior ? 'updated' : 'created',
        fields: fieldStatuses,
        published,
      };
    } catch (error) {
      return {
        key: ct.key,
        targetId: typeId,
        status: 'failed',
        fields: fieldStatuses.map((f) => ({ ...f, status: 'failed' as const })),
        message:
          error instanceof ContentfulError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'Failed to provision content type.',
      };
    }
  }

  /** Build the Contentful field list, including layout composition slots. */
  private buildFields(ct: ProvisionContentType): ContentfulField[] {
    const fields = ct.fields.map(provisionFieldToContentful);

    // For layouts, synthesize reference fields for any used type not already
    // represented by an explicit field (page composition slots).
    if (ct.role === 'layout' && ct.usesTypeKeys && ct.usesTypeKeys.length > 0) {
      const present = new Set(ct.fields.map((f) => toContentfulFieldId(f.key)));
      const slotKey = 'components';
      if (!present.has(slotKey)) {
        fields.push({
          id: slotKey,
          name: 'Components',
          type: 'Array',
          items: {
            type: 'Link',
            linkType: 'Entry',
            validations: [{ linkContentType: ct.usesTypeKeys.map(toContentfulTypeId) }],
          },
        });
      }
    }

    return fields;
  }

  private resolveDisplayField(
    ct: ProvisionContentType,
    fields: ContentfulField[],
  ): string | undefined {
    if (ct.displayFieldKey && fields.some((f) => f.id === toContentfulFieldId(ct.displayFieldKey!))) {
      return toContentfulFieldId(ct.displayFieldKey);
    }
    // Fall back to the first Symbol/Text field (Contentful requires a Symbol).
    const firstText = fields.find(
      (f) => f.type === 'Symbol' || f.type === 'Text',
    );
    return firstText?.id;
  }
}

function applyWrapperStrategy(contentTypes: ProvisionContentType[]): {
  contentTypes: ProvisionContentType[];
  wrapperSkipped: ProvisionOperation[];
} {
  const componentTypes = contentTypes.filter((ct) => ct.role === 'component');
  if (componentTypes.length === 0) {
    return { contentTypes, wrapperSkipped: [] };
  }

  const nonComponentTypes = contentTypes.filter((ct) => ct.role !== 'component');

  // Only apply the wrapper strategy when component types are referenced by
  // non-component types (layouts / contentTypes) in the same plan.
  // If the plan contains only components, provision them directly as content
  // types — the wrapper would produce empty plans and confusing results.
  const componentKeys = new Set(componentTypes.map((ct) => ct.key));
  const anyNonComponentReferencesComponent = nonComponentTypes.some((ct) => {
    const refsInFields = ct.fields.some(
      (f) => f.kind === 'reference' && f.linkContentTypeKeys?.some((k) => componentKeys.has(k)),
    );
    const refsInSlots = (ct.usesTypeKeys ?? []).some((k) => componentKeys.has(k));
    return refsInFields || refsInSlots;
  });

  if (!anyNonComponentReferencesComponent) {
    // No non-component type references these components — provision them directly
    // as Contentful content types (collectionType role).
    return {
      contentTypes: contentTypes.map((ct) =>
        ct.role === 'component' ? { ...ct, role: 'contentType' as const } : ct,
      ),
      wrapperSkipped: [],
    };
  }

  const componentTypeValues = [...componentKeys].sort();
  const wrapperKey = WRAPPER_TYPE_KEY;
  const normalized: ProvisionContentType[] = [];
  const seen = new Set<string>();

  // Keep non-component content types, but rewrite references that pointed to
  // component-only types so they point to the wrapper type.
  for (const ct of contentTypes) {
    if (ct.role === 'component') continue;
    if (ct.key === wrapperKey) {
      if (!seen.has(ct.key)) {
        normalized.push(ct);
        seen.add(ct.key);
      }
      continue;
    }
    const usesWrapperRef = (ct.usesTypeKeys ?? []).some((k) => componentKeys.has(k));
    const rewrittenFields = ct.fields.map((f) => {
      if (f.kind !== 'reference' || !f.linkContentTypeKeys || f.linkContentTypeKeys.length === 0) {
        return f;
      }
      const keys = new Set<string>();
      for (const k of f.linkContentTypeKeys) {
        if (componentKeys.has(k)) keys.add(wrapperKey);
        else keys.add(k);
      }
      return {
        ...f,
        linkContentTypeKeys: keys.size > 0 ? [...keys] : undefined,
      };
    });
    normalized.push({
      ...ct,
      fields: rewrittenFields,
      usesTypeKeys: usesWrapperRef ? [wrapperKey] : ct.usesTypeKeys,
    });
    seen.add(ct.key);
  }

  if (!seen.has(wrapperKey)) {
    normalized.push({
      key: wrapperKey,
      name: 'Ethereal Nexus Wrapper',
      role: 'component',
      displayFieldKey: 'entryTitle',
      publish: true,
      fields: [
        { key: 'entryTitle', name: 'Entry title', kind: 'text' },
        {
          key: 'componentType',
          name: 'Component Type',
          kind: 'select',
          required: true,
          allowedValues: componentTypeValues,
        },
        { key: 'properties', name: 'Properties', kind: 'json' },
      ],
    });
  }

  const wrapperSkipped: ProvisionOperation[] = componentTypes.map((ct) => ({
    key: ct.key,
    targetId: wrapperKey,
    status: 'skipped',
    message: `Mapped to wrapper type "${wrapperKey}" (componentType + properties).`,
  }));

  return { contentTypes: normalized, wrapperSkipped };
}

/**
 * Topologically sort content types so referenced types are provisioned before
 * the types that link to them. Falls back to declaration order on cycles.
 */
export function topoSort(
  types: ProvisionContentType[],
): ProvisionContentType[] {
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
    if (inStack.has(t.key)) return; // cycle — break here
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

function failPlan(plan: ProvisionPlan, error: unknown): ProvisionResult {
  const message =
    error instanceof ContentfulError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Failed to provision.';
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
