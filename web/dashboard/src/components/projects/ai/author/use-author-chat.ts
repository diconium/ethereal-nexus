'use client';

import { useCallback, useState } from 'react';
import {
  callAuthorChat,
  parseAgentReply,
} from '@ethereal-nexus/dialog-ui-core';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface RequestHistoryEntry {
  id: string;
  timestamp: string;
  requestBody: unknown;
  response: { reply: string; conversationId: string } | null;
  error: string | null;
  durationMs: number;
}

let counter = 0;
function uid() {
  return `msg-${Date.now()}-${++counter}`;
}

function safeParseJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

function getTypingChunkSize(wordCount: number) {
  if (wordCount > 180) {
    return 16;
  }

  if (wordCount > 80) {
    return 8;
  }

  if (wordCount > 32) {
    return 4;
  }

  return 1;
}

export function useAuthorChat({
  getDialogJson,
  getValuesJson,
  onValuesUpdate,
  apiUrl,
  authorDialogId,
}: {
  getDialogJson: () => string;
  getValuesJson: () => string;
  onValuesUpdate: (value: string) => void;
  apiUrl: string;
  authorDialogId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestHistory, setRequestHistory] = useState<RequestHistoryEntry[]>(
    [],
  );

  const sendMessage = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || isStreaming) {
        return;
      }

      setError(null);
      const userMessage: ChatMessage = {
        id: uid(),
        role: 'user',
        content: trimmed,
      };
      setMessages((current) => [...current, userMessage]);
      setIsStreaming(true);

      const assistantId = uid();
      setMessages((current) => [
        ...current,
        { id: assistantId, role: 'assistant', content: '' },
      ]);

      const requestBody = {
        authorDialogId,
        messages: [{ role: 'user' as const, content: trimmed }],
        conversationId,
        context: {
          values: safeParseJson(getValuesJson()),
          dialogDefinition: conversationId
            ? undefined
            : safeParseJson(getDialogJson()),
        },
      };

      const startTime = Date.now();
      const historyId = uid();

      try {
        const response = await callAuthorChat(requestBody, apiUrl);
        setConversationId(response.conversationId);
        setRequestHistory((current) => [
          {
            id: historyId,
            timestamp: new Date().toLocaleTimeString(),
            requestBody,
            response,
            error: null,
            durationMs: Date.now() - startTime,
          },
          ...current,
        ]);

        const { message, updatedValues } = parseAgentReply(response.reply);
        if (updatedValues !== null) {
          onValuesUpdate(JSON.stringify(updatedValues, null, 2));
        }

        const words = message.split(' ');
        const chunkSize = getTypingChunkSize(words.length);
        for (let index = 0; index < words.length; index += chunkSize) {
          const snapshot = words.slice(0, index + chunkSize).join(' ');
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, content: snapshot }
                : message,
            ),
          );
          if (index + chunkSize < words.length) {
            await new Promise((resolve) => setTimeout(resolve, 14));
          }
        }
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to reach author agent.';
        setError(message);
        setRequestHistory((current) => [
          {
            id: historyId,
            timestamp: new Date().toLocaleTimeString(),
            requestBody,
            response: null,
            error: message,
            durationMs: Date.now() - startTime,
          },
          ...current,
        ]);
        setMessages((current) =>
          current.filter((item) => item.id !== assistantId),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [
      apiUrl,
      authorDialogId,
      conversationId,
      getDialogJson,
      getValuesJson,
      isStreaming,
      onValuesUpdate,
    ],
  );

  return {
    messages,
    isStreaming,
    error,
    setError,
    requestHistory,
    clearConversation: () => {
      setMessages([]);
      setConversationId(undefined);
      setError(null);
    },
    sendMessage,
  };
}
