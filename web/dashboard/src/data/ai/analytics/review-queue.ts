import { and, eq, inArray, lte } from 'drizzle-orm';
import { db } from '@/db';
import { projectAiChatbotUnmatchedReviews } from '@/data/ai/schema';
import { redactAnalyticsText } from './redaction';

export async function enqueueUnmatchedReview(input: {
  projectId: string;
  environmentId: string;
  chatbotId: string;
  sessionId: string;
  eventId?: string | null;
  detectedLanguage?: string | null;
  firstUserMessage: string;
  secondUserMessage?: string | null;
  assistantExcerpt?: string | null;
  matchFailureReason: string;
}) {
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const rows = await db
    .insert(projectAiChatbotUnmatchedReviews)
    .values({
      project_id: input.projectId,
      environment_id: input.environmentId,
      chatbot_id: input.chatbotId,
      session_id: input.sessionId,
      event_id: input.eventId || null,
      detected_language: input.detectedLanguage || null,
      first_user_message: redactAnalyticsText(input.firstUserMessage, 500),
      second_user_message: input.secondUserMessage
        ? redactAnalyticsText(input.secondUserMessage, 500)
        : null,
      assistant_excerpt: input.assistantExcerpt
        ? redactAnalyticsText(input.assistantExcerpt, 350)
        : null,
      match_failure_reason: input.matchFailureReason,
      expires_at: expiresAt,
    })
    .returning();
  return rows[0] ?? null;
}

export async function getPendingReviewForSession(sessionId: string) {
  const rows = await db
    .select()
    .from(projectAiChatbotUnmatchedReviews)
    .where(
      and(
        eq(projectAiChatbotUnmatchedReviews.session_id, sessionId),
        inArray(projectAiChatbotUnmatchedReviews.status, ['pending', 'failed']),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function markReviewsExpired(limit = 500) {
  const now = new Date();
  const rows = await db
    .select({ id: projectAiChatbotUnmatchedReviews.id })
    .from(projectAiChatbotUnmatchedReviews)
    .where(
      and(
        inArray(projectAiChatbotUnmatchedReviews.status, ['pending', 'failed']),
        lte(projectAiChatbotUnmatchedReviews.expires_at, now),
      ),
    )
    .limit(limit);
  if (!rows.length) {
    return 0;
  }
  await db
    .update(projectAiChatbotUnmatchedReviews)
    .set({
      status: 'expired',
      first_user_message: '',
      second_user_message: null,
      assistant_excerpt: null,
      updated_at: now,
    })
    .where(
      inArray(
        projectAiChatbotUnmatchedReviews.id,
        rows.map((row) => row.id),
      ),
    );
  return rows.length;
}

export async function deleteExpiredReviews(limit = 500) {
  const rows = await db
    .select({ id: projectAiChatbotUnmatchedReviews.id })
    .from(projectAiChatbotUnmatchedReviews)
    .where(eq(projectAiChatbotUnmatchedReviews.status, 'expired'))
    .limit(limit);
  if (!rows.length) {
    return 0;
  }
  await db.delete(projectAiChatbotUnmatchedReviews).where(
    inArray(
      projectAiChatbotUnmatchedReviews.id,
      rows.map((row) => row.id),
    ),
  );
  return rows.length;
}
