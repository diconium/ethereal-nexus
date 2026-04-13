import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import {
  projectAiAnalyticsReviewAgentConfigs,
  projectAiChatbotAnalyticsConfigs,
  projectAiChatbotEvents,
  projectAiChatbots,
  projectAiChatbotSessions,
  projectAiChatbotTopicRules,
  projectAiChatbotTopicRuleSets,
  projectAiChatbotUnmatchedReviews,
} from '@/data/ai/schema';

export async function getChatbotAnalyticsConfig(chatbotId: string) {
  const rows = await db
    .select()
    .from(projectAiChatbotAnalyticsConfigs)
    .where(eq(projectAiChatbotAnalyticsConfigs.chatbot_id, chatbotId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getReviewAgentConfig(
  projectId: string,
  environmentId: string,
) {
  const rows = await db
    .select()
    .from(projectAiAnalyticsReviewAgentConfigs)
    .where(
      and(
        eq(projectAiAnalyticsReviewAgentConfigs.project_id, projectId),
        eq(projectAiAnalyticsReviewAgentConfigs.environment_id, environmentId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getTopicRuleSet(chatbotId: string) {
  const rows = await db
    .select()
    .from(projectAiChatbotTopicRuleSets)
    .where(eq(projectAiChatbotTopicRuleSets.chatbot_id, chatbotId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getTopicRules(chatbotId: string) {
  return db
    .select()
    .from(projectAiChatbotTopicRules)
    .where(eq(projectAiChatbotTopicRules.chatbot_id, chatbotId))
    .orderBy(asc(projectAiChatbotTopicRules.priority));
}

export async function getChatbotAnalyticsOverview(
  chatbotId: string,
  from: Date,
  to: Date,
) {
  const rows = await db
    .select()
    .from(projectAiChatbotSessions)
    .where(
      and(
        eq(projectAiChatbotSessions.chatbot_id, chatbotId),
        gte(projectAiChatbotSessions.started_at, from),
        lte(projectAiChatbotSessions.started_at, to),
      ),
    );

  const sessionCount = rows.length;
  const requestCount = rows.reduce((sum, row) => sum + row.request_count, 0);
  const durationTotal = rows.reduce(
    (sum, row) => sum + row.duration_seconds,
    0,
  );
  const turnsTotal = rows.reduce((sum, row) => sum + row.user_message_count, 0);
  const tokens = rows.reduce((sum, row) => sum + row.total_tokens, 0);
  const resolved = rows.filter(
    (row) => row.resolution_state === 'resolved',
  ).length;
  const unmatched = rows.filter(
    (row) => row.classification_confidence < 60,
  ).length;

  return {
    chatbot_id: chatbotId,
    session_count: sessionCount,
    request_count: requestCount,
    avg_duration_seconds: sessionCount ? durationTotal / sessionCount : 0,
    avg_turns_per_session: sessionCount ? turnsTotal / sessionCount : 0,
    success_rate: sessionCount ? resolved / sessionCount : 0,
    total_tokens: tokens,
    unmatched_rate: sessionCount ? unmatched / sessionCount : 0,
  };
}

export async function getChatbotTimeseries(
  chatbotId: string,
  from: Date,
  to: Date,
) {
  const sessions = await db
    .select()
    .from(projectAiChatbotSessions)
    .where(
      and(
        eq(projectAiChatbotSessions.chatbot_id, chatbotId),
        gte(projectAiChatbotSessions.started_at, from),
        lte(projectAiChatbotSessions.started_at, to),
      ),
    )
    .orderBy(asc(projectAiChatbotSessions.started_at));

  const points = new Map<
    string,
    {
      sessions: number;
      requests: number;
      total_tokens: number;
      rate_limited: number;
      topic_counts: Record<string, number>;
    }
  >();
  for (const session of sessions) {
    const bucket = new Date(session.started_at);
    bucket.setMinutes(0, 0, 0);
    const key = bucket.toISOString();
    const point = points.get(key) ?? {
      sessions: 0,
      requests: 0,
      total_tokens: 0,
      rate_limited: 0,
      topic_counts: {},
    };
    point.sessions += 1;
    if (Array.isArray(session.topic_tags) && session.topic_tags.length > 0) {
      for (const tag of session.topic_tags) {
        const topicKey = String(tag);
        point.topic_counts[topicKey] = (point.topic_counts[topicKey] ?? 0) + 1;
      }
    }
    point.requests += session.request_count;
    point.total_tokens += session.total_tokens;
    point.rate_limited += session.rate_limited_count;
    points.set(key, point);
  }

  return Array.from(points.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({
      date,
      ...value,
    }));
}

export async function getRecentChatbotSessions(chatbotId: string, limit = 20) {
  return db
    .select()
    .from(projectAiChatbotSessions)
    .where(eq(projectAiChatbotSessions.chatbot_id, chatbotId))
    .orderBy(desc(projectAiChatbotSessions.last_activity_at))
    .limit(limit);
}

export async function getTopicBreakdown(
  chatbotId: string,
  from: Date,
  to: Date,
) {
  const rows = await db
    .select()
    .from(projectAiChatbotSessions)
    .where(
      and(
        eq(projectAiChatbotSessions.chatbot_id, chatbotId),
        gte(projectAiChatbotSessions.started_at, from),
        lte(projectAiChatbotSessions.started_at, to),
      ),
    );
  const counts = new Map<string, number>();
  for (const row of rows) {
    const tags = Array.isArray(row.topic_tags) ? row.topic_tags : [];
    for (const tag of tags) {
      counts.set(String(tag), (counts.get(String(tag)) ?? 0) + 1);
    }
  }
  const total = rows.length || 1;
  return Array.from(counts.entries())
    .map(([key, count]) => ({
      key,
      label: key,
      count,
      percentage: count / total,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export async function getQueueHealth(chatbotId: string) {
  const [rows, sessions] = await Promise.all([
    db
      .select()
      .from(projectAiChatbotUnmatchedReviews)
      .where(eq(projectAiChatbotUnmatchedReviews.chatbot_id, chatbotId)),
    db
      .select()
      .from(projectAiChatbotSessions)
      .where(eq(projectAiChatbotSessions.chatbot_id, chatbotId)),
  ]);
  const now = Date.now();
  const reviewedSessionIds = new Set(rows.map((row) => row.session_id));

  return {
    pending: rows.filter((row) => row.status === 'pending').length,
    failed: rows.filter((row) => row.status === 'failed').length,
    classified_last_24h: rows.filter(
      (row) =>
        row.classified_at &&
        now - new Date(row.classified_at).getTime() < 24 * 60 * 60 * 1000,
    ).length,
    expiring_soon: rows.filter(
      (row) =>
        row.status === 'pending' &&
        new Date(row.expires_at).getTime() - now < 6 * 60 * 60 * 1000,
    ).length,
    historical_eligible_unmatched: sessions.filter(
      (session) =>
        session.user_message_count >= 2 &&
        (!Array.isArray(session.topic_tags) ||
          session.topic_tags.length === 0) &&
        !reviewedSessionIds.has(session.id),
    ).length,
    awaiting_second_message: sessions.filter(
      (session) =>
        session.user_message_count < 2 &&
        (!Array.isArray(session.topic_tags) || session.topic_tags.length === 0),
    ).length,
  };
}

export async function getChatbotById(projectId: string, chatbotId: string) {
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
  return rows[0] ?? null;
}
