import React, { useRef, useEffect } from 'react';
import { View } from '@adobe/react-spectrum';
import AIResponse from './AIResponse';
import AIMessage from './AIMessage';
import AILoader from '@/components/Chatbot/AILoader.tsx';

const AIConversation: React.FC<{ messages: { sender: 'ai' | 'user'; text: string }[] , loading: boolean}> = ({ messages, loading }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  return (
    <div
      ref={containerRef}
      style={{ flex: '1 1 0%', minHeight: 0, overflow: 'auto', maxHeight: '55vh' }}
    >
      <View
        backgroundColor="gray-50"
        padding="size-100"
        borderRadius="medium"
        marginBottom="size-200"
        height={'80%'}
      >
        {messages.map((msg, idx) =>
          msg.sender === 'ai'
            ? <AIResponse key={idx} text={msg.text} index={idx} />
            : <AIMessage key={idx} sender="user" text={msg.text} index={idx} />
        )}
        {loading && <AILoader />}
      </View>
    </div>
  );
};

export default AIConversation;
