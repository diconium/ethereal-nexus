import React, {useEffect, useState} from "react";
import {Picker, Item, ComboBox, TagGroup, Flex} from "@adobe/react-spectrum";
import {FieldRendererProps} from '@ethereal-nexus/dialog-ui-core';
import {handleIsolationCSS} from "./popoverUtils";
import {useI18n} from '@/providers';

export interface SpectrumPickerFieldProps extends FieldRendererProps {
    field: any;
    value: any;
    onChange: (value: any) => void;
    error?: string | null;
}

export const SpectrumPickerField: React.FC<SpectrumPickerFieldProps> = ({field, value, onChange, error}) => {
    const {t} = useI18n();
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    // Initialize with default values
    useEffect(() => {
        if (value === undefined || value === null) {
            if (field.defaultValue !== undefined) {
                if (field.multiple) {
                    const defaultArray = Array.isArray(field.defaultValue) ? field.defaultValue : [field.defaultValue];
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
        const option = field.options?.find((opt: any) => opt.value === optionValue);
        return option?.label || optionValue;
    };

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
                >
                    {field.options?.map((option: { value: string; label: string }) => (
                        <Item key={option.value}>{t(option.label ?? '')}</Item>
                    )) || []}
                </ComboBox>
                {selectedItems.length > 0 && (
                    <TagGroup
                        aria-label={t('spectrum.picker.selectedItems') || 'Selected items'}
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

    return (
        <Picker
            label={t(field.label ?? '')}
            placeholder={t(field.placeholder ?? '')}
            selectedKey={value || field.defaultValue || ''}
            onSelectionChange={handleSingleSelectionChange}
            isRequired={field.required}
            isInvalid={!!error}
            errorMessage={error || undefined}
            description={t(field.tooltip ?? '') || undefined}
            width="100%"
            onOpenChange={handleIsolationCSS}
        >
            {field.options?.map((option: { value: string; label: string }) => (
                <Item key={option.value}>{t(option.label ?? '')}</Item>
            )) || []}
        </Picker>
    );
};

export default SpectrumPickerField;
