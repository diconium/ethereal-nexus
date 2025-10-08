import React from 'react';
import {
    Flex,
    View,
} from "@adobe/react-spectrum";
import {SpectrumProvider} from "../providers/SpectrumProvider";
import {
    useDialogProcessor,
    DialogConfig,
    FieldConfig
} from '@ethereal-nexus/dialog-ui-core';
import {SpectrumFieldRendererComponent} from './SpectrumFieldRenderer';

interface DialogBodyProps {
    dialog: DialogConfig;
    initialValues?: any; // Initial form values from content-resource
    onSubmit?: (data: any) => void;
    onCancel?: () => void;
}

// Dialog body component without modal wrapper - just the form content
export const DialogBody: React.FC<DialogBodyProps> = ({
                                                          dialog,
                                                          initialValues,
                                                      }) => {
    console.log('DialogBody rendered with dialog:', dialog);
    const {formData, updateField, errors} = useDialogProcessor(dialog, initialValues);

    return (
        <SpectrumProvider colorScheme="light">
            <View padding="size-300">
                <Flex direction="column" gap="size-300">
                    {dialog.fields.map((field: FieldConfig) => (
                        <SpectrumFieldRendererComponent
                            key={field.id}
                            field={field}
                            value={field.type === "group" ? formData[field.id]?.active : formData[field.id]}
                            onChange={(value: any) => updateField(field.id, value)}
                            error={errors[field.id] || undefined}
                        />
                    ))}
                </Flex>
            </View>
        </SpectrumProvider>
    );
};
