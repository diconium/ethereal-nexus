'use server';

import { and, asc, desc, eq, inArray, lte } from 'drizzle-orm';
import { db } from '@/db';
import {
  analyticsReviewAgentConfigInputSchema,
  analyticsReviewAgentConfigSchema,
  chatbotAnalyticsConfigInputSchema,
  chatbotAnalyticsConfigSchema,
  chatbotBreakdownItemSchema,
  chatbotQueueHealthSchema,
  chatbotRecentSessionSchema,
  chatbotTimeseriesPointSchema,
  chatbotTopicRuleInputSchema,
  chatbotTopicRuleSchema,
  chatbotTopicRuleSetInputSchema,
  chatbotTopicRuleSetSchema,
  chatbotAnalyticsOverviewSchema,
} from '@/data/ai/dto';
import {
  getChatbotAnalyticsOverview,
  getChatbotAnalyticsConfig,
  getChatbotById,
  getChatbotTimeseries,
  getQueueHealth,
  getRecentChatbotSessions,
  getReviewAgentConfig,
  getTopicBreakdown,
  getTopicRules,
  getTopicRuleSet,
} from '@/data/ai/analytics/queries';
import {
  cleanupChatbotAnalyticsJob,
  finalizeStaleChatbotSessionsJob,
  processChatbotUnmatchedReviewJob,
} from '@/data/ai/analytics-jobs';
import {
  projectAiChatbotAnalyticsConfigs,
  projectAiChatbotTopicRules,
  projectAiChatbotTopicRuleSets,
  projectAiAnalyticsReviewAgentConfigs,
} from '@/data/ai/schema';
import { actionError, actionSuccess, actionZodError } from '@/data/utils';
import { getProjectAccess } from '@/data/ai/actions';
import { buildFoundryProviderConfig } from '@/data/ai/provider';

export async function getChatbotAnalyticsConfigByChatbot(
  projectId: string,
  chatbotId: string,
) {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const [config, chatbot] = await Promise.all([
      getChatbotAnalyticsConfig(chatbotId),
      getChatbotById(projectId, chatbotId),
    ]);
    if (!chatbot) {
      return actionError('Chatbot not found.');
    }
    const safe = chatbotAnalyticsConfigSchema.safeParse(
      config ?? {
        id: crypto.randomUUID(),
        project_id: projectId,
        environment_id: chatbot.environment_id,
        chatbot_id: chatbotId,
        llm_fallback_enabled: false,
        review_min_confidence: 60,
        created_at: new Date(),
        updated_at: new Date(),
      },
    );
    if (!safe.success) {
      return actionZodError(
        'Failed to parse chatbot analytics config.',
        safe.error,
      );
    }
    return actionSuccess(safe.data);
  } catch (error) {
    return actionError(
      error instanceof Error
        ? error.message
        : 'Failed to fetch chatbot analytics config.',
    );
  }
}

export async function upsertChatbotAnalyticsConfig(input: {
  id?: string;
  project_id: string;
  environment_id: string;
  chatbot_id: string;
  llm_fallback_enabled: boolean;
  review_min_confidence: number;
}) {
  const access = await getProjectAccess(input.project_id, true);
  if ('success' in access && !access.success) {
    return access;
  }

  const safeInput = chatbotAnalyticsConfigInputSchema.safeParse(input);
  if (!safeInput.success) {
    return actionZodError(
      'Failed to parse chatbot analytics config.',
      safeInput.error,
    );
  }

  try {
    const rows = await db
      .insert(projectAiChatbotAnalyticsConfigs)
      .values(safeInput.data)
      .onConflictDoUpdate({
        target: [projectAiChatbotAnalyticsConfigs.chatbot_id],
        set: {
          llm_fallback_enabled: safeInput.data.llm_fallback_enabled,
          review_min_confidence: safeInput.data.review_min_confidence,
          updated_at: new Date(),
        },
      })
      .returning();
    return actionSuccess(rows[0]);
  } catch (error) {
    return actionError(
      error instanceof Error
        ? error.message
        : 'Failed to save chatbot analytics config.',
    );
  }
}

export async function getAnalyticsReviewAgentConfigByEnvironment(
  projectId: string,
  environmentId: string,
) {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const config = await getReviewAgentConfig(projectId, environmentId);
    const safe = analyticsReviewAgentConfigSchema.safeParse(
      config ?? {
        id: crypto.randomUUID(),
        project_id: projectId,
        environment_id: environmentId,
        provider: 'microsoft-foundry',
        provider_config: buildFoundryProviderConfig({}),
        enabled: false,
        taxonomy_version: 'v1',
        max_batch_size: 20,
        created_at: new Date(),
        updated_at: new Date(),
      },
    );
    if (!safe.success) {
      return actionZodError('Failed to parse review agent config.', safe.error);
    }
    return actionSuccess(safe.data);
  } catch (error) {
    return actionError(
      error instanceof Error
        ? error.message
        : 'Failed to fetch review agent config.',
    );
  }
}

export async function upsertAnalyticsReviewAgentConfig(input: {
  id?: string;
  project_id: string;
  environment_id: string;
  provider: 'microsoft-foundry';
  project_endpoint?: string | null;
  provider_agent_id?: string | null;
  enabled: boolean;
  taxonomy_version: string;
  max_batch_size: number;
}) {
  const access = await getProjectAccess(input.project_id, true);
  if ('success' in access && !access.success) {
    return access;
  }
  const safeInput = analyticsReviewAgentConfigInputSchema.safeParse(input);
  if (!safeInput.success) {
    return actionZodError(
      'Failed to parse review agent config.',
      safeInput.error,
    );
  }

  try {
    const rows = await db
      .insert(projectAiAnalyticsReviewAgentConfigs)
      .values({
        project_id: safeInput.data.project_id,
        environment_id: safeInput.data.environment_id,
        provider: safeInput.data.provider,
        provider_config: buildFoundryProviderConfig({
          project_endpoint: safeInput.data.project_endpoint,
          agent_id: safeInput.data.provider_agent_id,
        }),
        enabled: safeInput.data.enabled,
        taxonomy_version: safeInput.data.taxonomy_version,
        max_batch_size: safeInput.data.max_batch_size,
      })
      .onConflictDoUpdate({
        target: [projectAiAnalyticsReviewAgentConfigs.environment_id],
        set: {
          provider: safeInput.data.provider,
          provider_config: buildFoundryProviderConfig({
            project_endpoint: safeInput.data.project_endpoint,
            agent_id: safeInput.data.provider_agent_id,
          }),
          enabled: safeInput.data.enabled,
          taxonomy_version: safeInput.data.taxonomy_version,
          max_batch_size: safeInput.data.max_batch_size,
          updated_at: new Date(),
        },
      })
      .returning();
    return actionSuccess(rows[0]);
  } catch (error) {
    return actionError(
      error instanceof Error
        ? error.message
        : 'Failed to save review agent config.',
    );
  }
}

export async function getChatbotTopicRuleSetWithRules(
  projectId: string,
  chatbotId: string,
) {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const [ruleSet, rules] = await Promise.all([
      getTopicRuleSet(chatbotId),
      getTopicRules(chatbotId),
    ]);

    return actionSuccess({
      ruleSet: ruleSet ? chatbotTopicRuleSetSchema.parse(ruleSet) : null,
      rules: rules.map((rule) => chatbotTopicRuleSchema.parse(rule)),
    });
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : 'Failed to fetch topic rules.',
    );
  }
}

export async function upsertChatbotTopicRuleSet(input: {
  id?: string;
  project_id: string;
  environment_id: string;
  chatbot_id: string;
  enabled: boolean;
  default_language: string;
  minimum_confidence: number;
}) {
  const access = await getProjectAccess(input.project_id, true);
  if ('success' in access && !access.success) {
    return access;
  }
  const safeInput = chatbotTopicRuleSetInputSchema.safeParse(input);
  if (!safeInput.success) {
    return actionZodError('Failed to parse topic rule set.', safeInput.error);
  }
  try {
    const rows = await db
      .insert(projectAiChatbotTopicRuleSets)
      .values(safeInput.data)
      .onConflictDoUpdate({
        target: [projectAiChatbotTopicRuleSets.chatbot_id],
        set: {
          enabled: safeInput.data.enabled,
          default_language: safeInput.data.default_language,
          minimum_confidence: safeInput.data.minimum_confidence,
          updated_at: new Date(),
        },
      })
      .returning();
    return actionSuccess(rows[0]);
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : 'Failed to save topic rule set.',
    );
  }
}

export async function upsertChatbotTopicRule(input: {
  id?: string;
  project_id: string;
  environment_id: string;
  chatbot_id: string;
  rule_set_id: string;
  topic_key: string;
  label: string;
  language: string;
  keywords: string[];
  negative_keywords: string[];
  priority: number;
  enabled: boolean;
}) {
  const access = await getProjectAccess(input.project_id, true);
  if ('success' in access && !access.success) {
    return access;
  }
  const safeInput = chatbotTopicRuleInputSchema.safeParse(input);
  if (!safeInput.success) {
    return actionZodError('Failed to parse topic rule.', safeInput.error);
  }
  try {
    const rows = safeInput.data.id
      ? await db
          .update(projectAiChatbotTopicRules)
          .set({ ...safeInput.data, updated_at: new Date() })
          .where(eq(projectAiChatbotTopicRules.id, safeInput.data.id))
          .returning()
      : await db
          .insert(projectAiChatbotTopicRules)
          .values(safeInput.data)
          .returning();
    return actionSuccess(rows[0]);
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : 'Failed to save topic rule.',
    );
  }
}

export async function deleteChatbotTopicRule(
  projectId: string,
  ruleId: string,
) {
  const access = await getProjectAccess(projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }
  try {
    const rows = await db
      .delete(projectAiChatbotTopicRules)
      .where(eq(projectAiChatbotTopicRules.id, ruleId))
      .returning();
    return actionSuccess(rows[0] ?? null);
  } catch (error) {
    return actionError(
      error instanceof Error ? error.message : 'Failed to delete topic rule.',
    );
  }
}

export async function getChatbotAnalyticsDashboard(
  projectId: string,
  chatbotId: string,
  from: Date,
  to: Date,
) {
  const access = await getProjectAccess(projectId);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    const [chatbot, overview, timeseries, breakdown, sessions, queueHealth] =
      await Promise.all([
        getChatbotById(projectId, chatbotId),
        getChatbotAnalyticsOverview(chatbotId, from, to),
        getChatbotTimeseries(chatbotId, from, to),
        getTopicBreakdown(chatbotId, from, to),
        getRecentChatbotSessions(chatbotId),
        getQueueHealth(chatbotId),
      ]);

    if (!chatbot) {
      return actionError('Chatbot not found.');
    }

    return actionSuccess({
      chatbot,
      overview: chatbotAnalyticsOverviewSchema.parse(overview),
      timeseries: chatbotTimeseriesPointSchema.array().parse(timeseries),
      breakdown: chatbotBreakdownItemSchema.array().parse(breakdown),
      sessions: chatbotRecentSessionSchema.array().parse(
        sessions.map((session) => ({
          id: session.id,
          started_at: session.started_at.toISOString(),
          last_activity_at: session.last_activity_at.toISOString(),
          duration_seconds: session.duration_seconds,
          request_count: session.request_count,
          user_message_count: session.user_message_count,
          total_tokens: session.total_tokens,
          detected_language: session.detected_language,
          topic_tags: Array.isArray(session.topic_tags)
            ? session.topic_tags.map(String)
            : [],
          intent_tags: Array.isArray(session.intent_tags)
            ? session.intent_tags.map(String)
            : [],
          sentiment: session.sentiment,
          resolution_state: session.resolution_state,
          classification_source: session.classification_source,
        })),
      ),
      queueHealth: chatbotQueueHealthSchema.parse(queueHealth),
    });
  } catch (error) {
    return actionError(
      error instanceof Error
        ? error.message
        : 'Failed to load chatbot analytics.',
    );
  }
}

export async function processChatbotUnmatchedReviewBatch(input: {
  projectId: string;
  environmentId: string;
  chatbotId?: string;
  limit?: number;
}) {
  const access = await getProjectAccess(input.projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }
  try {
    return actionSuccess(await processChatbotUnmatchedReviewJob(input));
  } catch (error) {
    return actionError(
      error instanceof Error
        ? error.message
        : 'Failed to process unmatched conversations.',
    );
  }
}

export async function finalizeStaleChatbotSessions(input: {
  projectId: string;
  environmentId: string;
  chatbotId?: string;
  staleAfterMinutes?: number;
  limit?: number;
}) {
  const access = await getProjectAccess(input.projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    return actionSuccess(await finalizeStaleChatbotSessionsJob(input));
  } catch (error) {
    return actionError(
      error instanceof Error
        ? error.message
        : 'Failed to finalize stale sessions.',
    );
  }
}

export async function cleanupChatbotAnalyticsData(input: {
  projectId: string;
  pruneExpiredQueue?: boolean;
}) {
  const access = await getProjectAccess(input.projectId, true);
  if ('success' in access && !access.success) {
    return access;
  }

  try {
    return actionSuccess(await cleanupChatbotAnalyticsJob(input));
  } catch (error) {
    return actionError(
      error instanceof Error
        ? error.message
        : 'Failed to clean analytics data.',
    );
  }
}
