import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextField, Button, Flex } from '@adobe/react-spectrum';
import AIConversation from './Chatbot/AIConversation';
import AISuggestions from './Chatbot/AISuggestions';
import { buildSuggestions } from '@ethereal-nexus/dialog-ui-core';
import { useAuthorChat } from './Chatbot/hooks/useAuthorChat';
import { StarIcon } from '@/components/EnhancedDialogBody.tsx';

interface ChatbotColumnProps {
  dialog: any;
  initialValues: any;
  onUpdateValues: (values: any) => void;
  apiUrl?: string;
}

export const ChatbotColumn: React.FC<ChatbotColumnProps> = ({
  dialog,
  initialValues,
  onUpdateValues,
  apiUrl,
}) => {
  const [input, setInput] = useState('');
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const lastValuesJsonRef = useRef<string>(JSON.stringify(initialValues ?? {}));

  useEffect(() => {
    lastValuesJsonRef.current = JSON.stringify(initialValues ?? {});
  }, [initialValues]);

  const { messages, isStreaming, error, sendMessage } = useAuthorChat({
    getDialogJson: () => JSON.stringify(dialog ?? {}),
    getValuesJson: () => JSON.stringify(initialValues ?? {}),
    onValuesUpdate: (json) => {
      const previousValuesJson = lastValuesJsonRef.current;
      try {
        onUpdateValues(JSON.parse(json));
        setUndoStack((prev) => [...prev, previousValuesJson]);
        setRedoStack([]);
      } catch {
        // Ignore non-JSON updated values to avoid breaking the form update.
      }
    },
    // Pass through the apiUrl as provided by the consumer. We intentionally
    // avoid a hard-coded default here so the presence of an API URL is
    // explicit — the chatbot UI should only be enabled when a URL is
    // configured by the host app.
    apiUrl: apiUrl,
  });

  // If there's no API URL configured, do not render the chatbot UI.
  // The parent component (EnhancedDialogBody / web component) should
  // normally prevent mounting the ChatbotColumn, but add a defensive
  // check here so the component is safe to use directly.
  if (!apiUrl) {
    return null;
  }

  const uiMessages: { sender: 'ai' | 'user'; text: string }[] = useMemo(
    () =>
      messages.map((msg) => ({
        sender: msg.role === 'assistant' ? 'ai' : 'user',
        text: msg.content,
      })),
    [messages],
  );

  const isEmpty = messages.length === 0;

  const suggestions = useMemo(() => {
    if (!dialog) return [] as string[];
    return buildSuggestions(dialog).slice(0, 2);
  }, [dialog]);

  const handleSend = async (text: string) => {
    await sendMessage(text);
    setInput('');
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const currentValuesJson = JSON.stringify(initialValues ?? {});
    const previousValuesJson = undoStack[undoStack.length - 1];
    try {
      onUpdateValues(JSON.parse(previousValuesJson));
      setUndoStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, currentValuesJson]);
    } catch {
      // Ignore invalid JSON snapshots.
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const currentValuesJson = JSON.stringify(initialValues ?? {});
    const nextValuesJson = redoStack[redoStack.length - 1];
    try {
      onUpdateValues(JSON.parse(nextValuesJson));
      setRedoStack((prev) => prev.slice(0, -1));
      setUndoStack((prev) => [...prev, currentValuesJson]);
    } catch {
      // Ignore invalid JSON snapshots.
    }
  };

  return (
    <View
      flex="1"
      minHeight="0"
      UNSAFE_style={{
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 600,
        width: '100%',
        height: '100%',
        overflowX: 'hidden',
      }}
    >
      <Text UNSAFE_style={{ fontSize: '1rem', fontWeight: 'bold' }}>
        AI Content Advisor
      </Text>

      {isEmpty ? (
        <View>
          <Flex
            direction="column"
            alignItems="center"
            justifyContent="center"
            UNSAFE_style={{ paddingTop: 96, paddingBottom: 20 }}
          >
            <View
              UNSAFE_style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 24,
                color: '#818cf8',
              }}
            >
              <StarIcon aria-label="Assistant" />
            </View>
            <Text
              UNSAFE_style={{
                fontSize: '1.2rem',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              How can I help you author content?
            </Text>
            <Text
              UNSAFE_style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                textAlign: 'center',
                maxWidth: 420,
                marginBottom: 24,
              }}
            >
              I can help you create, edit, and refine content for your AEM
              pages.
            </Text>
            {suggestions.length > 0 && (
              <Flex direction="row" gap="size-100" wrap>
                {suggestions.map((s) => (
                  <Button
                    key={s}
                    variant="secondary"
                    onPress={() => handleSend(s)}
                  >
                    {s}
                  </Button>
                ))}
              </Flex>
            )}
          </Flex>
        </View>
      ) : (
        <>
          <AIConversation messages={uiMessages} loading={isStreaming} />
          {suggestions.length > 0 && (
            <AISuggestions suggestions={suggestions} onSelect={handleSend} />
          )}
          {(undoStack.length > 0 || redoStack.length > 0) && (
            <Flex justifyContent="start" marginBottom="size-200" gap="size-100">
              <Button
                variant="secondary"
                onPress={handleUndo}
                isDisabled={undoStack.length === 0}
              >
                Undo
              </Button>
              <Button
                variant="secondary"
                onPress={handleRedo}
                isDisabled={redoStack.length === 0}
              >
                Redo
              </Button>
            </Flex>
          )}
        </>
      )}

      {error && (
        <Text UNSAFE_style={{ color: '#b00020', marginBottom: 6 }}>
          {error}
        </Text>
      )}

      <Flex flexShrink={0} gap="size-100">
        <TextField
          value={input}
          onChange={setInput}
          width="100%"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(input);
            }
          }}
        />
        <Button
          variant="accent"
          onPress={() => handleSend(input)}
          isDisabled={isStreaming}
        >
          Send
        </Button>
      </Flex>
    </View>
  );
};
