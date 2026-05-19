import { createRequire } from 'node:module';
import type { v1beta1 as VertexV1beta1 } from '@google-cloud/aiplatform';
import { getVertexConfigOrThrow } from '@/data/ai/provider';
import { logger } from '@/lib/logger';
import { estimateTokenCount } from '@/lib/rate-limit';

const require = createRequire(import.meta.url);
const { v1beta1 } = require('@google-cloud/aiplatform') as {
  v1beta1: typeof VertexV1beta1;
};

type SessionServiceClient = VertexV1beta1.SessionServiceClient;
type ReasoningEngineExecutionServiceClient =
  VertexV1beta1.ReasoningEngineExecutionServiceClient;

const VERTEX_REQUEST_TIMEOUT_MS = 90_000;

type VertexClients = {
  sessionClient: SessionServiceClient;
  executionClient: ReasoningEngineExecutionServiceClient;
};

export type VertexSessionSummary = {
  name: string;
  userId: string;
};

const clientCache = new Map<string, VertexClients>();

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  message: string,
  context?: Record<string, unknown>,
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race<T>([
      operation,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
        logger.warn(message, context);
        reject(new Error(message));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function getClients(location: string): VertexClients {
  const cached = clientCache.get(location);
  if (cached) {
    return cached;
  }

  const apiEndpoint = `${location}-aiplatform.googleapis.com`;
  const clients = {
    sessionClient: new v1beta1.SessionServiceClient({ apiEndpoint }),
    executionClient: new v1beta1.ReasoningEngineExecutionServiceClient({
      apiEndpoint,
    }),
  };

  clientCache.set(location, clients);
  return clients;
}

function buildReasoningEnginePath(config: {
  project: string;
  location: string;
  reasoning_engine: string;
}) {
  return `projects/${config.project}/locations/${config.location}/reasoningEngines/${config.reasoning_engine}`;
}

function getSessionId(conversationId: string) {
  return conversationId.split('/').pop() || conversationId;
}

function sanitiseVertexIdentifier(value: string, maxLength: number) {
  const normalised = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength);

  const withLeadingLetter = /^[a-z]/.test(normalised)
    ? normalised
    : `u-${normalised}`;
  const trimmed = withLeadingLetter.slice(0, maxLength).replace(/-+$/g, '');

  return trimmed || 'u-default';
}

function buildVertexSessionId() {
  return sanitiseVertexIdentifier(`chatbot-${Date.now()}`, 63);
}

function formatGoogleError(error: unknown, fallbackMessage: string) {
  if (!(error instanceof Error)) {
    return new Error(fallbackMessage);
  }

  const candidate = error as Error & {
    code?: unknown;
    details?: unknown;
    metadata?: {
      getMap?: () => Record<string, unknown>;
    };
  };

  const code =
    typeof candidate.code === 'number' || typeof candidate.code === 'string'
      ? String(candidate.code)
      : null;
  const details =
    typeof candidate.details === 'string' && candidate.details.trim()
      ? candidate.details.trim()
      : null;
  const metadata = candidate.metadata?.getMap?.();
  const metadataSummary = metadata
    ? Object.entries(metadata)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join(', ')
    : '';

  const message = [
    fallbackMessage,
    candidate.message?.trim() && candidate.message !== 'undefined undefined'
      ? candidate.message.trim()
      : null,
    code ? `code=${code}` : null,
    details ? `details=${details}` : null,
    metadataSummary ? `metadata=${metadataSummary}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  return new Error(message);
}

function isVertexSessionOwnershipError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /does not belong to user/i.test(error.message);
}

function getLatestUserMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
) {
  return [...messages].reverse().find((message) => message.role === 'user');
}

function extractJsonBlock(text: string) {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/i);
  return match ? match[1].trim() : text;
}

function decodeHttpBody(response: {
  data?: Uint8Array | Buffer | string | null;
}) {
  if (!response.data) {
    return '';
  }

  return typeof response.data === 'string'
    ? response.data
    : Buffer.from(response.data).toString('utf8');
}

function normaliseExtractedText(text: string) {
  return text.replace(/\r\n/g, '\n').trim();
}

function extractTextFromParsedPayload(parsed: Record<string, unknown>) {
  const textCandidate = [
    parsed.error,
    parsed.message,
    parsed.question,
    parsed.answer,
  ].find((value) => typeof value === 'string' && value.trim()) as
    | string
    | undefined;

  if (!textCandidate) {
    return { text: '', isError: false };
  }

  const code = typeof parsed.code === 'number' ? parsed.code : null;
  const isError = code !== null && code >= 400;

  return {
    text: textCandidate.trim(),
    isError,
  };
}

function extractTextFromStructuredMessage(text: string) {
  const candidate = extractJsonBlock(text);

  try {
    const parsed = JSON.parse(candidate) as {
      code?: unknown;
      message?: unknown;
      error?: unknown;
      question?: unknown;
      answer?: unknown;
    };

    return extractTextFromParsedPayload(parsed as Record<string, unknown>);
  } catch {
    return { text: '', isError: false };
  }
}

function extractTextFromPayload(payload: string) {
  const trimmedPayload = payload.trim();
  if (!trimmedPayload) {
    return { text: '', isError: false };
  }

  try {
    const parsed = JSON.parse(trimmedPayload) as {
      code?: unknown;
      error?: unknown;
      message?: unknown;
      question?: unknown;
      answer?: unknown;
      content?: {
        parts?: Array<{ text?: unknown }>;
      };
    };

    const plainText = extractTextFromParsedPayload(
      parsed as Record<string, unknown>,
    );
    if (plainText.text) {
      return plainText;
    }

    const parts = parsed.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) {
      return { text: trimmedPayload, isError: false };
    }

    const extracted = parts
      .map((part) => {
        if (typeof part?.text !== 'string') {
          return { text: '', isError: false };
        }

        const structured = extractTextFromStructuredMessage(part.text);
        return structured.text
          ? structured
          : {
              text: normaliseExtractedText(part.text),
              isError: false,
            };
      })
      .filter((item) => item.text);

    const firstError = extracted.find((item) => item.isError);
    if (firstError) {
      return firstError;
    }

    return {
      text: extracted.map((item) => item.text).join('\n').trim(),
      isError: false,
    };
  } catch {
    return { text: normaliseExtractedText(trimmedPayload), isError: false };
  }
}

async function createSession(options: {
  sessionClient: SessionServiceClient;
  reasoningEnginePath: string;
  userId: string;
  loggerContext?: Record<string, unknown>;
}) {
  const sessionId = buildVertexSessionId();
  const vertexUserId = sessionId;

  logger.debug('Creating Vertex AI session', {
    provider: 'vertex-ai-google',
    reasoningEnginePath: options.reasoningEnginePath,
    sessionId,
    userIdLength: vertexUserId.length,
    ...options.loggerContext,
  });

  let operation: unknown;
  try {
    [operation] = await options.sessionClient.createSession({
      parent: options.reasoningEnginePath,
      session: {
        userId: vertexUserId,
      },
      sessionId,
    });
  } catch (error) {
    throw formatGoogleError(
      error,
      'Failed to create Vertex AI session.',
    );
  }

  let response: { name?: string | null };
  try {
    [response] = (await withTimeout(
      (operation as { promise: () => Promise<unknown> }).promise() as Promise<[
        { name?: string | null },
        unknown,
        unknown,
      ]>,
      VERTEX_REQUEST_TIMEOUT_MS,
      'Timed out while creating Vertex AI session.',
      options.loggerContext,
    )) as [{ name?: string | null }, unknown, unknown];
  } catch (error) {
    throw formatGoogleError(
      error,
      'Vertex AI session creation operation failed.',
    );
  }

  if (!response.name) {
    throw new Error('Vertex AI session was created without a name.');
  }

  return response.name;
}

export async function listVertexSessions(options: {
  providerConfig: unknown;
  loggerContext?: Record<string, unknown>;
}): Promise<VertexSessionSummary[]> {
  const config = getVertexConfigOrThrow(options.providerConfig);
  const reasoningEnginePath = buildReasoningEnginePath(config);
  const { sessionClient } = getClients(config.location);

  logger.info('Listing Vertex AI sessions', {
    provider: 'vertex-ai-google',
    project: config.project,
    location: config.location,
    reasoningEngine: config.reasoning_engine,
    ...options.loggerContext,
  });

  try {
    const iterable = sessionClient.listSessionsAsync({
      parent: reasoningEnginePath,
    });
    const sessions: VertexSessionSummary[] = [];

    for await (const session of iterable) {
      sessions.push({
        name: session.name || '',
        userId: session.userId || '',
      });
    }

    logger.info('Listed Vertex AI sessions', {
      provider: 'vertex-ai-google',
      project: config.project,
      location: config.location,
      reasoningEngine: config.reasoning_engine,
      sessionCount: sessions.length,
      ...options.loggerContext,
    });

    return sessions;
  } catch (error) {
    throw formatGoogleError(error, 'Failed to list Vertex AI sessions.');
  }
}

async function resolveConversation(options: {
  sessionClient: SessionServiceClient;
  reasoningEnginePath: string;
  conversationId?: string;
  userId: string;
  loggerContext?: Record<string, unknown>;
}) {
  if (options.conversationId) {
    return options.conversationId;
  }

  return createSession(options);
}

async function collectReplyFromStream(
  stream: ReturnType<
    ReasoningEngineExecutionServiceClient['streamQueryReasoningEngine']
  >,
) {
  const chunks: string[] = [];

  await new Promise<void>((resolve, reject) => {
    stream.on('data', (response) => {
      const body = decodeHttpBody(response);
      const extracted = extractTextFromPayload(body);
      if (extracted.isError) {
        reject(new Error(extracted.text));
        return;
      }
      if (extracted.text) {
        chunks.push(extracted.text);
      }
    });
    stream.on('error', (error) => {
      reject(error);
    });
    stream.on('end', () => {
      resolve();
    });
  });

  return chunks.join('\n').trim();
}

async function queryReasoningEngine(options: {
  executionClient: ReasoningEngineExecutionServiceClient;
  reasoningEnginePath: string;
  sessionId: string;
  userId: string;
  message: string;
  loggerContext?: Record<string, unknown>;
}) {
  const stream = options.executionClient.streamQueryReasoningEngine({
    name: options.reasoningEnginePath,
    classMethod: 'async_stream_query',
    input: {
      fields: {
        message: { stringValue: options.message },
        session_id: { stringValue: options.sessionId },
        user_id: { stringValue: options.userId },
      },
    },
  });

  return withTimeout(
    collectReplyFromStream(stream),
    VERTEX_REQUEST_TIMEOUT_MS,
    'Timed out while waiting for Vertex AI reasoning engine response.',
    options.loggerContext,
  );
}

export async function callVertexReasoningEngineChat(options: {
  providerConfig: unknown;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  conversationId?: string;
  userId?: string;
  loggerContext?: Record<string, unknown>;
}) {
  const config = getVertexConfigOrThrow(options.providerConfig);
  const latestUserMessage = getLatestUserMessage(options.messages);

  if (!latestUserMessage) {
    throw new Error('Vertex AI request requires at least one user message.');
  }

  const userId = options.userId?.trim();
  if (!userId) {
    throw new Error('Vertex AI request requires a stable user ID.');
  }

  const reasoningEnginePath = buildReasoningEnginePath(config);
  const { sessionClient, executionClient } = getClients(config.location);

  logger.info('Starting Vertex AI reasoning engine chat request', {
    provider: 'vertex-ai-google',
    project: config.project,
    location: config.location,
    reasoningEngine: config.reasoning_engine,
    hasConversationId: Boolean(options.conversationId),
    messageCount: options.messages.length,
    ...options.loggerContext,
  });

  const conversationId = await resolveConversation({
    sessionClient,
    reasoningEnginePath,
    conversationId: options.conversationId,
    userId,
    loggerContext: {
      provider: 'vertex-ai-google',
      project: config.project,
      location: config.location,
      ...options.loggerContext,
    },
  });
  const sessionId = getSessionId(conversationId);

  logger.info('Resolved Vertex AI session', {
    provider: 'vertex-ai-google',
    project: config.project,
    location: config.location,
    conversationId,
    sessionId,
    ...options.loggerContext,
  });

  let reply: string;
  let finalConversationId = conversationId;
  let finalSessionId = sessionId;
  try {
    reply = await queryReasoningEngine({
      executionClient,
      reasoningEnginePath,
      sessionId,
      userId: sessionId,
      message: latestUserMessage.content,
      loggerContext: {
        provider: 'vertex-ai-google',
        project: config.project,
        location: config.location,
        conversationId,
        ...options.loggerContext,
      },
    });
  } catch (error) {
    if (options.conversationId && isVertexSessionOwnershipError(error)) {
      logger.warn('Vertex AI session ownership mismatch, creating new session', {
        provider: 'vertex-ai-google',
        project: config.project,
        location: config.location,
        conversationId: options.conversationId,
        ...options.loggerContext,
      });

      finalConversationId = await createSession({
        sessionClient,
        reasoningEnginePath,
        userId,
        loggerContext: {
          provider: 'vertex-ai-google',
          project: config.project,
          location: config.location,
          recoveryFromConversationId: options.conversationId,
          ...options.loggerContext,
        },
      });
      finalSessionId = getSessionId(finalConversationId);

      reply = await queryReasoningEngine({
        executionClient,
        reasoningEnginePath,
        sessionId: finalSessionId,
        userId: finalSessionId,
        message: latestUserMessage.content,
        loggerContext: {
          provider: 'vertex-ai-google',
          project: config.project,
          location: config.location,
          conversationId: finalConversationId,
          recoveredFromConversationId: options.conversationId,
          ...options.loggerContext,
        },
      });
    } else {
      throw formatGoogleError(
        error,
        'Vertex AI reasoning engine query failed.',
      );
    }
  }

  if (!reply) {
    throw new Error('Vertex AI reasoning engine returned an empty response.');
  }

  logger.info('Received Vertex AI reasoning engine response', {
    provider: 'vertex-ai-google',
    project: config.project,
    location: config.location,
    conversationId: finalConversationId,
    sessionId: finalSessionId,
    replyLength: reply.length,
    ...options.loggerContext,
  });

  const inputTokens = estimateTokenCount(latestUserMessage.content);
  const outputTokens = estimateTokenCount(reply);

  return {
    reply,
    conversationId: finalConversationId,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
    },
  };
}
