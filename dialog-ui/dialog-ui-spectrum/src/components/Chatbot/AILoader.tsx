import React from 'react';
import { Flex, Text } from '@adobe/react-spectrum';

const AILoader: React.FC = () => (
  <Flex alignItems="center" gap="size-100" marginY="size-100">
    <div className="ai-loader" style={{ width: 24, height: 24, display: 'inline-block' }}>
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="#007aff" strokeWidth="3" fill="none" strokeDasharray="60" strokeDashoffset="20">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
    <Text>AI is thinking…</Text>
  </Flex>
);

export default AILoader;

