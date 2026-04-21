'use server';

import { auth } from '@/auth';
import { ActionResponse } from '@/data/action';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { cache, db, dbUncached } from '@/db';
import { logger } from '@/lib/logger';
import {
  projectAiEnvironmentFeatureFlags,
  projectAiChatbots,
  projectAiChatbotApiSettings,
  projectAiChatbotStats,
  projectAiCatalogues,
  projectAiCatalogueVersions,
  projectAiAuthorDialogs,
  projectAiContentAdvisorAgentConfigs,
  projectAiContentAdvisorSchedules,
  projectAiContentAdvisorSchedulePages,
  projectAiContentAdvisorRuns,
  projectAiContentAdvisorAgentRuns,
  projectAiContentAdvisorIssues,
  projectAiContentAdvisorIssueComments,
  projectAiContentAdvisorIssueDetections,
  projectAiContentAdvisorSettings,
  projectAiPageUrlMappings,
} from './schema';
import { and, asc, desc, eq, inArray, notInArray, sql } from 'drizzle-orm';
import {
  AuthorDialog,
  AuthorDialogInput,
  authorDialogInputSchema,
  authorDialogSchema,
  Catalogue,
  CatalogueInput,
  catalogueInputSchema,
  catalogueSchema,
  CatalogueVersion,
  catalogueVersionSchema,
  Chatbot,
  ChatbotApiSettings,
  ChatbotApiSettingsInput,
  ChatbotStatsSummary,
  ChatbotInput,
  chatbotApiSettingsInputSchema,
  chatbotApiSettingsSchema,
  chatbotStatsSummarySchema,
  chatbotInputSchema,
  chatbotSchema,
  ContentAdvisorAgentConfig,
  ContentAdvisorAgentConfigInput,
  contentAdvisorAgentConfigInputSchema,
  contentAdvisorAgentConfigSchema,
  ContentAdvisorIssue,
  ContentAdvisorIssueComment,
  ContentAdvisorIssueCommentInput,
  ContentAdvisorIssueInput,
  ContentAdvisorIssueStatusInput,
  ContentAdvisorIssueWithComments,
  ContentAdvisorAgentRunWithAgent,
  ContentAdvisorIssueDashboardItem,
  ContentAdvisorRunHistoryItem,
  ContentAdvisorSettings,
  ContentAdvisorSettingsInput,
  contentAdvisorIssueCommentInputSchema,
  contentAdvisorIssueCommentSchema,
  contentAdvisorIssueDashboardItemSchema,
  contentAdvisorIssueDetectionSchema,
  contentAdvisorIssueStatusInputSchema,
  contentAdvisorSettingsInputSchema,
  contentAdvisorSettingsSchema,
  contentAdvisorAgentRunWithAgentSchema,
  contentAdvisorIssueSchema,
  contentAdvisorIssueInputSchema,
  contentAdvisorIssueWithCommentsSchema,
  ContentAdvisorRun,
  contentAdvisorRunSchema,
  contentAdvisorRunHistoryItemSchema,
  ContentAdvisorSchedule,
  ContentAdvisorScheduleInput,
  contentAdvisorScheduleInputSchema,
  contentAdvisorScheduleSchema,
  ProjectAiFeatureFlag,
  ProjectAiFeatureKey,
  projectAiFeatureFlagSchema,
  projectAiFeatureKeySchema,
  PROJECT_AI_FEATURE_KEYS,
  BrokenLinkAgentConfigInput,
  brokenLinkAgentConfigInputSchema,
  PageUrlMapping,
  PageUrlMappingInput,
  pageUrlMappingInputSchema,
  pageUrlMappingSchema,
} from './dto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  catalogueDataSchema,
  CatalogueData,
  CatalogueVersionSummary,
  EMPTY_CATALOGUE_DATA,
} from './catalogue';
import {
  CONTENT_ADVISOR_AGENT_CATALOG,
  ContentAdvisorAgentKey,
} from './content-advisor';
import { buildFoundryProviderConfig } from './provider';
import { normalizeCatalogueApiPath } from './catalogue-endpoint';
import { generateCatalogueWithFoundry } from '@/lib/ai-providers/microsoft-foundry';
import {
  analyzePageWithAgent,
  fetchPageSource,
  isSafeContentAdvisorUrl,
  resolveContentAdvisorPageUrl,
  resolvePageReferenceWithMapping,
} from './analyzer';
import type { InferSelectModel } from 'drizzle-orm';
import type { Session } from 'next-auth';

/**
 * Tiny semaphore for bounding concurrent async tasks without adding a
 * dependency on `p-limit`.  Use `limit(fn)` to acquire a slot, run `fn`, and
 * release the slot automatically.
 */
function createConcurrencyLimiter(concurrency: number) {
  let running = 0;
  const queue: (() => void)[] = [];
  function next() {
    if (queue.length && running < concurrency) {
      running++;
      queue.shift()!();
    }
  }
  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            running--;
            next();
          });
      });
      next();
    });
  };
}

function buildContentAdvisorIssueFingerprint(issue: {
  issue_type: string;
  page_path?: string | null;
  component_path?: string | null;
  title: string;
}) {
  const normalize = (value?: string | null) =>
    (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  return [
    normalize(issue.issue_type),
    normalize(issue.page_path),
    normalize(issue.component_path),
    normalize(issue.title),
  ].join('::');
}

type ContentAdvisorIssueRow = InferSelectModel<
  typeof projectAiContentAdvisorIssues
>;

/** Minimum set of columns needed to normalise an agent-config row. */
type PartialAgentConfigRow = Pick<
  InferSelectModel<typeof projectAiContentAdvisorAgentConfigs>,
  'id' | 'key' | 'name' | 'description'
> &
  Partial<
    Omit<
      InferSelectModel<typeof projectAiContentAdvisorAgentConfigs>,
      'id' | 'key' | 'name' | 'description'
    >
  >;

async function maybeAutoResolveContentAdvisorIssues(input: {
  tx: any;
  environmentId: string;
  threshold: number | null;
}) {
  if (!input.threshold || input.threshold < 1) {
    return;
  }

  const recentRuns = await input.tx
    .select({ id: projectAiContentAdvisorRuns.id })
    .from(projectAiContentAdvisorRuns)
    .where(eq(projectAiContentAdvisorRuns.environment_id, input.environmentId))
    .orderBy(desc(projectAiContentAdvisorRuns.created_at))
    .limit(input.threshold);

  if (recentRuns.length < input.threshold) {
    return;
  }

  const recentRunIds = recentRuns.map((run: { id: string }) => run.id);
  const recentlyDetectedIssues = await input.tx
    .select({ issue_id: projectAiContentAdvisorIssueDetections.issue_id })
    .from(projectAiContentAdvisorIssueDetections)
    .where(
      inArray(projectAiContentAdvisorIssueDetections.run_id, recentRunIds),
    );

  const recentIssueIds = new Set(
    recentlyDetectedIssues.map((row: { issue_id: string }) => row.issue_id),
  );

  // Fetch only open/in-progress issues to avoid unnecessary rows in memory.
  const candidateIds = await input.tx
    .select({ id: projectAiContentAdvisorIssues.id })
    .from(projectAiContentAdvisorIssues)
    .where(
      and(
        eq(projectAiContentAdvisorIssues.environment_id, input.environmentId),
        notInArray(projectAiContentAdvisorIssues.status, ['done', 'wont-do']),
      ),
    );

  const toResolveIds = candidateIds
    .map((r) => r.id)
    .filter((id) => !recentIssueIds.has(id));

  if (toResolveIds.length) {
    await input.tx
      .update(projectAiContentAdvisorIssues)
      .set({ status: 'done' })
      .where(inArray(projectAiContentAdvisorIssues.id, toResolveIds));
  }
}

type ProjectAccess = {
  session: Session;
  permission: string;
  canWrite: boolean;
};

export async function getProjectAccess(
  projectId: string,
  requireWrite = false,
): Promise<ProjectAccess | ActionResponse<never>> {
  const session = await auth();
  if (!session?.user?.id) {
    return actionError('No user provided.');
  }

  const permission =
    session.user.role === 'admin'
      ? 'manage'
      : session.permissions?.[projectId] || 'none';
  const canWrite =
    session.user.role === 'admin' || ['write', 'manage'].includes(permission);

  if (permission === 'none') {
    return actionError('You do not have permissions for this resource.');
  }

  if (requireWrite && !canWrite) {
    return actionError('You do not have write permissions for this resource.');
  }

  return { session, permission, canWrite };
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function ensureUniquePublicChatbotSlug(input: {
  publicSlug: string;
  excludeId?: string;
}) {
  const existing = await db
    .select({ id: projectAiChatbots.id })
    .from(projectAiChatbots)
    .where(eq(projectAiChatbots.public_slug, input.publicSlug))
    .limit(1);

  if (existing[0] && (!input.excludeId || existing[0].id !== input.excludeId)) {
    return actionError(
      'This public chatbot endpoint is already in use. Choose a different endpoint slug.',
    );
  }

  return null;
}

async function ensureUniquePublicAuthorDialogSlug(input: {
  publicSlug: string;
  excludeId?: string;
}) {
  const existing = await db
    .select({ id: projectAiAuthorDialogs.id })
    .from(projectAiAuthorDialogs)
    .where(eq(projectAiAuthorDialogs.public_slug, input.publicSlug))
    .limit(1);

  if (existing[0] && (!input.excludeId || existing[0].id !== input.excludeId)) {
    return actionError(
      'This public author dialog endpoint is already in use. Choose a different endpoint slug.',
    );
  }

  return null;
}

async function ensureUniqueCatalogueApiPath(input: {
  apiPath: string;
  excludeId?: string;
}) {
  const existing = await db
    .select({ id: projectAiCatalogues.id })
    .from(projectAiCatalogues)
    .where(eq(projectAiCatalogues.api_url, input.apiPath))
    .limit(1);

  if (existing[0] && (!input.excludeId || existing[0].id !== input.excludeId)) {
    return actionError(
      'This catalogue API endpoint is already in use. Choose a different endpoint path.',
    );
  }

  return null;
}

function mapAiDbError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const cause = error as Error & {
    cause?: {
      code?: string;
      message?: string;
    };
  };

  const message = error.message;
  const causeCode = cause.cause?.code ?? '';
  const causeMessage = cause.cause?.message ?? '';

  const missingSchema =
    causeCode === '42P01' ||
    causeCode === '42703' ||
    message.includes('does not exist') ||
    causeMessage.includes('does not exist');

  if (missingSchema) {
    return 'AI database schema is not initialized. Run `pnpm db:migrate` and reload the page.';
  }

  return fallback;
}

function aiRevalidate(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/settings`);
  revalidatePath(`/projects/${projectId}/ai/chatbots`);
  revalidatePath(`/projects/${projectId}/ai/catalogues`);
  revalidatePath(`/projects/${projectId}/ai/author-dialogs`);
  revalidatePath(`/projects/${projectId}/ai/content-advisor`);
  revalidatePath(`/projects/${projectId}/demos`);
}

const LEGACY_CONTENT_ADVISOR_AGENT_KEY_MAP: Record<
  string,
  ContentAdvisorAgentKey
> = {
  'freshness-accuracy': 'seo-performance',
  'content-quality': 'content',
  'broken-experience': 'broken-link',
  'compliance-accessibility': 'compliance',
};

function normalizeContentAdvisorAgentRow(row: PartialAgentConfigRow) {
  const normalizedKey =
    LEGACY_CONTENT_ADVISOR_AGENT_KEY_MAP[row.key] ??
    (row.key as ContentAdvisorAgentKey);
  const catalogEntry = CONTENT_ADVISOR_AGENT_CATALOG.find(
    (entry) => entry.key === normalizedKey,
  );

  if (!catalogEntry) {
    return row;
  }

  return {
    ...row,
    key: normalizedKey,
    name: catalogEntry.name,
    description: catalogEntry.description,
    prompt: row.prompt || catalogEntry.defaultPrompt,
  };
}

export async function getProjectAiFlags(
  projectId: string,
  environmentId: string,
): ActionResponse<ProjectAiFeatureFlag[]> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await dbUncached
      .select()
      .from(projectAiEnvironmentFeatureFlags)
      .where(
        and(
          eq(projectAiEnvironmentFeatureFlags.project_id, projectId),
          eq(projectAiEnvironmentFeatureFlags.environment_id, environmentId),
        ),
      );

    const byKey = new Map(rows.map((row) => [row.key, row]));
    const hydrated = PROJECT_AI_FEATURE_KEYS.map(
      (key) =>
        byKey.get(key) ?? {
          id: crypto.randomUUID(),
          project_id: projectId,
          environment_id: environmentId,
          key,
          enabled: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
    );

    const safe = z.array(projectAiFeatureFlagSchema).safeParse(hydrated);
    if (!safe.success) {
      return actionZodError('Failed to parse AI feature flags.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch AI feature flags from database.'),
    );
  }
}

export async function upsertProjectAiFlag(input: {
  project_id: string;
  environment_id: string;
  key: ProjectAiFeatureKey;
  enabled: boolean;
}): ActionResponse<ProjectAiFeatureFlag> {
  const access = await getProjectAccess(input.project_id, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const safeKey = projectAiFeatureKeySchema.safeParse(input.key);
  if (!safeKey.success) {
    return actionZodError('Invalid AI feature key.', safeKey.error);
  }

  try {
    const rows = await dbUncached
      .insert(projectAiEnvironmentFeatureFlags)
      .values({
        project_id: input.project_id,
        environment_id: input.environment_id,
        key: safeKey.data,
        enabled: input.enabled,
      })
      .onConflictDoUpdate({
        target: [
          projectAiEnvironmentFeatureFlags.environment_id,
          projectAiEnvironmentFeatureFlags.key,
        ],
        set: {
          enabled: input.enabled,
          updated_at: new Date(),
        },
      })
      .returning();

    const safe = projectAiFeatureFlagSchema.safeParse(rows[0]);
    if (!safe.success) {
      return actionZodError('Failed to parse AI feature flag.', safe.error);
    }

    await cache.onMutate({
      tables: [
        'project_ai_environment_feature_flag',
        'project_ai_feature_flag',
      ],
    });

    aiRevalidate(input.project_id);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(mapAiDbError(error, 'Failed to save AI feature flag.'));
  }
}

export async function getChatbotsByEnvironment(
  projectId: string,
  environmentId: string,
): ActionResponse<Chatbot[]> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .select()
      .from(projectAiChatbots)
      .where(
        and(
          eq(projectAiChatbots.project_id, projectId),
          eq(projectAiChatbots.environment_id, environmentId),
        ),
      )
      .orderBy(asc(projectAiChatbots.name));

    const safe = z.array(chatbotSchema).safeParse(rows);
    if (!safe.success) {
      return actionZodError('Failed to parse chatbots.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch chatbots from database.'),
    );
  }
}

export async function getChatbotStatsByEnvironment(
  projectId: string,
  environmentId: string,
): ActionResponse<ChatbotStatsSummary[]> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .select({
        chatbot_id: projectAiChatbotStats.chatbot_id,
        request_count: projectAiChatbotStats.request_count,
        success_count: projectAiChatbotStats.success_count,
        error_count: projectAiChatbotStats.error_count,
        rate_limited_count: projectAiChatbotStats.rate_limited_count,
        total_tokens: projectAiChatbotStats.total_tokens,
        total_latency_ms: projectAiChatbotStats.total_latency_ms,
        last_request_at: projectAiChatbotStats.last_request_at,
      })
      .from(projectAiChatbotStats)
      .where(
        and(
          eq(projectAiChatbotStats.project_id, projectId),
          eq(projectAiChatbotStats.environment_id, environmentId),
        ),
      )
      .orderBy(desc(projectAiChatbotStats.last_request_at));

    const normalized = rows.map((row) => ({
      chatbot_id: row.chatbot_id,
      request_count: row.request_count,
      success_count: row.success_count,
      error_count: row.error_count,
      rate_limited_count: row.rate_limited_count,
      total_tokens: row.total_tokens,
      avg_latency_ms:
        row.request_count > 0 ? row.total_latency_ms / row.request_count : 0,
      success_rate:
        row.request_count > 0 ? row.success_count / row.request_count : 0,
      last_request_at: row.last_request_at?.toISOString() ?? null,
    }));

    const safe = z.array(chatbotStatsSummarySchema).safeParse(normalized);
    if (!safe.success) {
      return actionZodError('Failed to parse chatbot stats.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch chatbot stats from database.'),
    );
  }
}

export async function getChatbotApiSettingsByEnvironment(
  projectId: string,
  environmentId: string,
): ActionResponse<ChatbotApiSettings[]> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .select()
      .from(projectAiChatbotApiSettings)
      .where(
        and(
          eq(projectAiChatbotApiSettings.project_id, projectId),
          eq(projectAiChatbotApiSettings.environment_id, environmentId),
        ),
      )
      .orderBy(asc(projectAiChatbotApiSettings.created_at));

    const safe = z.array(chatbotApiSettingsSchema).safeParse(rows);
    if (!safe.success) {
      return actionZodError(
        'Failed to parse chatbot API settings.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch chatbot API settings.'),
    );
  }
}

export async function upsertChatbotApiSettings(
  input: ChatbotApiSettingsInput,
): ActionResponse<ChatbotApiSettings> {
  const access = await getProjectAccess(input.project_id, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const safeInput = chatbotApiSettingsInputSchema.safeParse(input);
  if (!safeInput.success) {
    return actionZodError(
      'Failed to parse chatbot API settings input.',
      safeInput.error,
    );
  }

  try {
    const rows = await db
      .insert(projectAiChatbotApiSettings)
      .values({
        project_id: safeInput.data.project_id,
        environment_id: safeInput.data.environment_id,
        chatbot_id: safeInput.data.chatbot_id,
        rate_limit_enabled: safeInput.data.rate_limit_enabled,
        rate_limit_max_requests: safeInput.data.rate_limit_max_requests,
        rate_limit_window_seconds: safeInput.data.rate_limit_window_seconds,
        rate_limit_use_ip: safeInput.data.rate_limit_use_ip,
        rate_limit_use_session_cookie:
          safeInput.data.rate_limit_use_session_cookie,
        rate_limit_use_fingerprint: safeInput.data.rate_limit_use_fingerprint,
        fingerprint_header_name: safeInput.data.fingerprint_header_name,
        message_size_limit_enabled: safeInput.data.message_size_limit_enabled,
        max_message_characters: safeInput.data.max_message_characters,
        max_request_body_bytes: safeInput.data.max_request_body_bytes,
        session_request_cap_enabled: safeInput.data.session_request_cap_enabled,
        session_request_cap_max_requests:
          safeInput.data.session_request_cap_max_requests,
        session_request_cap_window_seconds:
          safeInput.data.session_request_cap_window_seconds,
        ip_daily_token_budget_enabled:
          safeInput.data.ip_daily_token_budget_enabled,
        ip_daily_token_budget: safeInput.data.ip_daily_token_budget,
        temporary_block_enabled: safeInput.data.temporary_block_enabled,
        temporary_block_violation_threshold:
          safeInput.data.temporary_block_violation_threshold,
        temporary_block_window_seconds:
          safeInput.data.temporary_block_window_seconds,
        temporary_block_duration_seconds:
          safeInput.data.temporary_block_duration_seconds,
      })
      .onConflictDoUpdate({
        target: [projectAiChatbotApiSettings.chatbot_id],
        set: {
          rate_limit_enabled: safeInput.data.rate_limit_enabled,
          rate_limit_max_requests: safeInput.data.rate_limit_max_requests,
          rate_limit_window_seconds: safeInput.data.rate_limit_window_seconds,
          rate_limit_use_ip: safeInput.data.rate_limit_use_ip,
          rate_limit_use_session_cookie:
            safeInput.data.rate_limit_use_session_cookie,
          rate_limit_use_fingerprint: safeInput.data.rate_limit_use_fingerprint,
          fingerprint_header_name: safeInput.data.fingerprint_header_name,
          message_size_limit_enabled: safeInput.data.message_size_limit_enabled,
          max_message_characters: safeInput.data.max_message_characters,
          max_request_body_bytes: safeInput.data.max_request_body_bytes,
          session_request_cap_enabled:
            safeInput.data.session_request_cap_enabled,
          session_request_cap_max_requests:
            safeInput.data.session_request_cap_max_requests,
          session_request_cap_window_seconds:
            safeInput.data.session_request_cap_window_seconds,
          ip_daily_token_budget_enabled:
            safeInput.data.ip_daily_token_budget_enabled,
          ip_daily_token_budget: safeInput.data.ip_daily_token_budget,
          temporary_block_enabled: safeInput.data.temporary_block_enabled,
          temporary_block_violation_threshold:
            safeInput.data.temporary_block_violation_threshold,
          temporary_block_window_seconds:
            safeInput.data.temporary_block_window_seconds,
          temporary_block_duration_seconds:
            safeInput.data.temporary_block_duration_seconds,
          updated_at: new Date(),
        },
      })
      .returning();

    const safe = chatbotApiSettingsSchema.safeParse(rows[0]);
    if (!safe.success) {
      return actionZodError(
        'Failed to parse chatbot API settings.',
        safe.error,
      );
    }

    await cache.onMutate({
      tables: ['project_ai_chatbot_api_setting'],
    });

    aiRevalidate(input.project_id);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to save chatbot API settings.'),
    );
  }
}

export async function getChatbotById(
  projectId: string,
  chatbotId: string,
): ActionResponse<Chatbot> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .select()
      .from(projectAiChatbots)
      .where(
        and(
          eq(projectAiChatbots.project_id, projectId),
          eq(projectAiChatbots.id, chatbotId),
        ),
      )
      .limit(1);

    const safe = chatbotSchema.safeParse(rows[0]);
    if (!safe.success) {
      return actionZodError('Failed to parse chatbot.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch chatbot from database.'),
    );
  }
}

export async function upsertChatbot(
  input: ChatbotInput,
): ActionResponse<Chatbot> {
  const access = await getProjectAccess(input.project_id, true);
  if ('success' in access && !access.success) {
    logger.warn('Unauthorized chatbot upsert attempt', {
      projectId: input.project_id,
      environmentId: input.environment_id,
      chatbotId: input.id,
    });
    return access;
  }

  const safeInput = chatbotInputSchema.safeParse({
    ...input,
    slug: normalizeSlug(input.slug || input.name),
    public_slug: normalizeSlug(input.public_slug || input.slug || input.name),
  });
  if (!safeInput.success) {
    logger.warn('Chatbot payload validation failed', {
      projectId: input.project_id,
      environmentId: input.environment_id,
      chatbotId: input.id,
      issues: safeInput.error.issues,
    });
    return actionZodError('Failed to parse chatbot input.', safeInput.error);
  }

  try {
    logger.info('Saving chatbot', {
      projectId: safeInput.data.project_id,
      environmentId: safeInput.data.environment_id,
      chatbotId: safeInput.data.id,
      slug: safeInput.data.slug,
      publicSlug: safeInput.data.public_slug,
      provider: safeInput.data.provider,
      operation: safeInput.data.id ? 'update' : 'create',
    });

    const publicSlugError = await ensureUniquePublicChatbotSlug({
      publicSlug: safeInput.data.public_slug,
      excludeId: safeInput.data.id,
    });
    if (publicSlugError) {
      logger.warn('Chatbot public slug validation failed', {
        projectId: safeInput.data.project_id,
        environmentId: safeInput.data.environment_id,
        chatbotId: safeInput.data.id,
        publicSlug: safeInput.data.public_slug,
        message: publicSlugError.error.message,
      });
      return publicSlugError;
    }

    const payload = {
      ...safeInput.data,
      description: safeInput.data.description || null,
      provider_config: buildFoundryProviderConfig({
        project_endpoint: safeInput.data.project_endpoint,
        agent_id: safeInput.data.agent_id,
      }),
      updated_at: new Date(),
    };

    const rows = safeInput.data.id
      ? await db
          .update(projectAiChatbots)
          .set(payload)
          .where(
            and(
              eq(projectAiChatbots.id, safeInput.data.id),
              eq(projectAiChatbots.project_id, safeInput.data.project_id),
            ),
          )
          .returning()
      : await db.insert(projectAiChatbots).values(payload).returning();

    const safe = chatbotSchema.safeParse(rows[0]);
    if (!safe.success) {
      logger.warn('Saved chatbot failed response validation', {
        projectId: safeInput.data.project_id,
        environmentId: safeInput.data.environment_id,
        chatbotId: safeInput.data.id,
        issues: safe.error.issues,
      });
      return actionZodError('Failed to parse chatbot.', safe.error);
    }

    logger.info('Chatbot saved successfully', {
      projectId: safe.data.project_id,
      environmentId: safe.data.environment_id,
      chatbotId: safe.data.id,
      slug: safe.data.slug,
      publicSlug: safe.data.public_slug,
      operation: safeInput.data.id ? 'update' : 'create',
    });

    aiRevalidate(input.project_id);
    return actionSuccess(safe.data);
  } catch (error) {
    logger.error('Failed to save chatbot', error as Error, {
      projectId: input.project_id,
      environmentId: input.environment_id,
      chatbotId: input.id,
      slug: input.slug,
      publicSlug: input.public_slug,
    });
    if (
      error instanceof Error &&
      error.message.includes('project_ai_chatbot_public_slug_idx')
    ) {
      return actionError(
        'This public chatbot endpoint is already in use. Choose a different endpoint slug.',
      );
    }
    return actionError(
      mapAiDbError(error, 'Failed to save chatbot into database.'),
    );
  }
}

export async function deleteChatbot(
  projectId: string,
  chatbotId: string,
): ActionResponse<Chatbot> {
  const access = await getProjectAccess(projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .delete(projectAiChatbots)
      .where(
        and(
          eq(projectAiChatbots.project_id, projectId),
          eq(projectAiChatbots.id, chatbotId),
        ),
      )
      .returning();

    const safe = chatbotSchema.safeParse(rows[0]);
    if (!safe.success) {
      return actionZodError('Failed to parse deleted chatbot.', safe.error);
    }

    aiRevalidate(projectId);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to delete chatbot from database.'),
    );
  }
}

export async function getCataloguesByEnvironment(
  projectId: string,
  environmentId: string,
): ActionResponse<Catalogue[]> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .select()
      .from(projectAiCatalogues)
      .where(
        and(
          eq(projectAiCatalogues.project_id, projectId),
          eq(projectAiCatalogues.environment_id, environmentId),
        ),
      )
      .orderBy(desc(projectAiCatalogues.updated_at));

    const safe = z.array(catalogueSchema).safeParse(rows);
    if (!safe.success) {
      return actionZodError('Failed to parse catalogues.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch catalogues from database.'),
    );
  }
}

export async function getCatalogueById(
  projectId: string,
  catalogueId: string,
): ActionResponse<Catalogue> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .select()
      .from(projectAiCatalogues)
      .where(
        and(
          eq(projectAiCatalogues.project_id, projectId),
          eq(projectAiCatalogues.id, catalogueId),
        ),
      )
      .limit(1);

    const safe = catalogueSchema.safeParse(rows[0]);
    if (!safe.success) {
      return actionZodError('Failed to parse catalogue.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch catalogue from database.'),
    );
  }
}

export async function upsertCatalogue(
  input: CatalogueInput,
): ActionResponse<Catalogue> {
  const access = await getProjectAccess(input.project_id, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const safeInput = catalogueInputSchema.safeParse({
    ...input,
    slug: normalizeSlug(input.slug || input.name),
    api_url: input.api_url || null,
  });
  if (!safeInput.success) {
    return actionZodError('Failed to parse catalogue input.', safeInput.error);
  }

  try {
    const apiPath = normalizeCatalogueApiPath(
      safeInput.data.api_url,
      safeInput.data.slug,
    );
    if (apiPath) {
      const apiPathError = await ensureUniqueCatalogueApiPath({
        apiPath,
        excludeId: safeInput.data.id,
      });
      if (apiPathError) {
        return apiPathError;
      }
    }

    const payload = {
      ...safeInput.data,
      description: safeInput.data.description || null,
      provider_config: buildFoundryProviderConfig({
        project_endpoint: safeInput.data.project_endpoint || '',
        agent_id: safeInput.data.provider_agent_id || '',
      }),
      api_url: apiPath,
      agent_id:
        safeInput.data.provider_agent_id || safeInput.data.agent_id || null,
      agent_principal_id: safeInput.data.agent_principal_id || null,
      tenant_id: safeInput.data.tenant_id || null,
      activity_protocol_endpoint:
        safeInput.data.activity_protocol_endpoint || null,
      responses_api_endpoint:
        apiPath ||
        safeInput.data.project_endpoint ||
        safeInput.data.responses_api_endpoint ||
        null,
      updated_at: new Date(),
    };

    const rows = safeInput.data.id
      ? await db
          .update(projectAiCatalogues)
          .set(payload)
          .where(
            and(
              eq(projectAiCatalogues.id, safeInput.data.id),
              eq(projectAiCatalogues.project_id, safeInput.data.project_id),
            ),
          )
          .returning()
      : await db.insert(projectAiCatalogues).values(payload).returning();

    const safe = catalogueSchema.safeParse(rows[0]);
    if (!safe.success) {
      return actionZodError('Failed to parse catalogue.', safe.error);
    }

    await cache.onMutate({
      tables: ['project_ai_catalogue', 'project_ai_catalogue_version'],
    });

    aiRevalidate(input.project_id);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    if (
      error instanceof Error &&
      error.message.includes('project_ai_catalogue_api_url_idx')
    ) {
      return actionError(
        'This catalogue API endpoint is already in use. Choose a different endpoint path.',
      );
    }
    return actionError(
      mapAiDbError(error, 'Failed to save catalogue into database.'),
    );
  }
}

export async function deleteCatalogue(
  projectId: string,
  catalogueId: string,
): ActionResponse<Catalogue> {
  const access = await getProjectAccess(projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .delete(projectAiCatalogues)
      .where(
        and(
          eq(projectAiCatalogues.project_id, projectId),
          eq(projectAiCatalogues.id, catalogueId),
        ),
      )
      .returning();

    const safe = catalogueSchema.safeParse(rows[0]);
    if (!safe.success) {
      return actionZodError('Failed to parse deleted catalogue.', safe.error);
    }

    await cache.onMutate({
      tables: ['project_ai_catalogue', 'project_ai_catalogue_version'],
    });

    aiRevalidate(projectId);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to delete catalogue from database.'),
    );
  }
}

export async function saveCatalogueVersion(
  projectId: string,
  catalogueId: string,
  raw: unknown,
): ActionResponse<CatalogueVersion> {
  const access = await getProjectAccess(projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const parsed = catalogueDataSchema.safeParse(raw);
  if (!parsed.success) {
    return actionZodError('Invalid catalogue data.', parsed.error);
  }

  try {
    const rows = await db
      .insert(projectAiCatalogueVersions)
      .values({ catalogue_id: catalogueId, data: parsed.data })
      .returning();

    await db
      .update(projectAiCatalogues)
      .set({ updated_at: new Date() })
      .where(eq(projectAiCatalogues.id, catalogueId));

    const safe = catalogueVersionSchema.safeParse(rows[0]);
    if (!safe.success) {
      return actionZodError('Failed to parse catalogue version.', safe.error);
    }

    await cache.onMutate({
      tables: ['project_ai_catalogue', 'project_ai_catalogue_version'],
    });

    aiRevalidate(projectId);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to save catalogue version.'),
    );
  }
}

export async function getLatestCatalogueVersion(
  projectId: string,
  catalogueId: string,
): ActionResponse<CatalogueVersion | null> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .select()
      .from(projectAiCatalogueVersions)
      .innerJoin(
        projectAiCatalogues,
        eq(projectAiCatalogueVersions.catalogue_id, projectAiCatalogues.id),
      )
      .where(
        and(
          eq(projectAiCatalogues.project_id, projectId),
          eq(projectAiCatalogueVersions.catalogue_id, catalogueId),
        ),
      )
      .orderBy(desc(projectAiCatalogueVersions.created_at))
      .limit(1);

    const row = rows[0]?.project_ai_catalogue_version;
    if (!row) {
      return actionSuccess(null);
    }

    const safe = catalogueVersionSchema.safeParse(row);
    if (!safe.success) {
      return actionZodError(
        'Failed to parse latest catalogue version.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch latest catalogue version.'),
    );
  }
}

export async function listCatalogueVersions(
  projectId: string,
  catalogueId: string,
): ActionResponse<CatalogueVersionSummary[]> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .select({
        id: projectAiCatalogueVersions.id,
        created_at: projectAiCatalogueVersions.created_at,
        item_count: sql<number>`jsonb_array_length(${projectAiCatalogueVersions.data}->'items')`,
      })
      .from(projectAiCatalogueVersions)
      .innerJoin(
        projectAiCatalogues,
        eq(projectAiCatalogueVersions.catalogue_id, projectAiCatalogues.id),
      )
      .where(
        and(
          eq(projectAiCatalogues.project_id, projectId),
          eq(projectAiCatalogueVersions.catalogue_id, catalogueId),
        ),
      )
      .orderBy(desc(projectAiCatalogueVersions.created_at));

    return actionSuccess(
      rows.map((row) => ({
        id: row.id,
        created_at: row.created_at.toISOString(),
        item_count: Number(row.item_count),
      })),
    );
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch catalogue versions.'),
    );
  }
}

export async function getCatalogueVersionById(
  projectId: string,
  versionId: string,
): ActionResponse<CatalogueVersion> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .select()
      .from(projectAiCatalogueVersions)
      .innerJoin(
        projectAiCatalogues,
        eq(projectAiCatalogueVersions.catalogue_id, projectAiCatalogues.id),
      )
      .where(
        and(
          eq(projectAiCatalogues.project_id, projectId),
          eq(projectAiCatalogueVersions.id, versionId),
        ),
      )
      .limit(1);

    const row = rows[0]?.project_ai_catalogue_version;
    const safe = catalogueVersionSchema.safeParse(row);
    if (!safe.success) {
      return actionZodError('Failed to parse catalogue version.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch catalogue version.'),
    );
  }
}

export async function activateCatalogueVersion(
  projectId: string,
  versionId: string,
): ActionResponse<CatalogueVersion> {
  const version = await getCatalogueVersionById(projectId, versionId);
  if (!version.success) {
    return version;
  }

  return saveCatalogueVersion(
    projectId,
    version.data.catalogue_id,
    version.data.data,
  );
}

export async function generateCatalogueVersionWithAi(
  projectId: string,
  catalogueId: string,
): ActionResponse<CatalogueVersion> {
  const access = await getProjectAccess(projectId, true);
  if ('success' in access && !access.success) {
    logger.warn('Unauthorized catalogue agent generation attempt', {
      projectId,
      catalogueId,
    });
    return access;
  }

  const catalogue = await getCatalogueById(projectId, catalogueId);
  if (!catalogue.success) {
    logger.warn('Catalogue agent generation target not found', {
      projectId,
      catalogueId,
      message: catalogue.error.message,
    });
    return catalogue;
  }

  try {
    logger.info('Generating catalogue version with agent', {
      projectId,
      catalogueId,
      provider: catalogue.data.provider,
      environmentId: catalogue.data.environment_id,
      slug: catalogue.data.slug,
    });

    switch (catalogue.data.provider) {
      case 'microsoft-foundry': {
        const parsedData = await generateCatalogueWithFoundry({
          providerConfig: catalogue.data.provider_config,
          systemPrompt: catalogue.data.system_prompt,
          loggerContext: {
            route: 'catalogue-generate',
            catalogueId,
            projectId,
          },
        });
        const result = await saveCatalogueVersion(
          projectId,
          catalogueId,
          parsedData,
        );
        if (!result.success) {
          logger.warn('Generated catalogue version failed to save', {
            projectId,
            catalogueId,
            provider: catalogue.data.provider,
            message: result.error.message,
          });
          return result;
        }

        logger.info('Catalogue version generated successfully', {
          projectId,
          catalogueId,
          versionId: result.data.id,
          itemCount: result.data.data.items.length,
          provider: catalogue.data.provider,
        });
        return result;
      }
      default:
        logger.warn('Unsupported catalogue provider for generation', {
          projectId,
          catalogueId,
          provider: catalogue.data.provider,
        });
        return actionError(
          `Unsupported catalogue provider: ${catalogue.data.provider}`,
        );
    }
  } catch (error) {
    logger.error(
      'Failed to generate catalogue version with AI',
      error as Error,
      {
        projectId,
        catalogueId,
        provider: catalogue.success ? catalogue.data.provider : undefined,
      },
    );
    return actionError(
      mapAiDbError(error, 'Failed to generate catalogue version with AI.'),
    );
  }
}

export async function getAuthorDialogsByEnvironment(
  projectId: string,
  environmentId: string,
): ActionResponse<AuthorDialog[]> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .select()
      .from(projectAiAuthorDialogs)
      .where(
        and(
          eq(projectAiAuthorDialogs.project_id, projectId),
          eq(projectAiAuthorDialogs.environment_id, environmentId),
        ),
      )
      .orderBy(asc(projectAiAuthorDialogs.name));

    const safe = z.array(authorDialogSchema).safeParse(rows);
    if (!safe.success) {
      return actionZodError('Failed to parse author dialogs.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch author dialogs from database.'),
    );
  }
}

export async function upsertAuthorDialog(
  input: AuthorDialogInput,
): ActionResponse<AuthorDialog> {
  const access = await getProjectAccess(input.project_id, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const safeInput = authorDialogInputSchema.safeParse({
    ...input,
    slug: normalizeSlug(input.slug || input.name),
    public_slug: normalizeSlug(input.public_slug || input.slug || input.name),
  });
  if (!safeInput.success) {
    return actionZodError(
      'Failed to parse author dialog input.',
      safeInput.error,
    );
  }

  try {
    const publicSlugError = await ensureUniquePublicAuthorDialogSlug({
      publicSlug: safeInput.data.public_slug,
      excludeId: safeInput.data.id,
    });
    if (publicSlugError) {
      return publicSlugError;
    }

    const payload = {
      ...safeInput.data,
      description: safeInput.data.description || null,
      provider_config: buildFoundryProviderConfig({
        project_endpoint: safeInput.data.project_endpoint || '',
        agent_id: safeInput.data.provider_agent_id || '',
      }),
      updated_at: new Date(),
    };

    const rows = safeInput.data.id
      ? await db
          .update(projectAiAuthorDialogs)
          .set(payload)
          .where(
            and(
              eq(projectAiAuthorDialogs.id, safeInput.data.id),
              eq(projectAiAuthorDialogs.project_id, safeInput.data.project_id),
            ),
          )
          .returning()
      : await db.insert(projectAiAuthorDialogs).values(payload).returning();

    const safe = authorDialogSchema.safeParse(rows[0]);
    if (!safe.success) {
      return actionZodError('Failed to parse author dialog.', safe.error);
    }

    await cache.onMutate({
      tables: ['project_ai_author_dialog'],
    });

    aiRevalidate(input.project_id);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    if (
      error instanceof Error &&
      error.message.includes('project_ai_author_dialog_public_slug_idx')
    ) {
      return actionError(
        'This public author dialog endpoint is already in use. Choose a different endpoint slug.',
      );
    }
    return actionError(
      mapAiDbError(error, 'Failed to save author dialog into database.'),
    );
  }
}

export async function getAuthorDialogById(
  projectId: string,
  authorDialogId: string,
): ActionResponse<AuthorDialog> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .select()
      .from(projectAiAuthorDialogs)
      .where(
        and(
          eq(projectAiAuthorDialogs.project_id, projectId),
          eq(projectAiAuthorDialogs.id, authorDialogId),
        ),
      )
      .limit(1);

    const safe = authorDialogSchema.safeParse(rows[0]);
    if (!safe.success) {
      return actionZodError('Failed to parse author dialog.', safe.error);
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch author dialog from database.'),
    );
  }
}

export async function deleteAuthorDialog(
  projectId: string,
  authorDialogId: string,
): ActionResponse<AuthorDialog> {
  const access = await getProjectAccess(projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .delete(projectAiAuthorDialogs)
      .where(
        and(
          eq(projectAiAuthorDialogs.project_id, projectId),
          eq(projectAiAuthorDialogs.id, authorDialogId),
        ),
      )
      .returning();

    const safe = authorDialogSchema.safeParse(rows[0]);
    if (!safe.success) {
      return actionZodError(
        'Failed to parse deleted author dialog.',
        safe.error,
      );
    }

    await cache.onMutate({
      tables: ['project_ai_author_dialog'],
    });

    aiRevalidate(projectId);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to delete author dialog from database.'),
    );
  }
}

export async function getContentAdvisorAgentConfigs(
  projectId: string,
  environmentId: string,
): ActionResponse<ContentAdvisorAgentConfig[]> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .select()
      .from(projectAiContentAdvisorAgentConfigs)
      .where(
        and(
          eq(projectAiContentAdvisorAgentConfigs.project_id, projectId),
          eq(projectAiContentAdvisorAgentConfigs.environment_id, environmentId),
        ),
      )
      .orderBy(asc(projectAiContentAdvisorAgentConfigs.name));

    const safe = z
      .array(contentAdvisorAgentConfigSchema)
      .safeParse(rows.map(normalizeContentAdvisorAgentRow));
    if (!safe.success) {
      return actionZodError(
        'Failed to parse content advisor agents.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(
        error,
        'Failed to fetch content advisor agents from database.',
      ),
    );
  }
}

export async function upsertContentAdvisorAgentConfig(
  input: ContentAdvisorAgentConfigInput,
): ActionResponse<ContentAdvisorAgentConfig> {
  const access = await getProjectAccess(input.project_id, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const safeInput = contentAdvisorAgentConfigInputSchema.safeParse(input);
  if (!safeInput.success) {
    return actionZodError(
      'Failed to parse content advisor agent input.',
      safeInput.error,
    );
  }

  try {
    const payload = {
      ...safeInput.data,
      provider_config: buildFoundryProviderConfig({
        project_endpoint: safeInput.data.project_endpoint || '',
        agent_id: safeInput.data.provider_agent_id || '',
      }),
      updated_at: new Date(),
    };

    const rows = safeInput.data.id
      ? await db
          .update(projectAiContentAdvisorAgentConfigs)
          .set(payload)
          .where(
            and(
              eq(projectAiContentAdvisorAgentConfigs.id, safeInput.data.id),
              eq(
                projectAiContentAdvisorAgentConfigs.project_id,
                safeInput.data.project_id,
              ),
            ),
          )
          .returning()
      : await db
          .insert(projectAiContentAdvisorAgentConfigs)
          .values(payload)
          .returning();

    const safe = contentAdvisorAgentConfigSchema.safeParse(rows[0]);
    if (!safe.success) {
      return actionZodError(
        'Failed to parse content advisor agent config.',
        safe.error,
      );
    }

    aiRevalidate(input.project_id);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to save content advisor agent config.'),
    );
  }
}

export async function upsertBrokenLinkAgentConfig(
  input: BrokenLinkAgentConfigInput,
): ActionResponse<ContentAdvisorAgentConfig> {
  const access = await getProjectAccess(input.project_id, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const safeInput = brokenLinkAgentConfigInputSchema.safeParse(input);
  if (!safeInput.success) {
    return actionZodError(
      'Failed to parse broken link agent config input.',
      safeInput.error,
    );
  }

  try {
    const payload = {
      project_id: safeInput.data.project_id,
      environment_id: safeInput.data.environment_id,
      key: safeInput.data.key,
      name: safeInput.data.name,
      description: safeInput.data.description,
      provider: 'microsoft-foundry' as const,
      provider_config: {
        crawl_depth: safeInput.data.crawl_depth,
        allowed_domain: safeInput.data.allowed_domain,
      },
      prompt: '',
      enabled: safeInput.data.enabled,
      updated_at: new Date(),
    };

    const rows = safeInput.data.id
      ? await db
          .update(projectAiContentAdvisorAgentConfigs)
          .set(payload)
          .where(
            and(
              eq(projectAiContentAdvisorAgentConfigs.id, safeInput.data.id),
              eq(
                projectAiContentAdvisorAgentConfigs.project_id,
                safeInput.data.project_id,
              ),
            ),
          )
          .returning()
      : await db
          .insert(projectAiContentAdvisorAgentConfigs)
          .values(payload)
          .returning();

    const safe = contentAdvisorAgentConfigSchema.safeParse(rows[0]);
    if (!safe.success) {
      return actionZodError(
        'Failed to parse broken link agent config.',
        safe.error,
      );
    }

    aiRevalidate(input.project_id);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to save broken link agent config.'),
    );
  }
}

export async function getContentAdvisorSchedules(
  projectId: string,
  environmentId: string,
): ActionResponse<ContentAdvisorSchedule[]> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const schedules = await db
      .select()
      .from(projectAiContentAdvisorSchedules)
      .where(
        and(
          eq(projectAiContentAdvisorSchedules.project_id, projectId),
          eq(projectAiContentAdvisorSchedules.environment_id, environmentId),
        ),
      )
      .orderBy(desc(projectAiContentAdvisorSchedules.updated_at));

    const pages = schedules.length
      ? await db
          .select()
          .from(projectAiContentAdvisorSchedulePages)
          .where(
            inArray(
              projectAiContentAdvisorSchedulePages.schedule_id,
              schedules.map((schedule) => schedule.id),
            ),
          )
      : [];

    const pagesBySchedule = new Map<string, string[]>();
    pages.forEach((page) => {
      const urls = pagesBySchedule.get(page.schedule_id) ?? [];
      urls.push(page.url);
      pagesBySchedule.set(page.schedule_id, urls);
    });

    const safe = z.array(contentAdvisorScheduleSchema).safeParse(
      schedules.map((schedule) => ({
        ...schedule,
        pages: pagesBySchedule.get(schedule.id) ?? [],
      })),
    );
    if (!safe.success) {
      return actionZodError(
        'Failed to parse content advisor schedules.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch content advisor schedules.'),
    );
  }
}

export async function upsertContentAdvisorSchedule(
  input: ContentAdvisorScheduleInput,
): ActionResponse<ContentAdvisorSchedule> {
  const access = await getProjectAccess(input.project_id, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const safeInput = contentAdvisorScheduleInputSchema.safeParse(input);
  if (!safeInput.success) {
    return actionZodError(
      'Failed to parse content advisor schedule input.',
      safeInput.error,
    );
  }

  try {
    const schedule = await db.transaction(async (tx) => {
      const scheduleRows = safeInput.data.id
        ? await tx
            .update(projectAiContentAdvisorSchedules)
            .set({
              label: safeInput.data.label,
              cron: safeInput.data.cron,
              focus_instruction: safeInput.data.focus_instruction || null,
              enabled: safeInput.data.enabled,
              updated_at: new Date(),
            })
            .where(
              and(
                eq(projectAiContentAdvisorSchedules.id, safeInput.data.id),
                eq(
                  projectAiContentAdvisorSchedules.project_id,
                  safeInput.data.project_id,
                ),
              ),
            )
            .returning()
        : await tx
            .insert(projectAiContentAdvisorSchedules)
            .values({
              project_id: safeInput.data.project_id,
              environment_id: safeInput.data.environment_id,
              label: safeInput.data.label,
              cron: safeInput.data.cron,
              focus_instruction: safeInput.data.focus_instruction || null,
              enabled: safeInput.data.enabled,
            })
            .returning();

      const scheduleRow = scheduleRows[0];

      await tx
        .delete(projectAiContentAdvisorSchedulePages)
        .where(
          eq(projectAiContentAdvisorSchedulePages.schedule_id, scheduleRow.id),
        );

      await tx.insert(projectAiContentAdvisorSchedulePages).values(
        safeInput.data.pages.map((url) => ({
          schedule_id: scheduleRow.id,
          url,
        })),
      );

      return scheduleRow;
    });

    const safe = contentAdvisorScheduleSchema.safeParse({
      ...schedule,
      pages: safeInput.data.pages,
    });
    if (!safe.success) {
      return actionZodError(
        'Failed to parse saved content advisor schedule.',
        safe.error,
      );
    }

    aiRevalidate(input.project_id);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to save content advisor schedule.'),
    );
  }
}

export async function deleteContentAdvisorSchedule(
  projectId: string,
  scheduleId: string,
): ActionResponse<{ id: string }> {
  const access = await getProjectAccess(projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .delete(projectAiContentAdvisorSchedules)
      .where(
        and(
          eq(projectAiContentAdvisorSchedules.id, scheduleId),
          eq(projectAiContentAdvisorSchedules.project_id, projectId),
        ),
      )
      .returning({ id: projectAiContentAdvisorSchedules.id });

    aiRevalidate(projectId);
    return actionSuccess(rows[0]);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to delete content advisor schedule.'),
    );
  }
}

export async function createContentAdvisorRun(
  projectId: string,
  environmentId: string,
  scheduleId: string | null,
  summary: string,
  agentRuns: Array<{
    agent_config_id: string;
    summary: string;
    response?: string;
    status?: string;
    issues: ContentAdvisorIssueInput[];
  }>,
  triggeredBy: 'schedule' | 'manual' = 'schedule',
): ActionResponse<{
  run: ContentAdvisorRun;
  issues: ContentAdvisorIssue[];
}> {
  const access = await getProjectAccess(projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }

  // Validate and transform all issues via Zod. We eagerly parse every issue
  // here so that Zod transforms (e.g. .trim()) are applied before any DB write,
  // and the validated `.data` is what actually reaches the database.
  const parsedAgentRuns: Array<
    (typeof agentRuns)[number] & { parsedIssues: ContentAdvisorIssueInput[] }
  > = [];
  for (const agentRun of agentRuns) {
    const parsedIssues: ContentAdvisorIssueInput[] = [];
    for (const issue of agentRun.issues) {
      const result = contentAdvisorIssueInputSchema.safeParse(issue);
      if (!result.success) {
        return actionZodError('Invalid content advisor issue.', result.error);
      }
      parsedIssues.push(result.data);
    }
    parsedAgentRuns.push({ ...agentRun, parsedIssues });
  }

  // IDOR guard: verify all agent_config_ids belong to this project
  const agentConfigIds = [
    ...new Set(parsedAgentRuns.map((r) => r.agent_config_id)),
  ];

  if (agentConfigIds.length === 0) {
    return actionError('No agent runs provided.');
  }
  if (agentConfigIds.length > 50) {
    return actionError('Too many agent configs in a single run (max 50).');
  }

  const validConfigs = await db
    .select({ id: projectAiContentAdvisorAgentConfigs.id })
    .from(projectAiContentAdvisorAgentConfigs)
    .where(
      and(
        eq(projectAiContentAdvisorAgentConfigs.project_id, projectId),
        inArray(projectAiContentAdvisorAgentConfigs.id, agentConfigIds),
      ),
    );
  const validConfigIds = new Set(validConfigs.map((c) => c.id));
  const invalidConfig = agentConfigIds.find((id) => !validConfigIds.has(id));
  if (invalidConfig) {
    return actionError(
      'One or more agent configs do not belong to this project.',
    );
  }

  try {
    const result = await db.transaction(async (tx) => {
      const uniqueFingerprintIndexResult = await tx.execute(
        sql`select exists (
          select 1
          from pg_indexes
          where schemaname = current_schema()
            and tablename = 'project_ai_content_advisor_issue'
            and indexname = 'project_ai_content_advisor_issue_fingerprint_idx'
            and indexdef ilike 'create unique index%'
        ) as is_unique`,
      );
      const hasUniqueFingerprintIndex = Array.isArray(
        uniqueFingerprintIndexResult,
      )
        ? Boolean(uniqueFingerprintIndexResult[0]?.is_unique)
        : Boolean(uniqueFingerprintIndexResult.rows[0]?.is_unique);

      const settingsRows = await tx
        .select()
        .from(projectAiContentAdvisorSettings)
        .where(
          and(
            eq(projectAiContentAdvisorSettings.project_id, projectId),
            eq(projectAiContentAdvisorSettings.environment_id, environmentId),
          ),
        )
        .limit(1);

      const settings = settingsRows[0] || null;

      const [runRow] = await tx
        .insert(projectAiContentAdvisorRuns)
        .values({
          project_id: projectId,
          environment_id: environmentId,
          schedule_id: scheduleId,
          triggered_by: triggeredBy,
          summary,
          status: 'completed',
          completed_at: new Date(),
        })
        .returning();

      const insertedIssues: ContentAdvisorIssue[] = [];

      for (const agentRun of parsedAgentRuns) {
        const [agentRunRow] = await tx
          .insert(projectAiContentAdvisorAgentRuns)
          .values({
            run_id: runRow.id,
            agent_config_id: agentRun.agent_config_id,
            summary: agentRun.summary,
            response: agentRun.response || '',
            status: agentRun.status || 'completed',
            issue_count: agentRun.parsedIssues.length,
          })
          .returning();

        if (!agentRun.parsedIssues.length) {
          continue;
        }

        const rows: ContentAdvisorIssueRow[] = [];
        const detectionValues: {
          issue_id: string;
          run_id: string;
          agent_run_id: string;
        }[] = [];

        for (const issue of agentRun.parsedIssues) {
          const fingerprint =
            issue.fingerprint || buildContentAdvisorIssueFingerprint(issue);
          const detectedAt = new Date();
          const insertValues = {
            environment_id: environmentId,
            run_id: runRow.id,
            agent_run_id: agentRunRow.id,
            ...issue,
            fingerprint,
            status: issue.status || 'open',
            page_path: issue.page_path || null,
            component_path: issue.component_path || null,
            page_title: issue.page_title || null,
            first_detected_at: detectedAt,
            last_detected_at: detectedAt,
            detection_count: 1,
          };
          const updateValues = {
            run_id: runRow.id,
            agent_run_id: agentRunRow.id,
            page_url: issue.page_url,
            page_path: issue.page_path || null,
            component_path: issue.component_path || null,
            page_title: issue.page_title || null,
            severity: issue.severity,
            title: issue.title,
            description: issue.description,
            suggestion: issue.suggestion,
            reasoning: issue.reasoning,
            last_detected_at: detectedAt,
            detection_count: sql`${projectAiContentAdvisorIssues.detection_count} + 1`,
          };

          // Atomic upsert — avoids race condition when concurrent runs process
          // the same fingerprint simultaneously.
          let upsertedIssue: ContentAdvisorIssueRow | undefined;

          if (hasUniqueFingerprintIndex) {
            [upsertedIssue] = await tx
              .insert(projectAiContentAdvisorIssues)
              .values(insertValues)
              .onConflictDoUpdate({
                target: [
                  projectAiContentAdvisorIssues.environment_id,
                  projectAiContentAdvisorIssues.fingerprint,
                ],
                set: updateValues,
              })
              .returning();
          } else {
            // Older databases may still have the pre-0031 non-unique index.
            // Serialize by fingerprint so we can safely emulate the upsert.
            await tx.execute(
              sql`select pg_advisory_xact_lock(hashtext(${environmentId}), hashtext(${fingerprint}))`,
            );

            const existingIssueRows = await tx
              .select()
              .from(projectAiContentAdvisorIssues)
              .where(
                and(
                  eq(
                    projectAiContentAdvisorIssues.environment_id,
                    environmentId,
                  ),
                  eq(projectAiContentAdvisorIssues.fingerprint, fingerprint),
                ),
              )
              .limit(1);

            if (existingIssueRows[0]) {
              [upsertedIssue] = await tx
                .update(projectAiContentAdvisorIssues)
                .set(updateValues)
                .where(
                  eq(projectAiContentAdvisorIssues.id, existingIssueRows[0].id),
                )
                .returning();
            } else {
              [upsertedIssue] = await tx
                .insert(projectAiContentAdvisorIssues)
                .values(insertValues)
                .returning();
            }
          }

          if (!upsertedIssue) {
            throw new Error('Failed to upsert content advisor issue.');
          }

          detectionValues.push({
            issue_id: upsertedIssue.id,
            run_id: runRow.id,
            agent_run_id: agentRunRow.id,
          });

          rows.push(upsertedIssue);
        }

        // Batch-insert all detections for this agent run in a single statement.
        if (detectionValues.length) {
          await tx
            .insert(projectAiContentAdvisorIssueDetections)
            .values(detectionValues);
        }

        const safeIssues = z.array(contentAdvisorIssueSchema).safeParse(rows);
        if (!safeIssues.success) {
          throw safeIssues.error;
        }
        insertedIssues.push(...safeIssues.data);
      }

      await maybeAutoResolveContentAdvisorIssues({
        tx,
        environmentId,
        threshold: settings?.auto_resolve_after_runs ?? null,
      });

      return { runRow, issues: insertedIssues };
    });

    const safeRun = contentAdvisorRunSchema.safeParse(result.runRow);
    if (!safeRun.success) {
      return actionZodError(
        'Failed to parse content advisor run.',
        safeRun.error,
      );
    }

    aiRevalidate(projectId);
    return actionSuccess({ run: safeRun.data, issues: result.issues });
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to save content advisor run.'),
    );
  }
}

export async function getLatestContentAdvisorResult(
  projectId: string,
  environmentId: string,
): ActionResponse<{
  run: ContentAdvisorRun | null;
  issues: ContentAdvisorIssueWithComments[];
}> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .select()
      .from(projectAiContentAdvisorRuns)
      .where(
        and(
          eq(projectAiContentAdvisorRuns.project_id, projectId),
          eq(projectAiContentAdvisorRuns.environment_id, environmentId),
        ),
      )
      .orderBy(desc(projectAiContentAdvisorRuns.created_at))
      .limit(1);

    const runRow = rows[0];
    if (!runRow) {
      return actionSuccess({ run: null, issues: [] });
    }

    const issues = await db
      .select()
      .from(projectAiContentAdvisorIssues)
      .where(eq(projectAiContentAdvisorIssues.run_id, runRow.id))
      .orderBy(desc(projectAiContentAdvisorIssues.created_at));

    const comments = issues.length
      ? await db
          .select()
          .from(projectAiContentAdvisorIssueComments)
          .where(
            inArray(
              projectAiContentAdvisorIssueComments.issue_id,
              issues.map((issue) => issue.id),
            ),
          )
          .orderBy(asc(projectAiContentAdvisorIssueComments.created_at))
      : [];

    const commentsByIssue = comments.reduce(
      (acc, comment) => {
        if (!acc[comment.issue_id]) {
          acc[comment.issue_id] = [];
        }
        acc[comment.issue_id].push(comment);
        return acc;
      },
      {} as Record<string, ContentAdvisorIssueComment[]>,
    );

    const issuesWithComments = issues.map((issue) => ({
      ...issue,
      comments: commentsByIssue[issue.id] || [],
    }));

    const safeRun = contentAdvisorRunSchema.safeParse(runRow);
    const safeIssues = z
      .array(contentAdvisorIssueWithCommentsSchema)
      .safeParse(issuesWithComments);
    if (!safeRun.success) {
      return actionZodError(
        'Failed to parse content advisor run.',
        safeRun.error,
      );
    }
    if (!safeIssues.success) {
      return actionZodError(
        'Failed to parse content advisor issues.',
        safeIssues.error,
      );
    }

    return actionSuccess({ run: safeRun.data, issues: safeIssues.data });
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch content advisor results.'),
    );
  }
}

export async function getContentAdvisorIssuesDashboard(
  projectId: string,
  environmentId: string,
): ActionResponse<{
  latestRun: ContentAdvisorRun | null;
  issues: ContentAdvisorIssueDashboardItem[];
}> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const latestRunRows = await db
      .select()
      .from(projectAiContentAdvisorRuns)
      .where(
        and(
          eq(projectAiContentAdvisorRuns.project_id, projectId),
          eq(projectAiContentAdvisorRuns.environment_id, environmentId),
        ),
      )
      .orderBy(desc(projectAiContentAdvisorRuns.created_at))
      .limit(1);

    const latestRunRow = latestRunRows[0] || null;

    // Fetch issues independently — can run in parallel with other future queries.
    const issues = await db
      .select({
        issue: projectAiContentAdvisorIssues,
        agent: {
          id: projectAiContentAdvisorAgentConfigs.id,
          key: projectAiContentAdvisorAgentConfigs.key,
          name: projectAiContentAdvisorAgentConfigs.name,
          description: projectAiContentAdvisorAgentConfigs.description,
        },
      })
      .from(projectAiContentAdvisorIssues)
      .innerJoin(
        projectAiContentAdvisorRuns,
        eq(
          projectAiContentAdvisorIssues.run_id,
          projectAiContentAdvisorRuns.id,
        ),
      )
      .innerJoin(
        projectAiContentAdvisorAgentRuns,
        eq(
          projectAiContentAdvisorIssues.agent_run_id,
          projectAiContentAdvisorAgentRuns.id,
        ),
      )
      .innerJoin(
        projectAiContentAdvisorAgentConfigs,
        eq(
          projectAiContentAdvisorAgentRuns.agent_config_id,
          projectAiContentAdvisorAgentConfigs.id,
        ),
      )
      .where(
        and(
          eq(projectAiContentAdvisorIssues.environment_id, environmentId),
          eq(projectAiContentAdvisorRuns.project_id, projectId),
        ),
      )
      .orderBy(desc(projectAiContentAdvisorIssues.last_detected_at));

    const issueRows = issues.map((row) => row.issue);

    // comments and detections are independent — fetch them in parallel.
    const [comments, detections] = await Promise.all([
      issueRows.length
        ? db
            .select()
            .from(projectAiContentAdvisorIssueComments)
            .where(
              inArray(
                projectAiContentAdvisorIssueComments.issue_id,
                issueRows.map((issue) => issue.id),
              ),
            )
            .orderBy(asc(projectAiContentAdvisorIssueComments.created_at))
        : Promise.resolve([]),
      issueRows.length
        ? db
            .select({
              id: projectAiContentAdvisorIssueDetections.id,
              issue_id: projectAiContentAdvisorIssueDetections.issue_id,
              run_id: projectAiContentAdvisorIssueDetections.run_id,
              agent_run_id: projectAiContentAdvisorIssueDetections.agent_run_id,
              created_at: projectAiContentAdvisorIssueDetections.created_at,
              run: {
                id: projectAiContentAdvisorRuns.id,
                summary: projectAiContentAdvisorRuns.summary,
                created_at: projectAiContentAdvisorRuns.created_at,
                completed_at: projectAiContentAdvisorRuns.completed_at,
              },
              agentRun: {
                id: projectAiContentAdvisorAgentRuns.id,
                summary: projectAiContentAdvisorAgentRuns.summary,
                status: projectAiContentAdvisorAgentRuns.status,
                created_at: projectAiContentAdvisorAgentRuns.created_at,
                agent: {
                  id: projectAiContentAdvisorAgentConfigs.id,
                  key: projectAiContentAdvisorAgentConfigs.key,
                  name: projectAiContentAdvisorAgentConfigs.name,
                  description: projectAiContentAdvisorAgentConfigs.description,
                },
              },
            })
            .from(projectAiContentAdvisorIssueDetections)
            .innerJoin(
              projectAiContentAdvisorRuns,
              eq(
                projectAiContentAdvisorIssueDetections.run_id,
                projectAiContentAdvisorRuns.id,
              ),
            )
            .innerJoin(
              projectAiContentAdvisorAgentRuns,
              eq(
                projectAiContentAdvisorIssueDetections.agent_run_id,
                projectAiContentAdvisorAgentRuns.id,
              ),
            )
            .innerJoin(
              projectAiContentAdvisorAgentConfigs,
              eq(
                projectAiContentAdvisorAgentRuns.agent_config_id,
                projectAiContentAdvisorAgentConfigs.id,
              ),
            )
            .where(
              inArray(
                projectAiContentAdvisorIssueDetections.issue_id,
                issueRows.map((issue) => issue.id),
              ),
            )
            .orderBy(desc(projectAiContentAdvisorIssueDetections.created_at))
        : Promise.resolve([]),
    ]);

    const commentsByIssue = comments.reduce(
      (acc, comment) => {
        if (!acc[comment.issue_id]) {
          acc[comment.issue_id] = [];
        }
        acc[comment.issue_id].push(comment);
        return acc;
      },
      {} as Record<string, ContentAdvisorIssueComment[]>,
    );

    const detectionsByIssue = detections.reduce(
      (acc, detection) => {
        if (!acc[detection.issue_id]) {
          acc[detection.issue_id] = [];
        }
        acc[detection.issue_id].push(detection);
        return acc;
      },
      {} as Record<
        string,
        z.infer<typeof contentAdvisorIssueDetectionSchema>[]
      >,
    );

    const safeLatestRun = latestRunRow
      ? contentAdvisorRunSchema.safeParse(latestRunRow)
      : null;

    if (safeLatestRun && !safeLatestRun.success) {
      return actionZodError(
        'Failed to parse latest content advisor run.',
        safeLatestRun.error,
      );
    }

    const safeIssues = z
      .array(contentAdvisorIssueDashboardItemSchema)
      .safeParse(
        issues.map((row) => ({
          ...row.issue,
          agent: row.agent,
          comments: commentsByIssue[row.issue.id] || [],
          detections: detectionsByIssue[row.issue.id] || [],
          is_detected_in_latest_run: latestRunRow
            ? row.issue.run_id === latestRunRow.id
            : false,
        })),
      );

    if (!safeIssues.success) {
      return actionZodError(
        'Failed to parse content advisor issues dashboard.',
        safeIssues.error,
      );
    }

    return actionSuccess({
      latestRun: safeLatestRun ? safeLatestRun.data : null,
      issues: safeIssues.data,
    });
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch content advisor issues dashboard.'),
    );
  }
}

export async function getContentAdvisorScheduleById(
  projectId: string,
  scheduleId: string,
): ActionResponse<ContentAdvisorSchedule> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const schedules = await db
      .select()
      .from(projectAiContentAdvisorSchedules)
      .where(
        and(
          eq(projectAiContentAdvisorSchedules.id, scheduleId),
          eq(projectAiContentAdvisorSchedules.project_id, projectId),
        ),
      )
      .limit(1);

    const schedule = schedules[0];
    if (!schedule) {
      return actionError('Schedule not found.');
    }

    const pages = await db
      .select()
      .from(projectAiContentAdvisorSchedulePages)
      .where(eq(projectAiContentAdvisorSchedulePages.schedule_id, schedule.id));

    const safe = contentAdvisorScheduleSchema.safeParse({
      ...schedule,
      pages: pages.map((page) => page.url),
    });
    if (!safe.success) {
      return actionZodError(
        'Failed to parse content advisor schedule.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch content advisor schedule.'),
    );
  }
}

export async function getContentAdvisorSettings(
  projectId: string,
  environmentId: string,
): ActionResponse<ContentAdvisorSettings | null> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const rows = await db
      .select()
      .from(projectAiContentAdvisorSettings)
      .where(
        and(
          eq(projectAiContentAdvisorSettings.project_id, projectId),
          eq(projectAiContentAdvisorSettings.environment_id, environmentId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      return actionSuccess(null);
    }

    const safe = contentAdvisorSettingsSchema.safeParse(row);
    if (!safe.success) {
      return actionZodError(
        'Failed to parse content advisor settings.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch content advisor settings.'),
    );
  }
}

export async function upsertContentAdvisorSettings(
  input: ContentAdvisorSettingsInput,
): ActionResponse<ContentAdvisorSettings> {
  const access = await getProjectAccess(input.project_id, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const parsedInput = contentAdvisorSettingsInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionZodError(
      'Failed to parse content advisor settings.',
      parsedInput.error,
    );
  }

  try {
    const rows = await db
      .insert(projectAiContentAdvisorSettings)
      .values({
        project_id: parsedInput.data.project_id,
        environment_id: parsedInput.data.environment_id,
        auto_resolve_after_runs: parsedInput.data.auto_resolve_after_runs,
      })
      .onConflictDoUpdate({
        target: [
          projectAiContentAdvisorSettings.project_id,
          projectAiContentAdvisorSettings.environment_id,
        ],
        set: {
          auto_resolve_after_runs: parsedInput.data.auto_resolve_after_runs,
          updated_at: new Date(),
        },
      })
      .returning();

    const safe = contentAdvisorSettingsSchema.safeParse(rows[0]);
    if (!safe.success) {
      return actionZodError(
        'Failed to parse saved content advisor settings.',
        safe.error,
      );
    }

    aiRevalidate(input.project_id);
    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to save content advisor settings.'),
    );
  }
}

export async function addContentAdvisorIssueComment(
  projectId: string,
  input: ContentAdvisorIssueCommentInput,
): ActionResponse<ContentAdvisorIssueComment> {
  const access = await getProjectAccess(projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const parsedInput = contentAdvisorIssueCommentInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionZodError(
      'Failed to parse content advisor issue comment.',
      parsedInput.error,
    );
  }

  if ('success' in access) {
    return access;
  }

  const { session } = access;
  const userId = session.user?.id;
  const userName =
    session.user?.name?.trim() || session.user?.email || 'Unknown';
  const userEmail = session.user?.email || null;
  const userImage = session.user?.image || null;

  if (!userId) {
    return actionError('No user provided.');
  }

  try {
    const issueRows = await db
      .select({
        id: projectAiContentAdvisorIssues.id,
        runProjectId: projectAiContentAdvisorRuns.project_id,
      })
      .from(projectAiContentAdvisorIssues)
      .innerJoin(
        projectAiContentAdvisorRuns,
        eq(
          projectAiContentAdvisorIssues.run_id,
          projectAiContentAdvisorRuns.id,
        ),
      )
      .where(eq(projectAiContentAdvisorIssues.id, parsedInput.data.issue_id))
      .limit(1);

    const issue = issueRows[0];
    if (!issue || issue.runProjectId !== projectId) {
      return actionError('Issue not found.');
    }

    const [comment] = await db
      .insert(projectAiContentAdvisorIssueComments)
      .values({
        issue_id: parsedInput.data.issue_id,
        author_user_id: userId,
        author_name: userName,
        author_email: userEmail,
        author_image: userImage,
        body: parsedInput.data.body,
      })
      .returning();

    const safeComment = contentAdvisorIssueCommentSchema.safeParse(comment);
    if (!safeComment.success) {
      return actionZodError(
        'Failed to parse content advisor issue comment.',
        safeComment.error,
      );
    }

    aiRevalidate(projectId);
    return actionSuccess(safeComment.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to save content advisor issue comment.'),
    );
  }
}

export async function updateContentAdvisorIssueStatus(
  projectId: string,
  input: ContentAdvisorIssueStatusInput,
): ActionResponse<ContentAdvisorIssue> {
  const access = await getProjectAccess(projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const parsedInput = contentAdvisorIssueStatusInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return actionZodError(
      'Failed to parse content advisor issue status.',
      parsedInput.error,
    );
  }

  try {
    const issueRows = await db
      .select({
        id: projectAiContentAdvisorIssues.id,
        runProjectId: projectAiContentAdvisorRuns.project_id,
      })
      .from(projectAiContentAdvisorIssues)
      .innerJoin(
        projectAiContentAdvisorRuns,
        eq(
          projectAiContentAdvisorIssues.run_id,
          projectAiContentAdvisorRuns.id,
        ),
      )
      .where(eq(projectAiContentAdvisorIssues.id, parsedInput.data.issue_id))
      .limit(1);

    const issue = issueRows[0];
    if (!issue || issue.runProjectId !== projectId) {
      return actionError('Issue not found.');
    }

    const [updatedIssue] = await db
      .update(projectAiContentAdvisorIssues)
      .set({ status: parsedInput.data.status })
      .where(eq(projectAiContentAdvisorIssues.id, parsedInput.data.issue_id))
      .returning();

    const safeIssue = contentAdvisorIssueSchema.safeParse(updatedIssue);
    if (!safeIssue.success) {
      return actionZodError(
        'Failed to parse content advisor issue status.',
        safeIssue.error,
      );
    }

    aiRevalidate(projectId);
    return actionSuccess(safeIssue.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to update content advisor issue status.'),
    );
  }
}

export async function deleteContentAdvisorIssue(
  projectId: string,
  issueId: string,
): ActionResponse<{ id: string }> {
  const access = await getProjectAccess(projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const issueRows = await db
      .select({
        id: projectAiContentAdvisorIssues.id,
        runProjectId: projectAiContentAdvisorRuns.project_id,
      })
      .from(projectAiContentAdvisorIssues)
      .innerJoin(
        projectAiContentAdvisorRuns,
        eq(
          projectAiContentAdvisorIssues.run_id,
          projectAiContentAdvisorRuns.id,
        ),
      )
      .where(eq(projectAiContentAdvisorIssues.id, issueId))
      .limit(1);

    const issue = issueRows[0];
    if (!issue || issue.runProjectId !== projectId) {
      return actionError('Issue not found.');
    }

    const rows = await db
      .delete(projectAiContentAdvisorIssues)
      .where(eq(projectAiContentAdvisorIssues.id, issueId))
      .returning({ id: projectAiContentAdvisorIssues.id });

    aiRevalidate(projectId);
    return actionSuccess(rows[0]);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to delete content advisor issue.'),
    );
  }
}

export async function runContentAdvisorScheduleAnalysis(
  projectId: string,
  scheduleId: string,
): ActionResponse<{
  run: ContentAdvisorRun;
  issues: ContentAdvisorIssue[];
}> {
  const access = await getProjectAccess(projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const scheduleResult = await getContentAdvisorScheduleById(
    projectId,
    scheduleId,
  );
  if (!scheduleResult.success) {
    return scheduleResult;
  }

  const schedule = scheduleResult.data;
  const agentConfigs = await getContentAdvisorAgentConfigs(
    projectId,
    schedule.environment_id,
  );
  if (!agentConfigs.success) {
    return agentConfigs;
  }

  const enabledAgents = agentConfigs.data.filter(
    // 'compliance' is coming-soon — exclude it from all scheduled/manual runs
    // until the feature is fully implemented and enabled for production.
    (agent) => agent.enabled && agent.key !== 'compliance',
  );
  if (!enabledAgents.length) {
    return actionError('No enabled content advisor agents configured.');
  }

  try {
    const mappingsResult = await getPageUrlMappings(
      projectId,
      schedule.environment_id,
    );
    const mappings = mappingsResult.success ? mappingsResult.data : [];

    const sources = await Promise.all(
      schedule.pages.map(async (page) => {
        try {
          const resolved = resolvePageReferenceWithMapping(page, mappings);
          if (!resolved.url.startsWith('http')) {
            // AEM path with no mapping — return a stub that will surface as an issue
            return {
              reference: page,
              url: page,
              title: null,
              text: '',
              html: '',
              status: 0,
            };
          }
          if (!isSafeContentAdvisorUrl(resolved.url)) {
            return {
              reference: page,
              url: resolved.url,
              title: null,
              text: '',
              html: '',
              status: 0,
            };
          }
          const rawSource = await fetchPageSource(resolved.url);
          return resolved.aemPath
            ? { ...rawSource, reference: resolved.aemPath }
            : rawSource;
        } catch {
          return {
            reference: page,
            url: resolveContentAdvisorPageUrl(page),
            title: null,
            text: '',
            html: '',
            status: 500,
          };
        }
      }),
    );

    // Cap concurrent LLM calls: max 4 agent×page combos in flight at once.
    // Each individual call is also wrapped with a 45-second timeout so a slow
    // LLM response does not hold the serverless function open indefinitely.
    const llmLimit = createConcurrencyLimiter(4);

    const agentRuns = await Promise.all(
      enabledAgents.map(async (agent) => {
        const analysisResults = await Promise.all(
          sources.map((source) =>
            llmLimit(async () => {
              const timeoutController = new AbortController();
              const timeoutId = setTimeout(
                () => timeoutController.abort(),
                45_000,
              );
              try {
                return await Promise.race([
                  analyzePageWithAgent(agent, source),
                  new Promise<never>((_, reject) => {
                    timeoutController.signal.addEventListener('abort', () =>
                      reject(new Error('LLM call timed out after 45 seconds')),
                    );
                  }),
                ]);
              } finally {
                clearTimeout(timeoutId);
              }
            }),
          ),
        );
        const issues = analysisResults.flatMap((result) => result.issues);
        const issueCount = issues.length;

        return {
          agent_config_id: agent.id,
          summary:
            analysisResults
              .map((result) => result.summary.trim())
              .filter(Boolean)
              .join(' ') ||
            `${issueCount} issue${issueCount === 1 ? '' : 's'} found by ${agent.name}.`,
          response: analysisResults
            .map((result) => result.response.trim())
            .filter(Boolean)
            .join('\n\n'),
          issues,
        };
      }),
    );

    const totalIssues = agentRuns.reduce(
      (sum, current) => sum + current.issues.length,
      0,
    );

    return createContentAdvisorRun(
      projectId,
      schedule.environment_id,
      schedule.id,
      totalIssues
        ? `Found ${totalIssues} issue${totalIssues === 1 ? '' : 's'} across ${schedule.pages.length} page${schedule.pages.length === 1 ? '' : 's'}.`
        : `No issues found across ${schedule.pages.length} page${schedule.pages.length === 1 ? '' : 's'}.`,
      agentRuns,
      'manual',
    );
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to run content advisor schedule.'),
    );
  }
}

export async function runContentAdvisorAgentForSchedulePage(input: {
  projectId: string;
  environmentId: string;
  scheduleId: string;
  agentConfigId: string;
  page: string;
}): ActionResponse<{
  sourceUrl: string;
  issues: ContentAdvisorIssue[];
  run: ContentAdvisorRun;
}> {
  const access = await getProjectAccess(input.projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const [scheduleResult, agentConfigsResult] = await Promise.all([
    getContentAdvisorScheduleById(input.projectId, input.scheduleId),
    getContentAdvisorAgentConfigs(input.projectId, input.environmentId),
  ]);

  if (!scheduleResult.success) {
    return scheduleResult;
  }

  if (!agentConfigsResult.success) {
    return agentConfigsResult;
  }

  const schedule = scheduleResult.data;
  if (schedule.environment_id !== input.environmentId) {
    return actionError('Schedule does not belong to the selected environment.');
  }

  const pageReference = input.page.trim();
  if (!pageReference) {
    return actionError('Select a page to analyse.');
  }

  if (!schedule.pages.includes(pageReference)) {
    return actionError('Selected page is not configured for this schedule.');
  }

  const agent = agentConfigsResult.data.find(
    (entry) => entry.id === input.agentConfigId,
  );
  if (!agent) {
    return actionError('Content Advisor agent not found.');
  }

  if (!agent.enabled) {
    return actionError('Selected Content Advisor agent is disabled.');
  }

  if (agent.key === 'compliance') {
    return actionError('The Compliance agent is not yet available.');
  }

  try {
    // Load URL mappings so AEM paths can be resolved to frontend URLs
    const mappingsResult = await getPageUrlMappings(
      input.projectId,
      input.environmentId,
    );
    const mappings = mappingsResult.success ? mappingsResult.data : [];

    const resolved = resolvePageReferenceWithMapping(pageReference, mappings);

    // If the reference is an AEM path with no mapping, bail with a helpful error
    if (!resolved.url.startsWith('http')) {
      return actionError(
        `"${pageReference}" is an AEM path with no URL mapping. Add a mapping in AI settings → AEM page URL mappings.`,
      );
    }

    if (!isSafeContentAdvisorUrl(resolved.url)) {
      return actionError(
        `"${pageReference}" resolves to a private or restricted address and cannot be analysed.`,
      );
    }

    const rawSource = await fetchPageSource(resolved.url);
    // When a mapping was applied, keep the AEM path as the source reference so
    // issues store page_path = AEM path and page_url = frontend URL.
    const source = resolved.aemPath
      ? { ...rawSource, reference: resolved.aemPath }
      : rawSource;

    const analysis = await analyzePageWithAgent(agent, source);
    const summary = analysis.issues.length
      ? `${agent.name} found ${analysis.issues.length} issue${analysis.issues.length === 1 ? '' : 's'} on ${pageReference}.`
      : `${agent.name} found no issues on ${pageReference}.`;

    const runResult = await createContentAdvisorRun(
      input.projectId,
      input.environmentId,
      input.scheduleId,
      summary,
      [
        {
          agent_config_id: agent.id,
          summary: analysis.summary || summary,
          response: analysis.response,
          issues: analysis.issues,
        },
      ],
      'manual',
    );

    if (!runResult.success) {
      return runResult;
    }

    return actionSuccess({
      sourceUrl: source.url,
      issues: runResult.data.issues,
      run: runResult.data.run,
    });
  } catch (error) {
    return actionError(
      error instanceof Error
        ? error.message
        : 'Failed to run content advisor agent for the selected page.',
    );
  }
}

export async function getContentAdvisorRunDetails(
  projectId: string,
  runId: string,
): ActionResponse<{
  run: ContentAdvisorRun;
  agentRuns: ContentAdvisorAgentRunWithAgent[];
  issues: ContentAdvisorIssueWithComments[];
}> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const runRows = await db
      .select()
      .from(projectAiContentAdvisorRuns)
      .where(
        and(
          eq(projectAiContentAdvisorRuns.id, runId),
          eq(projectAiContentAdvisorRuns.project_id, projectId),
        ),
      )
      .limit(1);

    const runRow = runRows[0];
    if (!runRow) {
      return actionError('Content Advisor run not found.');
    }

    // Fetch agent runs and issues in parallel — they are independent of each other.
    const [agentRunRows, issueRows] = await Promise.all([
      db
        .select({
          id: projectAiContentAdvisorAgentRuns.id,
          run_id: projectAiContentAdvisorAgentRuns.run_id,
          agent_config_id: projectAiContentAdvisorAgentRuns.agent_config_id,
          status: projectAiContentAdvisorAgentRuns.status,
          summary: projectAiContentAdvisorAgentRuns.summary,
          response: projectAiContentAdvisorAgentRuns.response,
          issue_count: projectAiContentAdvisorAgentRuns.issue_count,
          created_at: projectAiContentAdvisorAgentRuns.created_at,
          agent: {
            id: projectAiContentAdvisorAgentConfigs.id,
            key: projectAiContentAdvisorAgentConfigs.key,
            name: projectAiContentAdvisorAgentConfigs.name,
            description: projectAiContentAdvisorAgentConfigs.description,
          },
        })
        .from(projectAiContentAdvisorAgentRuns)
        .innerJoin(
          projectAiContentAdvisorAgentConfigs,
          eq(
            projectAiContentAdvisorAgentRuns.agent_config_id,
            projectAiContentAdvisorAgentConfigs.id,
          ),
        )
        .where(eq(projectAiContentAdvisorAgentRuns.run_id, runId))
        .orderBy(asc(projectAiContentAdvisorAgentRuns.created_at)),
      db
        .select()
        .from(projectAiContentAdvisorIssues)
        .where(eq(projectAiContentAdvisorIssues.run_id, runId))
        .orderBy(desc(projectAiContentAdvisorIssues.created_at)),
    ]);

    // Comments are not rendered in the run detail page.
    // Skip the DB query and pass empty arrays to satisfy the schema default.

    const safeRun = contentAdvisorRunSchema.safeParse(runRow);
    const safeAgentRuns = z
      .array(contentAdvisorAgentRunWithAgentSchema)
      .safeParse(
        agentRunRows.map((row) => ({
          ...row,
          agent: normalizeContentAdvisorAgentRow(row.agent),
        })),
      );
    const safeIssues = z.array(contentAdvisorIssueWithCommentsSchema).safeParse(
      issueRows.map((issue) => ({
        ...issue,
        comments: [],
      })),
    );

    if (!safeRun.success) {
      return actionZodError(
        'Failed to parse content advisor run.',
        safeRun.error,
      );
    }
    if (!safeAgentRuns.success) {
      return actionZodError(
        'Failed to parse content advisor agent runs.',
        safeAgentRuns.error,
      );
    }
    if (!safeIssues.success) {
      return actionZodError(
        'Failed to parse content advisor issues.',
        safeIssues.error,
      );
    }

    return actionSuccess({
      run: safeRun.data,
      agentRuns: safeAgentRuns.data,
      issues: safeIssues.data,
    });
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch content advisor run details.'),
    );
  }
}

export async function getContentAdvisorRunsForSchedule(
  projectId: string,
  scheduleId: string,
  limit = 25,
): ActionResponse<ContentAdvisorRunHistoryItem[]> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  const safeLimit = Math.max(1, Math.min(limit, 200));

  try {
    const runRows = await db
      .select()
      .from(projectAiContentAdvisorRuns)
      .where(
        and(
          eq(projectAiContentAdvisorRuns.project_id, projectId),
          eq(projectAiContentAdvisorRuns.schedule_id, scheduleId),
        ),
      )
      .orderBy(desc(projectAiContentAdvisorRuns.created_at))
      .limit(safeLimit);

    if (!runRows.length) {
      return actionSuccess([]);
    }

    const runIds = runRows.map((row) => row.id);

    const agentRunRows = await db
      .select({
        id: projectAiContentAdvisorAgentRuns.id,
        run_id: projectAiContentAdvisorAgentRuns.run_id,
        agent_config_id: projectAiContentAdvisorAgentRuns.agent_config_id,
        status: projectAiContentAdvisorAgentRuns.status,
        summary: projectAiContentAdvisorAgentRuns.summary,
        response: projectAiContentAdvisorAgentRuns.response,
        issue_count: projectAiContentAdvisorAgentRuns.issue_count,
        created_at: projectAiContentAdvisorAgentRuns.created_at,
        agent: {
          id: projectAiContentAdvisorAgentConfigs.id,
          key: projectAiContentAdvisorAgentConfigs.key,
          name: projectAiContentAdvisorAgentConfigs.name,
          description: projectAiContentAdvisorAgentConfigs.description,
        },
      })
      .from(projectAiContentAdvisorAgentRuns)
      .innerJoin(
        projectAiContentAdvisorAgentConfigs,
        eq(
          projectAiContentAdvisorAgentRuns.agent_config_id,
          projectAiContentAdvisorAgentConfigs.id,
        ),
      )
      .where(inArray(projectAiContentAdvisorAgentRuns.run_id, runIds))
      .orderBy(asc(projectAiContentAdvisorAgentRuns.created_at));

    const agentRunsByRunId = agentRunRows.reduce(
      (acc, row) => {
        if (!acc[row.run_id]) {
          acc[row.run_id] = [];
        }
        acc[row.run_id].push(row);
        return acc;
      },
      {} as Record<string, typeof agentRunRows>,
    );

    const items = runRows.map((run) => {
      const agentRuns = (agentRunsByRunId[run.id] ?? []).map((row) => ({
        ...row,
        agent: normalizeContentAdvisorAgentRow(row.agent as any),
      }));
      const issue_count = agentRuns.reduce(
        (sum, ar) => sum + (ar.issue_count || 0),
        0,
      );
      return { ...run, agentRuns, issue_count };
    });

    const safe = z.array(contentAdvisorRunHistoryItemSchema).safeParse(items);
    if (!safe.success) {
      return actionZodError(
        'Failed to parse content advisor run history.',
        safe.error,
      );
    }

    return actionSuccess(safe.data);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch content advisor run history.'),
    );
  }
}

export async function getCatalogueDataOrEmpty(
  projectId: string,
  catalogueId: string,
): ActionResponse<CatalogueData> {
  const latestVersion = await getLatestCatalogueVersion(projectId, catalogueId);
  if (!latestVersion.success) {
    return latestVersion;
  }

  return actionSuccess(latestVersion.data?.data || EMPTY_CATALOGUE_DATA);
}

// ---------------------------------------------------------------------------
// AEM path → frontend URL mappings
// ---------------------------------------------------------------------------

export async function getPageUrlMappings(
  projectId: string,
  environmentId: string,
): ActionResponse<PageUrlMapping[]> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) return access;

  try {
    const rows = await db
      .select()
      .from(projectAiPageUrlMappings)
      .where(
        and(
          eq(projectAiPageUrlMappings.project_id, projectId),
          eq(projectAiPageUrlMappings.environment_id, environmentId),
        ),
      )
      .orderBy(asc(projectAiPageUrlMappings.aem_path));

    const parsed = rows.map((row) => pageUrlMappingSchema.safeParse(row));
    const valid = parsed.filter((r) => r.success).map((r) => r.data!);
    return actionSuccess(valid);
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to fetch page URL mappings from database.'),
    );
  }
}

export async function upsertPageUrlMapping(
  input: PageUrlMappingInput,
): ActionResponse<PageUrlMapping> {
  const access = await getProjectAccess(input.project_id, true);
  if ('success' in access && !access.success) return access;

  const safe = pageUrlMappingInputSchema.safeParse(input);
  if (!safe.success) {
    return actionZodError(
      'Failed to parse page URL mapping input.',
      safe.error,
    );
  }

  try {
    const payload = {
      project_id: safe.data.project_id,
      environment_id: safe.data.environment_id,
      aem_path: safe.data.aem_path,
      frontend_url: safe.data.frontend_url,
      updated_at: new Date(),
    };

    const rows = safe.data.id
      ? await db
          .update(projectAiPageUrlMappings)
          .set(payload)
          .where(
            and(
              eq(projectAiPageUrlMappings.id, safe.data.id),
              eq(projectAiPageUrlMappings.project_id, safe.data.project_id),
            ),
          )
          .returning()
      : await db
          .insert(projectAiPageUrlMappings)
          .values(payload)
          .onConflictDoUpdate({
            target: [
              projectAiPageUrlMappings.environment_id,
              projectAiPageUrlMappings.aem_path,
            ],
            set: {
              frontend_url: safe.data.frontend_url,
              updated_at: new Date(),
            },
          })
          .returning();

    const parsed = pageUrlMappingSchema.safeParse(rows[0]);
    if (!parsed.success) {
      return actionZodError('Failed to parse saved mapping.', parsed.error);
    }

    return actionSuccess(parsed.data);
  } catch (error) {
    console.error(error);
    return actionError('Failed to save page URL mapping.');
  }
}

export async function deletePageUrlMapping(
  projectId: string,
  mappingId: string,
): ActionResponse<{ id: string }> {
  const access = await getProjectAccess(projectId, true);
  if ('success' in access && !access.success) return access;

  try {
    await db
      .delete(projectAiPageUrlMappings)
      .where(
        and(
          eq(projectAiPageUrlMappings.id, mappingId),
          eq(projectAiPageUrlMappings.project_id, projectId),
        ),
      );

    return actionSuccess({ id: mappingId });
  } catch (error) {
    console.error(error);
    return actionError('Failed to delete page URL mapping.');
  }
}
