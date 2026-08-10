'use server';

import { ActionResponse } from '@/data/action';
import { db } from '@/db';
import { auth } from '@/auth';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { nexusMappings, nexusMappingLinks } from './schema';
import {
  mappingWorkbenchSchema,
  mappingStatsSchema,
  mappingSummarySchema,
  type MappingWorkbench,
  type MappingStats,
  type MappingItem,
  type MappingSummary,
  type FieldMapEntry as FieldMapEntryDto,
} from './dto';
import type { MappingStatus } from './types';
import { suggestTargets, type SourceField, type SourceItem } from './suggest';
import { slugify } from '@/data/meta/design/normalize';
import { getBlueprintDetail } from '@/data/cms/actions';
import { getNexusLibrary } from '@/data/meta/design/actions';
import { cmsConnections } from '@/data/cms/schema';
import { blueprintDefinitions } from '@/data/cms/schema';

const CONTENT_PATH = '/projects';

/* ------------------------------ helpers ------------------------------- */

function readSourceItems(
  items: {
    kind: string;
    name: string;
    externalId: string;
    attributes: Record<string, unknown>;
  }[],
): SourceItem[] {
  const KINDS = new Set(['component', 'model', 'template', 'editableTemplate']);
  const toKind = (k: string) =>
    k === 'model' ? 'contentType' : k === 'editableTemplate' ? 'layout' : k === 'template' ? 'layout' : k;
  const seen = new Set<string>();
  const result: SourceItem[] = [];
  for (const it of items) {
    if (!KINDS.has(it.kind)) continue;
    const kind = toKind(it.kind);
    const key = slugify(it.name || it.externalId);
    const dedupeKey = `${kind}:${key}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const rawFields = it.attributes.fields;
    const fields: SourceField[] = Array.isArray(rawFields)
      ? rawFields
          .filter((f): f is SourceField => !!f && typeof f === 'object' && 'name' in f)
          .map((f) => ({
            name: String((f as SourceField).name),
            type: String((f as SourceField).type ?? 'Text'),
            required: (f as SourceField).required === true,
          }))
      : [];
    result.push({
      key,
      name: it.name,
      kind,
      group:
        typeof it.attributes.group === 'string'
          ? (it.attributes.group as string)
          : undefined,
      fields,
    });
  }
  return result;
}

/**
 * Build a dependency map (`kind:key` → required `kind:key`[]) from the blueprint
 * graph's `uses` edges (e.g. a Layout uses Components). Edges reference nodes by
 * `externalId`; we resolve those to the same `kind:key` identity used by items.
 */
function buildDependencyMap(
  items: {
    kind: string;
    name: string;
    externalId: string;
  }[],
  edges: { fromExternalId: string; toExternalId: string; type: string }[],
): Map<string, string[]> {
  const KINDS = new Set(['component', 'model', 'template', 'editableTemplate']);
  const toKind = (k: string) =>
    k === 'model'
      ? 'contentType'
      : k === 'editableTemplate' || k === 'template'
        ? 'layout'
        : k;
  // externalId → identity (kind:key)
  const idByExternalId = new Map<string, string>();
  for (const it of items) {
    if (!KINDS.has(it.kind)) continue;
    const key = slugify(it.name || it.externalId);
    idByExternalId.set(it.externalId, `${toKind(it.kind)}:${key}`);
  }
  const deps = new Map<string, string[]>();
  for (const e of edges) {
    if (e.type !== 'uses') continue;
    const from = idByExternalId.get(e.fromExternalId);
    const to = idByExternalId.get(e.toExternalId);
    if (!from || !to || from === to) continue;
    const arr = deps.get(from) ?? [];
    if (!arr.includes(to)) arr.push(to);
    deps.set(from, arr);
  }
  return deps;
}

function computeStats(items: { status: MappingStatus }[]): MappingStats {
  const s = { mapped: 0, needsReview: 0, missing: 0, conflict: 0, skipped: 0 };
  for (const i of items) {
    if (i.status === 'mapped') s.mapped += 1;
    else if (i.status === 'needs-review') s.needsReview += 1;
    else if (i.status === 'missing') s.missing += 1;
    else if (i.status === 'conflict') s.conflict += 1;
    else if (i.status === 'skipped') s.skipped += 1;
  }
  const total = items.length;
  const done = s.mapped;
  return {
    total,
    ...s,
    percent: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

/* --------------------------- mapping CRUD ----------------------------- */

export async function getMappings(
  projectId: string,
  blueprintDefinitionId: string,
): ActionResponse<MappingSummary[]> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    const rows = await db
      .select()
      .from(nexusMappings)
      .where(
        and(
          eq(nexusMappings.project_id, projectId),
          eq(nexusMappings.blueprint_definition_id, blueprintDefinitionId),
        ),
      );

    const summaries: MappingSummary[] = [];
    for (const m of rows) {
      const links = await db
        .select({ status: nexusMappingLinks.status })
        .from(nexusMappingLinks)
        .where(eq(nexusMappingLinks.mapping_id, m.id));
      summaries.push({
        id: m.id,
        name: m.name,
        blueprintDefinitionId: m.blueprint_definition_id,
        targetConnectionId: m.target_connection_id,
        stats: computeStats(links.map((l) => ({ status: l.status as MappingStatus }))),
      });
    }
    const safe = mappingSummarySchema.array().safeParse(summaries);
    if (!safe.success) return actionZodError('Failed to parse mappings.', safe.error);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to load mappings.');
  }
}

export async function createMapping(input: {
  projectId: string;
  blueprintDefinitionId: string;
  targetConnectionId?: string | null;
  name?: string;
}): ActionResponse<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    const library = await getNexusLibrary(input.projectId);
    if (!library.success) return actionError(library.error.message);

    const row = (
      await db
        .insert(nexusMappings)
        .values({
          project_id: input.projectId,
          blueprint_definition_id: input.blueprintDefinitionId,
          library_id: library.data.id,
          target_connection_id: input.targetConnectionId ?? null,
          name: input.name ?? 'Mapping',
        })
        .returning()
    )[0];

    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess({ id: row.id });
  } catch (error) {
    console.error(error);
    return actionError('Failed to create mapping.');
  }
}

export async function deleteMapping(
  mappingId: string,
): ActionResponse<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    await db.delete(nexusMappings).where(eq(nexusMappings.id, mappingId));
    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess({ id: mappingId });
  } catch (error) {
    console.error(error);
    return actionError('Failed to delete mapping.');
  }
}

export async function setMappingTarget(
  mappingId: string,
  targetConnectionId: string | null,
): ActionResponse<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    await db
      .update(nexusMappings)
      .set({ target_connection_id: targetConnectionId, updated_at: new Date() })
      .where(eq(nexusMappings.id, mappingId));
    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess({ id: mappingId });
  } catch (error) {
    console.error(error);
    return actionError('Failed to set target.');
  }
}

/* ----------------------------- workbench ------------------------------ */

export async function getMappingWorkbench(
  mappingId: string,
): ActionResponse<MappingWorkbench> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');

  try {
    const mapping = (
      await db.select().from(nexusMappings).where(eq(nexusMappings.id, mappingId))
    )[0];
    if (!mapping) return actionError('Mapping not found.');

    const [detail, library] = await Promise.all([
      getBlueprintDetail(mapping.blueprint_definition_id),
      getNexusLibrary(mapping.project_id),
    ]);
    if (!detail.success) return actionError(detail.error.message);
    if (!library.success) return actionError(library.error.message);

    const def = (
      await db
        .select({ name: blueprintDefinitions.name })
        .from(blueprintDefinitions)
        .where(eq(blueprintDefinitions.id, mapping.blueprint_definition_id))
    )[0];

    let targetConnectionName: string | null = null;
    if (mapping.target_connection_id) {
      const conn = (
        await db
          .select({ name: cmsConnections.name })
          .from(cmsConnections)
          .where(eq(cmsConnections.id, mapping.target_connection_id))
      )[0];
      targetConnectionName = conn?.name ?? null;
    }

    const sources = readSourceItems(detail.data.items);
    const depMap = buildDependencyMap(detail.data.items, detail.data.edges);

    // Existing links keyed by kind:key.
    const links = await db
      .select()
      .from(nexusMappingLinks)
      .where(eq(nexusMappingLinks.mapping_id, mappingId));
    type LinkRow = (typeof links)[number];
    const linkByKey = new Map<string, LinkRow>(
      links.map((l) => [`${l.blueprint_kind}:${l.blueprint_node_key}`, l] as const),
    );

    const items: MappingItem[] = sources.map((src) => {
      const suggestions = suggestTargets(src, library.data.definitions);
      const link = linkByKey.get(`${src.kind}:${src.key}`);
      return {
        kind: src.kind,
        key: src.key,
        name: src.name,
        group: src.group ?? null,
        sourceFields: src.fields,
        status: (link?.status as MappingStatus) ?? 'missing',
        confidence: link?.confidence ?? suggestions[0]?.confidence ?? 0,
        targetDefinitionId: link?.target_definition_id ?? null,
        fieldMap: (link?.field_map ?? []) as FieldMapEntryDto[],
        transform: (link?.transform ?? {}) as Record<string, unknown>,
        note: link?.note ?? null,
        mappedBy: link?.mapped_by ?? null,
        mappedByName: link?.mapped_by_name ?? null,
        updatedAt: link?.updated_at ?? null,
        mappingType: link?.mapping_type ?? null,
        suggestions,
        dependsOn: depMap.get(`${src.kind}:${src.key}`) ?? [],
      };
    });

    const payload: MappingWorkbench = {
      mapping: {
        id: mapping.id,
        projectId: mapping.project_id,
        blueprintDefinitionId: mapping.blueprint_definition_id,
        libraryId: mapping.library_id,
        targetConnectionId: mapping.target_connection_id,
        name: mapping.name,
      },
      blueprintName: def?.name ?? 'Blueprint',
      provider: detail.data.provider,
      targetConnectionName,
      items,
      stats: computeStats(items),
    };

    const safe = mappingWorkbenchSchema.safeParse(payload);
    if (!safe.success) return actionZodError('Failed to parse workbench.', safe.error);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to load the mapping workbench.');
  }
}

/* --------------------------- link mutations --------------------------- */

/** Upsert a single link (create-if-missing by kind+key). */
async function upsertLink(
  mappingId: string,
  kind: string,
  key: string,
  name: string,
  patch: Partial<{
    targetDefinitionId: string | null;
    status: MappingStatus;
    confidence: number;
    fieldMap: FieldMapEntryDto[];
    transform: Record<string, unknown>;
    note: string | null;
    mappingType: string | null;
  }>,
  actor?: { id: string; name: string } | null,
) {
  const existing = (
    await db
      .select({ id: nexusMappingLinks.id })
      .from(nexusMappingLinks)
      .where(
        and(
          eq(nexusMappingLinks.mapping_id, mappingId),
          eq(nexusMappingLinks.blueprint_kind, kind),
          eq(nexusMappingLinks.blueprint_node_key, key),
        ),
      )
      .limit(1)
  )[0];

  const now = new Date();

  if (existing) {
    const set: Record<string, unknown> = { updated_at: now };
    if (patch.targetDefinitionId !== undefined) set.target_definition_id = patch.targetDefinitionId;
    if (patch.status !== undefined) set.status = patch.status;
    if (patch.confidence !== undefined) set.confidence = patch.confidence;
    if (patch.fieldMap !== undefined) set.field_map = patch.fieldMap;
    if (patch.transform !== undefined) set.transform = patch.transform;
    if (patch.note !== undefined) set.note = patch.note;
    if (patch.mappingType !== undefined) set.mapping_type = patch.mappingType;
    if (patch.status === 'mapped' && actor) {
      set.mapped_by = actor.id;
      set.mapped_by_name = actor.name;
    }
    await db.update(nexusMappingLinks).set(set).where(eq(nexusMappingLinks.id, existing.id));
  } else {
    await db.insert(nexusMappingLinks).values({
      mapping_id: mappingId,
      blueprint_kind: kind,
      blueprint_node_key: key,
      blueprint_node_name: name,
      target_definition_id: patch.targetDefinitionId ?? null,
      status: patch.status ?? 'missing',
      confidence: patch.confidence ?? 0,
      field_map: (patch.fieldMap ?? []) as unknown,
      transform: (patch.transform ?? {}) as unknown,
      note: patch.note ?? null,
      mapping_type: patch.mappingType ?? null,
      mapped_by: patch.status === 'mapped' && actor ? actor.id : null,
      mapped_by_name: patch.status === 'mapped' && actor ? actor.name : null,
    });
  }
}

export async function setMappingLink(
  mappingId: string,
  item: { kind: string; key: string; name: string },
  patch: {
    targetDefinitionId?: string | null;
    status?: MappingStatus;
    fieldMap?: FieldMapEntryDto[];
    transform?: Record<string, unknown>;
    note?: string | null;
    mappingType?: string | null;
  },
): ActionResponse<{ ok: true }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  const actor = {
    id: session.user.id,
    name: session.user.name ?? session.user.email ?? 'Unknown',
  };
  try {
    await upsertLink(mappingId, item.kind, item.key, item.name, patch, actor);
    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess({ ok: true } as const);
  } catch (error) {
    console.error(error);
    return actionError('Failed to update mapping link.');
  }
}

/**
 * Auto-map every source item to its best suggestion.
 * - best suggestion applied → `needs-review` (yellow)
 * - none found → `missing`
 * - two items contend for the same target at similar confidence → `conflict`
 */
export async function autoMapAll(
  mappingId: string,
): ActionResponse<MappingStats> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    const mapping = (
      await db.select().from(nexusMappings).where(eq(nexusMappings.id, mappingId))
    )[0];
    if (!mapping) return actionError('Mapping not found.');

    const [detail, library] = await Promise.all([
      getBlueprintDetail(mapping.blueprint_definition_id),
      getNexusLibrary(mapping.project_id),
    ]);
    if (!detail.success) return actionError(detail.error.message);
    if (!library.success) return actionError(library.error.message);

    const sources = readSourceItems(detail.data.items);

    // First pass: best suggestion per source.
    type Plan = {
      src: SourceItem;
      best?: { definitionId: string; confidence: number };
    };
    const plans: Plan[] = sources.map((src) => {
      const s = suggestTargets(src, library.data.definitions);
      return { src, best: s[0] ? { definitionId: s[0].definitionId, confidence: s[0].confidence } : undefined };
    });

    // Conflict detection: same target claimed by 2+ sources at similar confidence.
    const byTarget = new Map<string, Plan[]>();
    for (const p of plans) {
      if (!p.best) continue;
      const arr = byTarget.get(p.best.definitionId) ?? [];
      arr.push(p);
      byTarget.set(p.best.definitionId, arr);
    }
    const conflicting = new Set<string>();
    for (const [, arr] of byTarget) {
      if (arr.length > 1) {
        const top = Math.max(...arr.map((a) => a.best!.confidence));
        for (const a of arr) {
          if (top - a.best!.confidence <= 15) conflicting.add(a.src.key + ':' + a.src.kind);
        }
      }
    }

    for (const p of plans) {
      // Don't clobber items the user already confirmed/skipped.
      const existing = (
        await db
          .select({ status: nexusMappingLinks.status })
          .from(nexusMappingLinks)
          .where(
            and(
              eq(nexusMappingLinks.mapping_id, mappingId),
              eq(nexusMappingLinks.blueprint_kind, p.src.kind),
              eq(nexusMappingLinks.blueprint_node_key, p.src.key),
            ),
          )
          .limit(1)
      )[0];
      if (existing && (existing.status === 'mapped' || existing.status === 'skipped')) {
        continue;
      }

      const isConflict = conflicting.has(p.src.key + ':' + p.src.kind);
      const status: MappingStatus = !p.best
        ? 'missing'
        : isConflict
          ? 'conflict'
          : 'needs-review';

      await upsertLink(mappingId, p.src.kind, p.src.key, p.src.name, {
        targetDefinitionId: p.best?.definitionId ?? null,
        status,
        confidence: p.best?.confidence ?? 0,
      });
    }

    // Recompute stats from persisted links, treating any source without a
    // link as `missing`.
    const links = await db
      .select({ status: nexusMappingLinks.status })
      .from(nexusMappingLinks)
      .where(eq(nexusMappingLinks.mapping_id, mappingId));
    const realStats = computeStats(
      links.map((l) => ({ status: l.status as MappingStatus })),
    );
    realStats.total = sources.length;
    realStats.missing += Math.max(0, sources.length - links.length);
    realStats.percent =
      realStats.total > 0
        ? Math.round((realStats.mapped / realStats.total) * 100)
        : 0;

    revalidatePath(CONTENT_PATH, 'page');
    const safe = mappingStatsSchema.safeParse(realStats);
    if (!safe.success) return actionZodError('Failed to parse stats.', safe.error);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to auto-map.');
  }
}

export async function acceptAll(mappingId: string): ActionResponse<{ ok: true }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    await db
      .update(nexusMappingLinks)
      .set({ status: 'mapped', updated_at: new Date() })
      .where(
        and(
          eq(nexusMappingLinks.mapping_id, mappingId),
          eq(nexusMappingLinks.status, 'needs-review'),
        ),
      );
    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess({ ok: true } as const);
  } catch (error) {
    console.error(error);
    return actionError('Failed to accept all.');
  }
}

export async function skipAll(mappingId: string): ActionResponse<{ ok: true }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    // Skip everything not already mapped.
    const links = await db
      .select({ id: nexusMappingLinks.id, status: nexusMappingLinks.status })
      .from(nexusMappingLinks)
      .where(eq(nexusMappingLinks.mapping_id, mappingId));
    for (const l of links) {
      if (l.status !== 'mapped') {
        await db
          .update(nexusMappingLinks)
          .set({ status: 'skipped', updated_at: new Date() })
          .where(eq(nexusMappingLinks.id, l.id));
      }
    }
    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess({ ok: true } as const);
  } catch (error) {
    console.error(error);
    return actionError('Failed to skip all.');
  }
}

/* --------------------------- bulk actions ---------------------------- */

type BulkTarget = { kind: string; key: string; name: string };

/**
 * Bulk-skip the given items. Enforces the dependency rule: a component that is
 * still required by a *kept* (non-skipped) layout cannot be skipped. Returns the
 * list of blocked components (with the layouts needing them) so the UI can
 * explain what to do.
 */
export async function bulkSkip(
  mappingId: string,
  targets: BulkTarget[],
): ActionResponse<{ skipped: number; blocked: { id: string; name: string; neededBy: string[] }[] }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  if (targets.length === 0) return actionSuccess({ skipped: 0, blocked: [] });
  try {
    const mapping = (
      await db.select().from(nexusMappings).where(eq(nexusMappings.id, mappingId))
    )[0];
    if (!mapping) return actionError('Mapping not found.');

    const detail = await getBlueprintDetail(mapping.blueprint_definition_id);
    if (!detail.success) return actionError(detail.error.message);

    const depMap = buildDependencyMap(detail.data.items, detail.data.edges);
    const nameById = new Map<string, string>(
      readSourceItems(detail.data.items).map((s) => [`${s.kind}:${s.key}`, s.name] as const),
    );

    // Current persisted statuses.
    const links = await db
      .select({
        kind: nexusMappingLinks.blueprint_kind,
        key: nexusMappingLinks.blueprint_node_key,
        status: nexusMappingLinks.status,
      })
      .from(nexusMappingLinks)
      .where(eq(nexusMappingLinks.mapping_id, mappingId));
    const statusById = new Map<string, MappingStatus>(
      links.map((l) => [`${l.kind}:${l.key}`, l.status as MappingStatus] as const),
    );

    // Simulate the post-skip state to evaluate dependencies.
    const skipSet = new Set<string>(targets.map((t) => `${t.kind}:${t.key}`));
    const willBeSkipped = (id: string) =>
      skipSet.has(id) || statusById.get(id) === 'skipped';

    // For each component being skipped, is any layout that uses it still kept?
    const blocked: { id: string; name: string; neededBy: string[] }[] = [];
    for (const t of targets) {
      const id = `${t.kind}:${t.key}`;
      if (t.kind !== 'component') continue;
      const neededBy: string[] = [];
      for (const [layoutId, deps] of depMap) {
        if (!deps.includes(id)) continue;
        if (!willBeSkipped(layoutId)) {
          neededBy.push(nameById.get(layoutId) ?? layoutId.split(':')[1]);
        }
      }
      if (neededBy.length > 0) {
        blocked.push({ id, name: t.name, neededBy });
      }
    }
    const blockedIds = new Set(blocked.map((b) => b.id));

    let skipped = 0;
    for (const t of targets) {
      const id = `${t.kind}:${t.key}`;
      if (blockedIds.has(id)) continue;
      await upsertLink(mappingId, t.kind, t.key, t.name, { status: 'skipped' });
      skipped += 1;
    }

    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess({ skipped, blocked });
  } catch (error) {
    console.error(error);
    return actionError('Failed to skip the selected items.');
  }
}

/** Auto-map the given items to their best suggestion (→ needs-review). */
export async function bulkAutoMap(
  mappingId: string,
  targets: BulkTarget[],
): ActionResponse<{ mapped: number; missing: number }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  if (targets.length === 0) return actionSuccess({ mapped: 0, missing: 0 });
  try {
    const mapping = (
      await db.select().from(nexusMappings).where(eq(nexusMappings.id, mappingId))
    )[0];
    if (!mapping) return actionError('Mapping not found.');

    const [detail, library] = await Promise.all([
      getBlueprintDetail(mapping.blueprint_definition_id),
      getNexusLibrary(mapping.project_id),
    ]);
    if (!detail.success) return actionError(detail.error.message);
    if (!library.success) return actionError(library.error.message);

    const sources = readSourceItems(detail.data.items);
    const sourceById = new Map(sources.map((s) => [`${s.kind}:${s.key}`, s] as const));

    let mapped = 0;
    let missing = 0;
    for (const t of targets) {
      const src = sourceById.get(`${t.kind}:${t.key}`);
      if (!src) continue;
      const best = suggestTargets(src, library.data.definitions)[0];
      if (best) {
        await upsertLink(mappingId, t.kind, t.key, t.name, {
          targetDefinitionId: best.definitionId,
          status: 'needs-review',
          confidence: best.confidence,
        });
        mapped += 1;
      } else {
        await upsertLink(mappingId, t.kind, t.key, t.name, {
          targetDefinitionId: null,
          status: 'missing',
          confidence: 0,
        });
        missing += 1;
      }
    }

    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess({ mapped, missing });
  } catch (error) {
    console.error(error);
    return actionError('Failed to auto-map the selected items.');
  }
}

/** Accept the given items (mark as mapped) — only those that have a target. */
export async function bulkAccept(
  mappingId: string,
  targets: BulkTarget[],
): ActionResponse<{ accepted: number; skippedNoTarget: number }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  if (targets.length === 0)
    return actionSuccess({ accepted: 0, skippedNoTarget: 0 });
  try {
    const links = await db
      .select({
        kind: nexusMappingLinks.blueprint_kind,
        key: nexusMappingLinks.blueprint_node_key,
        target: nexusMappingLinks.target_definition_id,
      })
      .from(nexusMappingLinks)
      .where(eq(nexusMappingLinks.mapping_id, mappingId));
    const targetById = new Map(
      links.map((l) => [`${l.kind}:${l.key}`, l.target] as const),
    );

    let accepted = 0;
    let skippedNoTarget = 0;
    for (const t of targets) {
      const id = `${t.kind}:${t.key}`;
      if (!targetById.get(id)) {
        skippedNoTarget += 1;
        continue;
      }
      await upsertLink(mappingId, t.kind, t.key, t.name, { status: 'mapped' });
      accepted += 1;
    }

    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess({ accepted, skippedNoTarget });
  } catch (error) {
    console.error(error);
    return actionError('Failed to accept the selected items.');
  }
}

export async function getProjectMappingStats(
  projectId: string,
): ActionResponse<MappingStats> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    const mappings = await db
      .select({ id: nexusMappings.id })
      .from(nexusMappings)
      .where(eq(nexusMappings.project_id, projectId));
    const allLinks: { status: MappingStatus }[] = [];
    for (const m of mappings) {
      const links = await db
        .select({ status: nexusMappingLinks.status })
        .from(nexusMappingLinks)
        .where(eq(nexusMappingLinks.mapping_id, m.id));
      for (const l of links) allLinks.push({ status: l.status as MappingStatus });
    }
    return actionSuccess(computeStats(allLinks));
  } catch (error) {
    console.error(error);
    return actionError('Failed to compute mapping stats.');
  }
}
