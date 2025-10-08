import {useState, useCallback} from 'react';
import {FieldConfig, DialogConfig, FormData, ValidationErrors} from './types';

export interface UseDialogProcessorReturn {
    formData: FormData;
    errors: ValidationErrors;
    isValid: boolean;
    updateField: (fieldName: string, value: any) => void;
    resetForm: () => void;
    validateForm: () => boolean;
}

export function useDialogProcessor(config: DialogConfig, initialValues: any): UseDialogProcessorReturn {
    console.log("initialValues", initialValues);

    // Initialize formData with initialValues instead of empty object
    const [formData, setFormData] = useState<FormData>(initialValues || {});
    const [errors, setErrors] = useState<ValidationErrors>({});

    const validateField = useCallback((field: FieldConfig, value: any): string | null => {
        if (field.required && (!value || (Array.isArray(value) && value.length === 0) || value.toString().trim() === '')) {
            return `${field.label} is required`;
        }

        if (field.type === 'textfield' && value) {
            if (field.min && value.toString().length < parseInt(field.min, 10)) {
                return `${field.label} must be at least ${field.min} characters`;
            }

            if (field.max && value.toString().length > parseInt(field.max, 10)) {
                return `${field.label} must be no more than ${field.max} characters`;
            }
        }

        // Handle multifield validation
        if (field.type === 'multifield' && Array.isArray(value) && field.children) {
            for (let i = 0; i < value.length; i++) {
                const item = value[i];
                for (const childField of field.children) {
                    const childError = validateField(childField, item[childField.name]);
                    if (childError) {
                        return `${field.label} item ${i + 1}: ${childError}`;
                    }
                }
            }
        }

        return null;
    }, []);

    const validateNestedFields = useCallback((fields: FieldConfig[], data: FormData, path: string = ''): ValidationErrors => {
        const nestedErrors: ValidationErrors = {};

        fields.forEach(field => {
            const fieldPath = path ? `${path}.${field.name}` : field.name;
            const value = data[field.name];

            const error = validateField(field, value);
            if (error) {
                nestedErrors[fieldPath] = error;
            }

            // Handle nested multifield validation
            if (field.type === 'multifield' && Array.isArray(value) && field.children) {
                value.forEach((item, index) => {
                    const itemErrors = validateNestedFields(
                        field.children!,
                        item,
                        `${fieldPath}[${index}]`
                    );
                    Object.assign(nestedErrors, itemErrors);
                });
            }
        });

        return nestedErrors;
    }, [validateField]);

    const updateField = useCallback((fieldName: string, value: any) => {
        setFormData(prev => ({...prev, [fieldName]: value}));

        // Validate the field - use consistent field identification
        const field = config.fields.find(f => (f.id || f.name) === fieldName);
        if (field) {
            const error = validateField(field, value);
            setErrors(prev => ({...prev, [fieldName]: error}));
        }
    }, [config.fields, validateField]);

    const validateForm = useCallback(() => {
        const newErrors = validateNestedFields(config.fields, formData);
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [config.fields, formData, validateNestedFields]);

    const resetForm = useCallback(() => {
        setFormData({});
        setErrors({});
    }, []);

    const isValid = Object.values(errors).every(error => !error);

    return {
        formData,
        errors,
        isValid,
        updateField,
        resetForm,
        validateForm,
    };
}
