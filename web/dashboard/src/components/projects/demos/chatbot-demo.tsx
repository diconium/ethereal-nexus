'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { highlight } from 'sugar-high';
import {
  Bot,
  Check,
  Copy,
  Pencil,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TextArea } from '@/components/ui/text-area';
import { Badge } from '@/components/ui/badge';
import type { AiProvider } from '@/data/ai/provider';
import {
  AI_PROVIDER_BADGE_STYLES,
  getAiProviderLabel,
} from '@/data/ai/provider';
import { cn } from '@/lib/utils';

export type ChatRole = 'user' | 'assistant';

export interface ChatTransportMessage {
  role: ChatRole;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  status: 'complete' | 'streaming' | 'error';
  parentUserMessageId?: string;
  error?: string;
  meta?: {
    model?: string;
  };
}

export interface ChatSendParams {
  messages: ChatTransportMessage[];
  conversationId?: string;
  systemPrompt?: string;
}

export interface ChatSendResult {
  reply: string;
  conversationId?: string;
  raw?: unknown;
}

export type ChatSendMessage = (
  params: ChatSendParams,
) => Promise<ChatSendResult>;

export interface ChatClassNames {
  root?: string;
  aside?: string;
  shell?: string;
  header?: string;
  timeline?: string;
  composer?: string;
  assistantBubble?: string;
  userBubble?: string;
}

export interface UseChatAdapterOptions {
  sendMessage: ChatSendMessage;
  initialMessages?: ChatMessage[];
  systemPrompt?: string;
  streamResponse?: boolean;
  streamDelayMs?: number;
}

export interface PortableAiChatProps {
  sendMessage: ChatSendMessage;
  initialMessages?: ChatMessage[];
  title?: string;
  description?: string;
  assistantName?: string;
  userName?: string;
  modelLabel?: string;
  modelBadgeClassName?: string;
  headerContent?: ReactNode;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  systemPrompt?: string;
  streamResponse?: boolean;
  streamDelayMs?: number;
  classNames?: ChatClassNames;
  showTimestamps?: boolean;
  aside?: ReactNode;
  inputPlaceholder?: string;
  renderMessageMeta?: (message: ChatMessage) => ReactNode;
}

type DemoResponse = {
  reply?: string;
  message?: string;
  text?: string;
  content?: string;
  response?: string;
  output_text?: string;
  conversationId?: string;
};

type ChatbotDemoProps = {
  chatbot: {
    name: string;
    description: string | null;
    slug: string;
    public_slug: string;
    agent_id: string;
    provider: string;
  };
};

function createMessage(
  role: ChatRole,
  content: string,
  overrides: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    status: 'complete',
    ...overrides,
  };
}

function readAssistantMessage(payload: unknown) {
  if (typeof payload === 'string') {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return JSON.stringify(payload, null, 2);
  }

  const candidate = payload as Record<string, unknown>;
  const direct =
    candidate.message ??
    candidate.reply ??
    candidate.text ??
    candidate.content ??
    candidate.response ??
    candidate.output_text;

  if (typeof direct === 'string') {
    return direct;
  }

  return JSON.stringify(payload, null, 2);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDayLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function getDayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getStreamingChunks(value: string) {
  return value.split(/(\s+)/).filter(Boolean);
}

async function copyToClipboard(value: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return false;
  }

  await navigator.clipboard.writeText(value);
  return true;
}

export function createHttpChatAdapter(endpoint: string): ChatSendMessage {
  return async ({ messages, conversationId, systemPrompt }) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        conversationId,
        systemPrompt,
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? ((await response.json()) as DemoResponse)
      : await response.text();

    if (!response.ok) {
      throw new Error(readAssistantMessage(payload));
    }

    return {
      reply: readAssistantMessage(payload),
      conversationId:
        payload &&
        typeof payload === 'object' &&
        'conversationId' in payload &&
        typeof payload.conversationId === 'string'
          ? payload.conversationId
          : conversationId,
      raw: payload,
    };
  };
}

export function useChatAdapter({
  sendMessage,
  initialMessages = [],
  systemPrompt,
  streamResponse = true,
  streamDelayMs = 16,
}: UseChatAdapterOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const runAssistantTurn = useCallback(
    async (
      history: ChatMessage[],
      userMessageId: string,
      options?: { resetConversation?: boolean },
    ) => {
      const assistantMessageId = crypto.randomUUID();
      const preparedConversationId = options?.resetConversation
        ? undefined
        : conversationId;

      setIsLoading(true);
      setError(null);
      setMessages([
        ...history,
        createMessage('assistant', '', {
          id: assistantMessageId,
          status: 'streaming',
          parentUserMessageId: userMessageId,
        }),
      ]);

      try {
        const result = await sendMessage({
          messages: history.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          conversationId: preparedConversationId,
          systemPrompt,
        });

        setConversationId(result.conversationId);

        if (!streamResponse) {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content: result.reply,
                    status: 'complete',
                  }
                : message,
            ),
          );
          return;
        }

        const parts = getStreamingChunks(result.reply);
        let nextValue = '';

        for (const part of parts) {
          nextValue += part;
          const snapshot = nextValue;

          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? {
                    ...message,
                    content: snapshot,
                  }
                : message,
            ),
          );

          await new Promise((resolve) => setTimeout(resolve, streamDelayMs));
        }

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  status: 'complete',
                }
              : message,
          ),
        );
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'Failed to reach the AI service.';

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
    },
    [conversationId, sendMessage, streamDelayMs, streamResponse, systemPrompt],
  );

  const submit = useCallback(async () => {
    const value = draft.trim();
    if (!value || isLoading) {
      return;
    }

    if (editingMessageId) {
      const index = messages.findIndex(
        (message) => message.id === editingMessageId,
      );
      if (index === -1) {
        setEditingMessageId(null);
        return;
      }

      const editedMessage = {
        ...messages[index],
        content: value,
        createdAt: new Date().toISOString(),
        status: 'complete' as const,
      };
      const history = [...messages.slice(0, index), editedMessage];

      setDraft('');
      setEditingMessageId(null);
      setConversationId(undefined);
      await runAssistantTurn(history, editedMessage.id, {
        resetConversation: true,
      });
      return;
    }

    const userMessage = createMessage('user', value);
    const history = [...messages, userMessage];

    setDraft('');
    await runAssistantTurn(history, userMessage.id);
  }, [draft, editingMessageId, isLoading, messages, runAssistantTurn]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setDraft('');
    setError(null);
    setConversationId(undefined);
    setEditingMessageId(null);
  }, []);

  const beginEdit = useCallback(
    (messageId: string) => {
      const target = messages.find((message) => message.id === messageId);
      if (!target || target.role !== 'user') {
        return;
      }

      setDraft(target.content);
      setEditingMessageId(messageId);
      setError(null);
    },
    [messages],
  );

  const retry = useCallback(
    async (messageId: string) => {
      const target = messages.find((message) => message.id === messageId);
      if (!target) {
        return;
      }

      const retryUserId =
        target.role === 'user' ? target.id : target.parentUserMessageId;
      if (!retryUserId) {
        return;
      }

      const userIndex = messages.findIndex(
        (message) => message.id === retryUserId,
      );
      if (userIndex === -1) {
        return;
      }

      const history = messages.slice(0, userIndex + 1).map((message) => ({
        ...message,
        status: 'complete' as const,
        error: undefined,
      }));

      setConversationId(undefined);
      await runAssistantTurn(history, retryUserId, { resetConversation: true });
    },
    [messages, runAssistantTurn],
  );

  return {
    messages,
    draft,
    setDraft,
    error,
    isLoading,
    conversationId,
    editingMessageId,
    submit,
    retry,
    beginEdit,
    clearConversation,
    cancelEdit: () => {
      setEditingMessageId(null);
      setDraft('');
    },
  };
}

function CodeBlock({ value, language }: { value: string; language: string }) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => highlight(value), [value]);

  return (
    <div className="overflow-hidden rounded-xl border bg-zinc-950 text-zinc-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
          {language}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-zinc-300 hover:bg-white/10 hover:text-white"
          onClick={async () => {
            if (await copyToClipboard(value)) {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            }
          }}
        >
          {copied ? (
            <Check className="size-3.5" />
          ) : (
            <Copy className="size-3.5" />
          )}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-6">
        <code
          className="block whitespace-pre font-mono [tab-size:2]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="leading-7 [&:not(:first-child)]:mt-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="ml-5 list-disc space-y-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="ml-5 list-decimal space-y-2">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-primary underline underline-offset-4"
    >
      {children}
    </a>
  ),
  code: ({ children, className, ...props }) => {
    const value = String(children).replace(/\n$/, '');
    const language = className?.match(/language-(\w+)/)?.[1] ?? 'text';

    if (!className) {
      return (
        <code
          className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em]"
          {...props}
        >
          {children}
        </code>
      );
    }

    return <CodeBlock value={value} language={language} />;
  },
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className="size-2 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
      <span className="size-2 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
      <span className="size-2 animate-bounce rounded-full bg-current" />
    </div>
  );
}

function MessageAction({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 rounded-full text-muted-foreground hover:text-foreground"
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

const MessageItem = memo(function MessageItem({
  message,
  assistantName,
  userName,
  showTimestamps,
  onRetry,
  onEdit,
  onCopy,
  renderMessageMeta,
  classNames,
}: {
  message: ChatMessage;
  assistantName: string;
  userName: string;
  showTimestamps: boolean;
  onRetry: (messageId: string) => void;
  onEdit: (messageId: string) => void;
  onCopy: (message: ChatMessage) => void;
  renderMessageMeta?: (message: ChatMessage) => ReactNode;
  classNames?: ChatClassNames;
}) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'group flex gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {!isUser ? (
        <Avatar className="mt-1 size-8 border bg-primary/10 text-primary">
          <AvatarFallback>
            <Bot className="size-4" />
          </AvatarFallback>
        </Avatar>
      ) : null}

      <div
        className={cn(
          'max-w-[min(85%,56rem)] space-y-2',
          isUser && 'items-end',
        )}
      >
        <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/80">
            {isUser ? userName : assistantName}
          </span>
          {showTimestamps ? <span>{formatTime(message.createdAt)}</span> : null}
          {message.meta?.model ? (
            <Badge variant="outline">{message.meta.model}</Badge>
          ) : null}
          {message.status === 'error' ? (
            <Badge variant="destructive">Failed</Badge>
          ) : null}
          {message.status === 'streaming' ? (
            <Badge variant="outline">Streaming</Badge>
          ) : null}
        </div>

        <div
          className={cn(
            'rounded-3xl border px-4 py-3 shadow-sm backdrop-blur-sm',
            isUser
              ? cn(
                  'bg-primary text-primary-foreground border-primary/30',
                  classNames?.userBubble,
                )
              : cn(
                  'bg-card/95 text-card-foreground border-border/70',
                  classNames?.assistantBubble,
                ),
          )}
        >
          {message.status === 'streaming' && !message.content ? (
            <TypingIndicator />
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:my-0 prose-code:before:hidden prose-code:after:hidden">
              <ReactMarkdown components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 px-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          <MessageAction
            label="Copy message"
            icon={<Copy className="size-3.5" />}
            onClick={() => onCopy(message)}
          />
          {message.role === 'user' ? (
            <MessageAction
              label="Edit prompt"
              icon={<Pencil className="size-3.5" />}
              onClick={() => onEdit(message.id)}
            />
          ) : null}
          {message.role === 'assistant' ? (
            <MessageAction
              label="Retry response"
              icon={<RotateCcw className="size-3.5" />}
              onClick={() => onRetry(message.id)}
            />
          ) : null}
          {message.role === 'assistant' && message.parentUserMessageId ? (
            <MessageAction
              label="Edit prompt"
              icon={<Pencil className="size-3.5" />}
              onClick={() => onEdit(message.parentUserMessageId!)}
            />
          ) : null}
          {renderMessageMeta ? renderMessageMeta(message) : null}
        </div>
      </div>

      {isUser ? (
        <Avatar className="mt-1 size-8 border bg-muted text-muted-foreground">
          <AvatarFallback>
            <User className="size-4" />
          </AvatarFallback>
        </Avatar>
      ) : null}
    </div>
  );
});

function MessageList({
  messages,
  assistantName,
  userName,
  showTimestamps,
  onRetry,
  onEdit,
  onCopy,
  renderMessageMeta,
  emptyStateTitle,
  emptyStateDescription,
  classNames,
}: {
  messages: ChatMessage[];
  assistantName: string;
  userName: string;
  showTimestamps: boolean;
  onRetry: (messageId: string) => void;
  onEdit: (messageId: string) => void;
  onCopy: (message: ChatMessage) => void;
  renderMessageMeta?: (message: ChatMessage) => ReactNode;
  emptyStateTitle: string;
  emptyStateDescription: string;
  classNames?: ChatClassNames;
}) {
  const groupedMessages = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: ChatMessage[] }> =
      [];

    for (const message of messages) {
      const key = getDayKey(message.createdAt);
      const lastGroup = groups.at(-1);

      if (!lastGroup || lastGroup.key !== key) {
        groups.push({
          key,
          label: formatDayLabel(message.createdAt),
          items: [message],
        });
        continue;
      }

      lastGroup.items.push(message);
    }

    return groups;
  }, [messages]);

  if (!messages.length) {
    return (
      <div className="flex min-h-[26rem] flex-col items-center justify-center rounded-[1.75rem] border border-dashed bg-gradient-to-b from-muted/10 to-muted/40 px-6 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="size-6" />
        </div>
        <h3 className="text-lg font-semibold">{emptyStateTitle}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {emptyStateDescription}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-8', classNames?.timeline)}>
      {groupedMessages.map((group) => (
        <div key={group.key} className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/70" />
            <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {group.label}
            </span>
            <div className="h-px flex-1 bg-border/70" />
          </div>

          <div className="space-y-5">
            {group.items.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                assistantName={assistantName}
                userName={userName}
                showTimestamps={showTimestamps}
                onRetry={onRetry}
                onEdit={onEdit}
                onCopy={onCopy}
                renderMessageMeta={renderMessageMeta}
                classNames={classNames}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  isEditing,
  onCancelEdit,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isEditing: boolean;
  onCancelEdit: () => void;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(value.length, value.length);
    }
  }, [isEditing, value.length]);

  return (
    <div className="space-y-3 rounded-[1.5rem] border bg-card/95 p-4 shadow-sm backdrop-blur-sm">
      {isEditing ? (
        <div className="flex items-center justify-between rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          <span>
            Editing an earlier prompt. Saving will regenerate the conversation
            from that point.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancelEdit}
          >
            <X className="size-3.5" /> Cancel
          </Button>
        </div>
      ) : null}

      <TextArea
        ref={inputRef}
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-[7rem] resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <p className="text-xs text-muted-foreground">
          Press{' '}
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">Enter</kbd>{' '}
          to send,{' '}
          <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">
            Shift+Enter
          </kbd>{' '}
          for a new line.
        </p>

        <Button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || !value.trim()}
        >
          <Send className="size-4" />
          {isLoading ? 'Thinking...' : isEditing ? 'Save & Regenerate' : 'Send'}
        </Button>
      </div>
    </div>
  );
}

export function ChatContainer({
  title,
  description,
  modelLabel,
  modelBadgeClassName,
  headerContent,
  systemPrompt,
  conversationId,
  onClear,
  aside,
  children,
  classNames,
}: {
  title: string;
  description?: string;
  modelLabel?: string;
  modelBadgeClassName?: string;
  headerContent?: ReactNode;
  systemPrompt?: string;
  conversationId?: string;
  onClear: () => void;
  aside?: ReactNode;
  children: ReactNode;
  classNames?: ChatClassNames;
}) {
  return (
    <div
      className={cn(
        aside
          ? 'Back to AI overviewgrid gap-6 xl:grid-cols-[minmax(17rem,22rem)_1fr]'
          : 'space-y-6',
        classNames?.root,
      )}
    >
      {aside ? (
        <div className={cn('space-y-6', classNames?.aside)}>{aside}</div>
      ) : null}

      <Card
        className={cn(
          'overflow-hidden border-border/70 bg-background/95 shadow-sm',
          classNames?.shell,
        )}
      >
        <CardHeader
          className={cn(
            'gap-4 border-b bg-gradient-to-b from-muted/35 to-background',
            classNames?.header,
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-2xl">{title}</CardTitle>
                {conversationId ? (
                  <Badge variant="secondary">Context active</Badge>
                ) : null}
              </div>
              {description ? (
                <CardDescription className="max-w-2xl text-sm">
                  {description}
                </CardDescription>
              ) : null}
              {headerContent ? headerContent : null}
            </div>

            <Button type="button" variant="outline" onClick={onClear}>
              <Trash2 className="size-4" /> Clear conversation
            </Button>
          </div>

          {systemPrompt ? (
            <details className="rounded-2xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              <summary className="cursor-pointer list-none font-medium text-foreground">
                View system prompt
              </summary>
              <pre className="mt-3 whitespace-pre-wrap font-mono text-xs leading-6 text-muted-foreground">
                {systemPrompt}
              </pre>
            </details>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-4 p-4 md:p-6">{children}</CardContent>
      </Card>

      <style jsx global>{`
        .sh__token--keyword,
        .sh__token--entity,
        .sh__token--property,
        .sh__token--class,
        .sh__token--function,
        .sh__token--type {
          color: #c084fc;
        }

        .sh__token--string,
        .sh__token--template,
        .sh__token--regexp {
          color: #86efac;
        }

        .sh__token--comment {
          color: #94a3b8;
          font-style: italic;
        }

        .sh__token--number,
        .sh__token--boolean,
        .sh__token--constant,
        .sh__token--operator {
          color: #fda4af;
        }

        .sh__token--punctuation {
          color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}

export function PortableAiChat({
  sendMessage,
  initialMessages,
  title = 'AI Assistant',
  description = 'Ask questions, explore ideas, and continue the conversation across multiple turns.',
  assistantName = 'Assistant',
  userName = 'You',
  modelLabel,
  modelBadgeClassName,
  headerContent,
  emptyStateTitle = 'Start a conversation',
  emptyStateDescription = 'Ask a question, request a draft, or explore ideas. This chat keeps multi-turn context when the backend provides a conversation id.',
  systemPrompt,
  streamResponse = true,
  streamDelayMs = 16,
  classNames,
  showTimestamps = true,
  aside,
  inputPlaceholder = 'Message the assistant…',
  renderMessageMeta,
}: PortableAiChatProps) {
  const {
    messages,
    draft,
    setDraft,
    error,
    isLoading,
    conversationId,
    editingMessageId,
    submit,
    retry,
    beginEdit,
    clearConversation,
    cancelEdit,
  } = useChatAdapter({
    sendMessage,
    initialMessages,
    systemPrompt,
    streamResponse,
    streamDelayMs,
  });

  const endRef = useRef<HTMLDivElement | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  return (
    <ChatContainer
      title={title}
      description={description}
      modelLabel={modelLabel}
      modelBadgeClassName={modelBadgeClassName}
      headerContent={headerContent}
      systemPrompt={systemPrompt}
      conversationId={conversationId}
      onClear={clearConversation}
      aside={aside}
      classNames={classNames}
    >
      <div className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="max-h-[65vh] overflow-y-auto rounded-[1.75rem] border bg-muted/15 p-4 md:p-6">
          <MessageList
            messages={messages}
            assistantName={assistantName}
            userName={userName}
            showTimestamps={showTimestamps}
            onRetry={retry}
            onEdit={beginEdit}
            onCopy={async (message) => {
              if (await copyToClipboard(message.content)) {
                setCopiedMessageId(message.id);
                window.setTimeout(() => setCopiedMessageId(null), 1200);
              }
            }}
            renderMessageMeta={(message) =>
              copiedMessageId === message.id ? (
                <span className="text-[11px] font-medium text-emerald-600">
                  Copied
                </span>
              ) : renderMessageMeta ? (
                renderMessageMeta(message)
              ) : null
            }
            emptyStateTitle={emptyStateTitle}
            emptyStateDescription={emptyStateDescription}
            classNames={classNames}
          />
          <div ref={endRef} />
        </div>

        <ChatInput
          value={draft}
          onChange={setDraft}
          onSubmit={submit}
          isLoading={isLoading}
          isEditing={Boolean(editingMessageId)}
          onCancelEdit={cancelEdit}
          placeholder={inputPlaceholder}
        />
      </div>
    </ChatContainer>
  );
}

export function ChatbotDemo({ chatbot }: ChatbotDemoProps) {
  const endpoint = useMemo(
    () => `/api/v1/chatbots/${chatbot.public_slug}/messages`,
    [chatbot.public_slug],
  );

  const sendMessage = useMemo(
    () => createHttpChatAdapter(endpoint),
    [endpoint],
  );

  return (
    <PortableAiChat
      title={chatbot.name}
      description={
        chatbot.description ||
        'A reusable Azure Foundry chatbot demo with modern AI chat ergonomics.'
      }
      modelLabel={getAiProviderLabel(chatbot.provider as AiProvider)}
      modelBadgeClassName={
        AI_PROVIDER_BADGE_STYLES[chatbot.provider as AiProvider]
      }
      assistantName={chatbot.name}
      sendMessage={sendMessage}
      inputPlaceholder={`Message ${chatbot.name}...`}
      headerContent={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="font-medium uppercase tracking-wide text-foreground/70">
              Slug
            </span>
            <span className="font-mono text-foreground/85">{chatbot.slug}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="font-medium uppercase tracking-wide text-foreground/70">
              Agent ID
            </span>
            <span className="font-mono text-foreground/85">
              {chatbot.agent_id}
            </span>
          </span>
          <span className="inline-flex max-w-full items-center gap-2">
            <span className="font-medium uppercase tracking-wide text-foreground/70">
              Endpoint
            </span>
            <span className="break-all font-mono text-foreground/85">
              {endpoint}
            </span>
          </span>
        </div>
      }
      emptyStateTitle={`Meet ${chatbot.name}`}
      emptyStateDescription="Ask a question, paste context, or iterate on prompts. You can edit previous prompts, retry responses, and continue the conversation across turns."
    />
  );
}
