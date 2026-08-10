'use server';

import { ActionResponse } from '@/data/action';
import { db } from '@/db';
import { auth } from '@/auth';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { nexusLibraries, nexusLibraryDefinitions } from './schema';
import {
  nexusLibraryViewSchema,
  seedResultSchema,
  type NexusLibraryView,
  type SeedResult,
} from './dto';
import {
  toNexusDialog,
  toLayoutComposition,
  slugify,
  type DiscoveredField,
} from './normalize';
import type { LibraryKind } from './types';
import { getBlueprintDetail } from '@/data/cms/actions';

const CONTENT_PATH = '/projects';

/** Get (or lazily create) the project's Nexus Library with its definitions. */
export async function getNexusLibrary(
  projectId: string,
): ActionResponse<NexusLibraryView> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');

  try {
    let library = (
      await db
        .select()
        .from(nexusLibraries)
        .where(eq(nexusLibraries.project_id, projectId))
        .limit(1)
    )[0];

    if (!library) {
      library = (
        await db
          .insert(nexusLibraries)
          .values({ project_id: projectId, name: 'Nexus Library' })
          .returning()
      )[0];
    }

    const defs = await db
      .select()
      .from(nexusLibraryDefinitions)
      .where(eq(nexusLibraryDefinitions.library_id, library.id));

    const view = {
      id: library.id,
      projectId: library.project_id,
      name: library.name,
      definitions: defs.map((d) => ({
        id: d.id,
        libraryId: d.library_id,
        kind: d.kind as LibraryKind,
        key: d.key,
        name: d.name,
        group: d.group,
        status: d.status as never,
        description: d.description,
        tags: (d.tags ?? []) as string[],
        dialog: (d.dialog ?? { dialog: [] }) as { dialog: unknown[] },
        composition: (d.composition ?? null) as never,
        sourceHint: (d.source_hint ?? null) as never,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })),
    };

    const safe = nexusLibraryViewSchema.safeParse(view);
    if (!safe.success) {
      return actionZodError('Failed to parse library.', safe.error);
    }
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to load the Nexus Library.');
  }
}

/**
 * Seed the project's Nexus Library from a Blueprint (read-only on the
 * Blueprint). Creates canonical Component / Content Type / Layout definitions
 * from discovered nodes. Key-stable upsert so re-seeding updates in place.
 *
 * The Blueprint is NEVER modified — this only writes Design-domain rows.
 */
export async function seedLibraryFromBlueprint(
  projectId: string,
  blueprintDefinitionId: string,
): ActionResponse<SeedResult> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');

  try {
    const detail = await getBlueprintDetail(blueprintDefinitionId);
    if (!detail.success) return actionError(detail.error.message);
    const bp = detail.data;

    // Ensure the library exists.
    let library = (
      await db
        .select()
        .from(nexusLibraries)
        .where(eq(nexusLibraries.project_id, projectId))
        .limit(1)
    )[0];
    if (!library) {
      library = (
        await db
          .insert(nexusLibraries)
          .values({ project_id: projectId, name: 'Nexus Library' })
          .returning()
      )[0];
    }

    // Build a key map from externalId -> library key for layout composition.
    const keyByExternalId = new Map<string, string>();
    for (const item of bp.items) {
      keyByExternalId.set(item.externalId, slugify(item.name || item.externalId));
    }

    type Row = {
      kind: LibraryKind;
      key: string;
      name: string;
      group: string | null;
      dialog: unknown;
      composition: unknown;
      source_hint: unknown;
    };
    const rows: Row[] = [];

    const readFields = (attrs: Record<string, unknown>): DiscoveredField[] => {
      const raw = attrs.fields;
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((f): f is DiscoveredField => !!f && typeof f === 'object' && 'name' in f)
        .map((f) => ({
          name: String((f as DiscoveredField).name),
          type: String((f as DiscoveredField).type ?? 'Text'),
          required: (f as DiscoveredField).required === true,
        }));
    };
    const readStrings = (attrs: Record<string, unknown>, key: string): string[] => {
      const raw = attrs[key];
      return Array.isArray(raw) ? raw.map((v) => String(v)) : [];
    };

    for (const item of bp.items) {
      const key = slugify(item.name || item.externalId);
      const group =
        typeof item.attributes.group === 'string'
          ? (item.attributes.group as string)
          : null;
      const sourceHint = {
        cms: bp.provider,
        blueprintDefinitionId: bp.definitionId,
        externalId: item.externalId,
        resourceType:
          typeof item.attributes.resourceType === 'string'
            ? (item.attributes.resourceType as string)
            : undefined,
      };

      if (item.kind === 'component') {
        rows.push({
          kind: 'component',
          key,
          name: item.name,
          group,
          dialog: toNexusDialog(readFields(item.attributes)),
          composition: null,
          source_hint: sourceHint,
        });
      } else if (item.kind === 'model') {
        rows.push({
          kind: 'contentType',
          key,
          name: item.name,
          group,
          dialog: toNexusDialog(readFields(item.attributes)),
          composition: null,
          source_hint: sourceHint,
        });
      } else if (item.kind === 'template' || item.kind === 'editableTemplate') {
        // Which component keys this layout uses (from `uses` edges).
        const usesKeys = bp.edges
          .filter((e) => e.fromExternalId === item.externalId && e.type === 'uses')
          .map((e) => keyByExternalId.get(e.toExternalId))
          .filter((k): k is string => !!k);
        rows.push({
          kind: 'layout',
          key,
          name: item.name,
          group,
          dialog: { dialog: [] },
          composition: toLayoutComposition(
            readStrings(item.attributes, 'regions'),
            usesKeys,
          ),
          source_hint: sourceHint,
        });
      }
    }

    // Key-stable upsert.
    let created = 0;
    let updated = 0;
    const byKind: Record<string, number> = {};
    for (const row of rows) {
      byKind[row.kind] = (byKind[row.kind] ?? 0) + 1;
      const existing = (
        await db
          .select({ id: nexusLibraryDefinitions.id })
          .from(nexusLibraryDefinitions)
          .where(
            and(
              eq(nexusLibraryDefinitions.library_id, library.id),
              eq(nexusLibraryDefinitions.kind, row.kind),
              eq(nexusLibraryDefinitions.key, row.key),
            ),
          )
          .limit(1)
      )[0];

      if (existing) {
        await db
          .update(nexusLibraryDefinitions)
          .set({
            name: row.name,
            group: row.group,
            dialog: row.dialog,
            composition: row.composition,
            source_hint: row.source_hint,
            updated_at: new Date(),
          })
          .where(eq(nexusLibraryDefinitions.id, existing.id));
        updated += 1;
      } else {
        await db.insert(nexusLibraryDefinitions).values({
          library_id: library.id,
          kind: row.kind,
          key: row.key,
          name: row.name,
          group: row.group,
          status: 'generated',
          dialog: row.dialog,
          composition: row.composition,
          source_hint: row.source_hint,
        });
        created += 1;
      }
    }

    revalidatePath(CONTENT_PATH, 'page');
    const result: SeedResult = { libraryId: library.id, created, updated, byKind };
    const safe = seedResultSchema.safeParse(result);
    if (!safe.success) {
      return actionZodError('Failed to parse seed result.', safe.error);
    }
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to seed the Nexus Library.');
  }
}

/** Delete a single library definition. */
export async function deleteLibraryDefinition(
  definitionId: string,
): ActionResponse<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    await db
      .delete(nexusLibraryDefinitions)
      .where(eq(nexusLibraryDefinitions.id, definitionId));
    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess({ id: definitionId });
  } catch (error) {
    console.error(error);
    return actionError('Failed to delete definition.');
  }
}

/**
 * Upsert a Nexus Library definition for an Ethereal Nexus component.
 * Used by the "Map to existing component" strategy — the selected component
 * needs a library definition row so it can be used as a mapping target.
 *
 * Key is derived from the component name (slugified) to keep it stable.
 * Dialog is built from the component version's dialog (flattened to Nexus format).
 */
export async function upsertLibraryDefinitionForComponent(
  projectId: string,
  component: {
    id: string;
    name: string;
    title: string | null;
    version: string | null;
    dialog: unknown;
  },
): ActionResponse<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');

  try {
    // Get or create the library
    let library = (
      await db.select().from(nexusLibraries).where(eq(nexusLibraries.project_id, projectId))
    )[0];
    if (!library) {
      const inserted = await db
        .insert(nexusLibraries)
        .values({ project_id: projectId, name: 'Nexus Library' })
        .returning();
      library = inserted[0];
    }

    const key = slugify(component.name);
    const displayName = component.title ?? component.name;

    // Build a Nexus dialog from the component's dialog
    const nexusDialog = buildNexusDialogFromComponentDialog(component.dialog);

    // Upsert by (library_id, kind, key)
    const existing = (
      await db
        .select({ id: nexusLibraryDefinitions.id })
        .from(nexusLibraryDefinitions)
        .where(
          and(
            eq(nexusLibraryDefinitions.library_id, library.id),
            eq(nexusLibraryDefinitions.kind, 'component'),
            eq(nexusLibraryDefinitions.key, key),
          ),
        )
    )[0];

    if (existing) {
      await db
        .update(nexusLibraryDefinitions)
        .set({
          name: displayName,
          dialog: nexusDialog,
          source_hint: { componentId: component.id, version: component.version },
          updated_at: new Date(),
        })
        .where(eq(nexusLibraryDefinitions.id, existing.id));
      return actionSuccess({ id: existing.id });
    }

    const inserted = await db
      .insert(nexusLibraryDefinitions)
      .values({
        library_id: library.id,
        kind: 'component' as LibraryKind,
        key,
        name: displayName,
        status: 'generated',
        dialog: nexusDialog,
        source_hint: { componentId: component.id, version: component.version },
      })
      .returning({ id: nexusLibraryDefinitions.id });

    return actionSuccess({ id: inserted[0].id });
  } catch (error) {
    console.error(error);
    return actionError('Failed to upsert library definition.');
  }
}

/**
 * Convert an Ethereal Nexus component dialog (array format) to the
 * Nexus Library dialog schema `{ dialog: NexusDialogEntry[] }`.
 * Skips container nodes (tabs, tab, group, multifield).
 */
function buildNexusDialogFromComponentDialog(dialog: unknown): { dialog: unknown[] } {
  if (!Array.isArray(dialog)) return { dialog: [] };
  const CONTAINERS = new Set(['tabs', 'tab', 'group', 'multifield', 'object']);
  const entries: unknown[] = [];

  function walk(nodes: unknown[]) {
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const n = node as Record<string, unknown>;
      const type = String(n.type ?? '');
      if (CONTAINERS.has(type)) {
        const children = n.children ?? n.fields ?? n.items;
        if (Array.isArray(children)) walk(children);
        continue;
      }
      if (n.name || n.id) {
        entries.push({
          id: String(n.id ?? n.name ?? ''),
          name: String(n.name ?? n.id ?? ''),
          type: type || 'textfield',
          label: String(n.label ?? n.name ?? n.id ?? ''),
          required: n.required === true,
        });
      }
      const children = n.children ?? n.fields;
      if (Array.isArray(children)) walk(children);
    }
  }

  walk(dialog);
  return { dialog: entries };
}
