import { FieldConfig, DialogConfig, ValidationErrors } from './types';

export interface DialogProcessorOptions {
  onValidationChange?: (isValid: boolean) => void;
  onDataChange?: (data: any) => void;
}

export class DialogProcessor {
  private config: DialogConfig;
  private formData: Record<string, any> = {};
  private errors: ValidationErrors = {};
  private options?: DialogProcessorOptions;

  constructor(config: DialogConfig, options?: DialogProcessorOptions) {
    this.config = config;
    this.options = options;
  }

  validateField(field: FieldConfig, value: any): string | null {
    if (field.required && (!value || (Array.isArray(value) && value.length === 0) || (typeof value === 'string' && value.trim() === ''))) {
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
          const childError = this.validateField(childField, item[childField.name]);
          if (childError) {
            return `${field.label} item ${i + 1}: ${childError}`;
          }
        }
      }
    }

    return null;
  }

  validateNestedFields(fields: FieldConfig[], data: Record<string, any>, path: string = ''): ValidationErrors {
    const nestedErrors: ValidationErrors = {};

    fields.forEach(field => {
      const fieldPath = path ? `${path}.${field.name}` : field.name;
      const value = data[field.name];

      const error = this.validateField(field, value);
      if (error) {
        nestedErrors[fieldPath] = error;
      }

      // Handle nested multifield validation
      if (field.type === 'multifield' && Array.isArray(value) && field.children) {
        value.forEach((item, index) => {
          const itemErrors = this.validateNestedFields(
            field.children!,
            item,
            `${fieldPath}[${index}]`
          );
          Object.assign(nestedErrors, itemErrors);
        });
      }
    });

    return nestedErrors;
  }

  updateField(fieldName: string, value: any): void {
    this.formData = { ...this.formData, [fieldName]: value };

    // Validate the field
    const field = this.config.fields.find(f => f.name === fieldName);
    if (field) {
      const error = this.validateField(field, value);
      this.errors = { ...this.errors, [fieldName]: error };
    }

    // Trigger callbacks
    this.options?.onDataChange?.(this.formData);
    this.options?.onValidationChange?.(this.isValid());
  }

  validateForm(): boolean {
    const newErrors = this.validateNestedFields(this.config.fields, this.formData);
    this.errors = newErrors;
    const isValid = Object.keys(newErrors).length === 0;
    this.options?.onValidationChange?.(isValid);
    return isValid;
  }

  resetForm(): void {
    this.formData = {};
    this.errors = {};
    this.options?.onDataChange?.({});
    this.options?.onValidationChange?.(true);
  }

  isValid(): boolean {
    return Object.values(this.errors).every(error => !error);
  }

  getFormData(): Record<string, any> {
    return { ...this.formData };
  }

  getErrors(): ValidationErrors {
    return { ...this.errors };
  }

  getFieldValue(fieldName: string): any {
    return this.formData[fieldName];
  }

  hasError(fieldName: string): boolean {
    return Boolean(this.errors[fieldName]);
  }

  getFieldError(fieldName: string): string | null {
    return this.errors[fieldName] || null;
  }
}
