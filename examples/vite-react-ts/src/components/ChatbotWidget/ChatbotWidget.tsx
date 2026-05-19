import React, { useState } from 'react';
import {
  component,
  dialog,
  multifield,
  object,
  text,
  type Output,
} from '@ethereal-nexus/core';

import './ChatbotWidget.css';
import { ChatbotWidgetView } from './ChatbotWidgetView';
import { useChatbotConversation } from './useChatbotConversation';

const defaultQuickActions = ['Karriere', 'Kontakt', 'Unternehmen', 'Neuigkeiten'];

const dialogSchema = dialog({
  apiurl: text({
    label: 'Chatbot API URL',
    placeholder: 'https://your-chatbot-api.example/messages',
    tooltip: 'Public API endpoint used by the chatbot widget.',
    required: true,
  }),
  initialmessage: text({
    label: 'Initial message',
    placeholder: 'How can I help you today?',
    tooltip: 'Greeting shown before the visitor sends the first message.',
    defaultValue:
      'Wie kann ich Ihnen helfen? Bitte waehlen Sie eines der Themen oder geben Sie Ihre Frage in das Freitextfeld ein. Kurze Saetze verstehe ich besser als einzelne Worte.',
  }),
  quickactions: multifield({
    label: 'Quick actions',
    itemLabelKey: 'label',
    children: object({
      label: text({
        label: 'Label',
        placeholder: 'Karriere',
        required: true,
      }),
    }),
  }),
});

const schema = component({ name: 'ChatbotWidget', version: '0.0.2' }, dialogSchema);

type Props = Output<typeof schema>;

export const ChatbotWidget: React.FC<Props> = ({ apiurl, initialmessage, quickactions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const quickActionLabels =
    quickactions?.map(({ label }) => label?.trim()).filter(Boolean) ?? defaultQuickActions;
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

  return (
    <ChatbotWidgetView
      isOpen={isOpen}
      isExpanded={isExpanded}
      hasApiUrl={hasApiUrl}
      quickActions={quickActionLabels}
      messages={messages}
      draft={draft}
      isLoading={isLoading}
      error={error}
      conversationId={conversationId}
      endRef={endRef}
      onToggleOpen={() => setIsOpen((current) => !current)}
      onToggleExpanded={() => setIsExpanded((current) => !current)}
      onClose={() => {
        setIsOpen(false);
        setIsExpanded(false);
      }}
      onDraftChange={setDraft}
      onSubmit={() => void submitMessage()}
      onQuickAction={(value) => void submitMessage(value)}
      onClear={clearConversation}
    />
  );
};
