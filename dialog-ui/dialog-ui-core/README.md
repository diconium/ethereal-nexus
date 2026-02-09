# @ethereal-nexus/dialog-ui-core

A headless React package providing hooks and logic for AEM dialog processing. This package contains the core business logic for handling dynamic form dialogs without any UI components.

## Features

- 🔧 **Headless Architecture**: Pure logic without UI dependencies
- ⚛️ **React Hooks**: Modern React patterns with `useDialogProcessor`
- 🔍 **Type Safety**: Full TypeScript support with comprehensive type definitions
- ✅ **Validation**: Built-in field validation with error handling
- 🔄 **Adapters**: Extensible adapter pattern for different data sources
- 📝 **Form Management**: State management for complex nested forms
- 🎯 **Multifield Support**: Handle arrays of complex field configurations

## Installation

```bash
npm install @ethereal-nexus/dialog-ui-core
# or
pnpm add @ethereal-nexus/dialog-ui-core
# or
yarn add @ethereal-nexus/dialog-ui-core
```

## Quick Start

```tsx
import { useDialogProcessor, DialogConfig } from '@ethereal-nexus/dialog-ui-core';

const dialogConfig: DialogConfig = {
  fields: [
    {
      id: 'title',
      name: 'title',
      label: 'Title',
      type: 'textfield',
      required: true,
      placeholder: 'Enter title...'
    },
    {
      id: 'description',
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: false
    }
  ]
};

function MyComponent() {
  const {
    formData,
    errors,
    isValid,
    updateField,
    resetForm,
    validateForm
  } = useDialogProcessor(dialogConfig, {});

  const handleSubmit = () => {
    if (validateForm()) {
      console.log('Form data:', formData);
    }
  };

  return (
    <div>
      <input
        value={formData.title || ''}
        onChange={(e) => updateField('title', e.target.value)}
        placeholder="Title"
      />
      {errors.title && <span className="error">{errors.title}</span>}
      
      <button onClick={handleSubmit} disabled={!isValid}>
        Submit
      </button>
    </div>
  );
}
```

## Core Concepts

### DialogConfig

The `DialogConfig` interface defines the structure of your dialog:

```typescript
interface DialogConfig {
  fields: FieldConfig[];
}
```

### FieldConfig

Each field in your dialog is defined by a `FieldConfig`:

```typescript
interface FieldConfig {
  id: string;                    // Unique identifier
  name: string;                  // Field name for form data
  label?: string;                // Display label
  type: string;                  // Field type (textfield, textarea, select, etc.)
  required?: boolean;            // Validation requirement
  placeholder?: string;          // Placeholder text
  multiple?: boolean;            // Allow multiple values
  defaultValue?: any;            // Default field value
  tooltip?: string | null;       // Help text
  min?: string;                  // Minimum length/value
  max?: string;                  // Maximum length/value
  children?: FieldConfig[];      // Nested fields (for multifield, groups)
  options?: Array<{ value: string; label: string }>; // Select options
  showastoggle?: boolean;        // Show as toggle component
}
```

### useDialogProcessor Hook

The main hook for managing dialog state:

```typescript
const {
  formData,      // Current form values
  errors,        // Validation errors
  isValid,       // Overall form validity
  updateField,   // Update a field value
  resetForm,     // Reset form to initial state
  validateForm   // Trigger validation
} = useDialogProcessor(config, initialValues);
```

## Supported Field Types

- **textfield**: Single-line text input
- **textarea**: Multi-line text input
- **select**: Dropdown selection
- **multifield**: Array of nested field groups
- **checkbox**: Boolean toggle
- **radio**: Single selection from options
- **pathbrowser**: File/path selection
- **datepicker**: Date selection

## Validation

Built-in validation includes:

- **Required field validation**: Ensures required fields have values
- **Length validation**: Min/max character limits for text fields
- **Nested validation**: Validates multifield items and nested structures
- **Custom validation**: Extensible validation through field configuration

```typescript
// Example with validation
const fieldConfig: FieldConfig = {
  id: 'username',
  name: 'username',
  label: 'Username',
  type: 'textfield',
  required: true,
  min: '3',
  max: '20'
};
```

## Adapters

The package includes an adapter pattern for integrating with different data sources:

```typescript
import { AEMAdapter } from '@ethereal-nexus/dialog-ui-core/adapters';

// Extend the base adapter for your specific needs
class CustomAdapter extends AEMAdapter {
  // Implement custom data fetching/transformation logic
}
```

## Advanced Usage

### Multifield Support

Handle complex nested structures:

```typescript
const multifieldConfig: FieldConfig = {
  id: 'items',
  name: 'items',
  label: 'Items',
  type: 'multifield',
  children: [
    {
      id: 'itemTitle',
      name: 'title',
      label: 'Item Title',
      type: 'textfield',
      required: true
    },
    {
      id: 'itemDescription',
      name: 'description',
      label: 'Description',
      type: 'textarea'
    }
  ]
};
```

### Dynamic Field Updates

React to field changes:

```typescript
const { updateField, formData } = useDialogProcessor(config, {});

// Update field programmatically
updateField('dynamicField', computedValue);

// React to field changes
useEffect(() => {
  if (formData.category === 'advanced') {
    updateField('advancedOptions', defaultAdvancedOptions);
  }
}, [formData.category]);
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  DialogConfig,
  FieldConfig,
  FormData,
  ValidationErrors,
  UseDialogProcessorReturn
} from '@ethereal-nexus/dialog-ui-core';
```

## Integration with UI Libraries

This headless package works with any UI library. For Adobe React Spectrum integration, see [@ethereal-nexus/dialog-ui-spectrum](../dialog-ui-spectrum).

## API Reference

### Types

- `DialogConfig` - Configuration for the entire dialog
- `FieldConfig` - Configuration for individual fields
- `FormData` - Type for form data object
- `ValidationErrors` - Type for validation error messages
- `UseDialogProcessorReturn` - Return type of the main hook

### Hooks

- `useDialogProcessor(config, initialValues)` - Main dialog processing hook

### Classes

- `DialogProcessor` - Core dialog processing class
- `FieldRenderer` - Base field rendering logic

### Adapters

- `AEMAdapter` - Adobe Experience Manager integration adapter

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## License

ISC License - see [LICENSE](../../LICENSE.md) for details.
