import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { HttpStatus } from '@/app/api/utils';
import { db } from '@/db';
import { projectAiAuthorDialogs } from '@/data/ai/schema';
import {
  sampleAuthorDialogDefinition,
  sampleAuthorValues,
} from '@/data/ai/sample-author-data';
import { callFoundryChat } from '@/lib/ai-providers/microsoft-foundry';
import { logger } from '@/lib/logger';
import {
  buildIdentityResolution,
  checkRateLimit,
  getClientIp,
  getTemporaryBlock,
  registerViolationAndMaybeBlock,
} from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const PUBLIC_AUTHOR_CHAT_LIMITS = {
  rateLimitMaxRequests: 20,
  rateLimitWindowSeconds: 60,
  maxMessageCharacters: 8000,
  maxRequestBodyBytes: 16000,
  temporaryBlockThreshold: 5,
  temporaryBlockWindowSeconds: 3600,
  temporaryBlockDurationSeconds: 1800,
};

type RouteContext = {
  params: Promise<{
    publicSlug: string;
  }>;
};

type PublicAuthorDialogRequest = {
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  conversationId?: string;
  context?: {
    dialogDefinition?: unknown;
    values?: unknown;
  };
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { publicSlug } = await context.params;
  const clientIp = getClientIp(request);
  const scopeKey = `author-dialog:${publicSlug}`;
  const identityResolution = buildIdentityResolution(request, {
    useIp: true,
    useSessionCookie: true,
    useFingerprint: false,
    fingerprintHeaderName: 'x-client-fingerprint',
  });

  for (const identity of identityResolution.identities) {
    const block = await getTemporaryBlock(`${scopeKey}:${identity.key}`);
    if (block.blocked) {
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

  for (const identity of identityResolution.identities) {
    const rateLimit = await checkRateLimit({
      key: `${scopeKey}:${identity.key}:window`,
      limit: PUBLIC_AUTHOR_CHAT_LIMITS.rateLimitMaxRequests,
      windowSeconds: PUBLIC_AUTHOR_CHAT_LIMITS.rateLimitWindowSeconds,
    });

    if (!rateLimit.allowed) {
      await registerViolationAndMaybeBlock({
        key: `${scopeKey}:${identity.key}`,
        threshold: PUBLIC_AUTHOR_CHAT_LIMITS.temporaryBlockThreshold,
        violationWindowSeconds:
          PUBLIC_AUTHOR_CHAT_LIMITS.temporaryBlockWindowSeconds,
        blockDurationSeconds:
          PUBLIC_AUTHOR_CHAT_LIMITS.temporaryBlockDurationSeconds,
      });

      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetSeconds),
          },
        },
      );
    }
  }

  const rawText = await request.text();
  const requestBodyBytes = Buffer.byteLength(rawText, 'utf8');
  if (requestBodyBytes > PUBLIC_AUTHOR_CHAT_LIMITS.maxRequestBodyBytes) {
    for (const identity of identityResolution.identities) {
      await registerViolationAndMaybeBlock({
        key: `${scopeKey}:${identity.key}`,
        threshold: PUBLIC_AUTHOR_CHAT_LIMITS.temporaryBlockThreshold,
        violationWindowSeconds:
          PUBLIC_AUTHOR_CHAT_LIMITS.temporaryBlockWindowSeconds,
        blockDurationSeconds:
          PUBLIC_AUTHOR_CHAT_LIMITS.temporaryBlockDurationSeconds,
      });
    }

    return NextResponse.json(
      { error: 'Request body exceeds the configured size limit.' },
      { status: 413 },
    );
  }

  let body: PublicAuthorDialogRequest | null = null;

  try {
    body = rawText ? (JSON.parse(rawText) as PublicAuthorDialogRequest) : null;
  } catch {
    return NextResponse.json(
      { error: 'Request body must be valid JSON.' },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  if (!body?.messages?.length) {
    return NextResponse.json(
      { error: 'messages are required.' },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  const totalCharacters = body.messages.reduce(
    (sum, message) => sum + message.content.length,
    0,
  );
  if (totalCharacters > PUBLIC_AUTHOR_CHAT_LIMITS.maxMessageCharacters) {
    for (const identity of identityResolution.identities) {
      await registerViolationAndMaybeBlock({
        key: `${scopeKey}:${identity.key}`,
        threshold: PUBLIC_AUTHOR_CHAT_LIMITS.temporaryBlockThreshold,
        violationWindowSeconds:
          PUBLIC_AUTHOR_CHAT_LIMITS.temporaryBlockWindowSeconds,
        blockDurationSeconds:
          PUBLIC_AUTHOR_CHAT_LIMITS.temporaryBlockDurationSeconds,
      });
    }

    return NextResponse.json(
      { error: 'Message payload exceeds the configured size limit.' },
      { status: 413 },
    );
  }

  const rows = await db
    .select()
    .from(projectAiAuthorDialogs)
    .where(
      and(
        eq(projectAiAuthorDialogs.public_slug, publicSlug),
        eq(projectAiAuthorDialogs.enabled, true),
      ),
    )
    .limit(1);

  const authorDialog = rows[0];
  if (!authorDialog) {
    return NextResponse.json(
      { error: 'Author dialog not found.' },
      { status: HttpStatus.NOT_FOUND },
    );
  }

  const latestUserMessage = [...body.messages]
    .reverse()
    .find((message) => message.role === 'user');
  if (!latestUserMessage) {
    return NextResponse.json(
      { error: 'A user message is required.' },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  const contextPreamble = [
    'You are an authoring assistant for structured dialog editing.',
    'Reply using exactly this format:',
    'MESSAGE:\n<short explanation>',
    'UPDATED_VALUES_JSON:\n<valid json>',
    'Only include UPDATED_VALUES_JSON when a values update is needed.',
    `Workspace system prompt: ${authorDialog.system_prompt}`,
    `Dialog definition: ${JSON.stringify(
      body.context?.dialogDefinition ?? sampleAuthorDialogDefinition,
    )}`,
    `Current values: ${JSON.stringify(
      body.context?.values ?? sampleAuthorValues,
    )}`,
  ].join('\n\n');

  try {
    switch (authorDialog.provider) {
      case 'microsoft-foundry': {
        const firstTurnContent = `${contextPreamble}\n\n${latestUserMessage.content}`;
        const response = await callFoundryChat({
          providerConfig: authorDialog.provider_config,
          messages: [
            {
              role: 'user',
              content: body.conversationId
                ? latestUserMessage.content
                : firstTurnContent,
            },
          ],
          conversationId: body.conversationId,
          loggerContext: {
            route: 'author-chat-public',
            publicSlug,
            authorDialogId: authorDialog.id,
          },
        });

        return NextResponse.json({
          reply: response.reply,
          conversationId: response.conversationId,
        });
      }
      default:
        return NextResponse.json(
          {
            error: `Unsupported author dialog provider: ${authorDialog.provider}`,
          },
          { status: HttpStatus.BAD_REQUEST },
        );
    }
  } catch (error) {
    logger.error('Failed to reach public author agent runtime', error as Error, {
      route: 'author-chat-public',
      publicSlug,
      clientIp,
      requestBodyBytes,
    });
    return NextResponse.json(
      { error: 'Failed to reach the author agent runtime.' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }
}
