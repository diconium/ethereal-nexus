import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '@/db';
import {
  projectAiChatbotEvents,
  projectAiChatbotSessions,
} from '@/data/ai/schema';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export async function resolveChatbotSession(input: {
  projectId: string;
  environmentId: string;
  chatbotId: string;
  conversationId?: string | null;
  sessionKey: string;
  identitySource: string;
}) {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - SESSION_TIMEOUT_MS);
  const rows = await db
    .select()
    .from(projectAiChatbotSessions)
    .where(
      and(
        eq(projectAiChatbotSessions.chatbot_id, input.chatbotId),
        eq(projectAiChatbotSessions.session_key, input.sessionKey),
        gte(projectAiChatbotSessions.last_activity_at, staleThreshold),
      ),
    )
    .orderBy(desc(projectAiChatbotSessions.last_activity_at))
    .limit(1);

  if (rows[0]) {
    await db
      .update(projectAiChatbotSessions)
      .set({ last_activity_at: now, updated_at: now })
      .where(eq(projectAiChatbotSessions.id, rows[0].id));
    return { session: { ...rows[0], last_activity_at: now }, isNew: false };
  }

  const inserted = await db
    .insert(projectAiChatbotSessions)
    .values({
      project_id: input.projectId,
      environment_id: input.environmentId,
      chatbot_id: input.chatbotId,
      conversation_id: input.conversationId || null,
      session_key: input.sessionKey,
      identity_source: input.identitySource,
      started_at: now,
      last_activity_at: now,
    })
    .returning();

  return { session: inserted[0], isNew: true };
}

export async function recordChatbotAnalyticsEvent(input: {
  projectId: string;
  environmentId: string;
  chatbotId: string;
  sessionId: string;
  eventType: string;
  statusCode?: number | null;
  latencyMs?: number | null;
  requestBodyBytes?: number | null;
  messageCount?: number | null;
  latestUserCharacters?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  success?: boolean;
  rateLimited?: boolean;
  temporaryBlocked?: boolean;
}) {
  const rows = await db
    .insert(projectAiChatbotEvents)
    .values({
      session_id: input.sessionId,
      project_id: input.projectId,
      environment_id: input.environmentId,
      chatbot_id: input.chatbotId,
      event_type: input.eventType,
      status_code: input.statusCode ?? null,
      latency_ms: input.latencyMs ?? null,
      request_body_bytes: input.requestBodyBytes ?? null,
      message_count: input.messageCount ?? null,
      latest_user_characters: input.latestUserCharacters ?? null,
      input_tokens: input.inputTokens ?? 0,
      output_tokens: input.outputTokens ?? 0,
      total_tokens: input.totalTokens ?? 0,
      success: input.success ?? false,
      rate_limited: input.rateLimited ?? false,
      temporary_blocked: input.temporaryBlocked ?? false,
    })
    .returning();

  return rows[0];
}

export async function updateChatbotSessionRollup(input: {
  sessionId: string;
  detectedLanguage?: string | null;
  requestCountDelta?: number;
  userMessageCountDelta?: number;
  assistantMessageCountDelta?: number;
  errorCountDelta?: number;
  rateLimitedCountDelta?: number;
  inputTokensDelta?: number;
  outputTokensDelta?: number;
  totalTokensDelta?: number;
  latencyMsDelta?: number;
  secondUserMessageSeen?: boolean;
}) {
  const rows = await db
    .select()
    .from(projectAiChatbotSessions)
    .where(eq(projectAiChatbotSessions.id, input.sessionId))
    .limit(1);
  const session = rows[0];
  if (!session) {
    return null;
  }

  const now = new Date();
  const durationSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(session.started_at).getTime()) / 1000),
  );

  const updated = await db
    .update(projectAiChatbotSessions)
    .set({
      last_activity_at: now,
      duration_seconds: durationSeconds,
      request_count: session.request_count + (input.requestCountDelta ?? 0),
      user_message_count:
        session.user_message_count + (input.userMessageCountDelta ?? 0),
      assistant_message_count:
        session.assistant_message_count +
        (input.assistantMessageCountDelta ?? 0),
      error_count: session.error_count + (input.errorCountDelta ?? 0),
      rate_limited_count:
        session.rate_limited_count + (input.rateLimitedCountDelta ?? 0),
      total_input_tokens:
        session.total_input_tokens + (input.inputTokensDelta ?? 0),
      total_output_tokens:
        session.total_output_tokens + (input.outputTokensDelta ?? 0),
      total_tokens: session.total_tokens + (input.totalTokensDelta ?? 0),
      total_latency_ms: session.total_latency_ms + (input.latencyMsDelta ?? 0),
      detected_language: input.detectedLanguage || session.detected_language,
      second_user_message_at:
        input.secondUserMessageSeen && !session.second_user_message_at
          ? now
          : session.second_user_message_at,
      updated_at: now,
    })
    .where(eq(projectAiChatbotSessions.id, input.sessionId))
    .returning();

  return updated[0] ?? null;
}

export async function finalizeChatbotSession(input: {
  sessionId: string;
  resolutionState?: string;
  sentiment?: string;
  topicTags?: string[];
  intentTags?: string[];
  classificationSource?: string;
  classificationConfidence?: number;
}) {
  const rows = await db
    .update(projectAiChatbotSessions)
    .set({
      ended_at: new Date(),
      resolution_state: input.resolutionState,
      sentiment: input.sentiment,
      topic_tags: input.topicTags,
      intent_tags: input.intentTags,
      classification_source: input.classificationSource,
      classification_confidence: input.classificationConfidence,
      updated_at: new Date(),
    })
    .where(eq(projectAiChatbotSessions.id, input.sessionId))
    .returning();

  return rows[0] ?? null;
}

export async function updateChatbotSessionClassification(input: {
  sessionId: string;
  topicTags: string[];
  intentTags: string[];
  sentiment: string;
  resolutionState: string;
  classificationSource: string;
  classificationConfidence: number;
  detectedLanguage?: string | null;
}) {
  const rows = await db
    .update(projectAiChatbotSessions)
    .set({
      topic_tags: input.topicTags,
      intent_tags: input.intentTags,
      sentiment: input.sentiment,
      resolution_state: input.resolutionState,
      classification_source: input.classificationSource,
      classification_confidence: input.classificationConfidence,
      detected_language: input.detectedLanguage,
      updated_at: new Date(),
    })
    .where(eq(projectAiChatbotSessions.id, input.sessionId))
    .returning();

  return rows[0] ?? null;
}
