// @ts-nocheck
import React, {useEffect, useRef, useState} from 'react';
import {View, Text, Flex, TextField, Well} from "@adobe/react-spectrum";
import Alert from '@spectrum-icons/workflow/Alert';
import {useI18n} from '../providers';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            "foundation-autocomplete": React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement>,
                HTMLElement
            > & {
                name?: string;
                // Add other attributes your web component supports
            };
        }
    }
}

export interface SpectrumDatamodelFieldProps {
    field: any;
    value: string | any; // Allow both string and object types for datamodel values
    onChange: (value: any) => void; // Also update onChange to accept any type
    error?: string | null;
}

export const SpectrumDatamodelField: React.FC<SpectrumDatamodelFieldProps> = ({field, value, onChange, error}) => {
    const {t} = useI18n();
    const inputRef = useRef<any>(null);
    const [isWebComponentAvailable, setIsWebComponentAvailable] = useState<boolean>(true);

    useEffect(() => {
        // Check if Coral is available on the global window object
        if (typeof window !== 'undefined' && (window as any).Coral) {
            setIsWebComponentAvailable(true);
        } else {
            // Also check if foundation-autocomplete custom element is defined
            if (typeof window !== 'undefined' && window.customElements && window.customElements.get('foundation-autocomplete')) {
                setIsWebComponentAvailable(true);
            } else {
                setIsWebComponentAvailable(false);
            }
        }
    }, []);


    // Extract the fragmentPath from datamodel field value
    const extractFragmentPath = (dataValue: any): string => {
        console.log(`🔸 [SpectrumDatamodelField] Extracting fragment path from value for field '${field.id}':`, typeof dataValue, dataValue);
        if (!dataValue) return '';

        // If it's already a string (direct fragmentPath), return it
        if (typeof dataValue === 'string') {
            return dataValue;
        }

        // If it's an object, look for fragmentPath in various structures
        if (typeof dataValue === 'object') {
            // Direct fragmentPath property (legacy format)
            if (dataValue.fragmentPath) {
                return dataValue.fragmentPath;
            }
        }

        return '';
    };
    const [fallbackValue, setFallbackValue] = useState<string>(extractFragmentPath(value));

    // Get the current fragment path value
    const fragmentPath = extractFragmentPath(value);

    const handleFragmentChange = (newFragmentPath: string) => {
        console.log(`🔸 [SpectrumDatamodelField] Fragment path changed for field '${field.id}':`, newFragmentPath);

        // Always ensure cf_ prefix is present
        const fieldKey = field.id.startsWith('cf_') ? field.id : `cf_${field.id}`;

        const datamodelStructure = {
            [fieldKey]: {
                fragmentPath: newFragmentPath || ''
            }
        };

        console.log(`🔸 [SpectrumDatamodelField] Sending datamodel structure for field '${field.id}':`, datamodelStructure);
        onChange(datamodelStructure);
    };

    const handleFallbackChange = (newValue: string) => {
        console.log(`🔸 [SpectrumDatamodelField] Fallback text field changed for field '${field.id}':`, newValue);
        setFallbackValue(newValue);
        handleFragmentChange(newValue);
    };

    // Set the value in the foundation-autocomplete when component mounts or value changes
    useEffect(() => {
        if (inputRef.current && fragmentPath) {
            console.log(`🔸 [SpectrumDatamodelField] Setting fragment path in component for field '${field.name}':`, fragmentPath);
            // Set the value in the coral component
            const tagList = inputRef.current.querySelector('coral-taglist');
            if (tagList) {
                tagList.value = fragmentPath;
            }
        }
    }, [fragmentPath]);

    // Prevent the foundation-autocomplete from submitting its value directly to the form
    useEffect(() => {
        const handleFormSubmission = (event: Event) => {
            if (inputRef.current) {
                // Disable the foundation-autocomplete from participating in form submission
                const tagList = inputRef.current.querySelector('coral-taglist');
                if (tagList) {
                    tagList.removeAttribute('name');
                }
            }
        };

        // Find the parent form and add event listener
        if (inputRef.current) {
            const form = inputRef.current.closest('form');
            if (form) {
                form.addEventListener('submit', handleFormSubmission);
                return () => form.removeEventListener('submit', handleFormSubmission);
            }
        }
    }, []);

    return (
        <View>
            <Text UNSAFE_style={{fontSize: '12px', marginBottom: '8px'}}>
                {t(field.label ?? '')}
                {field.required && <span style={{color: 'red'}}> *</span>}
            </Text>
            {error && (
                <Text UNSAFE_style={{color: 'red', fontSize: '12px', marginBottom: '8px'}}>
                    {error}
                </Text>
            )}
            {!isWebComponentAvailable && (
                <Well marginBottom="size-100">
                    <Flex alignItems="start" gap="size-100">
                        <Alert size="S" color="notice"/>
                        <View flex="1">
                            <Text UNSAFE_style={{fontSize: '12px', color: '#bf7000'}}>
                                <strong>{t('spectrum.datamodel.notice') || 'Notice:'}</strong> {t('spectrum.datamodel.noticeText') || 'Content Fragment picker is not available. Please enter the fragment path manually (e.g., /content/dam/fragments/my-fragment).'}
                            </Text>
                            <Text UNSAFE_style={{fontSize: '11px', color: '#666', marginTop: '4px'}}>
                                {t('spectrum.datamodel.fallback') || 'This fallback mode requires the AEM foundation-autocomplete web component to be loaded.'}
                            </Text>
                        </View>
                    </Flex>
                </Well>
            )}
            <Flex gap="size-100" alignItems="center">
                {/*Content Fragment picker for datamodel field*/}
                {isWebComponentAvailable ? (
                    <foundation-autocomplete
                        className="coral-Form-field"
                        data-cmp-id={field.name}
                        placeholder={t(field.placeholder ?? '') || "Enter or select Content Fragment"}
                        pickersrc="/mnt/overlay/dam/cfm/content/cfpicker/picker.html{value}?root=%2fcontent%2fdam&filter=hierarchyNotFile&selectionCount=single"
                        data-foundation-validation={field.required ? "required" : ""}
                        ref={inputRef}
                        onChange={(e: any) => {
                            // Try to get value from event or input
                            const newValue = e?.detail?.value || e?.target?.value || '';
                            console.log(`🔸 [SpectrumDatamodelField] Raw change event for field '${field.name}':`, newValue);
                            handleFragmentChange(newValue);
                        }}
                    >
                        <coral-overlay
                            foundation-autocomplete-suggestion=""
                            className="foundation-picker-buttonlist"
                            data-foundation-picker-buttonlist-src="/mnt/overlay/dam/cfm/content/cfpicker/suggestion{.offset,limit}.html?root=%2fcontent%2fdam&filter=hierarchyNotFile{&query}"
                        ></coral-overlay>
                        <coral-taglist
                            foundation-autocomplete-value=""
                        ></coral-taglist>
                    </foundation-autocomplete>
                ) : (
                    // Fallback to regular text field if web component is not available
                    <TextField
                        placeholder={t(field.placeholder ?? '')}
                        value={fallbackValue}
                        onChange={handleFallbackChange}
                        isRequired={field.required}
                        errorMessage={error || ''}
                        width="100%"
                    />
                )}
                {field.tooltip && (
                    <Text UNSAFE_style={{fontSize: '12px', color: '#666', marginBottom: '8px'}}>
                        {t(field.tooltip ?? '')}
                    </Text>
                )}
            </Flex>
            <style>{`
                .spectrum-Datamodel input[is="coral-textfield"] {
                    font-family: var(--spectrum-font-family, "Adobe Clean", Arial, sans-serif);
                    font-size: var(--spectrum-textfield-text-size,var(--spectrum-alias-font-size-default));
                    background: var(--spectrum-global-color-gray-50, #fff);
                    border: 1px solid var(--spectrum-global-color-gray-400, #d1d1d1);
                    border-top-left-radius: 4px;
                    border-bottom-left-radius: 4px;
                    padding: 8px 12px;
                    color: var(--spectrum-global-color-gray-900, #222);
                    box-shadow: none;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .spectrum-Datamodel input[is="coral-textfield"]:focus {
                    border-color: var(--spectrum-global-color-blue-400, #2680eb);
                    box-shadow: 0 0 0 2px var(--spectrum-global-color-blue-200, #cce4ff);
                }
            `}</style>
        </View>
    );
};
