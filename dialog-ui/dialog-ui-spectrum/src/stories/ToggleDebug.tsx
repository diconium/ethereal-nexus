import React, { useState } from 'react';
import { View, Text } from '@adobe/react-spectrum';
import { SpectrumFieldRendererComponent } from '../components/SpectrumFieldRenderer';

// Simple debug component to test showastoggle
export const ToggleDebugTest: React.FC = () => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleFieldChange = (fieldName: string, value: any) => {
    console.log('Field change:', fieldName, value);
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const testToggleGroup = {
    id: 'debugToggle',
    name: 'debugToggle',
    type: 'group',
    label: 'Debug Toggle Group',
    tooltip: 'This should show a toggle switch',
    showastoggle: true,
    children: [
      {
        id: 'testField',
        name: 'testField',
        type: 'textfield',
        label: 'Test Field',
        placeholder: 'Enter some text'
      }
    ]
  };

  return (
    <View padding="size-400" maxWidth="600px">
      <Text UNSAFE_style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
        Toggle Debug Test
      </Text>

      <Text UNSAFE_style={{ marginBottom: '10px', fontSize: '14px' }}>
        Field config showastoggle: {String(testToggleGroup.showastoggle)}
      </Text>

      <SpectrumFieldRendererComponent
        field={testToggleGroup}
        value={formData[testToggleGroup.name]}
        onChange={(value) => handleFieldChange(testToggleGroup.name, value)}
      />

      <View marginTop="size-300">
        <Text UNSAFE_style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
          Current Form Data:
        </Text>
        <Text UNSAFE_style={{
          fontSize: '12px',
          fontFamily: 'monospace',
          backgroundColor: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap'
        }}>
          {JSON.stringify(formData, null, 2)}
        </Text>
      </View>
    </View>
  );
};
