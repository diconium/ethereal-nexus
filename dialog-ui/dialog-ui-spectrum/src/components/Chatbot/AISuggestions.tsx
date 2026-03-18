import React from 'react';
import { Flex, Button } from '@adobe/react-spectrum';

const AISuggestions: React.FC<{ suggestions: string[]; onSelect: (s: string) => void }> = ({ suggestions, onSelect }) => (
  <Flex
    direction="row"
    gap="size-100"
    marginTop="size-100"
    marginBottom="size-200"
    UNSAFE_style={{
      overflowX: 'auto',
      overflowY: 'hidden',
      whiteSpace: 'nowrap',
      maxHeight: 40,
      alignItems: 'center',
      scrollbarWidth: 'thin',
    }}
  >
    {suggestions.map((s, i) => (
      <Button
        variant="secondary"
        key={i}
        onPress={() => onSelect(s)}
      >
        {s}
      </Button>
    ))}
  </Flex>
);

export default AISuggestions;
