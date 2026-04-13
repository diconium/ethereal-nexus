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
    publicSlug: string;
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

export async function POST(request: NextRequest, context: RouteContext) {
  const { publicSlug } = await context.params;
  const clientIp = getClientIp(request);

  logger.info('Chatbot demo message request received', {
    route: 'chatbot-messages-public',
    publicSlug,
    method: request.method,
    clientIp,
  });

  const rows = await db
    .select({
      chatbot: projectAiChatbots,
      settings: projectAiChatbotApiSettings,
    })
    .from(projectAiChatbots)
    .leftJoin(
      projectAiChatbotApiSettings,
      eq(projectAiChatbotApiSettings.chatbot_id, projectAiChatbots.id),
    )
    .where(eq(projectAiChatbots.public_slug, publicSlug))
    .limit(1);

  const row = rows[0];
  const chatbot = row?.chatbot;
  const chatbotApiSettings =
    row?.settings ?? DEFAULT_CHATBOT_API_SETTINGS_VALUES;

  if (!chatbot) {
    logger.warn('Chatbot message target not found', {
      route: 'chatbot-messages-public',
      publicSlug,
    });

    return NextResponse.json(
      { error: 'Chatbot not found.' },
      { status: HttpStatus.NOT_FOUND },
    );
  }

  if (!chatbot.enabled) {
    logger.warn('Disabled chatbot message target requested', {
      route: 'chatbot-messages-public',
      publicSlug,
      chatbotId: chatbot.id,
    });

    return NextResponse.json(
      { error: 'Chatbot not found.' },
      { status: HttpStatus.NOT_FOUND },
    );
  }

  const { project_id: projectId, environment_id: environmentId } = chatbot;
  const scopeKey = `${publicSlug}`;

  const identityResolution = buildIdentityResolution(request, {
    useIp: chatbotApiSettings.rate_limit_use_ip,
    useSessionCookie: chatbotApiSettings.rate_limit_use_session_cookie,
    useFingerprint: chatbotApiSettings.rate_limit_use_fingerprint,
    fingerprintHeaderName: chatbotApiSettings.fingerprint_header_name,
  });
  const sessionIdentityKey = getSessionCookieIdentifier(request);
  const ipIdentityKey = `ip:${clientIp}`;

  logger.debug('Chatbot protection identity resolved', {
    route: 'chatbot-messages-public',
    projectId,
    environmentId,
    publicSlug,
    usedIp: identityResolution.usedIp,
    usedSessionCookie: identityResolution.usedSessionCookie,
    usedFingerprint: identityResolution.usedFingerprint,
    identitySources: identityResolution.identities.map(
      (identity) => identity.source,
    ),
  });

  if (chatbotApiSettings.temporary_block_enabled) {
    for (const identity of identityResolution.identities) {
      const block = await getTemporaryBlock(`${scopeKey}:${identity.key}`);

      if (block.blocked) {
        await recordChatbotStat({
          projectId,
          environmentId,
          chatbotId: chatbot.id,
          success: false,
          rateLimited: true,
        });

        logger.warn('Chatbot request blocked temporarily', {
          route: 'chatbot-messages-public',
          projectId,
          environmentId,
          publicSlug,
          identitySource: identity.source,
          resetSeconds: block.resetSeconds,
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
        key: `${scopeKey}:${identity.key}:window`,
        limit: chatbotApiSettings.rate_limit_max_requests,
        windowSeconds: chatbotApiSettings.rate_limit_window_seconds,
      });

      logger.debug('Chatbot public rate limit evaluated', {
        route: 'chatbot-messages-public',
        projectId,
        environmentId,
        publicSlug,
        clientIp,
        identitySource: identity.source,
        allowed: rateLimit.allowed,
        current: rateLimit.current,
        remaining: rateLimit.remaining,
        resetSeconds: rateLimit.resetSeconds,
        limit: chatbotApiSettings.rate_limit_max_requests,
        windowSeconds: chatbotApiSettings.rate_limit_window_seconds,
      });

      if (!rateLimit.allowed) {
        if (chatbotApiSettings.temporary_block_enabled) {
          await registerViolationAndMaybeBlock({
            key: `${scopeKey}:${identity.key}`,
            threshold: chatbotApiSettings.temporary_block_violation_threshold,
            violationWindowSeconds:
              chatbotApiSettings.temporary_block_window_seconds,
            blockDurationSeconds:
              chatbotApiSettings.temporary_block_duration_seconds,
          });
        }

        logger.warn('Chatbot public rate limit exceeded', {
          route: 'chatbot-messages-public',
          projectId,
          environmentId,
          publicSlug,
          clientIp,
          identitySource: identity.source,
          current: rateLimit.current,
          limit: chatbotApiSettings.rate_limit_max_requests,
          resetSeconds: rateLimit.resetSeconds,
        });

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
            key: `${scopeKey}:${identity.key}`,
            threshold: chatbotApiSettings.temporary_block_violation_threshold,
            violationWindowSeconds:
              chatbotApiSettings.temporary_block_window_seconds,
            blockDurationSeconds:
              chatbotApiSettings.temporary_block_duration_seconds,
          });
        }
      }

      logger.warn('Chatbot request body exceeded byte limit', {
        route: 'chatbot-messages-public',
        projectId,
        environmentId,
        publicSlug,
        requestBodyBytes,
        limit: chatbotApiSettings.max_request_body_bytes,
      });

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
      logger.warn('Chatbot request body is not valid JSON', {
        route: 'chatbot-messages-public',
        projectId,
        environmentId,
        publicSlug,
        requestBodyBytes,
      });

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
            key: `${scopeKey}:${identity.key}`,
            threshold: chatbotApiSettings.temporary_block_violation_threshold,
            violationWindowSeconds:
              chatbotApiSettings.temporary_block_window_seconds,
            blockDurationSeconds:
              chatbotApiSettings.temporary_block_duration_seconds,
          });
        }
      }

      logger.warn('Chatbot demo request validation failed', {
        route: 'chatbot-messages-public',
        projectId,
        environmentId,
        publicSlug,
        clientIp,
        status: handled.status,
        requestBodyBytes,
      });

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
      body.conversationId ||
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
      identitySource: body.conversationId
        ? 'conversation'
        : sessionIdentityKey
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
      detectedLanguage: null,
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

    logger.debug('Chatbot request payload validated', {
      route: 'chatbot-messages-public',
      projectId,
      environmentId,
      publicSlug,
      requestBodyBytes,
      messageCount: body.metrics.messageCount,
      totalCharacters: body.metrics.totalCharacters,
      latestUserCharacters: body.metrics.latestUserCharacters,
    });

    if (chatbotApiSettings.session_request_cap_enabled) {
      if (sessionIdentityKey) {
        const sessionCap = await checkRateLimit({
          key: `${scopeKey}:session:${sessionIdentityKey}:session-cap`,
          limit: chatbotApiSettings.session_request_cap_max_requests,
          windowSeconds: chatbotApiSettings.session_request_cap_window_seconds,
        });

        if (!sessionCap.allowed) {
          if (chatbotApiSettings.temporary_block_enabled) {
            await registerViolationAndMaybeBlock({
              key: `${scopeKey}:session:${sessionIdentityKey}`,
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
        `${scopeKey}:${ipIdentityKey}:daily-tokens`,
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

    logger.info('Invoking chatbot agent through Azure AI Projects', {
      route: 'chatbot-messages-public',
      projectId,
      environmentId,
      publicSlug,
      projectEndpoint: chatbot.project_endpoint,
      requestBodyKeys:
        body && typeof body === 'object' ? Object.keys(body as object) : [],
      messageCount: body.metrics.messageCount,
      hasConversationId: Boolean(body.conversationId),
    });

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

    if (reviewEligible) {
      const existingReview = await getPendingReviewForSession(session.id);
      if (!existingReview) {
        await enqueueUnmatchedReview({
          projectId,
          environmentId,
          chatbotId: chatbot.id,
          sessionId: session.id,
          eventId: requestEvent.id,
          firstUserMessage: userMessages[0] || '',
          secondUserMessage: userMessages[1] || null,
          assistantExcerpt: response.reply,
          matchFailureReason: 'no-topic-rule-match',
        });

        logger.info('Queued unmatched chatbot session for fallback review', {
          route: 'chatbot-messages-public',
          projectId,
          environmentId,
          publicSlug,
          chatbotId: chatbot.id,
          sessionId: session.id,
          userMessageCount: userMessages.length,
        });
      }
    }

    if (chatbotApiSettings.ip_daily_token_budget_enabled) {
      if (ipIdentityKey) {
        const tokenBudget = await incrementUsageCounter({
          key: `${scopeKey}:${ipIdentityKey}:daily-tokens`,
          amount: response.usage.totalTokens,
          limit: chatbotApiSettings.ip_daily_token_budget,
          windowSeconds: 86400,
        });

        logger.debug('Chatbot IP token budget evaluated', {
          route: 'chatbot-messages-public',
          projectId,
          environmentId,
          publicSlug,
          identitySource: 'ip',
          totalTokens: response.usage.totalTokens,
          current: tokenBudget.current,
          remaining: tokenBudget.remaining,
          limit: chatbotApiSettings.ip_daily_token_budget,
          resetSeconds: tokenBudget.resetSeconds,
        });

        if (tokenBudget.current > chatbotApiSettings.ip_daily_token_budget) {
          if (chatbotApiSettings.temporary_block_enabled) {
            await registerViolationAndMaybeBlock({
              key: `${scopeKey}:${ipIdentityKey}`,
              threshold: chatbotApiSettings.temporary_block_violation_threshold,
              violationWindowSeconds:
                chatbotApiSettings.temporary_block_window_seconds,
              blockDurationSeconds:
                chatbotApiSettings.temporary_block_duration_seconds,
            });
          }

          logger.warn(
            'Chatbot daily token budget exceeded after current response',
            {
              route: 'chatbot-messages-public',
              projectId,
              environmentId,
              publicSlug,
              current: tokenBudget.current,
              limit: chatbotApiSettings.ip_daily_token_budget,
              resetSeconds: tokenBudget.resetSeconds,
            },
          );
        }
      }
    }

    logger.info('Chatbot agent response received', {
      route: 'chatbot-messages-public',
      projectId,
      environmentId,
      publicSlug,
      hasConversationId: Boolean(response.conversationId),
      replyLength: response.reply.length,
      tokenUsage: response.usage,
      latencyMs,
    });

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
      route: 'chatbot-messages-public',
      projectId,
      environmentId,
      publicSlug,
    });

    return NextResponse.json(
      { error: 'Failed to invoke the configured chatbot agent.' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }
}
