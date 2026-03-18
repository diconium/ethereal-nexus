import React, { useEffect, useRef, useState } from 'react';
import { Flex, View, Button, Text } from '@adobe/react-spectrum';
import { SpectrumProvider, I18nProvider } from '@/providers';
import {
  useDialogProcessor,
  DialogConfig,
  FieldConfig,
} from '@ethereal-nexus/dialog-ui-core';
import { SpectrumFieldRendererComponent } from './SpectrumFieldRenderer';
import { useSpectrumAEMAdapter, SpectrumAEMAdapterConfig } from '@/adapters';
import { setDialogMinWidth } from './dialogUtils';
import { getFieldName } from '@/components/getFieldName.ts';
import { FormDataProvider } from '@/components/FormDataContext.tsx';
import { ChatbotColumn } from './ChatbotColumn';

// Custom SVG Star Icon
export const StarIcon = ({ color = 'gray', size = 38 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2L12 2Z" />
    <path d="M19 3L19.7 5.3L22 6L19.7 6.7L19 9L18.3 6.7L16 6L18.3 5.3L19 3Z" />
    <path d="M5 15L5.6 17L7.5 17.6L5.6 18.2L5 20L4.4 18.2L2.5 17.6L4.4 17L5 15Z" />
  </svg>
);

interface EnhancedDialogBodyProps {
  dialog: DialogConfig;
  initialValues?: any;
  adapterConfig?: SpectrumAEMAdapterConfig | null;
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  onSaveSuccess?: (data: any) => void;
  onSaveError?: (error: string) => void;
  chatbotApiUrl?: string;
}

// Enhanced Dialog body component with AEM adapter integration
export const EnhancedDialogBody: React.FC<
  EnhancedDialogBodyProps & { showChatbot?: boolean }
> = ({
  dialog,
  initialValues,
  adapterConfig,
  onSubmit,
  showChatbot = false,
  chatbotApiUrl,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const hasChatbot = Boolean(chatbotApiUrl);

  // If consumer requested the chatbot but didn't provide an API URL,
  // we intentionally remain silent and simply keep the chatbot hidden.
  // This avoids noisy warnings in host applications — the chatbot is an
  // opt-in feature when `chatbotApiUrl` is provided.

  const [isChatbotVisible, setIsChatbotVisible] = useState<boolean>(
    () => !!(showChatbot && hasChatbot),
  );

  console.log('🛠️ [EnhancedDialogBody] Rendering with dialog:', dialog);
  const { formData, updateField, errors, isValid } = useDialogProcessor(
    dialog,
    initialValues,
  );

  // Initialize AEM adapter if configuration is provided
  const aemAdapter = adapterConfig
    ? useSpectrumAEMAdapter(adapterConfig)
    : null;

  // Update global state for external button access
  useEffect(() => {
    // Update global state whenever form data or validation changes
    if (
      typeof window !== 'undefined' &&
      (window as any).updateEtherealFormState
    ) {
      console.log(
        '🔄 EnhancedDialogBody updating global form state - isValid:',
        isValid,
        'hasFormData:',
        !!formData,
      );
      (window as any).updateEtherealFormState(formData, isValid);
    } else {
      console.warn(
        '⚠️ updateEtherealFormState function not available on window',
      );
    }
  }, [formData, isValid]);

  useEffect(() => {
    setDialogMinWidth(rootRef.current);
  }, []);

  // Expose helper functions on window only when the chatbot is available.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (hasChatbot) {
      (window as any).showEtherealAI = () => setIsChatbotVisible(true);
      (window as any).hideEtherealAI = () => setIsChatbotVisible(false);
      (window as any).toggleEtherealAI = () =>
        setIsChatbotVisible((v: boolean) => !v);
    } else {
      // Ensure we don't leak these helpers when chatbot isn't configured.
      delete (window as any).showEtherealAI;
      delete (window as any).hideEtherealAI;
      delete (window as any).toggleEtherealAI;
    }

    return () => {
      delete (window as any).showEtherealAI;
      delete (window as any).hideEtherealAI;
      delete (window as any).toggleEtherealAI;
    };
  }, [hasChatbot]);

  // Notify parent component when form data changes (for live updates in testing)
  useEffect(() => {
    if (onSubmit && !aemAdapter) {
      // Only call onSubmit for live updates if there's no AEM adapter
      // (when AEM adapter exists, onSubmit is only called on actual save)
      onSubmit(formData);
    }
  }, [formData, onSubmit, aemAdapter]);

  // Helper function to get field value with proper nested structure handling
  const getFieldValue = (field: FieldConfig, formData: any): any => {
    const fieldId = getFieldName(field);

    console.log(`🔍 [EnhancedDialogBody] getFieldValue called for field:`, {
      fieldType: field.type,
      fieldId: fieldId,
      fieldLabel: field.label,
      formData: formData,
    });

    // For top-level fields, check if data exists in remote object
    let fieldData = formData[fieldId];

    // If not found at top level and we have a remote object, check inside remote
    if (fieldData === undefined && formData.remote) {
      fieldData = formData.remote[fieldId];
      console.log(
        `🔍 [EnhancedDialogBody] Field ${fieldId} not found at top level, checking remote:`,
        fieldData,
      );
    }

    console.log(
      `🔍 [EnhancedDialogBody] Extracted fieldData for ${fieldId}:`,
      fieldData,
    );

    // Handle different field types
    switch (field.type) {
      case 'group':
        console.log(
          `🔍 [EnhancedDialogBody] Processing GROUP field ${fieldId}`,
        );
        // For groups, return the group content directly (not nested under group key)
        if (fieldData) {
          console.log(
            `🔍 [EnhancedDialogBody] Group ${fieldId} has fieldData:`,
            fieldData,
          );

          // AEM structure: group has active/inactive state and remote object with actual field values
          let groupContent = { ...fieldData };

          // If fieldData has a remote object (AEM structure), merge it for child fields
          if (fieldData.remote && typeof fieldData.remote === 'object') {
            console.log(
              `🔍 [EnhancedDialogBody] Group ${fieldId} has AEM remote structure, merging:`,
              fieldData.remote,
            );
            // Merge the remote data into the group data for easy access by child fields
            Object.assign(groupContent, fieldData.remote);
          }

          // If fieldData contains a nested structure with the group key, extract and merge
          if (fieldData[fieldId] && typeof fieldData[fieldId] === 'object') {
            console.log(
              `🔍 [EnhancedDialogBody] Group ${fieldId} has nested structure, extracting:`,
              fieldData[fieldId],
            );
            const nestedGroupData = fieldData[fieldId];

            // Start with the nested group data
            groupContent = { ...nestedGroupData };

            // If the nested data also has a remote structure, merge it
            if (
              nestedGroupData.remote &&
              typeof nestedGroupData.remote === 'object'
            ) {
              Object.assign(groupContent, nestedGroupData.remote);
            }
          }

          // Ensure the toggle state is properly set - check both direct active and any nested active
          const toggleStateKey = `active`;
          // Priority: direct active > nested active > default true
          let activeState = true; // default
          if (fieldData.active !== undefined) {
            activeState = fieldData.active !== false;
          } else if (fieldData[fieldId]?.active !== undefined) {
            activeState = fieldData[fieldId].active !== false;
          }

          groupContent[toggleStateKey] = activeState;
          console.log(
            `🔍 [EnhancedDialogBody] Group ${fieldId} final data with active state ${activeState}:`,
            groupContent,
          );
          return groupContent;
        }
        console.log(
          `🔍 [EnhancedDialogBody] Group ${fieldId} has no fieldData, returning empty object`,
        );
        return {};

      case 'tabs':
        console.log(
          `🔍 [EnhancedDialogBody] Processing TABS field ${fieldId}, passing through formData:`,
          formData,
        );
        // Tabs should be transparent - pass through the original form data
        // without creating any nested tab structure
        return formData;

      case 'tab':
        console.log(
          `🔍 [EnhancedDialogBody] Processing TAB field ${fieldId}, passing through formData:`,
          formData,
        );
        // Tab should be transparent - pass through the original form data
        // without creating any nested tab structure
        return formData;

      case 'multifield':
        console.log(
          `🔍 [EnhancedDialogBody] Processing MULTIFIELD field ${fieldId}, fieldData:`,
          fieldData,
        );
        // For multifields, ensure we return an array
        const multifieldResult = Array.isArray(fieldData)
          ? fieldData
          : fieldData
            ? [fieldData]
            : [];
        console.log(
          `🔍 [EnhancedDialogBody] Multifield ${fieldId} result:`,
          multifieldResult,
        );
        return multifieldResult;
      case 'datamodel':
        const cfFieldId = 'cf_' + fieldId;
        let cfData = formData[cfFieldId];
        // If not found at top level, check in remote
        if (!cfData && formData.remote) {
          cfData = formData.remote[cfFieldId];
        }
        if (cfData) {
          console.log(
            `🔍 [EnhancedDialogBody] Found cf_ data for ${fieldId}:`,
            cfData,
          );

          // If cfData has fragmentPath, create the structure expected by the component
          if (cfData.fragmentPath) {
            const datamodelValue = {
              fragmentPath: cfData.fragmentPath,
              ...cfData, // Include any other properties
            };
            console.log(
              `🔍 [EnhancedDialogBody] Returning datamodel value:`,
              datamodelValue,
            );
            return datamodelValue;
          }
        }
        return;
      default:
        console.log(
          `🔍 [EnhancedDialogBody] Processing DEFAULT field ${fieldId} (${field.type}), returning:`,
          fieldData,
        );
        // For regular fields, return the value directly
        return fieldData;
    }
  };
  // Helper function to find a field definition in the dialog structure
  const findFieldInDialog = (
    dialog: DialogConfig,
    fieldKey: string,
  ): FieldConfig | null => {
    const searchInFields = (fields: FieldConfig[]): FieldConfig | null => {
      for (const field of fields) {
        if ((field.id || field.name) === fieldKey) {
          return field;
        }
        // Recursively search in children (tabs, groups, etc.)
        if (field.children && Array.isArray(field.children)) {
          const found = searchInFields(field.children);
          if (found) return found;
        }
      }
      return null;
    };

    return searchInFields(dialog.fields);
  };

  // Helper to update form data from chatbot
  const handleChatbotUpdate = (newValues: any) => {
    Object.entries(newValues).forEach(([key, value]) => {
      updateField(key, value);
    });
  };

  return (
    <FormDataProvider formData={formData}>
      <I18nProvider>
        <SpectrumProvider colorScheme="light">
          <div ref={rootRef}>
            <View
              padding="size-200"
              UNSAFE_style={{
                overflowY: 'auto',
                maxHeight: '70vh',
                display: 'block',
                overflow: 'hidden',
              }}
            >
              {/* AI Toggle Button - only render when an API URL is configured */}
              {hasChatbot && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Button
                    variant="secondary"
                    onPress={() => setIsChatbotVisible((v) => !v)}
                    aria-pressed={isChatbotVisible}
                    aria-label={isChatbotVisible ? 'Hide AI' : 'Show AI'}
                  >
                    <StarIcon
                      color={isChatbotVisible ? 'gold' : 'gray'}
                      size={24}
                    />
                    <Text>AI content advisor</Text>
                  </Button>
                </div>
              )}
              <Flex direction="row" gap="size-300" height="100%">
                {/* Left: Form Fields */}
                <View flex="1 1 0%" minWidth={468} maxWidth={578}>
                  <View
                    padding="size-200"
                    UNSAFE_style={{
                      overflowY: 'auto',
                      maxHeight: '70vh',
                      display: 'block',
                    }}
                  >
                    <Flex direction="column" gap="size-300">
                      {dialog?.fields?.map((field: FieldConfig) => (
                        <SpectrumFieldRendererComponent
                          key={getFieldName(field)}
                          field={field}
                          value={getFieldValue(field, formData)}
                          page={adapterConfig?.containingPage}
                          onChange={(value: any) => {
                            if (field.type === 'tabs' || field.type === 'tab') {
                              Object.keys(value).forEach((fieldKey) => {
                                const fieldDef = findFieldInDialog(
                                  dialog,
                                  fieldKey,
                                );
                                const key = fieldDef
                                  ? getFieldName(fieldDef)
                                  : fieldKey;
                                if (formData[key] !== value[key]) {
                                  if (fieldDef?.type === 'datamodel') {
                                    const datamodelKey = `cf_${key}`;
                                    updateField(
                                      datamodelKey,
                                      Object.values(value[key])[0],
                                    );
                                  } else {
                                    updateField(key, value[key]);
                                  }
                                }
                              });
                              return;
                            }
                            const fieldName = getFieldName(field);
                            updateField(fieldName, value);
                          }}
                          error={errors[field.id || field.name]}
                        />
                      ))}
                    </Flex>
                  </View>
                </View>
                {/* Right: Chatbot Column */}
                {isChatbotVisible && hasChatbot && (
                  <View
                    flex="0 0 50%"
                    minWidth={500}
                    maxWidth={500}
                    minHeight={450}
                  >
                    <ChatbotColumn
                      dialog={dialog}
                      initialValues={formData}
                      onUpdateValues={handleChatbotUpdate}
                      apiUrl={chatbotApiUrl ?? undefined}
                    />
                  </View>
                )}
              </Flex>
            </View>
          </div>
        </SpectrumProvider>
      </I18nProvider>
    </FormDataProvider>
  );
};

// TypeScript declaration for custom window properties
declare global {
  interface Window {
    showEtherealAI?: () => void;
    hideEtherealAI?: () => void;
    toggleEtherealAI?: () => void;
  }
}
