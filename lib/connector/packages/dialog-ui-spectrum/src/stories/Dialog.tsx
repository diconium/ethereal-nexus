import React from 'react';
import {
  ActionButton,
  ButtonGroup,
  Content,
  Dialog as SpectrumDialog,
  DialogTrigger,
  Divider,
  Heading,
  Button,
  Flex,
  View,
  Text
} from "@adobe/react-spectrum";
import { SpectrumProvider } from "../providers/SpectrumProvider";
import { useDialogProcessor, DialogProps } from '@ethereal-nexus/dialog-ui-core';
import { SpectrumFieldRendererComponent } from '../components/SpectrumFieldRenderer';

// Main Dialog component - pure UI logic, business logic comes from core
export const Dialog: React.FC<DialogProps> = ({
  dialog,
  onSubmit,
  onCancel
}) => {
  //TODO: Handle initial values from content-resource if provided
  const initialValues = {};
  const { formData, updateField, errors, isValid, resetForm } = useDialogProcessor(dialog,initialValues);

  const handleSubmit = () => {
    if (isValid && onSubmit) {
      onSubmit(formData);
    }
  };

  const handleCancel = () => {
    resetForm();
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <SpectrumProvider colorScheme="light">
      <DialogTrigger>
        <ActionButton>Open Dialog</ActionButton>
        {(close) => (
          <SpectrumDialog size="L">
            <Heading>Component Configuration</Heading>
            <Divider />
            <Content>
              <Flex direction="column" gap="size-300">
                {dialog.fields.map(field => (
                  <SpectrumFieldRendererComponent
                    key={field.name}
                    field={field}
                    value={formData[field.name]}
                    onChange={(value) => updateField(field.name, value)}
                    error={errors[field.name] || undefined}
                  />
                ))}

                {/* Form State Display for Development */}
                <Divider />
                <View>
                  <Text UNSAFE_style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                    Current Form Data:
                  </Text>
                  <pre style={{
                    backgroundColor: '#f8f9fa',
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                    maxHeight: '200px',
                    border: '1px solid #e0e0e0'
                  }}>
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                </View>
              </Flex>
            </Content>
            <ButtonGroup>
              <Button
                variant="secondary"
                onPress={() => {
                  handleCancel();
                  close();
                }}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                onPress={() => {
                  handleSubmit();
                  close();
                }}
                isDisabled={!isValid}
              >
                Save
              </Button>
            </ButtonGroup>
          </SpectrumDialog>
        )}
      </DialogTrigger>
    </SpectrumProvider>
  );
};
