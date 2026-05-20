/**
 * Google Vertex AI Provider integration utilities and API functions.
 *
 * This module provides functions to interact with Google Vertex AI's Reasoning Engine and Session services.
 * It includes session management, error handling, payload extraction, and chat invocation logic.
 *
 * Main Exports:
 * - listVertexSessions: List all Vertex AI sessions for a given provider config.
 * - callVertexReasoningEngineChat: Send a chat message to Vertex AI and receive a response.
 *
 * Internal Utilities:
 * - Session and execution client management (with caching)
 * - Error formatting and detection helpers
 * - Payload extraction and normalization helpers
 * - Timeout handling for async operations
 *
 * Types:
 * - VertexSessionSummary: Summary of a Vertex AI session
 *
 * Usage:
 *   import { callVertexReasoningEngineChat } from './google-vertex';
 *   const result = await callVertexReasoningEngineChat({ ... });
 */

import {v1beta1} from '@google-cloud/aiplatform';
import {getVertexConfigOrThrow} from '@/data/ai/provider';
import {logger} from '@/lib/logger';
import {estimateTokenCount} from '@/lib/rate-limit';
import {decodeHttpBody, extractTextFromPayload, formatGoogleError} from "@/utils/extractor-utils";

type SessionServiceClient = v1beta1.SessionServiceClient;
type ReasoningEngineExecutionServiceClient = v1beta1.ReasoningEngineExecutionServiceClient;

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


const VERTEX_AI_PROVIDER = 'vertex-ai-google';

async function createSession(options: {
  sessionClient: SessionServiceClient;
  reasoningEnginePath: string;
  userId: string;
  loggerContext?: Record<string, unknown>;
}) {
  const sessionId = buildVertexSessionId();
  const vertexUserId = sessionId;

  logger.debug('Creating Vertex AI session', {
    provider: VERTEX_AI_PROVIDER,
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
    provider: VERTEX_AI_PROVIDER,
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
      provider: VERTEX_AI_PROVIDER,
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

  logger.debug('Starting Vertex AI reasoning engine chat request', {
    provider: VERTEX_AI_PROVIDER,
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
      provider: VERTEX_AI_PROVIDER,
      project: config.project,
      location: config.location,
      ...options.loggerContext,
    },
  });

  const sessionId = getSessionId(conversationId);

  logger.info('Resolved Vertex AI session', {
    provider: VERTEX_AI_PROVIDER,
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
        provider: VERTEX_AI_PROVIDER,
        project: config.project,
        location: config.location,
        conversationId,
        ...options.loggerContext,
      },
    });
  } catch (error) {
    if (options.conversationId && isVertexSessionOwnershipError(error)) {
      logger.warn('Vertex AI session ownership mismatch, creating new session', {
        provider: VERTEX_AI_PROVIDER,
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
          provider: VERTEX_AI_PROVIDER,
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
          provider: VERTEX_AI_PROVIDER,
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
    provider: VERTEX_AI_PROVIDER,
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
