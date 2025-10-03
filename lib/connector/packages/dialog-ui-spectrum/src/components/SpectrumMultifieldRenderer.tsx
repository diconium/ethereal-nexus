import React from 'react';
import {
    View,
    Flex,
    Text,
    ActionButton,
    Accordion,
    Disclosure,
    DisclosureTitle,
    DisclosurePanel
} from '@adobe/react-spectrum';
import Add from '@spectrum-icons/workflow/Add';
import Delete from '@spectrum-icons/workflow/Delete';
import ChevronUp from '@spectrum-icons/workflow/ChevronUp';
import ChevronDown from '@spectrum-icons/workflow/ChevronDown';
import {FieldRenderLogic, MultifieldRendererProps} from '@ethereal-nexus/dialog-ui-core';
import {SpectrumFieldRendererComponent} from './SpectrumFieldRenderer';
import {useI18n} from '../providers';

const SpectrumMultifieldRenderer: React.FC<MultifieldRendererProps> = ({field, value, onChange, error, path, page }) => {
    const {t} = useI18n();
    const arrayValue = Array.isArray(value) ? value : [];

    const addItem = () => {
        const newValue = FieldRenderLogic.addMultifieldItem(arrayValue, field);
        onChange(newValue);
    };

    const removeItem = (index: number) => {
        const newValue = FieldRenderLogic.removeMultifieldItem(arrayValue, index);
        onChange(newValue);
    };

    const updateItem = (index: number, childName: string, childValue: any) => {
        const childField = field.children?.find(f => (f.id || f.name) === childName);

        let actualFieldName = childName;
        let actualFieldValue = childValue;

        if (childField?.type === 'datamodel') {
            // For datamodel fields, use cf_ prefix and extract fragmentPath
            actualFieldName = `cf_${childName}`;
            if (
                childValue &&
                typeof childValue === 'object' &&
                Object.values(childValue)[0] &&
                typeof Object.values(childValue)[0] === 'object' &&
                'fragmentPath' in (Object.values(childValue)[0] as Record<string, unknown>)
            ) {
                actualFieldValue = Object.values(childValue)[0];
            }
        }
        const newValue = FieldRenderLogic.updateMultifieldItem(arrayValue, index, actualFieldName, actualFieldValue);
        onChange(newValue);
    };

    const moveItemUp = (index: number) => {
        if (index > 0) {
            const newValue = [...arrayValue];
            [newValue[index - 1], newValue[index]] = [newValue[index], newValue[index - 1]];
            onChange(newValue);
        }
    };

    const moveItemDown = (index: number) => {
        if (index < arrayValue.length - 1) {
            const newValue = [...arrayValue];
            [newValue[index], newValue[index + 1]] = [newValue[index + 1], newValue[index]];
            onChange(newValue);
        }
    };

    const getMultifieldValue = (item: any, childField: any) => {
        console.log(`🔹 [SpectrumMultifieldRenderer] getMultifieldValue called for childField:`, childField, item);
        const childFieldKey = childField.id || childField.name;
        return childField.type === 'datamodel'
            ? item[`cf_${childFieldKey}`]
            : item[childFieldKey];
    }

    return (
        <View>
            <Flex justifyContent="space-between" alignItems="center" marginBottom="size-100">
                <Text UNSAFE_style={{fontWeight: 'bold', fontSize: '14px'}}>
                    {t(field.label ?? '')}
                </Text>
                <ActionButton onPress={addItem} isQuiet>
                    <Add/>
                    <Text>{t('Add')}</Text>
                </ActionButton>
            </Flex>

            {field.tooltip && (
                <Text UNSAFE_style={{fontSize: '12px', color: '#666', marginBottom: '8px'}}>
                    {t(field.tooltip ?? '')}
                </Text>
            )}

            {error && (
                <Text UNSAFE_style={{color: 'red', fontSize: '12px', marginBottom: '8px'}}>
                    {error}
                </Text>
            )}

            {arrayValue.length === 0 ? (
                <View backgroundColor="gray-100" padding="size-100" borderRadius="medium">
                    <Text UNSAFE_style={{
                        fontStyle: 'italic',
                        textAlign: 'center',
                        color: '#666',
                        fontSize: '12px',
                        padding: '8px'
                    }}>
                        {t('No items. Click "Add" to create one.')}
                    </Text>
                </View>
            ) : (
                <Accordion allowsMultipleExpanded defaultExpandedKeys={[]}>
                    {arrayValue.map((item: any, index: number) => (
                        <Disclosure key={`item-${index}`} id={`item-${index}`}>
                            <DisclosureTitle level={4}>
                                <Flex justifyContent="space-between" alignItems="center" width="100%">
                                    <Text UNSAFE_style={{fontSize: '14px'}}>
                                        {item.itemTitle || item.title || `Item ${index + 1}`}
                                    </Text>
                                    <Flex alignItems="center" gap="size-50">
                                        {arrayValue.length > 1 && (
                                            <>
                                                <ActionButton onPress={() => moveItemUp(index)} isQuiet
                                                              isDisabled={index === 0}
                                                              aria-label={`Move item ${index + 1} up`}>
                                                    <ChevronUp size="S"/>
                                                </ActionButton>
                                                <ActionButton onPress={() => moveItemDown(index)} isQuiet
                                                              isDisabled={index === arrayValue.length - 1}
                                                              aria-label={`Move item ${index + 1} down`}>
                                                    <ChevronDown size="S"/>
                                                </ActionButton>
                                            </>
                                        )}
                                        <ActionButton onPress={() => removeItem(index)} isQuiet
                                                      aria-label={`Delete item ${index + 1}`}>
                                            <Delete size="S"/>
                                        </ActionButton>
                                    </Flex>
                                </Flex>
                            </DisclosureTitle>
                            <DisclosurePanel>
                                <View padding="size-100" UNSAFE_style={{paddingTop: '8px'}}>
                                    {field.children?.map((childField: any) => (
                                        <View key={childField.id || childField.name} marginBottom="size-100">
                                            <SpectrumFieldRendererComponent
                                                field={childField}
                                                value={getMultifieldValue(item, childField)}
                                                onChange={(childValue: any) => updateItem(index, childField.id || childField.name, childValue)}
                                                path={`${path}[${index}]`}
                                                page={page}
                                            />
                                        </View>
                                    ))}
                                </View>
                            </DisclosurePanel>
                        </Disclosure>
                    ))}
                </Accordion>
            )}
        </View>
    );
};

export default SpectrumMultifieldRenderer;
