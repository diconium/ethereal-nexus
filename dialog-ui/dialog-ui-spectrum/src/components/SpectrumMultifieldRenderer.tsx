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
import {getFieldName} from "@/components/getFieldName.ts";

/**
 * Compute the next counter value by scanning existing items for __itemKey.
 */
function computeNextCounter(items: any[]): number {
    let max = -1;
    for (const item of items) {
        const key = item?.__itemKey;
        if (typeof key === 'string') {
            const num = parseInt(key.replace('item', ''), 10);
            if (!isNaN(num) && num > max) max = num;
        }
    }
    return max + 1;
}

const SpectrumMultifieldRenderer: React.FC<MultifieldRendererProps> = ({field, value, onChange, error, path, page }) => {
    const {t} = useI18n();
    const arrayValue = Array.isArray(value) ? value : [];

    // Stable counter for generating unique __itemKey for new items.
    // Initialized from existing items so new keys never collide.
    const itemCounterRef = React.useRef(computeNextCounter(arrayValue));

    const addItem = () => {
        const newItem = FieldRenderLogic.createMultifieldItem(field);
        newItem.__itemKey = `item${itemCounterRef.current++}`;
        onChange([...arrayValue, newItem]);
    };

    const removeItem = (index: number) => {
        const newValue = FieldRenderLogic.removeMultifieldItem(arrayValue, index);
        onChange(newValue);
    };

    const updateItem = (index: number, childName: string, childValue: any) => {
        const childField = field.children?.find(f => (getFieldName(f)) === childName);

        let actualFieldName = childName;
        let actualFieldValue = childValue;

        if (childField?.type === 'datamodel') {
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

    /**
     * Derive a meaningful title for a multifield item when itemLabelKey is not set.
     *
     * Priority:
     * 1. First child field that has a non-empty string value (content-based, follows the item on reorder)
     * 2. __itemKey — stable key from content-resource (e.g. "item0") or assigned at creation time
     * 3. Positional fallback "Item N" (only when nothing else is available)
     */
    const getItemTitle = (item: any, index: number): string => {
        if (!item || typeof item !== 'object') return `Item ${index + 1}`;

        // Try to find a meaningful string value from child fields
        if (field.children) {
            for (const child of field.children) {
                const key = getFieldName(child);
                const val = item[key];
                if (typeof val === 'string' && val.trim() !== '') {
                    return val;
                }
            }
        }

        // Use stable __itemKey (set by content-resource extraction or addItem)
        if (item.__itemKey) {
            return item.__itemKey;
        }

        return `Item ${index + 1}`;
    };

    const getMultifieldValue = (item: any, childField: any) => {
        const childFieldKey = getFieldName(childField);
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
                                        {item[field.itemLabelKey as string] || getItemTitle(item, index)}
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
                                        <View key={getFieldName(childField)} marginBottom="size-100">
                                            <SpectrumFieldRendererComponent
                                                field={childField}
                                                value={getMultifieldValue(item, childField)}
                                                onChange={(childValue: any) => updateItem(index, getFieldName(childField), childValue)}
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
