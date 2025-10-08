import React, {useEffect, useState} from 'react';
import {
    Content,
    ContextualHelp,
    Flex,
    Heading,
    Text,
    View,
    Picker,
    Item,
    ComboBox,
    TagGroup,
    ProgressCircle
} from "@adobe/react-spectrum";
import {FieldConfig, FieldRendererProps} from '@ethereal-nexus/dialog-ui-core';
import {handleIsolationCSS} from "./popoverUtils";
import {useI18n} from '../providers';

interface DataSourceOption {
    value: string;
    label: string;
}

export interface SpectrumDataSourceFieldProps extends FieldRendererProps {
    field: FieldConfig;
    value: any;
    onChange: (value: any) => void;
    error?: string | null;
}

export const SpectrumDataSourceField: React.FC<SpectrumDataSourceFieldProps> = ({
                                                                                    field,
                                                                                    value,
                                                                                    onChange,
                                                                                    error,
                                                                                    page,
                                                                                }) => {
    const {t} = useI18n();
    const [options, setOptions] = useState<DataSourceOption[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    // Initialize with default values
    useEffect(() => {
        if (value === undefined || value === null) {
            if (field.defaultValue !== undefined) {
                if (field.multiple) {
                    const defaultArray = Array.isArray(field.defaultValue)
                        ? field.defaultValue.filter((item): item is string => typeof item === 'string' && item !== null)
                        : typeof field.defaultValue === 'string' && field.defaultValue !== null
                            ? [field.defaultValue]
                            : [];
                    setSelectedItems(defaultArray);
                    onChange(defaultArray);
                } else {
                    onChange(field.defaultValue);
                }
            } else if (field.multiple) {
                setSelectedItems([]);
                onChange([]);
            }
        } else if (field.multiple && Array.isArray(value)) {
            setSelectedItems(value);
        }
    }, [field.defaultValue, field.multiple, value, onChange]);

    // Helper function to check if URL is relative
    const isRelativeUrl = (url: string): boolean => {
        try {
            // If URL constructor doesn't throw, it's absolute
            new URL(url);
            return false;
        } catch {
            // If URL constructor throws, it's relative
            return true;
        }
    };

    // Helper function to get CSRF token
    async function getCSRFToken() {
        const res = await fetch('/libs/granite/csrf/token.json', {
            credentials: 'include' // important for cookies
        });
        const data = await res.json();
        return data.token;
    }

    // Helper function to get current path
    const getCurrentPath = (): string => {

        if (page) {
            return page;
        }

        // Try to get path from window location first
        if (typeof window !== 'undefined') {
            let path = window.location.pathname;

            // Remove /editor.html/ from the beginning if present
            if (path.startsWith('/editor.html/')) {
                path = '/' + path.substring('/editor.html/'.length);
            }

            // Remove .html from the end if present
            if (path.endsWith('.html')) {
                path = path.substring(0, path.length - '.html'.length);
            }

            return path;
        }
        return '';
    };

    // Helper function to add path parameter to URL
    const addPathParameterToUrl = (url: string): string => {
        try {
            const currentPath = getCurrentPath();
            if (!currentPath) {
                return url;
            }

            const urlObj = new URL(url, window.location.origin);

            // Check if path parameter already exists
            if (!urlObj.searchParams.has('path')) {
                urlObj.searchParams.set('path', currentPath);
            }

            return urlObj.toString();
        } catch (error) {
            console.warn('Error adding path parameter to URL:', error);
            return url;
        }
    };

    // Fetch data from URL
    useEffect(() => {
        const fetchData = async () => {
            if (!field.url) {
                setFetchError('No URL provided');
                return;
            }

            setLoading(true);
            setFetchError(null);

            try {
                const isRelative = isRelativeUrl(field.url);

                // Add path parameter to URL
                const urlWithPath = addPathParameterToUrl(field.url);

                const headers: HeadersInit = {};

                // Add Content-Type for POST/PUT/PATCH requests
                const method = (field.method || 'POST').toUpperCase();
                if (['POST', 'PUT', 'PATCH'].includes(method)) {
                    headers['Content-Type'] = 'application/json';
                }

                const csrfToken = await getCSRFToken();

                if (csrfToken) {
                    headers['CSRF-Token'] = csrfToken;
                }

                const requestOptions: RequestInit = {
                    method: method,
                    headers: headers,
                    credentials: isRelative ? 'same-origin' : 'omit',
                    mode: isRelative ? 'same-origin' : 'cors',
                    cache: 'no-cache',
                    redirect: 'follow',
                };

                // Add body for POST/PUT/PATCH requests
                if (['POST', 'PUT', 'PATCH'].includes(method) && field.body) {
                    requestOptions.body = JSON.stringify(field.body);
                }

                const response = await fetch(urlWithPath, requestOptions);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
                }

                const data = await response.json();

                // Validate response format
                if (!Array.isArray(data)) {
                    throw new Error('Response must be an array of objects with value and label properties');
                }

                const formattedOptions: DataSourceOption[] = data.map((item: any, index: number) => {
                    if (typeof item !== 'object' || item === null) {
                        throw new Error(`Invalid item at index ${index}: must be an object`);
                    }

                    return {
                        value: item.value || item.key || String(index),
                        label: item.label || item.name || item.value || item.key || String(index)
                    };
                });

                setOptions(formattedOptions);
            } catch (err) {
                console.error('Error fetching data source:', err);
                setFetchError(err instanceof Error ? err.message : 'Failed to fetch data');
                setOptions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [field.url, field.method, field.body]);

    const handleSingleSelectionChange = (selectedKey: any) => {
        onChange(selectedKey);
    };

    const handleMultipleSelectionChange = (selectedKey: any) => {
        if (selectedKey) {
            const newSelection = [...selectedItems];
            const index = newSelection.indexOf(selectedKey);

            if (index === -1) {
                newSelection.push(selectedKey);
            } else {
                newSelection.splice(index, 1);
            }

            setSelectedItems(newSelection);
            onChange(newSelection);
        }
    };

    const handleTagRemove = (tagValue: string) => {
        const newSelection = selectedItems.filter(item => item !== tagValue);
        setSelectedItems(newSelection);
        onChange(newSelection);
    };

    const getSelectedLabel = (optionValue: string) => {
        const option = options.find(opt => opt.value === optionValue);
        return option?.label || optionValue;
    };

    // Show loading state
    if (loading) {
        return (
            <View>
                <Flex alignItems="center" justifyContent="space-between" marginBottom="size-100">
                    <Text UNSAFE_style={{fontSize: '12px'}}>
                        {t(field.label ?? '')}
                        {field.required && <span style={{color: 'red'}}> *</span>}
                    </Text>

                    {field.tooltip && (
                        <ContextualHelp variant="info">
                            <Heading>{t('spectrum.datasource.help') || 'Help'}</Heading>
                            <Content>
                                <Text>{t(field.tooltip ?? '')}</Text>
                            </Content>
                        </ContextualHelp>
                    )}
                </Flex>

                <Flex alignItems="center" gap="size-100">
                    <ProgressCircle size="S" isIndeterminate
                                    aria-label={t('spectrum.datasource.loading') || 'Loading options'}/>
                    <Text
                        UNSAFE_style={{fontSize: '14px'}}>{t('spectrum.datasource.loading') || 'Loading options...'}</Text>
                </Flex>
            </View>
        );
    }

    // Show error state
    if (fetchError) {
        return (
            <View>
                <Flex alignItems="center" justifyContent="space-between" marginBottom="size-100">
                    <Text UNSAFE_style={{fontSize: '12px'}}>
                        {t(field.label ?? '')}
                        {field.required && <span style={{color: 'red'}}> *</span>}
                    </Text>

                    {field.tooltip && (
                        <ContextualHelp variant="info">
                            <Heading>{t('spectrum.datasource.help') || 'Help'}</Heading>
                            <Content>
                                <Text>{t(field.tooltip ?? '')}</Text>
                            </Content>
                        </ContextualHelp>
                    )}
                </Flex>

                <Text UNSAFE_style={{color: 'red', fontSize: '12px', marginBottom: '8px'}}>
                    {t('spectrum.datasource.error') || 'Datasource: Error loading options:'} {fetchError}
                </Text>
            </View>
        );
    }

    // Multiple selection mode
    if (field.multiple) {
        return (
            <Flex direction="column" gap="size-100">
                <ComboBox
                    label={t(field.label ?? '')}
                    placeholder={t(field.placeholder ?? '')}
                    onSelectionChange={handleMultipleSelectionChange}
                    isRequired={field.required}
                    validationState={error ? "invalid" : "valid"}
                    errorMessage={error || undefined}
                    description={t(field.tooltip ?? '') || undefined}
                    width="100%"
                    onOpenChange={handleIsolationCSS}
                    selectedKey={null} // Always reset selection after choosing
                    isDisabled={options.length === 0}
                >
                    {options.map((option) => (
                        <Item key={option.value}>{t(option.label ?? '')}</Item>
                    ))}
                </ComboBox>

                {selectedItems.length > 0 && (
                    <TagGroup
                        aria-label={t('spectrum.datasource.selectedItems') || 'Selected items'}
                        onRemove={(keys) => {
                            const removedKey = Array.from(keys)[0] as string;
                            handleTagRemove(removedKey);
                        }}
                    >
                        {selectedItems.map((item) => (
                            <Item key={item}>{t(getSelectedLabel(item) ?? '')}</Item>
                        ))}
                    </TagGroup>
                )}
            </Flex>
        );
    }

    // Single selection mode
    return (
        <Picker
            label={t(field.label ?? '')}
            placeholder={t(field.placeholder ?? '')}
            selectedKey={value || field.defaultValue || ''}
            onSelectionChange={handleSingleSelectionChange}
            isRequired={field.required}
            validationState={error ? "invalid" : "valid"}
            errorMessage={error || undefined}
            description={t(field.tooltip ?? '') || undefined}
            width="100%"
            onOpenChange={handleIsolationCSS}
            isDisabled={options.length === 0}
        >
            {options.map((option) => (
                <Item key={option.value}>{t(option.label ?? '')}</Item>
            ))}
        </Picker>
    );
};
