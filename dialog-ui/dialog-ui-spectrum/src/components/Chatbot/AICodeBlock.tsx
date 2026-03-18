import React from 'react';

const AICodeBlock: React.FC<{ code: string; language?: string }> = ({ code }) => (
  <pre style={{ background: '#f5f5f5', borderRadius: 4, padding: 8, fontSize: 13, overflowX: 'auto', margin: '8px 0' }}>
    <code>{code}</code>
  </pre>
);

export default AICodeBlock;

