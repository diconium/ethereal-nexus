import type {Meta, StoryObj} from '@storybook/react-vite';
import React, {useState} from 'react';
import {View, Flex, Text, Divider, Well} from '@adobe/react-spectrum';
import {SpectrumDatamodelField} from '../components/SpectrumDatamodelField';

const meta: Meta<typeof SpectrumDatamodelField> = {
    title: 'Fields/SpectrumDatamodelField',
    component: SpectrumDatamodelField,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component: 'A specialized field component for selecting Content Fragments in AEM. Handles datamodel field values with cf_ prefix management.',
            },
        },
    },
    argTypes: {
        field: {
            description: 'Field configuration object',
            control: 'object',
        },
        value: {
            description: 'Current field value (can be string or object with fragmentPath)',
            control: 'object',
        },
        onChange: {
            description: 'Callback function called when field value changes',
            action: 'changed',
        },
        error: {
            description: 'Error message to display',
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof SpectrumDatamodelField>;

// Basic story with interactive controls
export const Default: Story = {
    args: {
        field: {
            id: 'person',
            name: 'person',
            type: 'datamodel',
            label: 'Person Content Fragment',
            placeholder: 'Select a person content fragment...',
            tooltip: 'Choose a person content fragment to reference',
            required: true,
        },
        value: '',
        error: null,
    },
};

// Story showing the component with an initial value
export const WithInitialValue: Story = {
    args: {
        field: {
            id: 'article',
            name: 'article',
            type: 'datamodel',
            label: 'Article Reference',
            placeholder: 'Select an article...',
            tooltip: 'Reference an existing article content fragment',
            required: false,
        },
        value: {
            cf_article: {
                fragmentPath: '/content/dam/fragments/articles/sample-article'
            }
        },
        error: null,
    },
};

// Interactive demo with state management
export const InteractiveDemo = () => {
    const [personValue, setPersonValue] = useState<any>('');
    const [articleValue, setArticleValue] = useState<any>({
        cf_article: {
            fragmentPath: '/content/dam/fragments/articles/initial-article'
        }
    });
    const [productValue, setProductValue] = useState<any>('');
    const [errors, setErrors] = useState<Record<string, string | null>>({});

    const handlePersonChange = (value: any) => {
        console.log('🔸 [Storybook] Person field changed:', value);
        setPersonValue(value);

        // Simulate validation
        if (!value || (typeof value === 'object' && !value.cf_person?.fragmentPath)) {
            setErrors(prev => ({...prev, person: 'Person is required'}));
        } else {
            setErrors(prev => ({...prev, person: null}));
        }
    };

    const handleArticleChange = (value: any) => {
        console.log('🔸 [Storybook] Article field changed:', value);
        setArticleValue(value);
        setErrors(prev => ({...prev, article: null}));
    };

    const handleProductChange = (value: any) => {
        console.log('🔸 [Storybook] Product field changed:', value);
        setProductValue(value);
        setErrors(prev => ({...prev, product: null}));
    };

    const handleReset = () => {
        setPersonValue('');
        setArticleValue('');
        setProductValue('');
        setErrors({});
    };

    return (
        <View>
            <Text UNSAFE_style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '16px'}}>
                Datamodel Field Interactive Demo
            </Text>
            <Text UNSAFE_style={{marginBottom: '24px', color: '#666'}}>
                This demo shows multiple datamodel fields with different configurations and behaviors.
                Open the browser console to see the value changes and cf_ prefix handling.
            </Text>

            <Flex direction="column" gap="size-300">
                {/* Required field starting empty */}
                <View>
                    <Text UNSAFE_style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '8px'}}>
                        1. Required Field (Empty Start)
                    </Text>
                    <SpectrumDatamodelField
                        field={{
                            id: 'person',
                            name: 'person',
                            type: 'datamodel',
                            label: 'Person Content Fragment',
                            placeholder: 'Select a person content fragment...',
                            tooltip: 'This field is required and starts empty',
                            required: true,
                        }}
                        value={personValue}
                        onChange={handlePersonChange}
                        error={errors.person}
                    />
                </View>

                <Divider/>

                {/* Field with initial value */}
                <View>
                    <Text UNSAFE_style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '8px'}}>
                        2. Field with Initial Value
                    </Text>
                    <SpectrumDatamodelField
                        field={{
                            id: 'article',
                            name: 'article',
                            type: 'datamodel',
                            label: 'Article Reference',
                            placeholder: 'Select an article...',
                            tooltip: 'This field starts with a pre-selected value',
                            required: false,
                        }}
                        value={articleValue}
                        onChange={handleArticleChange}
                        error={errors.article}
                    />
                </View>

                <Divider/>

                {/* Field with cf_ prefix in id */}
                <View>
                    <Text UNSAFE_style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '8px'}}>
                        3. Field with cf_ Prefix in ID
                    </Text>
                    <Text UNSAFE_style={{fontSize: '12px', marginBottom: '8px', color: '#666'}}>
                        This tests the double cf_ prefix bug fix - the field.id already has 'cf_' prefix
                    </Text>
                    <SpectrumDatamodelField
                        field={{
                            id: 'cf_product',
                            name: 'cf_product',
                            type: 'datamodel',
                            label: 'Product Content Fragment',
                            placeholder: 'Select a product...',
                            tooltip: 'Field ID already has cf_ prefix - should not create cf_cf_product',
                            required: false,
                        }}
                        value={productValue}
                        onChange={handleProductChange}
                        error={errors.product}
                    />
                </View>

                <Divider/>

                {/* Debug information */}
                <Well>
                    <Text UNSAFE_style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '12px'}}>
                        Current Values (Debug Info)
                    </Text>
                    <View>
                        <Text UNSAFE_style={{fontSize: '12px', fontFamily: 'monospace'}}>
                            <strong>Person:</strong> {JSON.stringify(personValue, null, 2)}
                        </Text>
                        <Text UNSAFE_style={{fontSize: '12px', fontFamily: 'monospace', marginTop: '8px'}}>
                            <strong>Article:</strong> {JSON.stringify(articleValue, null, 2)}
                        </Text>
                        <Text UNSAFE_style={{fontSize: '12px', fontFamily: 'monospace', marginTop: '8px'}}>
                            <strong>Product:</strong> {JSON.stringify(productValue, null, 2)}
                        </Text>
                    </View>
                </Well>

                {/* Reset button */}
                <Flex justifyContent="center">
                    <button
                        onClick={handleReset}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#2680eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Reset All Fields
                    </button>
                </Flex>
            </Flex>
        </View>
    );
};

// Story demonstrating error handling
export const WithError: Story = {
    args: {
        field: {
            id: 'requiredFragment',
            name: 'requiredFragment',
            type: 'datamodel',
            label: 'Required Content Fragment',
            placeholder: 'This field is required...',
            tooltip: 'This field shows error state',
            required: true,
        },
        value: '',
        error: 'Content fragment selection is required',
    },
};

// Story testing the cf_ prefix edge cases
export const PrefixEdgeCases = () => {
    const [values, setValues] = useState<Record<string, any>>({
        normal: '',
        withPrefix: '',
        nested: {
            cf_existing: {
                fragmentPath: '/content/dam/test/existing'
            }
        }
    });

    const handleFieldChange = (fieldKey: string) => (value: any) => {
        console.log(`🔸 [Storybook] ${fieldKey} changed:`, value);
        setValues(prev => ({
            ...prev,
            [fieldKey]: value
        }));
    };

    return (
        <View>
            <Text UNSAFE_style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '16px'}}>
                cf_ Prefix Edge Cases Test
            </Text>
            <Text UNSAFE_style={{marginBottom: '24px', color: '#666'}}>
                Testing various scenarios to ensure the cf_ prefix bug fix works correctly.
                Check the console to see how field keys are handled.
            </Text>

            <Flex direction="column" gap="size-300">
                <View>
                    <Text UNSAFE_style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '8px'}}>
                        Normal Field ID (no prefix)
                    </Text>
                    <SpectrumDatamodelField
                        field={{
                            id: 'normalField',
                            name: 'normalField',
                            type: 'datamodel',
                            label: 'Normal Field',
                            placeholder: 'Should create cf_normalField key',
                        }}
                        value={values.normal}
                        onChange={handleFieldChange('normal')}
                    />
                </View>

                <View>
                    <Text UNSAFE_style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '8px'}}>
                        Field ID with cf_ prefix
                    </Text>
                    <SpectrumDatamodelField
                        field={{
                            id: 'cf_prefixedField',
                            name: 'cf_prefixedField',
                            type: 'datamodel',
                            label: 'Prefixed Field',
                            placeholder: 'Should create cf_prefixedField key (not cf_cf_prefixedField)',
                        }}
                        value={values.withPrefix}
                        onChange={handleFieldChange('withPrefix')}
                    />
                </View>

                <View>
                    <Text UNSAFE_style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '8px'}}>
                        Field with existing nested value
                    </Text>
                    <SpectrumDatamodelField
                        field={{
                            id: 'existing',
                            name: 'existing',
                            type: 'datamodel',
                            label: 'Existing Value Field',
                            placeholder: 'Has initial value with cf_ structure',
                        }}
                        value={values.nested}
                        onChange={handleFieldChange('nested')}
                    />
                </View>

                <Well>
                    <Text UNSAFE_style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '12px'}}>
                        Current Values (Watch for correct cf_ prefixing)
                    </Text>
                    <Text UNSAFE_style={{fontSize: '12px', fontFamily: 'monospace'}}>
                        {JSON.stringify(values, null, 2)}
                    </Text>
                </Well>
            </Flex>
        </View>
    );
};

// Story demonstrating fallback mode when web component is not available
export const FallbackMode = () => {
    const [value, setValue] = useState<any>('');

    // Mock the web component detection to always return false for this story
    React.useEffect(() => {
        // Override the global customElements for this story only
        const originalGet = customElements.get;
        customElements.get = () => undefined;

        return () => {
            customElements.get = originalGet;
        };
    }, []);

    return (
        <View>
            <Text UNSAFE_style={{fontSize: '18px', fontWeight: 'bold', marginBottom: '16px'}}>
                Fallback Mode Demo
            </Text>
            <Text UNSAFE_style={{marginBottom: '24px', color: '#666'}}>
                This demonstrates how the component behaves when the foundation-autocomplete web component is not
                available.
                Notice the warning message and fallback to a regular text field.
            </Text>

            <SpectrumDatamodelField
                field={{
                    id: 'fallbackTest',
                    name: 'fallbackTest',
                    type: 'datamodel',
                    label: 'Content Fragment (Fallback Mode)',
                    placeholder: 'Enter fragment path manually...',
                    tooltip: 'This field is in fallback mode - web component not available',
                    required: true,
                }}
                value={value}
                onChange={(newValue) => {
                    console.log('🔸 [Storybook Fallback] Value changed:', newValue);
                    setValue(newValue);
                }}
                error={!value ? 'Fragment path is required' : null}
            />

            <Well marginTop="size-200">
                <Text UNSAFE_style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '8px'}}>
                    Current Value:
                </Text>
                <Text UNSAFE_style={{fontSize: '12px', fontFamily: 'monospace'}}>
                    {JSON.stringify(value, null, 2)}
                </Text>
            </Well>
        </View>
    );
};
