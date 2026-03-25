export interface ChatbotDemoMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatbotDemoRequest {
  messages: ChatbotDemoMessage[];
  conversationId?: string;
}

export interface ChatbotDemoHandlerResult {
  status: number;
  body: unknown;
}

export interface ChatbotDemoValidationOptions {
  maxMessageCharacters?: number;
}

export interface ChatbotDemoRequestEnvelope extends ChatbotDemoRequest {
  metrics: {
    messageCount: number;
    totalCharacters: number;
    latestUserCharacters: number;
  };
}

export function handleChatbotDemoRequest(
  body: unknown,
  options: ChatbotDemoValidationOptions = {},
): ChatbotDemoHandlerResult {
  if (!body || typeof body !== 'object') {
    return { status: 400, body: { error: 'Request body is required.' } };
  }

  const req = body as Record<string, unknown>;
  const normalizedMessages = Array.isArray(req.messages)
    ? req.messages
    : typeof req.message === 'string' && req.message.trim()
      ? [{ role: 'user', content: req.message.trim() }]
      : null;

  if (!normalizedMessages || normalizedMessages.length === 0) {
    return {
      status: 400,
      body: {
        error:
          "Request body must include a non-empty 'messages' array or a 'message' string.",
      },
    };
  }

  for (const message of normalizedMessages) {
    if (!message || typeof message !== 'object') {
      return {
        status: 400,
        body: { error: 'Each message must be an object.' },
      };
    }

    const candidate = message as Record<string, unknown>;
    if (
      (candidate.role !== 'user' && candidate.role !== 'assistant') ||
      typeof candidate.content !== 'string' ||
      !candidate.content.trim()
    ) {
      return {
        status: 400,
        body: {
          error:
            "Each message must have a valid 'role' ('user' or 'assistant') and a non-empty 'content' string.",
        },
      };
    }
  }

  const totalCharacters = normalizedMessages.reduce((sum, message) => {
    const candidate = message as Record<string, unknown>;
    return sum + String(candidate.content).trim().length;
  }, 0);
  const latestUser = [...normalizedMessages]
    .reverse()
    .find(
      (message) =>
        (message as Record<string, unknown>).role === 'user' &&
        typeof (message as Record<string, unknown>).content === 'string',
    ) as Record<string, unknown> | undefined;
  const latestUserCharacters = latestUser
    ? String(latestUser.content).trim().length
    : 0;

  if (
    options.maxMessageCharacters &&
    totalCharacters > options.maxMessageCharacters
  ) {
    return {
      status: 413,
      body: {
        error: `Message exceeds the configured size limit of ${options.maxMessageCharacters} characters.`,
      },
    };
  }

  return {
    status: 200,
    body: {
      messages: normalizedMessages as ChatbotDemoMessage[],
      conversationId:
        typeof req.conversationId === 'string' ? req.conversationId : undefined,
      metrics: {
        messageCount: normalizedMessages.length,
        totalCharacters,
        latestUserCharacters,
      },
    } satisfies ChatbotDemoRequestEnvelope,
  };
}
