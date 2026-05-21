import React from 'react';

import { formatTime, type ChatMessage } from './useChatbotConversation';

type ChatbotWidgetViewProps = {
  isOpen: boolean;
  isExpanded: boolean;
  hasApiUrl: boolean;
  quickActions: string[];
  messages: ChatMessage[];
  draft: string;
  isLoading: boolean;
  error: string | null;
  conversationId?: string;
  endRef: React.RefObject<HTMLDivElement | null>;
  onToggleOpen: () => void;
  onToggleExpanded: () => void;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onQuickAction: (value: string) => void;
  onClear: () => void;
};

function ChatLauncherIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 12C20 16.4183 16.4183 20 12 20C10.5937 20 9.27223 19.6372 8.12398 19C7.5 19.5 5.5 20.5 3 21C3.5 19 3.5 17.5 3.5 16.5C2.55906 15.1768 2 13.5478 2 12C2 7.58172 5.58172 4 10 4H12C16.4183 4 20 7.58172 20 12Z"
        fill="white"
        stroke="white"
        strokeWidth="1.5"
      />
      <circle cx="8" cy="12" r="1.25" fill="#dc2626" />
      <circle cx="12" cy="12" r="1.25" fill="#dc2626" />
      <circle cx="16" cy="12" r="1.25" fill="#dc2626" />
    </svg>
  );
}

function ExpandIcon({ expanded }: { expanded: boolean }) {
  return expanded ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 4H4v5M15 20h5v-5M4 9l6-6M20 15l-6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 4h5v5M9 20H4v-5M20 9l-6-6M4 15l6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.2 3.8 4.9 10.07c-1.08.44-1.04 1.99.07 2.37l5.36 1.86 1.86 5.36c.39 1.11 1.93 1.15 2.38.07L20.8 4.4c.31-.76-.28-1.35-1.04-1.04Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m10.9 13.1 9.3-9.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChatbotWidgetView({
  isOpen,
  isExpanded,
  hasApiUrl,
  quickActions,
  messages,
  draft,
  isLoading,
  error,
  conversationId,
  endRef,
  onToggleOpen,
  onToggleExpanded,
  onClose,
  onDraftChange,
  onSubmit,
  onQuickAction,
  onClear,
}: ChatbotWidgetViewProps) {
  return (
    <div className="chatbotWidget">
      {isOpen ? (
        <>
          {isExpanded ? <div className="chatbotWidget__backdrop" /> : null}
          <section
            className={[
              'chatbotWidget__panel',
              isExpanded ? 'chatbotWidget__panel--expanded' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label="Chatbot conversation window"
          >
            <header className="chatbotWidget__header">
              <h2 className="chatbotWidget__title">Support</h2>
              <div className="chatbotWidget__headerActions">
                <button
                  type="button"
                  className="chatbotWidget__headerButton"
                  aria-label={isExpanded ? 'Collapse chatbot' : 'Expand chatbot'}
                  onClick={onToggleExpanded}
                >
                  <ExpandIcon expanded={isExpanded} />
                </button>
                <button
                  type="button"
                  className="chatbotWidget__headerButton"
                  aria-label="Close chatbot"
                  onClick={onClose}
                >
                  ×
                </button>
              </div>
            </header>

            {error ? <div className="chatbotWidget__error">{error}</div> : null}

            <div className="chatbotWidget__messages">
              <div className="chatbotWidget__list">
                {messages.map((message) => {
                  const isUser = message.role === 'user';

                  return (
                    <div
                      key={message.id}
                      className={[
                        'chatbotWidget__messageRow',
                        isUser
                          ? 'chatbotWidget__messageRow--user'
                          : 'chatbotWidget__messageRow--assistant',
                      ].join(' ')}
                    >
                      <div className="chatbotWidget__messageBlock">
                        <div
                          className={[
                            'chatbotWidget__bubble',
                            isUser
                              ? 'chatbotWidget__bubble--user'
                              : 'chatbotWidget__bubble--assistant',
                            message.status === 'error'
                              ? 'chatbotWidget__bubble--error'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          {message.status === 'streaming' && !message.content ? (
                            <span className="chatbotWidget__typing" aria-label="Assistant is typing">
                              <span />
                              <span />
                              <span />
                            </span>
                          ) : message.content ? (
                            message.content
                          ) : null}
                        </div>
                        {message.richContentHtml ? (
                          <div
                            className="chatbotWidget__richContent"
                            dangerouslySetInnerHTML={{ __html: message.richContentHtml }}
                          />
                        ) : null}
                        <div className="chatbotWidget__meta">{formatTime(message.createdAt)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
            </div>

            {quickActions.length ? (
              <div className="chatbotWidget__quickActions">
                {quickActions.map((label) => (
                  <button
                    key={label}
                    type="button"
                    className="chatbotWidget__quickAction"
                    onClick={() => void onQuickAction(label)}
                    disabled={!hasApiUrl || isLoading}
                  >
                    <span>{label}</span>
                    <span className="chatbotWidget__quickActionArrow">›</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="chatbotWidget__composer">
              <div className="chatbotWidget__inputShell">
                <textarea
                  className="chatbotWidget__textarea"
                  value={draft}
                  onChange={(event) => onDraftChange(event.target.value)}
                  placeholder={hasApiUrl ? 'Nachricht...' : 'Chatbot API URL is missing'}
                  disabled={!hasApiUrl || isLoading}
                  rows={1}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      onSubmit();
                    }
                  }}
                />
                <button
                  type="button"
                  className="chatbotWidget__send"
                  aria-label="Send message"
                  onClick={onSubmit}
                  disabled={!hasApiUrl || isLoading || !draft.trim()}
                >
                  <SendIcon />
                </button>
              </div>
              <div className="chatbotWidget__footer">
                <button
                  type="button"
                  className="chatbotWidget__clear"
                  onClick={onClear}
                  disabled={isLoading || messages.length <= 1}
                >
                  Neue Unterhaltung
                </button>
                <p className="chatbotWidget__hint">
                  {conversationId ? 'Kontext aktiv' : 'Enter senden, Shift+Enter neue Zeile'}
                </p>
              </div>
            </div>
          </section>
        </>
      ) : null}

      <button
        type="button"
        className={[
          'chatbotWidget__launcher',
          isOpen ? 'chatbotWidget__launcher--hidden' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={isOpen ? 'Close chatbot' : 'Open chatbot'}
        aria-expanded={isOpen}
        onClick={onToggleOpen}
      >
        <ChatLauncherIcon />
        <span className="chatbotWidget__statusDot" aria-hidden="true" />
      </button>
    </div>
  );
}
