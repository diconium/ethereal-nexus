'use server';

import { ActionResponse } from '@/data/action';
import { db } from '@/db';
import { auth } from '@/auth';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { decryptJson } from '@/lib/crypto';
import { nexusProvisionJobs } from './schema';
import { nexusMappings } from '@/data/meta/mapping/schema';
import { cmsConnections } from '@/data/cms/schema';
import { getConnectorOrThrow } from '@/data/cms/connectors';
import type { CmsConnectorConfig, CmsConnectorKey } from '@/data/cms/config';
import { buildProvisionPlan } from './plan';
import {
  provisionJobViewSchema,
  provisionJobSummarySchema,
  type ProvisionJobView,
  type ProvisionJobSummary,
} from './dto';
import type {
  ProvisionOperation,
  ProvisionPlan,
  ProvisionResult,
} from './types';

const CONTENT_PATH = '/projects';

/** Provider-specific "can this connection provision?" precheck. */
function provisionReadiness(
  provider: CmsConnectorKey,
  config: Record<string, unknown>,
): { ok: boolean; message?: string } {
  const connector = getConnectorOrThrow(provider);
  const provisionFeature = connector
    .features()
    .find((f) => f.id === 'provision');
  if (!provisionFeature?.supported) {
    return {
      ok: false,
      message: `The ${provider} connector does not support provisioning yet.`,
    };
  }
  if (provider === 'contentful') {
    const token = config.managementToken;
    if (typeof token !== 'string' || !token.trim()) {
      return {
        ok: false,
        message:
          'The target Contentful connection has no Management token. Edit the connection and add a Management token (Personal Access Token) to provision.',
      };
    }
  }
  return { ok: true };
}

/**
 * Create a migration (provision) job for a mapping. Validates that a target
 * connection is set and is provision-ready, builds the plan, and inserts a
 * `pending` job. Does NOT run the provisioning (the detail page triggers it).
 */
export async function startMigrationJob(
  mappingId: string,
): ActionResponse<{ jobId: string }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');

  try {
    const mapping = (
      await db.select().from(nexusMappings).where(eq(nexusMappings.id, mappingId))
    )[0];
    if (!mapping) return actionError('Mapping not found.');
    if (!mapping.target_connection_id) {
      return actionError(
        'Select a target connection on the mapping before starting a migration.',
      );
    }

    const target = (
      await db
        .select()
        .from(cmsConnections)
        .where(eq(cmsConnections.id, mapping.target_connection_id))
    )[0];
    if (!target) return actionError('Target connection not found.');

    const provider = target.provider as CmsConnectorKey;
    let config: Record<string, unknown>;
    try {
      config = decryptJson<CmsConnectorConfig>(
        target.configuration,
      ) as Record<string, unknown>;
    } catch {
      return actionError('Could not read the target connection configuration.');
    }

    const readiness = provisionReadiness(provider, config);
    if (!readiness.ok) {
      return actionError(readiness.message ?? 'Target cannot provision.');
    }

    let plan: ProvisionPlan;
    try {
      plan = await buildProvisionPlan(mappingId);
    } catch (error) {
      return actionError(
        error instanceof Error ? error.message : 'Failed to build the plan.',
      );
    }
    if (plan.contentTypes.length === 0) {
      return actionError(
        'Nothing to provision. Map at least one item (status mapped or needs-review) with a target.',
      );
    }

    const row = (
      await db
        .insert(nexusProvisionJobs)
        .values({
          project_id: mapping.project_id,
          mapping_id: mappingId,
          target_connection_id: mapping.target_connection_id,
          name: `${mapping.name} → ${target.name}`,
          status: 'pending',
          progress: 0,
          plan: plan as unknown,
          operations: [] as unknown,
        })
        .returning()
    )[0];

    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess({ jobId: row.id });
  } catch (error) {
    console.error(error);
    return actionError('Failed to start migration job.');
  }
}

/**
 * Execute a pending provision job. Guarded so it only runs once (status must be
 * `pending`). Loads the target connector, calls `provision(ctx, plan)`, and
 * persists the result. Safe to call again after completion (returns the row).
 */
export async function runProvisionJob(
  jobId: string,
): ActionResponse<{ status: string }> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');

  try {
    const job = (
      await db
        .select()
        .from(nexusProvisionJobs)
        .where(eq(nexusProvisionJobs.id, jobId))
    )[0];
    if (!job) return actionError('Job not found.');

    // Idempotency: only a pending job runs.
    if (job.status !== 'pending') {
      return actionSuccess({ status: job.status });
    }
    if (!job.target_connection_id) {
      await db
        .update(nexusProvisionJobs)
        .set({
          status: 'failed',
          error: 'No target connection.',
          finished_at: new Date(),
          progress: 100,
        })
        .where(eq(nexusProvisionJobs.id, jobId));
      return actionSuccess({ status: 'failed' });
    }

    // Mark running.
    await db
      .update(nexusProvisionJobs)
      .set({ status: 'running', started_at: new Date(), progress: 10 })
      .where(eq(nexusProvisionJobs.id, jobId));

    const target = (
      await db
        .select()
        .from(cmsConnections)
        .where(eq(cmsConnections.id, job.target_connection_id))
    )[0];
    if (!target) {
      await db
        .update(nexusProvisionJobs)
        .set({
          status: 'failed',
          error: 'Target connection not found.',
          finished_at: new Date(),
          progress: 100,
        })
        .where(eq(nexusProvisionJobs.id, jobId));
      return actionSuccess({ status: 'failed' });
    }

    const provider = target.provider as CmsConnectorKey;
    const connector = getConnectorOrThrow(provider);
    const config = decryptJson<CmsConnectorConfig>(target.configuration);
    const plan = job.plan as ProvisionPlan;

    let result: ProvisionResult;
    try {
      result = await connector.provision(
        {
          connectionId: target.id,
          config: config as Record<string, unknown>,
        },
        plan,
      );
    } catch (error) {
      await db
        .update(nexusProvisionJobs)
        .set({
          status: 'failed',
          error:
            error instanceof Error ? error.message : 'Provisioning failed.',
          finished_at: new Date(),
          progress: 100,
        })
        .where(eq(nexusProvisionJobs.id, jobId));
      return actionSuccess({ status: 'failed' });
    }

    await db
      .update(nexusProvisionJobs)
      .set({
        status: result.ok ? 'completed' : 'failed',
        result: result as unknown,
        operations: (result.operations ?? []) as unknown,
        error: result.ok ? null : result.message ?? 'Provisioning failed.',
        finished_at: new Date(),
        progress: 100,
      })
      .where(eq(nexusProvisionJobs.id, jobId));

    revalidatePath(CONTENT_PATH, 'page');
    return actionSuccess({ status: result.ok ? 'completed' : 'failed' });
  } catch (error) {
    console.error(error);
    return actionError('Failed to run migration job.');
  }
}

async function targetInfo(connectionId: string | null) {
  if (!connectionId) return { name: null, provider: null };
  const c = (
    await db
      .select({ name: cmsConnections.name, provider: cmsConnections.provider })
      .from(cmsConnections)
      .where(eq(cmsConnections.id, connectionId))
  )[0];
  return { name: c?.name ?? null, provider: c?.provider ?? null };
}

export async function getProvisionJob(
  jobId: string,
): ActionResponse<ProvisionJobView> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    const job = (
      await db
        .select()
        .from(nexusProvisionJobs)
        .where(eq(nexusProvisionJobs.id, jobId))
    )[0];
    if (!job) return actionError('Job not found.');

    const { name, provider } = await targetInfo(job.target_connection_id);
    const plan = job.plan as ProvisionPlan;
    const result = job.result as ProvisionResult | null;

    const view = provisionJobViewSchema.safeParse({
      id: job.id,
      projectId: job.project_id,
      mappingId: job.mapping_id,
      targetConnectionId: job.target_connection_id,
      targetConnectionName: name,
      targetProvider: provider,
      name: job.name,
      status: job.status,
      progress: job.progress,
      contentTypeCount: plan?.contentTypes?.length ?? 0,
      result: result ?? null,
      operations: (job.operations as ProvisionOperation[]) ?? [],
      error: job.error ?? null,
      started_at: job.started_at,
      finished_at: job.finished_at,
      created_at: job.created_at,
    });
    if (!view.success) {
      return actionZodError('Failed to parse job.', view.error);
    }
    return actionSuccess(view.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to load migration job.');
  }
}

export async function getProvisionJobs(
  projectId: string,
): ActionResponse<ProvisionJobSummary[]> {
  const session = await auth();
  if (!session?.user?.id) return actionError('No user provided.');
  try {
    const rows = await db
      .select()
      .from(nexusProvisionJobs)
      .where(eq(nexusProvisionJobs.project_id, projectId))
      .orderBy(desc(nexusProvisionJobs.created_at));

    const summaries: ProvisionJobSummary[] = [];
    for (const job of rows) {
      const { name, provider } = await targetInfo(job.target_connection_id);
      const plan = job.plan as ProvisionPlan;
      const result = job.result as ProvisionResult | null;
      const parsed = provisionJobSummarySchema.safeParse({
        id: job.id,
        name: job.name,
        targetConnectionName: name,
        targetProvider: provider,
        status: job.status,
        progress: job.progress,
        contentTypeCount: plan?.contentTypes?.length ?? 0,
        created: result?.created ?? 0,
        updated: result?.updated ?? 0,
        failed: result?.failed ?? 0,
        created_at: job.created_at,
        finished_at: job.finished_at,
      });
      if (parsed.success) summaries.push(parsed.data);
    }
    return actionSuccess(summaries);
  } catch (error) {
    console.error(error);
    return actionError('Failed to load migration jobs.');
  }
}
