import React, { useState } from 'react';
import { View, Text, ActionButton, Flex } from '@adobe/react-spectrum';
import AICodeBlock from './AICodeBlock';

function extractImage(text: string): { imageUrl?: string; alt?: string; rest: string } {
  // Markdown image: ![alt](url)
  const mdImg = text.match(/!\[(.*?)\]\((.*?)\)/);
  if (mdImg) {
    return { imageUrl: mdImg[2], alt: mdImg[1], rest: text.replace(mdImg[0], '') };
  }
  // Direct URL (simple heuristic)
  const urlMatch = text.match(/(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp))/);
  if (urlMatch) {
    return { imageUrl: urlMatch[1], alt: '', rest: text.replace(urlMatch[1], '') };
  }
  return { rest: text };
}

const AIMessage: React.FC<{ sender: 'ai' | 'user'; text: string; index?: number }> = ({ sender, text, index }) => {
  const [feedback, setFeedback] = useState<'up' | 'down' | undefined>();
  // Detect code blocks (triple backticks)
  const codeMatch = text.match(/```([\s\S]*?)```/);
  const { imageUrl, alt, rest } = extractImage(text);

  // Show feedback only for AI messages and index % 50 === 0
  const showFeedback = sender === 'ai' && typeof index === 'number' && index % 50 === 0;

  return (
    <View marginBottom="size-100" UNSAFE_style={{ textAlign: sender === 'user' ? 'right' : 'left' }}>
      {sender === 'user' ? (
        <div
          style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #007aff 0%, #4f8cff 100%)',
            color: '#fff',
            borderRadius: '16px', // Match suggestions
            padding: '4px 12px', // Match suggestions
            maxWidth: '70%',
            marginLeft: 'auto',
            marginRight: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            wordBreak: 'break-word',
          }}
        >
          <Text UNSAFE_style={{ color: '#fff', fontSize: 13 }}>{rest}</Text>
        </div>
      ) : (
        <>
          {/* Render code block if present */}
          {codeMatch ? (
            <>
              {rest.split('```')[0] && <Text>{rest.split('```')[0]}</Text>}
              <AICodeBlock code={codeMatch[1]} />
              {rest.split('```')[2] && <Text>{rest.split('```')[2]}</Text>}
            </>
          ) : (
            <Text UNSAFE_style={{ color: '#333' }}>{rest}</Text>
          )}
        </>
      )}
      {/* Render image if present */}
      {imageUrl && (
        <img src={imageUrl} alt={alt} style={{ maxWidth: '100%', borderRadius: 8, margin: '8px 0' }} />
      )}
      {/* Feedback controls for AI messages only, 2% */}
      {showFeedback && (
        <Flex gap="size-100" marginTop="size-50">
          <ActionButton onPress={() => setFeedback('up')} aria-label="Thumbs up">
            <span style={{ color: feedback === 'up' ? '#007aff' : undefined }}>👍</span>
          </ActionButton>
          <ActionButton onPress={() => setFeedback('down')} aria-label="Thumbs down">
            <span style={{ color: feedback === 'down' ? '#007aff' : undefined }}>👎</span>
          </ActionButton>
        </Flex>
      )}
    </View>
  );
};

export default AIMessage;
