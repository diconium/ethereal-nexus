/**
 * ProvisionPlan builder.
 *
 * Turns a Mapping (+ its links) and the Nexus Library into a CMS-independent
 * {@link ProvisionPlan}. This is the ONLY place that reads across the Mapping
 * and Design domains to assemble a plan; connectors consume the plan without
 * knowing anything about mappings, blueprints or the source CMS.
 *
 * Structure only — content types + fields + references. No entries, no assets.
 */

import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { nexusMappings, nexusMappingLinks } from '@/data/meta/mapping/schema';
import { getNexusLibrary } from '@/data/meta/design/actions';
import type { LibraryDefinitionView } from '@/data/meta/design/dto';
import type { NexusDialogEntry, NexusFieldType } from '@/data/meta/design/types';
import type {
  ProvisionContentType,
  ProvisionField,
  ProvisionFieldKind,
  ProvisionPlan,
  ProvisionTypeRole,
} from './types';

/** Link statuses that are included in a provision plan (green + yellow). */
const INCLUDED_STATUSES = new Set(['mapped', 'needs-review']);

/**
 * Generic Nexus dialog type → provision field kind. This lives in the provision
 * domain (it is about the Nexus meta model, not any CMS); connectors then
 * realize each kind into their own native field type.
 */
export function nexusTypeToProvisionKind(
  type: NexusFieldType,
): ProvisionFieldKind {
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

function libraryKindToRole(kind: LibraryDefinitionView['kind']): ProvisionTypeRole {
  if (kind === 'layout') return 'layout';
  if (kind === 'contentType') return 'contentType';
  return 'component';
}

/** Convert a Nexus dialog entry into a provision field. */
function dialogEntryToField(entry: NexusDialogEntry): ProvisionField {
  const kind = nexusTypeToProvisionKind(entry.type);
  const field: ProvisionField = {
    key: entry.name || entry.id,
    name: entry.label || entry.name || entry.id,
    kind,
    required: entry.required === true,
    multiple: entry.multiple === true || entry.type === 'multifield',
    nexusType: entry.type,
  };
  if (Array.isArray(entry.values) && entry.values.length > 0) {
    field.allowedValues = entry.values.map((v) => v.value);
  }
  return field;
}

/**
 * Build a ProvisionPlan for a mapping. Includes only links whose status is
 * `mapped` or `needs-review`, resolved to their target Library definition.
 */
export async function buildProvisionPlan(
  mappingId: string,
): Promise<ProvisionPlan> {
  const mapping = (
    await db.select().from(nexusMappings).where(eq(nexusMappings.id, mappingId))
  )[0];
  if (!mapping) {
    throw new Error('Mapping not found.');
  }

  const library = await getNexusLibrary(mapping.project_id);
  if (!library.success) {
    throw new Error(library.error.message);
  }
  const defsById = new Map(
    library.data.definitions.map((d) => [d.id, d] as const),
  );
  // Key = library key; used to resolve reference/layout links to type keys.
  const keyByDefId = new Map(
    library.data.definitions.map((d) => [d.id, d.key] as const),
  );

  const links = await db
    .select()
    .from(nexusMappingLinks)
    .where(eq(nexusMappingLinks.mapping_id, mappingId));

  const contentTypes: ProvisionContentType[] = [];
  const seenKeys = new Set<string>();

  for (const link of links) {
    if (!INCLUDED_STATUSES.has(link.status)) continue;
    if (!link.target_definition_id) continue;
    const def = defsById.get(link.target_definition_id);
    if (!def) continue;
    if (seenKeys.has(def.key)) continue; // one content type per library key
    seenKeys.add(def.key);

    const fields: ProvisionField[] = (def.dialog?.dialog ?? []).map((e) =>
      dialogEntryToField(e as NexusDialogEntry),
    );

    const role = libraryKindToRole(def.kind);

    // Layout composition → usesTypeKeys (the component library keys it uses).
    let usesTypeKeys: string[] | undefined;
    if (role === 'layout' && def.composition) {
      const keys = def.composition.usesComponentKeys ?? [];
      usesTypeKeys = keys.length > 0 ? keys : undefined;
    }

    // A sensible displayField: first text field.
    const displayFieldKey = fields.find((f) => f.kind === 'text')?.key;

    contentTypes.push({
      key: def.key,
      name: def.name,
      role,
      description: def.description ?? undefined,
      displayFieldKey,
      fields,
      usesTypeKeys,
      publish: true,
    });
  }

  // Resolve library-key set so we only keep reference/usesTypeKeys that point
  // at content types actually included in the plan.
  const includedKeys = new Set(contentTypes.map((c) => c.key));
  const allKeys = new Set(keyByDefId.values());
  for (const ct of contentTypes) {
    if (ct.usesTypeKeys) {
      ct.usesTypeKeys = ct.usesTypeKeys.filter(
        (k) => includedKeys.has(k) && allKeys.has(k),
      );
      if (ct.usesTypeKeys.length === 0) ct.usesTypeKeys = undefined;
    }
  }

  return {
    id: mappingId,
    name: mapping.name,
    projectId: mapping.project_id,
    contentTypes,
    options: { publish: true, onConflict: 'update' },
  };
}
