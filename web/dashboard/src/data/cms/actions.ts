'use server';

import { ActionResponse } from '@/data/action';
import { db, dbUncached } from '@/db';
import { auth } from '@/auth';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { encryptJson, decryptJson } from '@/lib/crypto';
import { logger } from '@/lib/logger';
import {
  cmsConnections,
  connectionValidations,
  discoveryJobs,
  blueprintDefinitions,
  blueprintSnapshots,
  blueprintNodes,
  blueprintEdges,
  blueprintChanges,
} from './schema';
import { environments } from '@/data/projects/schema';
import {
  cmsConnectionInputSchema,
  cmsConnectionViewSchema,
  validationRunSchema,
  capabilityRunSchema,
  buildRunSchema,
  blueprintViewSchema,
  blueprintDetailSchema,
  type CmsConnectionInput,
  type CmsConnectionView,
  type ValidationRun,
  type CapabilityRun,
  type BuildRun,
  type BlueprintView,
  type BlueprintDetail,
} from './dto';
import {
  cmsConfigSchemas,
  CMS_SECRET_FIELDS,
  SECRET_PLACEHOLDER,
  type CmsConnectorConfig,
  type CmsConnectorKey,
} from './config';
import { getConnectorOrThrow } from './connectors';
import { diffGraph } from './graph';
import type {
  Capability,
  ConnectionHealth,
  DiscoveryScope,
  NodeKind,
  Project,
} from './types';

const CONTENT_PATH = '/projects';

/* ============================ connections ============================= */

export async function getCmsConnections(
  projectId: string,
): ActionResponse<CmsConnectionView[]> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');

  try {
    // Use dbUncached to prevent stale data after a write-then-read pattern.
    const rows = await dbUncached
      .select({
        id: cmsConnections.id,
        project_id: cmsConnections.project_id,
        environment_id: cmsConnections.environment_id,
        provider: cmsConnections.provider,
        name: cmsConnections.name,
        status: cmsConnections.status,
        role: cmsConnections.role,
        capabilities: cmsConnections.capabilities,
        health: cmsConnections.health,
        created_at: cmsConnections.created_at,
        updated_at: cmsConnections.updated_at,
      })
      .from(cmsConnections)
      .where(eq(cmsConnections.project_id, projectId))
      .orderBy(desc(cmsConnections.created_at));

    const safe = cmsConnectionViewSchema.array().safeParse(rows);
    if (!safe.success) {
      return actionZodError('Failed to parse connections.', safe.error);
    }
    return actionSuccess(safe.data);
  } catch (error) {
    logger.error('getCmsConnections failed', error instanceof Error ? error : undefined);
    return actionError('Failed to load CMS connections.');
  }
}

/** Read a possibly-nested value by dotted path (e.g. "auth.password"). */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/** Set a possibly-nested value by dotted path, mutating a shallow-cloned tree. */
function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split('.');
  let node: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const k = keys[i];
    if (!node[k] || typeof node[k] !== 'object') node[k] = {};
    node = node[k] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]] = value;
}

/**
 * For each secret field of a provider, if the incoming value is blank or the
 * keep-placeholder, restore the value from the existing (decrypted) config.
 */
function mergeSecrets(
  provider: CmsConnectorKey,
  incoming: Record<string, unknown>,
  existing: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = structuredClone(incoming);
  for (const path of CMS_SECRET_FIELDS[provider] ?? []) {
    const value = getByPath(merged, path);
    const isBlank =
      value === undefined ||
      value === null ||
      value === '' ||
      value === SECRET_PLACEHOLDER;
    if (isBlank) {
      const prior = getByPath(existing, path);
      if (prior !== undefined) setByPath(merged, path, prior);
    }
  }
  return merged;
}

export async function upsertCmsConnection(
  input: CmsConnectionInput,
): ActionResponse<CmsConnectionView> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');

  const parsed = cmsConnectionInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionZodError('Failed to parse connection input.', parsed.error);
  }

  // RBAC: require write or manage permission on the project.
  const projectPermission = session.permissions?.[parsed.data.project_id];
  if (
    session.user.role !== 'admin' &&
    projectPermission !== 'write' &&
    projectPermission !== 'manage'
  ) {
    return actionError('You do not have permission to manage connections for this project.');
  }

  const isUpdate = !!parsed.data.id;

  // On update, preserve stored secrets when the incoming value is blank or the
  // keep-placeholder (secrets are never sent to the client).
  let incomingConfig = parsed.data.config as Record<string, unknown>;
  if (isUpdate) {
    const existingRow = (
      await db
        .select({ configuration: cmsConnections.configuration })
        .from(cmsConnections)
        .where(eq(cmsConnections.id, parsed.data.id!))
    )[0];
    if (existingRow) {
      try {
        const existingConfig = decryptJson<Record<string, unknown>>(
          existingRow.configuration,
        );
        incomingConfig = mergeSecrets(
          parsed.data.provider,
          incomingConfig,
          existingConfig,
        );
      } catch {
        // If decrypt fails (e.g. schema changed), fall back to incoming config.
      }
    }
  }

  const configSchema = cmsConfigSchemas[parsed.data.provider];
  const safeConfig = configSchema.safeParse(incomingConfig);
  if (!safeConfig.success) {
    return actionZodError('Invalid connection configuration.', safeConfig.error);
  }

  const configEncrypted = encryptJson(safeConfig.data);

  try {
    const values = {
      project_id: parsed.data.project_id,
      environment_id: parsed.data.environment_id ?? null,
      provider: parsed.data.provider,
      name: (safeConfig.data as { name: string }).name,
      configuration: configEncrypted,
      status: 'draft',
      role: parsed.data.role ?? 'general',
      updated_at: new Date(),
    };

    const row = isUpdate
      ? (
          await db
            .update(cmsConnections)
            .set(values)
            .where(eq(cmsConnections.id, parsed.data.id!))
            .returning()
        )[0]
      : (await db.insert(cmsConnections).values(values).returning())[0];

    const view = cmsConnectionViewSchema.safeParse(row);
    if (!view.success) {
      return actionZodError('Failed to parse saved connection.', view.error);
    }
    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess(view.data);
  } catch (error) {
    logger.error('upsertCmsConnection failed', error instanceof Error ? error : undefined);
    return actionError('Failed to save CMS connection.');
  }
}

/**
 * Return a connection's config for editing, with all secret fields redacted to
 * the keep-placeholder (real secrets never reach the client). Also returns the
 * provider so the editor can preselect the CMS type.
 */
export async function getCmsConnectionConfig(
  connectionId: string,
): ActionResponse<{ provider: CmsConnectorKey; role: string; config: Record<string, unknown> }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    const row = (
      await db
        .select()
        .from(cmsConnections)
        .where(eq(cmsConnections.id, connectionId))
    )[0];
    if (!row) return actionError('Connection not found.');

    // RBAC: require at least read permission on the connection's project.
    // Using 'Connection not found' (not 'Forbidden') to prevent ID enumeration.
    const projectPermission = session.permissions?.[row.project_id];
    if (
      session.user.role !== 'admin' &&
      projectPermission === undefined
    ) {
      return actionError('Connection not found.');
    }

    const provider = row.provider as CmsConnectorKey;
    let config: Record<string, unknown>;
    try {
      config = decryptJson<Record<string, unknown>>(row.configuration);
    } catch {
      return actionError('Stored configuration could not be read.');
    }

    // Redact secrets.
    const redacted = structuredClone(config);
    for (const path of CMS_SECRET_FIELDS[provider] ?? []) {
      if (getByPath(redacted, path) !== undefined) {
        setByPath(redacted, path, SECRET_PLACEHOLDER);
      }
    }

    return actionSuccess({ provider, role: row.role ?? 'general', config: redacted });
  } catch (error) {
    logger.error('action failed', error instanceof Error ? error : undefined);
    return actionError('Failed to load connection configuration.');
  }
}

export async function deleteCmsConnection(
  connectionId: string,
): ActionResponse<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    // Block deletion if an active or pending discovery job references this connection.
    const activeJobs = await db
      .select({ id: discoveryJobs.id, status: discoveryJobs.status })
      .from(discoveryJobs)
      .where(
        and(
          eq(discoveryJobs.connection_id, connectionId),
          inArray(discoveryJobs.status, ['pending', 'running']),
        ),
      );

    if (activeJobs.length > 0) {
      const jobIds = activeJobs.map((j) => j.id).join(', ');
      return actionError(
        `This connection is in use by active job(s): ${jobIds}. Complete or cancel the job before deleting.`,
      );
    }

    // RBAC: fetch the connection to determine its project, then check write permission.
    const connectionRow = (
      await db
        .select({ project_id: cmsConnections.project_id })
        .from(cmsConnections)
        .where(eq(cmsConnections.id, connectionId))
    )[0];

    if (!connectionRow) return actionError('Connection not found.');

    const projectPermission = session.permissions?.[connectionRow.project_id];
    if (
      session.user.role !== 'admin' &&
      projectPermission !== 'write' &&
      projectPermission !== 'manage'
    ) {
      return actionError('You do not have permission to delete connections for this project.');
    }

    await db.delete(cmsConnections).where(eq(cmsConnections.id, connectionId));
    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess({ id: connectionId });
  } catch (error) {
    logger.error('deleteCmsConnection failed', error instanceof Error ? error : undefined);
    return actionError('Failed to delete CMS connection.');
  }
}

async function loadConnectorCtx(connectionId: string) {
  const row = (
    await db
      .select()
      .from(cmsConnections)
      .where(eq(cmsConnections.id, connectionId))
  )[0];
  if (!row) return null;
  const connector = getConnectorOrThrow(row.provider as CmsConnectorKey);
  const config = decryptJson<CmsConnectorConfig>(row.configuration);
  return {
    row,
    connector,
    ctx: { connectionId, config: config as Record<string, unknown> },
  };
}

/* ============================ validation ============================== */

export async function validateCmsConnection(
  connectionId: string,
): ActionResponse<ValidationRun> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');

  try {
    const loaded = await loadConnectorCtx(connectionId);
    if (!loaded) return actionError('Connection not found.');
    const { row, connector, ctx } = loaded;

    // RBAC: require write or manage permission on the connection's project.
    const projectPermission = session.permissions?.[row.project_id];
    if (
      session.user.role !== 'admin' &&
      projectPermission !== 'write' &&
      projectPermission !== 'manage'
    ) {
      return actionError('You do not have permission to validate connections for this project.');
    }

    const authResult = await connector.authenticate(ctx);
    const result = await connector.validateConnection({ ...ctx, auth: authResult });

    const safe = validationRunSchema.safeParse(result);
    if (!safe.success) {
      return actionZodError('Failed to parse validation result.', safe.error);
    }

    await db
      .delete(connectionValidations)
      .where(eq(connectionValidations.connection_id, connectionId));
    if (safe.data.tasks.length > 0) {
      await db.insert(connectionValidations).values(
        safe.data.tasks.map((t) => ({
          connection_id: connectionId,
          task: t.name,
          status: t.status,
          message: t.message ?? null,
          duration_ms: t.durationMs ?? null,
        })),
      );
    }

    await db
      .update(cmsConnections)
      .set({ status: safe.data.ok ? 'active' : 'error', updated_at: new Date() })
      .where(eq(cmsConnections.id, connectionId));

    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess(safe.data);
  } catch (error) {
    logger.error('action failed', error instanceof Error ? error : undefined);
    return actionError('Failed to validate CMS connection.');
  }
}

/* ======================= capability discovery ======================== */

export async function discoverCapabilities(
  connectionId: string,
): ActionResponse<CapabilityRun> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');

  try {
    const loaded = await loadConnectorCtx(connectionId);
    if (!loaded) return actionError('Connection not found.');
    const { row, connector, ctx } = loaded;

    // RBAC: require write or manage permission on the connection's project.
    const projectPermission = session.permissions?.[row.project_id];
    if (
      session.user.role !== 'admin' &&
      projectPermission !== 'write' &&
      projectPermission !== 'manage'
    ) {
      return actionError('You do not have permission to discover capabilities for this project.');
    }

    const authResult = await connector.authenticate(ctx);
    const runCtx = { ...ctx, auth: authResult };

    const capabilities: Capability[] = [];
    for (const probe of connector.capabilityProbes()) {
      try {
        capabilities.push(await probe.execute(runCtx));
      } catch {
        capabilities.push({ key: probe.key, supported: false });
      }
    }

    // Derive + cache health.
    const missing = capabilities.filter((c) => !c.supported).length;
    const score = capabilities.length
      ? Math.round(
          ((capabilities.length - missing) / capabilities.length) * 100,
        )
      : 100;
    const health: ConnectionHealth = {
      score,
      warnings: missing,
      missingCapabilities: missing,
      status: score >= 90 ? 'healthy' : score >= 50 ? 'warning' : 'error',
    };

    await db
      .update(cmsConnections)
      .set({
        capabilities,
        health,
        status: 'connected',
        updated_at: new Date(),
      })
      .where(eq(cmsConnections.id, connectionId));

    const safe = capabilityRunSchema.safeParse({ capabilities });
    if (!safe.success) {
      return actionZodError('Failed to parse capabilities.', safe.error);
    }
    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess(safe.data);
  } catch (error) {
    logger.error('action failed', error instanceof Error ? error : undefined);
    return actionError('Failed to discover capabilities.');
  }
}

export async function getConnectionProjects(
  connectionId: string,
): ActionResponse<Project[]> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    const loaded = await loadConnectorCtx(connectionId);
    if (!loaded) return actionError('Connection not found.');
    const projects = await loaded.connector.discoverProjects(loaded.ctx);
    return actionSuccess(projects);
  } catch (error) {
    logger.error('action failed', error instanceof Error ? error : undefined);
    return actionError('Failed to list projects for this connection.');
  }
}

/**
 * List the CMS projects for connection config that has NOT been saved yet.
 * Used by the Add-CMS wizard so the user can pick a project before the
 * connection row exists. Config is used transiently (never persisted here).
 */
export async function discoverProjectsForConfig(
  provider: CmsConnectorKey,
  config: Record<string, unknown>,
): ActionResponse<Project[]> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    const connector = getConnectorOrThrow(provider);
    const projects = await connector.discoverProjects({
      connectionId: 'transient',
      config,
    });
    return actionSuccess(projects);
  } catch (error) {
    logger.error('action failed', error instanceof Error ? error : undefined);
    const detail = error instanceof Error ? error.message : 'Unknown error';
    return actionError(`Failed to list projects: ${detail}`);
  }
}

/* ========================= Blueprint Builder ========================== */

/**
 * Blueprint Builder: run generic-scope discovery tasks, build the graph
 * (definition + snapshot nodes/edges), persist a new versioned Snapshot, and
 * compute Changes vs the previous snapshot.
 */
export async function buildBlueprint(
  connectionId: string,
  scope?: DiscoveryScope[],
): ActionResponse<BuildRun> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');

  try {
    const loaded = await loadConnectorCtx(connectionId);
    if (!loaded) return actionError('Connection not found.');
    const { row, connector, ctx } = loaded;

    // The project to scope discovery to lives on the connection config.
    const projectId =
      typeof ctx.config.project === 'string' && ctx.config.project
        ? (ctx.config.project as string)
        : 'default';

    const discoveredBy = session.user.email ?? session.user.name ?? 'Unknown';

    // Definition: one per connection+project (create if missing).
    let definition = (
      await db
        .select()
        .from(blueprintDefinitions)
        .where(
          and(
            eq(blueprintDefinitions.connection_id, connectionId),
            eq(blueprintDefinitions.project_ref, projectId),
          ),
        )
        .limit(1)
    )[0];
    if (!definition) {
      definition = (
        await db
          .insert(blueprintDefinitions)
          .values({
            connection_id: connectionId,
            project_ref: projectId,
            name: `${row.name} — ${projectId}`,
            discovered_by: discoveredBy,
            description: 'Blueprint automatically generated from discovery.',
          })
          .returning()
      )[0];
    }

    // Previous snapshot (for diff).
    const prevSnapshot = (
      await db
        .select()
        .from(blueprintSnapshots)
        .where(eq(blueprintSnapshots.definition_id, definition.id))
        .orderBy(desc(blueprintSnapshots.version))
        .limit(1)
    )[0];
    const prevNodes = prevSnapshot
      ? await db
          .select({
            kind: blueprintNodes.kind,
            external_id: blueprintNodes.external_id,
            name: blueprintNodes.name,
          })
          .from(blueprintNodes)
          .where(eq(blueprintNodes.snapshot_id, prevSnapshot.id))
      : [];
    const prevEdges = prevSnapshot
      ? await db
          .select({
            from_external_id: blueprintEdges.from_external_id,
            to_external_id: blueprintEdges.to_external_id,
            type: blueprintEdges.type,
          })
          .from(blueprintEdges)
          .where(eq(blueprintEdges.snapshot_id, prevSnapshot.id))
      : [];

    const job = (
      await db
        .insert(discoveryJobs)
        .values({
          connection_id: connectionId,
          status: 'running',
          progress: 0,
          scope: scope ?? [],
          started_at: new Date(),
        })
        .returning()
    )[0];

    // Run the discovery tasks (filtered by generic scope).
    const scopeSet = scope && scope.length > 0 ? new Set(scope) : null;
    const tasksToRun = connector
      .discoveryTasks()
      .filter((t) => !scopeSet || scopeSet.has(t.scope));

    const taskResults: BuildRun['tasks'] = [];
    const allNodes: Array<{
      kind: NodeKind;
      externalId: string;
      name: string;
      layer: 'definition' | 'snapshot';
      attributes: Record<string, unknown>;
    }> = [];
    const allEdges: Array<{
      fromExternalId: string;
      toExternalId: string;
      type: string;
    }> = [];
    const stats: Partial<Record<string, number>> = {};

    for (const task of tasksToRun) {
      const start = Date.now();
      try {
        const output = await task.execute(ctx, projectId);
        for (const n of output.nodes) {
          allNodes.push({
            kind: n.kind,
            externalId: n.externalId,
            name: n.name,
            layer: n.layer,
            attributes: n.attributes ?? {},
          });
        }
        for (const e of output.edges) {
          allEdges.push({
            fromExternalId: e.fromExternalId,
            toExternalId: e.toExternalId,
            type: e.type,
          });
        }
        for (const [kind, total] of Object.entries(output.totals ?? {})) {
          stats[kind] = (stats[kind] ?? 0) + (total ?? 0);
        }
        taskResults.push({
          id: task.id,
          name: task.name,
          scope: task.scope,
          status: 'success',
          nodeCount: output.nodes.length,
          durationMs: Date.now() - start,
        });
      } catch (error) {
        taskResults.push({
          id: task.id,
          name: task.name,
          scope: task.scope,
          status: 'error',
          message: error instanceof Error ? error.message : 'Task failed',
          durationMs: Date.now() - start,
        });
      }
    }

    // Fill stats from captured node kinds when the task didn't report totals.
    for (const n of allNodes) {
      if (stats[n.kind] === undefined) {
        stats[n.kind] = (stats[n.kind] ?? 0) + 1;
      }
    }

    const nextVersion = prevSnapshot ? prevSnapshot.version + 1 : 1;
    const snapshot = (
      await db
        .insert(blueprintSnapshots)
        .values({
          definition_id: definition.id,
          version: nextVersion,
          discovered_by: discoveredBy,
          stats,
        })
        .returning()
    )[0];

    // Persist nodes + edges (chunked).
    const CHUNK = 500;
    if (allNodes.length > 0) {
      const nodeRows = allNodes.map((n) => ({
        snapshot_id: snapshot.id,
        layer: n.layer,
        kind: n.kind,
        external_id: n.externalId,
        name: n.name,
        attributes: n.attributes,
      }));
      for (let i = 0; i < nodeRows.length; i += CHUNK) {
        await db.insert(blueprintNodes).values(nodeRows.slice(i, i + CHUNK));
      }
    }
    if (allEdges.length > 0) {
      const edgeRows = allEdges.map((e) => ({
        snapshot_id: snapshot.id,
        type: e.type,
        from_external_id: e.fromExternalId,
        to_external_id: e.toExternalId,
      }));
      for (let i = 0; i < edgeRows.length; i += CHUNK) {
        await db.insert(blueprintEdges).values(edgeRows.slice(i, i + CHUNK));
      }
    }

    // Compute + persist changes vs the previous snapshot.
    const changes = diffGraph(
      {
        nodes: prevNodes.map((n) => ({
          kind: n.kind as NodeKind,
          externalId: n.external_id,
          name: n.name,
        })),
        edges: prevEdges.map((e) => ({
          fromExternalId: e.from_external_id,
          toExternalId: e.to_external_id,
          type: e.type as never,
        })),
      },
      {
        nodes: allNodes.map((n) => ({
          kind: n.kind,
          externalId: n.externalId,
          name: n.name,
        })),
        edges: allEdges.map((e) => ({
          fromExternalId: e.fromExternalId,
          toExternalId: e.toExternalId,
          type: e.type as never,
        })),
      },
    );
    if (changes.length > 0) {
      await db.insert(blueprintChanges).values(
        changes.map((c) => ({
          snapshot_id: snapshot.id,
          kind: c.kind,
          target: c.target,
          node_kind: c.nodeKind ?? null,
          edge_type: c.edgeType ?? null,
          external_id: c.externalId,
          name: c.name ?? null,
        })),
      );
    }

    const ok = taskResults.every((t) => t.status !== 'error');
    await db
      .update(discoveryJobs)
      .set({
        status: ok ? 'completed' : 'failed',
        progress: 100,
        finished_at: new Date(),
        snapshot_id: snapshot.id,
      })
      .where(eq(discoveryJobs.id, job.id));

    await db
      .update(cmsConnections)
      .set({ status: 'connected', updated_at: new Date() })
      .where(eq(cmsConnections.id, connectionId));

    revalidatePath(CONTENT_PATH, 'page');

    const nodeTotal = Object.values(stats).reduce(
      (s: number, v) => s + (v ?? 0),
      0,
    );
    const run: BuildRun = {
      ok,
      definitionId: definition.id,
      snapshotId: snapshot.id,
      version: nextVersion,
      projectId,
      tasks: taskResults,
      nodeTotal,
      changeCount: changes.length,
    };
    const safe = buildRunSchema.safeParse(run);
    if (!safe.success) {
      return actionZodError('Failed to parse build result.', safe.error);
    }
    return actionSuccess(safe.data);
  } catch (error) {
    logger.error('action failed', error instanceof Error ? error : undefined);
    return actionError('Failed to build blueprint.');
  }
}

/**
 * Re-discover an existing Blueprint: resolves the definition's connection +
 * project and runs the Builder again, producing a new versioned snapshot.
 */
export async function rediscoverBlueprint(
  definitionId: string,
): ActionResponse<BuildRun> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');

  try {
    const def = (
      await db
        .select({ connection_id: blueprintDefinitions.connection_id })
        .from(blueprintDefinitions)
        .where(eq(blueprintDefinitions.id, definitionId))
    )[0];
    if (!def) return actionError('Blueprint not found.');
    // The project is derived from the connection config inside buildBlueprint.
    return await buildBlueprint(def.connection_id);
  } catch (error) {
    logger.error('action failed', error instanceof Error ? error : undefined);
    return actionError('Failed to re-discover blueprint.');
  }
}

/* ============================== reads ================================= */

export async function getBlueprints(
  projectId: string,
): ActionResponse<BlueprintView[]> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');

  try {
    // Latest snapshot per definition, joined to connection + environment.
    const defs = await db
      .select({
        definitionId: blueprintDefinitions.id,
        name: blueprintDefinitions.name,
        discoveredBy: blueprintDefinitions.discovered_by,
        connectionId: cmsConnections.id,
        connectionName: cmsConnections.name,
        provider: cmsConnections.provider,
        connectionStatus: cmsConnections.status,
        environment: environments.name,
      })
      .from(blueprintDefinitions)
      .innerJoin(
        cmsConnections,
        eq(blueprintDefinitions.connection_id, cmsConnections.id),
      )
      .leftJoin(
        environments,
        eq(cmsConnections.environment_id, environments.id),
      )
      .where(eq(cmsConnections.project_id, projectId))
      .orderBy(desc(blueprintDefinitions.created_at));

    if (defs.length === 0) return actionSuccess([]);

    const defIds = defs.map((d) => d.definitionId);
    const snapshots = await db
      .select()
      .from(blueprintSnapshots)
      .where(inArray(blueprintSnapshots.definition_id, defIds))
      .orderBy(desc(blueprintSnapshots.version));

    // latest snapshot per definition
    const latest = new Map<string, (typeof snapshots)[number]>();
    for (const s of snapshots) {
      if (!latest.has(s.definition_id)) latest.set(s.definition_id, s);
    }

    const jobs = await db
      .select({
        snapshot_id: discoveryJobs.snapshot_id,
        status: discoveryJobs.status,
      })
      .from(discoveryJobs)
      .where(
        inArray(
          discoveryJobs.snapshot_id,
          Array.from(latest.values()).map((s) => s.id),
        ),
      );
    const jobStatus = new Map<string, string>();
    for (const j of jobs) if (j.snapshot_id) jobStatus.set(j.snapshot_id, j.status);

    const views = defs
      .map((d) => {
        const snap = latest.get(d.definitionId);
        if (!snap) return null;
        const stats = (snap.stats ?? {}) as Record<string, number>;
        const groups = Object.entries(stats).map(([kind, count]) => ({
          kind: kind as NodeKind,
          count,
          delta: null,
        }));
        const totalItems = Object.values(stats).reduce((s, v) => s + v, 0);
        const job = jobStatus.get(snap.id);
        const status: BlueprintView['status'] =
          job === 'running'
            ? 'discovering'
            : job === 'failed'
              ? 'error'
              : d.connectionStatus === 'warning'
                ? 'warning'
                : 'ready';
        return {
          definitionId: d.definitionId,
          snapshotId: snap.id,
          name: d.name,
          version: snap.version,
          created_at: snap.created_at,
          discoveredBy: d.discoveredBy,
          connectionId: d.connectionId,
          connectionName: d.connectionName,
          provider: d.provider,
          environment: d.environment ?? null,
          status,
          totalItems,
          groups,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    const safe = blueprintViewSchema.array().safeParse(views);
    if (!safe.success) {
      return actionZodError('Failed to parse blueprints.', safe.error);
    }
    return actionSuccess(safe.data);
  } catch (error) {
    logger.error('action failed', error instanceof Error ? error : undefined);
    return actionError('Failed to load blueprints.');
  }
}

export async function deleteBlueprint(
  definitionId: string,
): ActionResponse<{ id: string }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    // Snapshots/nodes/edges/changes cascade from definition.
    await db
      .delete(blueprintDefinitions)
      .where(eq(blueprintDefinitions.id, definitionId));
    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess({ id: definitionId });
  } catch (error) {
    logger.error('action failed', error instanceof Error ? error : undefined);
    return actionError('Failed to delete blueprint.');
  }
}

export async function getBlueprintDetail(
  definitionId: string,
): ActionResponse<BlueprintDetail> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');

  try {
    const def = (
      await db
        .select({
          id: blueprintDefinitions.id,
          name: blueprintDefinitions.name,
          discoveredBy: blueprintDefinitions.discovered_by,
          description: blueprintDefinitions.description,
          connectionId: cmsConnections.id,
          connectionName: cmsConnections.name,
          provider: cmsConnections.provider,
        })
        .from(blueprintDefinitions)
        .innerJoin(
          cmsConnections,
          eq(blueprintDefinitions.connection_id, cmsConnections.id),
        )
        .where(eq(blueprintDefinitions.id, definitionId))
    )[0];
    if (!def) return actionError('Blueprint not found.');

    const snap = (
      await db
        .select()
        .from(blueprintSnapshots)
        .where(eq(blueprintSnapshots.definition_id, definitionId))
        .orderBy(desc(blueprintSnapshots.version))
        .limit(1)
    )[0];
    if (!snap) return actionError('No snapshot for this blueprint.');

    const [nodes, edges, changeRows] = await Promise.all([
      db
        .select()
        .from(blueprintNodes)
        .where(eq(blueprintNodes.snapshot_id, snap.id)),
      db
        .select()
        .from(blueprintEdges)
        .where(eq(blueprintEdges.snapshot_id, snap.id)),
      db
        .select()
        .from(blueprintChanges)
        .where(eq(blueprintChanges.snapshot_id, snap.id)),
    ]);

    const stats = (snap.stats ?? {}) as Record<string, number>;
    const groups = Object.entries(stats).map(([kind, count]) => ({
      kind: kind as NodeKind,
      count,
      delta: null,
    }));
    const totalItems = Object.values(stats).reduce((s, v) => s + v, 0);

    const detail: BlueprintDetail = {
      definitionId: def.id,
      snapshotId: snap.id,
      name: def.name,
      version: snap.version,
      created_at: snap.created_at,
      discoveredBy: def.discoveredBy,
      description: def.description,
      connectionId: def.connectionId,
      connectionName: def.connectionName,
      provider: def.provider as CmsConnectorKey,
      totalItems,
      groups,
      items: nodes.map((n) => ({
        externalId: n.external_id,
        name: n.name,
        kind: n.kind as NodeKind,
        layer: n.layer as 'definition' | 'snapshot',
        attributes: (n.attributes ?? {}) as Record<string, unknown>,
      })),
      edges: edges.map((e) => ({
        fromExternalId: e.from_external_id,
        toExternalId: e.to_external_id,
        type: e.type as never,
      })),
      changes: changeRows.map((c) => ({
        kind: c.kind as 'added' | 'removed' | 'changed',
        target: c.target as 'node' | 'edge',
        nodeKind: (c.node_kind ?? undefined) as NodeKind | undefined,
        edgeType: (c.edge_type ?? undefined) as never,
        externalId: c.external_id,
        name: c.name ?? undefined,
      })),
    };

    const safe = blueprintDetailSchema.safeParse(detail);
    if (!safe.success) {
      return actionZodError('Failed to parse blueprint detail.', safe.error);
    }
    return actionSuccess(safe.data);
  } catch (error) {
    logger.error('action failed', error instanceof Error ? error : undefined);
    return actionError('Failed to load blueprint detail.');
  }
}
