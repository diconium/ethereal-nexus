import { and, asc, desc, eq, lte } from 'drizzle-orm';
import { db } from '@/db';
import { classifyChatbotConversationWithFoundry } from '@/data/ai/analytics/classifier-review';
import {
  deleteExpiredReviews,
  markReviewsExpired,
} from '@/data/ai/analytics/review-queue';
import { finalizeChatbotSession } from '@/data/ai/analytics/session';
import {
  getChatbotAnalyticsConfig,
  getChatbotById,
  getReviewAgentConfig,
} from '@/data/ai/analytics/queries';
import {
  projectAiChatbotSessions,
  projectAiChatbotUnmatchedReviews,
} from '@/data/ai/schema';

export async function processChatbotUnmatchedReviewJob(input: {
  projectId: string;
  environmentId: string;
  chatbotId?: string;
  limit?: number;
}) {
  const reviewAgentConfig = await getReviewAgentConfig(
    input.projectId,
    input.environmentId,
  );
  if (!reviewAgentConfig?.enabled) {
    return {
      scanned: 0,
      eligible: 0,
      classified: 0,
      skipped: 0,
      failed: 0,
      expired: 0,
      details: [],
    };
  }

  const conditions = [
    eq(projectAiChatbotUnmatchedReviews.project_id, input.projectId),
    eq(projectAiChatbotUnmatchedReviews.environment_id, input.environmentId),
    eq(projectAiChatbotUnmatchedReviews.status, 'pending'),
  ];
  if (input.chatbotId) {
    conditions.push(
      eq(projectAiChatbotUnmatchedReviews.chatbot_id, input.chatbotId),
    );
  }

  const rows = await db
    .select()
    .from(projectAiChatbotUnmatchedReviews)
    .where(and(...conditions))
    .orderBy(asc(projectAiChatbotUnmatchedReviews.created_at))
    .limit(
      Math.min(
        input.limit ?? reviewAgentConfig.max_batch_size,
        reviewAgentConfig.max_batch_size,
      ),
    );

  let classified = 0;
  let skipped = 0;
  let failed = 0;
  const details: Array<{
    queueId: string;
    chatbotId: string;
    status: string;
    reason?: string;
    confidence?: number;
  }> = [];

  for (const row of rows) {
    const chatbotConfig = await getChatbotAnalyticsConfig(row.chatbot_id);
    if (!chatbotConfig?.llm_fallback_enabled) {
      skipped += 1;
      details.push({
        queueId: row.id,
        chatbotId: row.chatbot_id,
        status: 'skipped',
        reason: 'llm-fallback-disabled',
      });
      continue;
    }
    const chatbot = await getChatbotById(input.projectId, row.chatbot_id);
    if (!chatbot) {
      failed += 1;
      details.push({
        queueId: row.id,
        chatbotId: row.chatbot_id,
        status: 'failed',
        reason: 'chatbot-not-found',
      });
      continue;
    }

    try {
      const review = await classifyChatbotConversationWithFoundry({
        config: reviewAgentConfig,
        chatbotName: chatbot.name,
        detectedLanguage: row.detected_language,
        firstUserMessage: row.first_user_message,
        secondUserMessage: row.second_user_message,
        assistantExcerpt: row.assistant_excerpt,
      });

      await finalizeChatbotSession({
        sessionId: row.session_id,
        topicTags: review.topic_tags,
        intentTags: review.intent_tags,
        sentiment: review.sentiment,
        resolutionState: review.resolution_state,
        classificationSource: 'llm',
        classificationConfidence: Math.round(review.confidence * 100),
      });

      await db
        .update(projectAiChatbotUnmatchedReviews)
        .set({
          status: 'classified',
          classification_source: 'llm',
          classification_confidence: Math.round(review.confidence * 100),
          last_reviewed_at: new Date(),
          classified_at: new Date(),
          first_user_message: '',
          second_user_message: null,
          assistant_excerpt: null,
          updated_at: new Date(),
        })
        .where(eq(projectAiChatbotUnmatchedReviews.id, row.id));

      classified += 1;
      details.push({
        queueId: row.id,
        chatbotId: row.chatbot_id,
        status: 'classified',
        confidence: review.confidence,
      });
    } catch (error) {
      failed += 1;
      await db
        .update(projectAiChatbotUnmatchedReviews)
        .set({
          status: 'failed',
          review_attempts: row.review_attempts + 1,
          last_reviewed_at: new Date(),
          error_message:
            error instanceof Error ? error.message : 'Classification failed.',
          updated_at: new Date(),
        })
        .where(eq(projectAiChatbotUnmatchedReviews.id, row.id));
      details.push({
        queueId: row.id,
        chatbotId: row.chatbot_id,
        status: 'failed',
        reason:
          error instanceof Error ? error.message : 'classification-failed',
      });
    }
  }

  return {
    scanned: rows.length,
    eligible: rows.length,
    classified,
    skipped,
    failed,
    expired: 0,
    details,
  };
}

export async function finalizeStaleChatbotSessionsJob(input: {
  projectId: string;
  environmentId: string;
  chatbotId?: string;
  staleAfterMinutes?: number;
  limit?: number;
}) {
  const staleAfterMinutes = input.staleAfterMinutes ?? 30;
  const threshold = new Date(Date.now() - staleAfterMinutes * 60 * 1000);
  const conditions = [
    eq(projectAiChatbotSessions.project_id, input.projectId),
    eq(projectAiChatbotSessions.environment_id, input.environmentId),
    lte(projectAiChatbotSessions.last_activity_at, threshold),
  ];
  if (input.chatbotId) {
    conditions.push(eq(projectAiChatbotSessions.chatbot_id, input.chatbotId));
  }
  const rows = await db
    .select()
    .from(projectAiChatbotSessions)
    .where(and(...conditions))
    .orderBy(desc(projectAiChatbotSessions.last_activity_at))
    .limit(input.limit ?? 100);

  let reclassified = 0;
  for (const row of rows) {
    const fallbackResolution =
      row.request_count > 0 ? 'unresolved' : 'abandoned';
    await finalizeChatbotSession({
      sessionId: row.id,
      resolutionState:
        row.resolution_state === 'unknown'
          ? fallbackResolution
          : row.resolution_state,
      sentiment: row.sentiment,
      topicTags: Array.isArray(row.topic_tags)
        ? row.topic_tags.map(String)
        : [],
      intentTags: Array.isArray(row.intent_tags)
        ? row.intent_tags.map(String)
        : [],
      classificationSource: row.classification_source,
      classificationConfidence: row.classification_confidence,
    });
    reclassified += 1;
  }

  return {
    scanned: rows.length,
    finalized: rows.length,
    skipped: 0,
    reclassified,
  };
}

export async function cleanupChatbotAnalyticsJob(input: {
  pruneExpiredQueue?: boolean;
}) {
  const expiredQueueRowsExpired = input.pruneExpiredQueue
    ? await markReviewsExpired()
    : 0;
  const expiredQueueRowsDeleted = input.pruneExpiredQueue
    ? await deleteExpiredReviews()
    : 0;
  return { expiredQueueRowsDeleted, expiredQueueRowsExpired };
}
