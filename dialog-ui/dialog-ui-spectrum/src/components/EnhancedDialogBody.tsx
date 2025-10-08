import React, {useEffect, useRef} from 'react';
import {
    Flex,
    View,
} from "@adobe/react-spectrum";
import {SpectrumProvider} from "../providers/SpectrumProvider";
import {I18nProvider} from "../providers/I18nProvider";
import {
    useDialogProcessor,
    DialogConfig,
    FieldConfig
} from '@ethereal-nexus/dialog-ui-core';
import {SpectrumFieldRendererComponent} from './SpectrumFieldRenderer';
import {useSpectrumAEMAdapter, SpectrumAEMAdapterConfig} from '../adapters';
import {setDialogMinWidth} from './dialogUtils';

interface EnhancedDialogBodyProps {
    dialog: DialogConfig;
    initialValues?: any;
    adapterConfig?: SpectrumAEMAdapterConfig;
    onSubmit?: (data: any) => void;
    onCancel?: () => void;
    onSaveSuccess?: (data: any) => void;
    onSaveError?: (error: string) => void;
}

// Enhanced Dialog body component with AEM adapter integration
export const EnhancedDialogBody: React.FC<EnhancedDialogBodyProps> = ({
                                                                          dialog,
                                                                          initialValues,
                                                                          adapterConfig,
                                                                          onSubmit,
                                                                      }) => {
    const rootRef = useRef<HTMLDivElement>(null);

    console.log('🛠️ [EnhancedDialogBody] Rendering with dialog:', dialog);
    const {formData, updateField, errors, isValid} = useDialogProcessor(dialog, initialValues);

    // Initialize AEM adapter if configuration is provided
    const aemAdapter = adapterConfig ? useSpectrumAEMAdapter(adapterConfig) : null;

    // Update global state for external button access
    useEffect(() => {
        // Update global state whenever form data or validation changes
        if (typeof window !== 'undefined' && (window as any).updateEtherealFormState) {
            console.log('🔄 EnhancedDialogBody updating global form state - isValid:', isValid, 'hasFormData:', !!formData);
            (window as any).updateEtherealFormState(formData, isValid);
        } else {
            console.warn('⚠️ updateEtherealFormState function not available on window');
        }
    }, [formData, isValid]);

    useEffect(() => {
        setDialogMinWidth(rootRef.current);
    }, []);


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
        const fieldId = field.id || field.name;

        console.log(`🔍 [EnhancedDialogBody] getFieldValue called for field:`, {
            fieldType: field.type,
            fieldId: fieldId,
            fieldLabel: field.label,
            formData: formData
        });

        // For top-level fields, check if data exists in remote object
        let fieldData = formData[fieldId];

        // If not found at top level and we have a remote object, check inside remote
        if (fieldData === undefined && formData.remote) {
            fieldData = formData.remote[fieldId];
            console.log(`🔍 [EnhancedDialogBody] Field ${fieldId} not found at top level, checking remote:`, fieldData);
        }

        console.log(`🔍 [EnhancedDialogBody] Extracted fieldData for ${fieldId}:`, fieldData);

        // Handle different field types
        switch (field.type) {
            case 'group':
                console.log(`🔍 [EnhancedDialogBody] Processing GROUP field ${fieldId}`);
                // For groups, return the group content directly (not nested under group key)
                if (fieldData) {
                    console.log(`🔍 [EnhancedDialogBody] Group ${fieldId} has fieldData:`, fieldData);

                    // AEM structure: group has active/inactive state and remote object with actual field values
                    let groupContent = {...fieldData};

                    // If fieldData has a remote object (AEM structure), merge it for child fields
                    if (fieldData.remote && typeof fieldData.remote === 'object') {
                        console.log(`🔍 [EnhancedDialogBody] Group ${fieldId} has AEM remote structure, merging:`, fieldData.remote);
                        // Merge the remote data into the group data for easy access by child fields
                        Object.assign(groupContent, fieldData.remote);
                    }

                    // If fieldData contains a nested structure with the group key, extract and merge
                    if (fieldData[fieldId] && typeof fieldData[fieldId] === 'object') {
                        console.log(`🔍 [EnhancedDialogBody] Group ${fieldId} has nested structure, extracting:`, fieldData[fieldId]);
                        const nestedGroupData = fieldData[fieldId];

                        // Start with the nested group data
                        groupContent = {...nestedGroupData};

                        // If the nested data also has a remote structure, merge it
                        if (nestedGroupData.remote && typeof nestedGroupData.remote === 'object') {
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
                    console.log(`🔍 [EnhancedDialogBody] Group ${fieldId} final data with active state ${activeState}:`, groupContent);
                    return groupContent;
                }
                console.log(`🔍 [EnhancedDialogBody] Group ${fieldId} has no fieldData, returning empty object`);
                return {};

            case 'tabs':
                console.log(`🔍 [EnhancedDialogBody] Processing TABS field ${fieldId}, passing through formData:`, formData);
                // Tabs should be transparent - pass through the original form data
                // without creating any nested tab structure
                return formData;

            case 'tab':
                console.log(`🔍 [EnhancedDialogBody] Processing TAB field ${fieldId}, passing through formData:`, formData);
                // Tab should be transparent - pass through the original form data
                // without creating any nested tab structure
                return formData;

            case 'multifield':
                console.log(`🔍 [EnhancedDialogBody] Processing MULTIFIELD field ${fieldId}, fieldData:`, fieldData);
                // For multifields, ensure we return an array
                const multifieldResult = Array.isArray(fieldData) ? fieldData : (fieldData ? [fieldData] : []);
                console.log(`🔍 [EnhancedDialogBody] Multifield ${fieldId} result:`, multifieldResult);
                return multifieldResult;
            case 'datamodel':

                const cfFieldId = 'cf_' + fieldId;
                let cfData = formData[cfFieldId];
                // If not found at top level, check in remote
                if (!cfData && formData.remote) {
                    cfData = formData.remote[cfFieldId];
                }
                if (cfData) {
                    console.log(`🔍 [EnhancedDialogBody] Found cf_ data for ${fieldId}:`, cfData);

                    // If cfData has fragmentPath, create the structure expected by the component
                    if (cfData.fragmentPath) {
                        const datamodelValue = {
                            fragmentPath: cfData.fragmentPath,
                            ...cfData // Include any other properties
                        };
                        console.log(`🔍 [EnhancedDialogBody] Returning datamodel value:`, datamodelValue);
                        return datamodelValue;
                    }
                }
                return
            default:
                console.log(`🔍 [EnhancedDialogBody] Processing DEFAULT field ${fieldId} (${field.type}), returning:`, fieldData);
                // For regular fields, return the value directly
                return fieldData;
        }
    };
// Helper function to find a field definition in the dialog structure
    const findFieldInDialog = (dialog: DialogConfig, fieldKey: string): FieldConfig | null => {
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
    return (
        <I18nProvider>
            <SpectrumProvider colorScheme="light">
                <div ref={rootRef}>
                    <View padding="size-200" UNSAFE_style={{overflowY: 'auto', maxHeight: '70vh', display: 'block'}}>

                        {/* Form Fields */}
                        <Flex direction="column" gap="size-300">
                            {dialog.fields.map((field: FieldConfig) => (
                                <SpectrumFieldRendererComponent
                                    key={field.id || field.name}
                                    field={field}
                                    value={getFieldValue(field, formData)}
                                    page={adapterConfig?.containingPage}
                                    onChange={(value: any) => {
                                        // For transparent fields (tabs, tab), they should not call updateField
                                        // as they pass changes through directly. However, we need to handle the case
                                        // where fields are directly inside tabs/tab (not inside groups).

                                        if (field.type === 'tabs' || field.type === 'tab') {
                                            console.log(`🔍 [EnhancedDialogBody] Transparent field ${field.type} received onChange, but checking if this contains direct field updates`);

                                            // For transparent fields, we need to merge the changes into formData
                                            // This handles cases where fields are directly in tabs/tab (not in groups)
                                            const updatedFormData = {...formData, ...value};
                                            console.log(`🔍 [EnhancedDialogBody] Merging transparent field changes into formData:`, updatedFormData);

                                            // We need to manually trigger the form data update since tabs/tab don't call updateField
                                            // Find what actually changed and update those fields
                                            Object.keys(value).forEach(key => {
                                                if (formData[key] !== value[key]) {
                                                    // Find the field definition to check if it's a datamodel
                                                    const fieldDef = findFieldInDialog(dialog, key);

                                                    if (fieldDef?.type === 'datamodel') {
                                                        const datamodelKey = `cf_${key}`;
                                                        console.log(`🔍 [EnhancedDialogBody] Datamodel field ${key} changed, updating with cf_ prefix:`, datamodelKey, value[key]);
                                                        updateField(datamodelKey, Object.values(value[key])[0]);
                                                    } else {
                                                        console.log(`🔍 [EnhancedDialogBody] Field ${key} changed from ${formData[key]} to ${value[key]}, updating`);
                                                        updateField(key, value[key]);
                                                    }
                                                }
                                            });

                                            return;
                                        }
                                        console.log(`🔍 [EnhancedDialogBody] Calling updateField for ${field.type} field:`, field.id || field.name, value);
                                        updateField(field.id || field.name, value);
                                    }}
                                    error={errors[field.id || field.name]}
                                />
                            ))}
                        </Flex>
                    </View>
                </div>
            </SpectrumProvider>
        </I18nProvider>
    );
};
