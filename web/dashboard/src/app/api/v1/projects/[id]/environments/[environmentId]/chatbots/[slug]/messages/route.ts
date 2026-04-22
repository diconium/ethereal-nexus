import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { HttpStatus } from '@/app/api/utils';
import { db } from '@/db';
import {
  projectAiChatbotApiSettings,
  projectAiChatbots,
  projectAiChatbotStats,
} from '@/data/ai/schema';
import { DEFAULT_CHATBOT_API_SETTINGS_VALUES } from '@/data/ai/chatbot-api-settings';
import { and, eq, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import {
  buildIdentityResolution,
  checkRateLimit,
  getClientIp,
  getCounterState,
  getSessionCookieIdentifier,
  getTemporaryBlock,
  incrementUsageCounter,
  registerViolationAndMaybeBlock,
} from '@/lib/rate-limit';
import {
  handleChatbotDemoRequest,
  type ChatbotDemoRequestEnvelope,
} from '@/lib/chatbot-demo-api/route-handler';
import { chatWithChatbotAgent } from '@/lib/chatbot-demo-api/agent';
import { classifyConversationWithRules } from '@/data/ai/analytics/classifier-rules';
import {
  getChatbotAnalyticsConfig,
  getTopicRules,
  getTopicRuleSet,
} from '@/data/ai/analytics/queries';
import {
  recordChatbotAnalyticsEvent,
  resolveChatbotSession,
  updateChatbotSessionClassification,
  updateChatbotSessionRollup,
} from '@/data/ai/analytics/session';
import {
  enqueueUnmatchedReview,
  getPendingReviewForSession,
} from '@/data/ai/analytics/review-queue';

type RouteContext = {
  params: Promise<{
    id: string;
    environmentId: string;
    slug: string;
  }>;
};

async function recordChatbotStat(input: {
  projectId: string;
  environmentId: string;
  chatbotId: string;
  success?: boolean;
  rateLimited?: boolean;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}) {
  const now = new Date();

  await db
    .insert(projectAiChatbotStats)
    .values({
      project_id: input.projectId,
      environment_id: input.environmentId,
      chatbot_id: input.chatbotId,
      request_count: 1,
      success_count: input.success ? 1 : 0,
      error_count: input.success === false && !input.rateLimited ? 1 : 0,
      rate_limited_count: input.rateLimited ? 1 : 0,
      total_input_tokens: input.inputTokens ?? 0,
      total_output_tokens: input.outputTokens ?? 0,
      total_tokens: input.totalTokens ?? 0,
      total_latency_ms: input.latencyMs ?? 0,
      last_request_at: now,
      last_success_at: input.success ? now : null,
      last_error_at: input.success === false && !input.rateLimited ? now : null,
      last_rate_limited_at: input.rateLimited ? now : null,
    })
    .onConflictDoUpdate({
      target: [projectAiChatbotStats.chatbot_id],
      set: {
        request_count: sql`${projectAiChatbotStats.request_count} + 1`,
        success_count: sql`${projectAiChatbotStats.success_count} + ${
          input.success ? 1 : 0
        }`,
        error_count: sql`${projectAiChatbotStats.error_count} + ${
          input.success === false && !input.rateLimited ? 1 : 0
        }`,
        rate_limited_count: sql`${projectAiChatbotStats.rate_limited_count} + ${
          input.rateLimited ? 1 : 0
        }`,
        total_input_tokens: sql`${projectAiChatbotStats.total_input_tokens} + ${
          input.inputTokens ?? 0
        }`,
        total_output_tokens: sql`${projectAiChatbotStats.total_output_tokens} + ${
          input.outputTokens ?? 0
        }`,
        total_tokens: sql`${projectAiChatbotStats.total_tokens} + ${
          input.totalTokens ?? 0
        }`,
        total_latency_ms: sql`${projectAiChatbotStats.total_latency_ms} + ${
          input.latencyMs ?? 0
        }`,
        last_request_at: now,
        last_success_at: input.success
          ? now
          : projectAiChatbotStats.last_success_at,
        last_error_at:
          input.success === false && !input.rateLimited
            ? now
            : projectAiChatbotStats.last_error_at,
        last_rate_limited_at: input.rateLimited
          ? now
          : projectAiChatbotStats.last_rate_limited_at,
        updated_at: now,
      },
    });
}

async function enqueueReviewIfEligible(input: {
  reviewEligible: boolean;
  projectId: string;
  environmentId: string;
  chatbotId: string;
  sessionId: string;
  eventId: string;
  userMessages: string[];
  assistantExcerpt: string;
  slug: string;
}) {
  if (!input.reviewEligible) {
    return;
  }

  const existingReview = await getPendingReviewForSession(input.sessionId);
  if (existingReview) {
    return;
  }

  await enqueueUnmatchedReview({
    projectId: input.projectId,
    environmentId: input.environmentId,
    chatbotId: input.chatbotId,
    sessionId: input.sessionId,
    eventId: input.eventId,
    firstUserMessage: input.userMessages[0] || '',
    secondUserMessage: input.userMessages[1] || null,
    assistantExcerpt: input.assistantExcerpt,
    matchFailureReason: 'no-topic-rule-match',
  });

  logger.info('Queued unmatched chatbot session for fallback review', {
    route: 'chatbot-messages-legacy',
    projectId: input.projectId,
    environmentId: input.environmentId,
    slug: input.slug,
    chatbotId: input.chatbotId,
    sessionId: input.sessionId,
    userMessageCount: input.userMessages.length,
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: projectId, environmentId, slug } = await context.params;
  const clientIp = getClientIp(request);

  logger.info('Chatbot demo message request received', {
    route: 'chatbot-messages-legacy',
    projectId,
    environmentId,
    slug,
    method: request.method,
    clientIp,
  });

  const rows = await db
    .select()
    .from(projectAiChatbots)
    .where(
      and(
        eq(projectAiChatbots.project_id, projectId),
        eq(projectAiChatbots.environment_id, environmentId),
        eq(projectAiChatbots.slug, slug),
      ),
    )
    .limit(1);

  const chatbot = rows[0];

  if (!chatbot) {
    logger.warn('Chatbot message target not found', {
      route: 'chatbot-messages-legacy',
      projectId,
      environmentId,
      slug,
    });

    return NextResponse.json(
      { error: 'Chatbot not found.' },
      { status: HttpStatus.NOT_FOUND },
    );
  }

  if (!chatbot.enabled) {
    logger.warn('Disabled chatbot message target requested', {
      route: 'chatbot-messages-legacy',
      projectId,
      environmentId,
      slug,
      chatbotId: chatbot.id,
    });

    return NextResponse.json(
      { error: 'Chatbot not found.' },
      { status: HttpStatus.NOT_FOUND },
    );
  }

  const settingRows = await db
    .select()
    .from(projectAiChatbotApiSettings)
    .where(eq(projectAiChatbotApiSettings.chatbot_id, chatbot.id))
    .limit(1);

  const chatbotApiSettings =
    settingRows[0] ?? DEFAULT_CHATBOT_API_SETTINGS_VALUES;

  const identityResolution = buildIdentityResolution(request, {
    useIp: chatbotApiSettings.rate_limit_use_ip,
    useSessionCookie: chatbotApiSettings.rate_limit_use_session_cookie,
    useFingerprint: chatbotApiSettings.rate_limit_use_fingerprint,
    fingerprintHeaderName: chatbotApiSettings.fingerprint_header_name,
  });
  const sessionIdentityKey = getSessionCookieIdentifier(request);
  const ipIdentityKey = `ip:${clientIp}`;

  if (chatbotApiSettings.temporary_block_enabled) {
    for (const identity of identityResolution.identities) {
      const block = await getTemporaryBlock(
        `${projectId}:${environmentId}:${slug}:${identity.key}`,
      );

      if (block.blocked) {
        await recordChatbotStat({
          projectId,
          environmentId,
          chatbotId: chatbot.id,
          success: false,
          rateLimited: true,
        });

        return NextResponse.json(
          { error: 'Too many requests. Temporary block active.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(block.resetSeconds),
            },
          },
        );
      }
    }
  }

  if (chatbotApiSettings.rate_limit_enabled) {
    for (const identity of identityResolution.identities) {
      const rateLimit = await checkRateLimit({
        key: `${projectId}:${environmentId}:${slug}:${identity.key}:window`,
        limit: chatbotApiSettings.rate_limit_max_requests,
        windowSeconds: chatbotApiSettings.rate_limit_window_seconds,
      });

      if (!rateLimit.allowed) {
        if (chatbotApiSettings.temporary_block_enabled) {
          await registerViolationAndMaybeBlock({
            key: `${projectId}:${environmentId}:${slug}:${identity.key}`,
            threshold: chatbotApiSettings.temporary_block_violation_threshold,
            violationWindowSeconds:
              chatbotApiSettings.temporary_block_window_seconds,
            blockDurationSeconds:
              chatbotApiSettings.temporary_block_duration_seconds,
          });
        }

        await recordChatbotStat({
          projectId,
          environmentId,
          chatbotId: chatbot.id,
          success: false,
          rateLimited: true,
        });

        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(rateLimit.resetSeconds),
              'X-RateLimit-Limit': String(
                chatbotApiSettings.rate_limit_max_requests,
              ),
              'X-RateLimit-Remaining': String(rateLimit.remaining),
              'X-RateLimit-Reset': String(rateLimit.resetSeconds),
            },
          },
        );
      }
    }
  }

  try {
    const requestStart = Date.now();
    const rawText = await request.text();
    const requestBodyBytes = Buffer.byteLength(rawText, 'utf8');

    if (
      chatbotApiSettings.message_size_limit_enabled &&
      requestBodyBytes > chatbotApiSettings.max_request_body_bytes
    ) {
      if (chatbotApiSettings.temporary_block_enabled) {
        for (const identity of identityResolution.identities) {
          await registerViolationAndMaybeBlock({
            key: `${projectId}:${environmentId}:${slug}:${identity.key}`,
            threshold: chatbotApiSettings.temporary_block_violation_threshold,
            violationWindowSeconds:
              chatbotApiSettings.temporary_block_window_seconds,
            blockDurationSeconds:
              chatbotApiSettings.temporary_block_duration_seconds,
          });
        }
      }

      await recordChatbotStat({
        projectId,
        environmentId,
        chatbotId: chatbot.id,
        success: false,
        latencyMs: Date.now() - requestStart,
      });

      return NextResponse.json(
        { error: 'Request body exceeds the configured size limit.' },
        { status: 413 },
      );
    }

    let rawBody: unknown;
    try {
      rawBody = rawText ? JSON.parse(rawText) : null;
    } catch {
      await recordChatbotStat({
        projectId,
        environmentId,
        chatbotId: chatbot.id,
        success: false,
        latencyMs: Date.now() - requestStart,
      });

      return NextResponse.json(
        { error: 'Request body must be valid JSON.' },
        { status: 400 },
      );
    }

    const handled = handleChatbotDemoRequest(rawBody, {
      maxMessageCharacters: chatbotApiSettings.message_size_limit_enabled
        ? chatbotApiSettings.max_message_characters
        : undefined,
    });

    if (handled.status !== 200) {
      if (chatbotApiSettings.temporary_block_enabled) {
        for (const identity of identityResolution.identities) {
          await registerViolationAndMaybeBlock({
            key: `${projectId}:${environmentId}:${slug}:${identity.key}`,
            threshold: chatbotApiSettings.temporary_block_violation_threshold,
            violationWindowSeconds:
              chatbotApiSettings.temporary_block_window_seconds,
            blockDurationSeconds:
              chatbotApiSettings.temporary_block_duration_seconds,
          });
        }
      }

      await recordChatbotStat({
        projectId,
        environmentId,
        chatbotId: chatbot.id,
        success: false,
        latencyMs: Date.now() - requestStart,
      });

      return NextResponse.json(handled.body, { status: handled.status });
    }

    const body = handled.body as ChatbotDemoRequestEnvelope;
    const userMessages = body.messages
      .filter((message) => message.role === 'user')
      .map((message) => message.content.trim())
      .filter(Boolean);
    const rawSessionKey =
      sessionIdentityKey ||
      identityResolution.identities[0]?.key ||
      ipIdentityKey;
    const sessionKey = createHash('sha256')
      .update(`${chatbot.id}:${rawSessionKey}`)
      .digest('hex');
    const { session } = await resolveChatbotSession({
      projectId,
      environmentId,
      chatbotId: chatbot.id,
      conversationId: body.conversationId,
      sessionKey,
      identitySource: sessionIdentityKey
        ? 'session'
        : identityResolution.usedFingerprint
          ? 'fingerprint'
          : 'ip',
    });
    const requestEvent = await recordChatbotAnalyticsEvent({
      projectId,
      environmentId,
      chatbotId: chatbot.id,
      sessionId: session.id,
      eventType: 'request',
      statusCode: 200,
      requestBodyBytes,
      messageCount: body.metrics.messageCount,
      latestUserCharacters: body.metrics.latestUserCharacters,
      success: true,
    });
    await updateChatbotSessionRollup({
      sessionId: session.id,
      requestCountDelta: 1,
      userMessageCountDelta: 1,
      secondUserMessageSeen: userMessages.length >= 2,
    });

    let reviewEligible = false;
    if (userMessages.length >= 1) {
      const [topicRuleSet, topicRules, analyticsConfig] = await Promise.all([
        getTopicRuleSet(chatbot.id),
        getTopicRules(chatbot.id),
        getChatbotAnalyticsConfig(chatbot.id),
      ]);

      const ruleResult = classifyConversationWithRules({
        firstUserMessage: userMessages[0] || '',
        secondUserMessage: userMessages[1] || null,
        rules: topicRuleSet?.enabled ? topicRules : [],
        defaultLanguage: topicRuleSet?.default_language,
      });

      const hasConfidentRuleMatch =
        Boolean(topicRuleSet?.enabled) &&
        ruleResult.matched &&
        ruleResult.confidence >= (topicRuleSet?.minimum_confidence ?? 60);

      if (hasConfidentRuleMatch) {
        await updateChatbotSessionClassification({
          sessionId: session.id,
          topicTags: ruleResult.topicTags,
          intentTags: ruleResult.intentTags,
          sentiment: ruleResult.sentiment,
          resolutionState: ruleResult.resolutionState,
          classificationSource: ruleResult.source,
          classificationConfidence: ruleResult.confidence,
          detectedLanguage: ruleResult.detectedLanguage,
        });
      } else if (
        analyticsConfig?.llm_fallback_enabled &&
        userMessages.length >= 2
      ) {
        reviewEligible = true;
        await updateChatbotSessionClassification({
          sessionId: session.id,
          topicTags: [],
          intentTags: ruleResult.intentTags,
          sentiment: ruleResult.sentiment,
          resolutionState: ruleResult.resolutionState,
          classificationSource: 'rules',
          classificationConfidence: ruleResult.confidence,
          detectedLanguage: ruleResult.detectedLanguage,
        });
      }
    }

    const sessionCapIdentityKey = sessionIdentityKey || rawSessionKey;
    if (chatbotApiSettings.session_request_cap_enabled) {
      if (sessionCapIdentityKey) {
        const sessionCap = await checkRateLimit({
          key: `${projectId}:${environmentId}:${slug}:session:${sessionCapIdentityKey}:session-cap`,
          limit: chatbotApiSettings.session_request_cap_max_requests,
          windowSeconds: chatbotApiSettings.session_request_cap_window_seconds,
        });

        if (!sessionCap.allowed) {
          if (chatbotApiSettings.temporary_block_enabled) {
            await registerViolationAndMaybeBlock({
              key: `${projectId}:${environmentId}:${slug}:session:${sessionCapIdentityKey}`,
              threshold: chatbotApiSettings.temporary_block_violation_threshold,
              violationWindowSeconds:
                chatbotApiSettings.temporary_block_window_seconds,
              blockDurationSeconds:
                chatbotApiSettings.temporary_block_duration_seconds,
            });
          }

          await recordChatbotStat({
            projectId,
            environmentId,
            chatbotId: chatbot.id,
            success: false,
            rateLimited: true,
            latencyMs: Date.now() - requestStart,
          });

          return NextResponse.json(
            { error: 'Session request cap exceeded. Please try again later.' },
            {
              status: 429,
              headers: {
                'Retry-After': String(sessionCap.resetSeconds),
                'X-Ethereal-Limit-Type': 'session-cap',
                'X-Ethereal-Limit': String(
                  chatbotApiSettings.session_request_cap_max_requests,
                ),
                'X-Ethereal-Current': String(sessionCap.current),
                'X-Ethereal-Remaining': String(sessionCap.remaining),
                'X-Ethereal-Reset': String(sessionCap.resetSeconds),
              },
            },
          );
        }
      }
    }

    if (chatbotApiSettings.ip_daily_token_budget_enabled) {
      const tokenBudgetState = await getCounterState(
        `${projectId}:${environmentId}:${slug}:${ipIdentityKey}:daily-tokens`,
      );

      if (
        tokenBudgetState.current >= chatbotApiSettings.ip_daily_token_budget
      ) {
        await recordChatbotStat({
          projectId,
          environmentId,
          chatbotId: chatbot.id,
          success: false,
          rateLimited: true,
          latencyMs: Date.now() - requestStart,
        });

        return NextResponse.json(
          { error: 'Daily token budget exceeded. Please try again later.' },
          {
            status: 429,
            headers: {
              'Retry-After': String(tokenBudgetState.resetSeconds || 86400),
              'X-Ethereal-Limit-Type': 'daily-token-budget',
              'X-Ethereal-Limit': String(
                chatbotApiSettings.ip_daily_token_budget,
              ),
              'X-Ethereal-Current': String(tokenBudgetState.current),
              'X-Ethereal-Remaining': String(
                Math.max(
                  0,
                  chatbotApiSettings.ip_daily_token_budget -
                    tokenBudgetState.current,
                ),
              ),
              'X-Ethereal-Reset': String(
                tokenBudgetState.resetSeconds || 86400,
              ),
            },
          },
        );
      }
    }

    const response = await chatWithChatbotAgent(chatbot, body);
    const latencyMs = Date.now() - requestStart;

    await recordChatbotAnalyticsEvent({
      projectId,
      environmentId,
      chatbotId: chatbot.id,
      sessionId: session.id,
      eventType: 'response',
      statusCode: 200,
      latencyMs,
      messageCount: body.metrics.messageCount,
      latestUserCharacters: body.metrics.latestUserCharacters,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      totalTokens: response.usage.totalTokens,
      success: true,
    });
    await updateChatbotSessionRollup({
      sessionId: session.id,
      assistantMessageCountDelta: 1,
      inputTokensDelta: response.usage.inputTokens,
      outputTokensDelta: response.usage.outputTokens,
      totalTokensDelta: response.usage.totalTokens,
      latencyMsDelta: latencyMs,
    });

    if (chatbotApiSettings.ip_daily_token_budget_enabled) {
      if (ipIdentityKey) {
        const tokenBudget = await incrementUsageCounter({
          key: `${projectId}:${environmentId}:${slug}:${ipIdentityKey}:daily-tokens`,
          amount: response.usage.totalTokens,
          limit: chatbotApiSettings.ip_daily_token_budget,
          windowSeconds: 86400,
        });

        if (tokenBudget.current > chatbotApiSettings.ip_daily_token_budget) {
          if (chatbotApiSettings.temporary_block_enabled) {
            await registerViolationAndMaybeBlock({
              key: `${projectId}:${environmentId}:${slug}:${ipIdentityKey}`,
              threshold: chatbotApiSettings.temporary_block_violation_threshold,
              violationWindowSeconds:
                chatbotApiSettings.temporary_block_window_seconds,
              blockDurationSeconds:
                chatbotApiSettings.temporary_block_duration_seconds,
            });
          }
        }
      }
    }

    await recordChatbotStat({
      projectId,
      environmentId,
      chatbotId: chatbot.id,
      success: true,
      latencyMs,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      totalTokens: response.usage.totalTokens,
    });

    await enqueueReviewIfEligible({
      reviewEligible,
      projectId,
      environmentId,
      chatbotId: chatbot.id,
      sessionId: session.id,
      eventId: requestEvent.id,
      userMessages,
      assistantExcerpt: response.reply,
      slug,
    });

    return NextResponse.json({
      reply: response.reply,
      conversationId: response.conversationId,
    });
  } catch (error) {
    await recordChatbotStat({
      projectId,
      environmentId,
      chatbotId: chatbot.id,
      success: false,
    });

    logger.error('Failed to invoke chatbot agent', error as Error, {
      route: 'chatbot-messages-legacy',
      projectId,
      environmentId,
      slug,
    });

    return NextResponse.json(
      { error: 'Failed to invoke the configured chatbot agent.' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }
}
