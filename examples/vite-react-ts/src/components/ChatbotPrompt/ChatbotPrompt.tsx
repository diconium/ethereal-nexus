import React from 'react';
import {
  component,
  dialog,
  text,
  type Output,
} from '@ethereal-nexus/core';

import './ChatbotPrompt.css';
import { formatTime, useChatbotConversation } from '../ChatbotWidget/useChatbotConversation';

const dialogSchema = dialog({
  apiurl: text({
    label: 'Chatbot API URL',
    placeholder: 'https://your-chatbot-api.example/messages',
    tooltip: 'Public API endpoint used by the chatbot component.',
    required: true,
  }),
  aititle: text({
    label: 'Title',
    placeholder: 'How can we help?',
    defaultValue: 'How can I help you today?',
  }),
  inputplaceholder: text({
    label: 'Input placeholder',
    placeholder: 'Ask anything...',
    defaultValue: 'Ask a question about careers, services, or locations...',
  }),
  initialmessage: text({
    label: 'Initial message',
    placeholder: 'How can I help you today?',
    tooltip: 'Greeting shown in the conversation after the first message is sent.',
    defaultValue:
      'Hello, I am your virtual assistant. Ask me anything and I will do my best to help.',
  }),
});

const schema = component({ name: 'ChatbotPrompt', version: '0.0.2' }, dialogSchema);

type Props = Output<typeof schema>;

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

export const ChatbotPrompt: React.FC<Props> = ({
                                                 apiurl,
                                                 aititle: title,
  inputplaceholder,
  initialmessage,
}) => {
  const {
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
  } = useChatbotConversation({
    apiUrl: apiurl,
    initialAssistantMessage: initialmessage,
  });

  const hasStarted = isLoading || messages.some((message) => message.role === 'user');

  return (
    <section
      className={[
        'chatbotPrompt',
        hasStarted ? 'chatbotPrompt--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={title}
    >
      {hasStarted ? (
        <header className="chatbotPrompt__header">
          <div>
            <h2 className="chatbotPrompt__headerTitle">{title}</h2>
            <p className="chatbotPrompt__headerMeta">
              {conversationId ? 'Context active' : 'New conversation'}
            </p>
          </div>
          <button
            type="button"
            className="chatbotPrompt__clear"
            onClick={clearConversation}
            disabled={isLoading || messages.length <= 1}
          >
            New conversation
          </button>
        </header>
      ) : (
        <div className="chatbotPrompt__hero">
          <h2 className="chatbotPrompt__title">{title}</h2>
        </div>
      )}

      {error ? <div className="chatbotPrompt__error">{error}</div> : null}

      {hasStarted ? (
        <div className="chatbotPrompt__messages">
          <div className="chatbotPrompt__list">
            {messages.map((message) => {
              const isUser = message.role === 'user';

              return (
                <div
                  key={message.id}
                  className={[
                    'chatbotPrompt__messageRow',
                    isUser
                      ? 'chatbotPrompt__messageRow--user'
                      : 'chatbotPrompt__messageRow--assistant',
                  ].join(' ')}
                >
                  <div className="chatbotPrompt__messageBlock">
                    <div
                      className={[
                        'chatbotPrompt__bubble',
                        isUser
                          ? 'chatbotPrompt__bubble--user'
                          : 'chatbotPrompt__bubble--assistant',
                        message.status === 'error' ? 'chatbotPrompt__bubble--error' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {message.status === 'streaming' && !message.content ? (
                        <span className="chatbotPrompt__typing" aria-label="Assistant is typing">
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
                        className="chatbotPrompt__richContent"
                        dangerouslySetInnerHTML={{ __html: message.richContentHtml }}
                      />
                    ) : null}
                    <div className="chatbotPrompt__meta">{formatTime(message.createdAt)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        </div>
      ) : null}

      <div className="chatbotPrompt__composer">
        <div className="chatbotPrompt__inputShell">
          <textarea
            className="chatbotPrompt__textarea"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={hasApiUrl ? inputplaceholder : 'Chatbot API URL is missing'}
            disabled={!hasApiUrl || isLoading}
            rows={1}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void submitMessage();
              }
            }}
          />
          <button
            type="button"
            className="chatbotPrompt__send"
            aria-label="Send message"
            onClick={() => void submitMessage()}
            disabled={!hasApiUrl || isLoading || !draft.trim()}
          >
            <SendIcon />
          </button>
        </div>
        <p className="chatbotPrompt__hint">
          {hasStarted ? 'Press Enter to send, Shift+Enter for a new line' : ''}
        </p>
      </div>
    </section>
  );
};
