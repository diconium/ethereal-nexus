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
} from './schema';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
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
  ContentAdvisorIssueInput,
  contentAdvisorIssueSchema,
  contentAdvisorIssueInputSchema,
  ContentAdvisorRun,
  contentAdvisorRunSchema,
  ContentAdvisorSchedule,
  ContentAdvisorScheduleInput,
  contentAdvisorScheduleInputSchema,
  contentAdvisorScheduleSchema,
  ProjectAiFeatureFlag,
  ProjectAiFeatureKey,
  projectAiFeatureFlagSchema,
  projectAiFeatureKeySchema,
  PROJECT_AI_FEATURE_KEYS,
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
import { generateCatalogueWithFoundry } from '@/lib/ai-providers/microsoft-foundry';
import { analyzePageWithAgent, fetchPageSource } from './analyzer';

type ProjectAccess = {
  session: any;
  permission: string;
  canWrite: boolean;
};

async function getProjectAccess(
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

function normalizeContentAdvisorAgentRow(
  row: typeof projectAiContentAdvisorAgentConfigs.$inferSelect,
) {
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
    const payload = {
      ...safeInput.data,
      description: safeInput.data.description || null,
      provider_config: buildFoundryProviderConfig({
        project_endpoint: safeInput.data.project_endpoint || '',
        agent_id: safeInput.data.provider_agent_id || '',
      }),
      api_url:
        safeInput.data.api_url || safeInput.data.project_endpoint || null,
      agent_id:
        safeInput.data.provider_agent_id || safeInput.data.agent_id || null,
      agent_principal_id: safeInput.data.agent_principal_id || null,
      tenant_id: safeInput.data.tenant_id || null,
      activity_protocol_endpoint:
        safeInput.data.activity_protocol_endpoint || null,
      responses_api_endpoint:
        safeInput.data.api_url ||
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
    return access;
  }

  const catalogue = await getCatalogueById(projectId, catalogueId);
  if (!catalogue.success) {
    return catalogue;
  }

  try {
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
        return saveCatalogueVersion(projectId, catalogueId, parsedData);
      }
      default:
        return actionError(
          `Unsupported catalogue provider: ${catalogue.data.provider}`,
        );
    }
  } catch (error) {
    console.error(error);
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
    status?: string;
    issues: ContentAdvisorIssueInput[];
  }>,
): ActionResponse<{
  run: ContentAdvisorRun;
  issues: ContentAdvisorIssue[];
}> {
  const access = await getProjectAccess(projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const parsedIssues = agentRuns.flatMap((agentRun) =>
    agentRun.issues.map((issue) =>
      contentAdvisorIssueInputSchema.safeParse(issue),
    ),
  );
  const failedIssue = parsedIssues.find((result) => !result.success);
  if (failedIssue && !failedIssue.success) {
    return actionZodError('Invalid content advisor issue.', failedIssue.error);
  }

  try {
    const result = await db.transaction(async (tx) => {
      const [runRow] = await tx
        .insert(projectAiContentAdvisorRuns)
        .values({
          project_id: projectId,
          environment_id: environmentId,
          schedule_id: scheduleId,
          summary,
          status: 'completed',
          completed_at: new Date(),
        })
        .returning();

      const insertedIssues: ContentAdvisorIssue[] = [];

      for (const agentRun of agentRuns) {
        const [agentRunRow] = await tx
          .insert(projectAiContentAdvisorAgentRuns)
          .values({
            run_id: runRow.id,
            agent_config_id: agentRun.agent_config_id,
            summary: agentRun.summary,
            status: agentRun.status || 'completed',
            issue_count: agentRun.issues.length,
          })
          .returning();

        if (!agentRun.issues.length) {
          continue;
        }

        const rows = await tx
          .insert(projectAiContentAdvisorIssues)
          .values(
            agentRun.issues.map((issue) => ({
              run_id: runRow.id,
              agent_run_id: agentRunRow.id,
              ...issue,
              page_title: issue.page_title || null,
            })),
          )
          .returning();

        const safeIssues = z.array(contentAdvisorIssueSchema).safeParse(rows);
        if (!safeIssues.success) {
          throw safeIssues.error;
        }
        insertedIssues.push(...safeIssues.data);
      }

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
  issues: ContentAdvisorIssue[];
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

    const safeRun = contentAdvisorRunSchema.safeParse(runRow);
    const safeIssues = z.array(contentAdvisorIssueSchema).safeParse(issues);
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

export async function getContentAdvisorScheduleById(
  projectId: string,
  scheduleId: string,
): ActionResponse<ContentAdvisorSchedule> {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

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
}

export async function runContentAdvisorScheduleAnalysis(
  projectId: string,
  scheduleId: string,
): ActionResponse<{
  run: ContentAdvisorRun;
  issues: ContentAdvisorIssue[];
}> {
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

  const enabledAgents = agentConfigs.data.filter((agent) => agent.enabled);
  if (!enabledAgents.length) {
    return actionError('No enabled content advisor agents configured.');
  }

  try {
    const sources = await Promise.all(
      schedule.pages.map(async (url) => {
        try {
          return await fetchPageSource(url);
        } catch {
          return {
            url,
            title: null,
            text: '',
            html: '',
            status: 500,
          };
        }
      }),
    );

    const agentRuns = enabledAgents.map((agent) => {
      const issues = sources.flatMap((source) =>
        analyzePageWithAgent(agent, source),
      );
      return {
        agent_config_id: agent.id,
        summary: `${issues.length} issue${issues.length === 1 ? '' : 's'} found by ${agent.name}.`,
        issues,
      };
    });

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
    );
  } catch (error) {
    console.error(error);
    return actionError(
      mapAiDbError(error, 'Failed to run content advisor schedule.'),
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
