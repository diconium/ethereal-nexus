import React from 'react';
import AIMessage from './AIMessage';

const AIResponse: React.FC<{ text: string; index: number }> = ({ text, index }) => {
  // For now, just use AIMessage with sender='ai'
  return <AIMessage sender="ai" text={text} index={index} />;
};

export default AIResponse;
