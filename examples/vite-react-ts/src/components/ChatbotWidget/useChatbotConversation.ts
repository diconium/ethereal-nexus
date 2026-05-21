import { useEffect, useMemo, useRef, useState } from 'react';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  richContentHtml?: string;
  createdAt: string;
  status: 'complete' | 'streaming' | 'error';
  error?: string;
};

type DemoResponse = {
  reply?: string;
  message?: string;
  text?: string;
  content?: string;
  response?: string;
  output_text?: string;
  html?: string;
  markup?: string;
  componentMarkup?: string;
  conversationId?: string;
};

type UseChatbotConversationOptions = {
  apiUrl?: string;
  initialAssistantMessage: string;
};

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `chat-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function createMessage(
  role: ChatRole,
  content: string,
  overrides: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: createId(),
    role,
    content,
    createdAt: new Date().toISOString(),
    status: 'complete',
    ...overrides,
  };
}

function readAssistantMessage(payload: unknown) {
  if (typeof payload === 'string') {
    return {
      text: payload,
      richContentHtml: undefined,
    };
  }

  if (!payload || typeof payload !== 'object') {
    return {
      text: 'The chatbot returned an unexpected response.',
      richContentHtml: undefined,
    };
  }

  const candidate = payload as Record<string, unknown>;
  const direct =
    candidate.message ??
    candidate.reply ??
    candidate.text ??
    candidate.content ??
    candidate.response ??
    candidate.output_text;
  const richContentCandidate =
    candidate.html ?? candidate.markup ?? candidate.componentMarkup;

  const text =
    typeof direct === 'string' && direct.trim()
      ? direct
      : JSON.stringify(payload, null, 2);

  return {
    text,
    richContentHtml:
      typeof richContentCandidate === 'string' && richContentCandidate.trim()
        ? richContentCandidate
        : undefined,
  };
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function useChatbotConversation({
  apiUrl,
  initialAssistantMessage,
}: UseChatbotConversationOptions) {
  const initialMessages = useMemo(
    () => [createMessage('assistant', initialAssistantMessage)],
    [initialAssistantMessage],
  );
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const endRef = useRef<HTMLDivElement | null>(null);
  const hasApiUrl = Boolean(apiUrl?.trim());

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const submitMessage = async (rawValue?: string) => {
    const value = (rawValue ?? draft).trim();
    if (!value || isLoading || !hasApiUrl || !apiUrl) {
      return;
    }

    const userMessage = createMessage('user', value);
    const assistantMessageId = createId();
    const history = [...messages, userMessage];

    setDraft('');
    setError(null);
    setIsLoading(true);
    setMessages([
      ...history,
      createMessage('assistant', '', {
        id: assistantMessageId,
        status: 'streaming',
      }),
    ]);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: history.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          conversationId,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json')
        ? ((await response.json()) as DemoResponse)
        : await response.text();

      if (!response.ok) {
        throw new Error(readAssistantMessage(payload));
      }

      const reply = readAssistantMessage(payload);
      const nextConversationId =
        payload &&
        typeof payload === 'object' &&
        'conversationId' in payload &&
        typeof payload.conversationId === 'string'
          ? payload.conversationId
          : conversationId;

      setConversationId(nextConversationId);
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: reply.text,
                richContentHtml: reply.richContentHtml,
                status: 'complete',
                error: undefined,
              }
            : message,
        ),
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Failed to reach the chatbot service.';

      setError(message);
      setConversationId(undefined);
      setMessages((current) =>
        current.map((entry) =>
          entry.id === assistantMessageId
            ? {
                ...entry,
                content: message,
                status: 'error',
                error: message,
              }
            : entry,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    setMessages(initialMessages);
    setDraft('');
    setError(null);
    setConversationId(undefined);
  };

  return {
    messages,
    draft,
    setDraft,
    isLoading,
    error,
    conversationId,
    hasApiUrl,
    endRef,
    submitMessage,
    clearConversation,
  };
}
