'use client';

import { useCallback, useRef, useState } from 'react';
import {
  callAuthorChat,
  parseAgentReply,
  type AuthorChatRequest,
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

let _counter = 0;
function uid() {
  return `msg-${Date.now()}-${++_counter}`;
}

function safeParseJson(str: string): unknown {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

interface UseAuthorChatOptions {
  /** Getter for the current dialog JSON string. */
  getDialogJson: () => string;
  /** Getter for the current values JSON string. */
  getValuesJson: () => string;
  /** Called when the agent returns updated values. */
  onValuesUpdate: (json: string) => void;
  /**
   * Full URL of the author chat API endpoint.
   * Same origin: "/api/author/chat"
   * Cross-origin: "https://your-dashboard.com/api/author/chat"
   *
   * Optional — when not provided the hook becomes a no-op and will not
   * attempt network requests. This prevents the UI from functioning when
   * no backend is configured.
   */
  apiUrl?: string;
}

export function useAuthorChat({
  getDialogJson,
  getValuesJson,
  onValuesUpdate,
  apiUrl,
}: UseAuthorChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestHistory, setRequestHistory] = useState<RequestHistoryEntry[]>(
    [],
  );
  const lastAssistantReplyRef = useRef<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      // If there's no API URL configured, silently ignore send attempts.
      // EnhancedDialogBody already hides the chatbot toggle/button when no
      // API URL is provided; this prevents spurious errors if the hook is
      // invoked in a context without a configured backend.
      if (!apiUrl) {
        console.debug(
          '[author-chat] sendMessage ignored: apiUrl not configured',
        );
        return;
      }
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;
      if (
        lastAssistantReplyRef.current &&
        trimmed === lastAssistantReplyRef.current
      ) {
        setError(
          'Please enter a new message instead of re-sending the assistant reply.',
        );
        return;
      }

      setError(null);

      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      const assistantId = uid();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '' },
      ]);

      try {
        const context: { values: unknown; dialogDefinition?: unknown } = {
          values: safeParseJson(getValuesJson()),
        };
        if (!conversationId) {
          context.dialogDefinition = safeParseJson(getDialogJson());
          console.debug('[author-chat] first message context', {
            hasDialogDefinition: context.dialogDefinition != null,
            hasValues: context.values != null,
            dialogDefinitionIsEmptyObject:
              typeof context.dialogDefinition === 'object' &&
              context.dialogDefinition !== null &&
              Object.keys(context.dialogDefinition as Record<string, unknown>)
                .length === 0,
            valuesIsEmptyObject:
              typeof context.values === 'object' &&
              context.values !== null &&
              Object.keys(context.values as Record<string, unknown>).length ===
                0,
          });
        }

        const requestBody: AuthorChatRequest = {
          messages: [{ role: 'user', content: trimmed }],
          conversationId,
          context,
        };

        const historyId = uid();
        const startTime = Date.now();

        let data: { reply: string; conversationId: string };
        try {
          data = await callAuthorChat(requestBody, apiUrl);
        } catch (fetchErr) {
          const errorMsg =
            fetchErr instanceof Error ? fetchErr.message : 'Request failed';
          setRequestHistory((prev) => [
            {
              id: historyId,
              timestamp: new Date().toLocaleTimeString(),
              requestBody,
              response: null,
              error: errorMsg,
              durationMs: Date.now() - startTime,
            },
            ...prev,
          ]);
          throw new Error(errorMsg);
        }

        setRequestHistory((prev) => [
          {
            id: historyId,
            timestamp: new Date().toLocaleTimeString(),
            requestBody,
            response: data,
            error: null,
            durationMs: Date.now() - startTime,
          },
          ...prev,
        ]);

        setConversationId(data.conversationId);

        const { message: displayReply, updatedValues } = parseAgentReply(
          data.reply,
        );
        lastAssistantReplyRef.current = displayReply;
        if (updatedValues !== null) {
          onValuesUpdate(JSON.stringify(updatedValues, null, 2));
        }

        // Word-by-word streaming animation
        const words = displayReply.split(' ');
        let accumulated = '';
        for (let i = 0; i < words.length; i++) {
          accumulated += (i > 0 ? ' ' : '') + words[i];
          const snapshot = accumulated;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: snapshot } : m,
            ),
          );
          await new Promise((r) => setTimeout(r, 18));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to reach agent');
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsStreaming(false);
      }
    },
    [
      isStreaming,
      conversationId,
      getDialogJson,
      getValuesJson,
      onValuesUpdate,
      apiUrl,
    ],
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setConversationId(undefined);
    setError(null);
  }, []);

  return {
    messages,
    isStreaming,
    error,
    setError,
    requestHistory,
    clearConversation,
    sendMessage,
  };
}
