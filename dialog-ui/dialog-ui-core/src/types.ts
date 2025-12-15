
export type ConditionType = {
  field?: string;
  operator: 'eq' | 'neq' | "and" | "or";
  value: {
    "stringValue"?: string,
    "conditionArray"?: ConditionType[],
    "booleanValue"?: boolean,
    "string": string
  }
}

// Base field types
export interface FieldConfig {
    id: string;
    name: string;
    label?: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    multiple?: boolean;
    parentId?: string;
    defaultValue?: boolean | string | number | string[] | number[] | null;
    tooltip?: string | null;
    min?: string;
    max?: string;
    url?: string;
    method?: 'GET' | 'POST';
    body?: any;
    children?: FieldConfig[];
    options?: Array<{ value: string; label: string }>;
    showastoggle?: boolean;
    itemLabelKey?: string;
    condition?: {
      field: string;
      value: {
        "stringValue": string,
        "conditionArray": string[],
        "booleanValue": boolean,
        "string": string
      }
      operator: 'eq' | 'neq' | "and" | "or";
    }
}

// Dialog configuration
export interface DialogConfig {
    fields: FieldConfig[];
}

// Form data and validation
export type FormData = Record<string, any>;
export type ValidationErrors = Record<string, string | null>;

// Field component props
export interface FieldProps {
    field: FieldConfig;
    value: any;
    onChange: (value: any) => void;
    error?: string | null;
}

// Additional types for CMS integration
export interface DialogField {
    id: string;
    name: string;
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    tooltip?: string | null;
    min?: string;
    max?: string;
    children?: DialogField[] | null;
    options?: Array<{ value: string; label: string }>;
    url?: string;
    method?: 'GET' | 'POST';
    body?: any;
    
    [key: string]: any;
}

export type DialogStructure = DialogField[];
export type FieldValues = Record<string, any>;

// Dialog processor interfaces
export interface DialogProps {
    dialog: DialogConfig;
    onSubmit?: (data: any) => void;
    onCancel?: () => void;
}
