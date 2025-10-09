# @ethereal-nexus/dialog-ui-spectrum

A React UI package using Adobe React Spectrum components for building beautiful, accessible dialog interfaces. This package provides pre-built UI components that integrate seamlessly with [@ethereal-nexus/dialog-ui-core](../dialog-ui-core) for AEM dialog processing.

## Features

- 🎨 **Adobe React Spectrum**: Built on Adobe's design system
- ♿ **Accessibility**: WCAG compliant components out of the box
- 🔧 **Headless Integration**: Works with `@ethereal-nexus/dialog-ui-core`
- 🌐 **Web Components**: Export as custom elements for any framework
- 📱 **Responsive**: Mobile-first responsive design
- 🎭 **Storybook**: Interactive component documentation
- 🔄 **AEM Integration**: Specialized adapters for Adobe Experience Manager
- 🌍 **i18n Ready**: Internationalization support built-in

## Installation

```bash
npm install @ethereal-nexus/dialog-ui-spectrum @ethereal-nexus/dialog-ui-core
# or
pnpm add @ethereal-nexus/dialog-ui-spectrum @ethereal-nexus/dialog-ui-core
# or
yarn add @ethereal-nexus/dialog-ui-spectrum @ethereal-nexus/dialog-ui-core
```

### Peer Dependencies

This package requires React and React DOM as peer dependencies:

```bash
npm install react react-dom
```

## Quick Start

```tsx
import React from 'react';
import { SpectrumProvider, DialogBody } from '@ethereal-nexus/dialog-ui-spectrum';
import { useDialogProcessor } from '@ethereal-nexus/dialog-ui-core';

const dialogConfig = {
  fields: [
    {
      id: 'title',
      name: 'title',
      label: 'Title',
      type: 'textfield',
      required: true
    },
    {
      id: 'category',
      name: 'category',
      label: 'Category',
      type: 'select',
      options: [
        { value: 'news', label: 'News' },
        { value: 'blog', label: 'Blog' }
      ]
    }
  ]
};

function MyDialog() {
  const dialogProcessor = useDialogProcessor(dialogConfig, {});

  return (
    <SpectrumProvider>
      <DialogBody
        config={dialogConfig}
        dialogProcessor={dialogProcessor}
        onSubmit={(data) => console.log('Submitted:', data)}
      />
    </SpectrumProvider>
  );
}
```

## Web Components

Use as framework-agnostic web components:

```html
<!-- Include the web component -->
<script type="module" src="./dist/dialog-renderer-web-component.js"></script>

<!-- Use in any HTML -->
<dialog-renderer-web-component
  config='{"fields":[{"id":"title","name":"title","label":"Title","type":"textfield"}]}'
  initial-values='{"title":"Hello World"}'
></dialog-renderer-web-component>
```

```tsx
// Or import and register manually
import { DialogRendererWebComponent } from '@ethereal-nexus/dialog-ui-spectrum';

// Web component is automatically registered as 'dialog-renderer-web-component'
```

## Components

### Core Components

#### SpectrumProvider
Provides Adobe React Spectrum theme and context:

```tsx
import { SpectrumProvider } from '@ethereal-nexus/dialog-ui-spectrum';

<SpectrumProvider theme="light" colorScheme="light">
  {/* Your dialog components */}
</SpectrumProvider>
```

#### DialogBody
Main dialog container that renders all fields:

```tsx
import { DialogBody } from '@ethereal-nexus/dialog-ui-spectrum';

<DialogBody
  config={dialogConfig}
  dialogProcessor={dialogProcessor}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  submitLabel="Save"
  cancelLabel="Cancel"
/>
```

#### EnhancedDialogBody
Extended dialog with additional features:

```tsx
import { EnhancedDialogBody } from '@ethereal-nexus/dialog-ui-spectrum';

<EnhancedDialogBody
  config={dialogConfig}
  dialogProcessor={dialogProcessor}
  showDebugInfo={true}
  autoSave={true}
  onAutoSave={handleAutoSave}
/>
```

### Field Components

#### SpectrumFieldRenderer
Universal field renderer that automatically selects the appropriate component:

```tsx
import { SpectrumFieldRenderer } from '@ethereal-nexus/dialog-ui-spectrum';

<SpectrumFieldRenderer
  field={fieldConfig}
  value={currentValue}
  onChange={handleChange}
  error={validationError}
/>
```

#### Specialized Field Components

- **SpectrumCalendarField**: Date and time selection
- **SpectrumDatamodelField**: Dynamic data model selection
- **SpectrumDataSourceField**: External data source integration
- **SpectrumGroupField**: Grouped field collections
- **SpectrumMediaField**: Media asset selection
- **SpectrumPathbrowserField**: File and path browsing
- **SpectrumPickerField**: Multi-option picker with search
- **SpectrumRichTextEditorField**: Rich text editing
- **SpectrumMultifieldRenderer**: Dynamic array field management

### Example Usage

```tsx
import {
  SpectrumCalendarField,
  SpectrumPathbrowserField,
  SpectrumRichTextEditorField
} from '@ethereal-nexus/dialog-ui-spectrum';

// Date picker
<SpectrumCalendarField
  field={{
    id: 'publishDate',
    name: 'publishDate',
    label: 'Publish Date',
    type: 'datepicker'
  }}
  value={formData.publishDate}
  onChange={(value) => updateField('publishDate', value)}
/>

// File browser
<SpectrumPathbrowserField
  field={{
    id: 'heroImage',
    name: 'heroImage',
    label: 'Hero Image',
    type: 'pathbrowser'
  }}
  value={formData.heroImage}
  onChange={(value) => updateField('heroImage', value)}
/>

// Rich text editor
<SpectrumRichTextEditorField
  field={{
    id: 'content',
    name: 'content',
    label: 'Content',
    type: 'richtext'
  }}
  value={formData.content}
  onChange={(value) => updateField('content', value)}
/>
```

## AEM Integration

### Spectrum AEM Adapter

Specialized adapter for Adobe Experience Manager:

```tsx
import { SpectrumAEMAdapter, SpectrumAEMAdapterFactory } from '@ethereal-nexus/dialog-ui-spectrum';

// Create adapter instance
const aemAdapter = SpectrumAEMAdapterFactory.create({
  endpoint: '/content/mysite',
  authToken: 'your-auth-token'
});

// Use with dialog processor
const dialogProcessor = useDialogProcessor(config, {}, aemAdapter);
```

### AEM-Specific Features

- **Coral UI Integration**: Seamless integration with AEM's Coral UI
- **Page Picker**: Browse and select AEM pages
- **Asset Browser**: Integration with AEM DAM
- **Reference Fields**: Link to other AEM content
- **Multifield Support**: Handle AEM multifield configurations

## Styling and Theming

### Custom Themes

```tsx
import { SpectrumProvider } from '@ethereal-nexus/dialog-ui-spectrum';

<SpectrumProvider 
  theme="dark" 
  colorScheme="dark"
  scale="large"
>
  <DialogBody config={config} dialogProcessor={processor} />
</SpectrumProvider>
```

### CSS Custom Properties

Override default styles using CSS custom properties:

```css
.dialog-container {
  --spectrum-dialog-max-width: 800px;
  --spectrum-dialog-border-radius: 8px;
  --spectrum-field-margin-bottom: 16px;
}
```

## Internationalization

Built-in i18n support:

```tsx
import { I18nProvider } from '@ethereal-nexus/dialog-ui-spectrum';

<I18nProvider locale="en-US" messages={messages}>
  <SpectrumProvider>
    <DialogBody config={config} dialogProcessor={processor} />
  </SpectrumProvider>
</I18nProvider>
```

Custom message overrides:

```tsx
const customMessages = {
  'dialog.submit': 'Save Changes',
  'dialog.cancel': 'Discard',
  'validation.required': 'This field is required',
  'validation.minLength': 'Minimum {min} characters required'
};
```

## Storybook Documentation

Explore components interactively:

```bash
npm run storybook
# or
pnpm storybook
```

Visit `http://localhost:6006` to see:
- Interactive component demos
- Configuration examples  
- Usage patterns
- Design system guidelines

## Advanced Usage

### Custom Field Types

Extend the field renderer for custom components:

```tsx
import { SpectrumFieldRenderer } from '@ethereal-nexus/dialog-ui-spectrum';

const CustomFieldRenderer = ({ field, value, onChange, error }) => {
  if (field.type === 'custom-widget') {
    return <CustomWidget {...props} />;
  }
  
  return <SpectrumFieldRenderer field={field} value={value} onChange={onChange} error={error} />;
};
```

### Dynamic Field Loading

Load field configurations dynamically:

```tsx
import { SpectrumDatamodelField } from '@ethereal-nexus/dialog-ui-spectrum';

<SpectrumDatamodelField
  field={{
    id: 'dynamicField',
    name: 'dynamicField',
    type: 'datamodel',
    url: '/api/field-config',
    method: 'GET'
  }}
  value={formData.dynamicField}
  onChange={(value) => updateField('dynamicField', value)}
/>
```

### Validation Integration

Custom validation with Spectrum components:

```tsx
const { formData, errors, updateField } = useDialogProcessor(config, {});

<SpectrumFieldRenderer
  field={fieldConfig}
  value={formData[fieldConfig.name]}
  onChange={(value) => updateField(fieldConfig.name, value)}
  error={errors[fieldConfig.name]}
  validationState={errors[fieldConfig.name] ? 'invalid' : 'valid'}
/>
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  SpectrumFieldProps,
  SpectrumDialogProps,
  AEMAdapterConfig,
  SpectrumThemeConfig
} from '@ethereal-nexus/dialog-ui-spectrum';
```

## Performance

- **Code Splitting**: Components are tree-shakeable
- **Lazy Loading**: Heavy components load on demand
- **Memoization**: Optimized re-renders
- **Bundle Size**: Optimized for production builds

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## Related Packages

- [@ethereal-nexus/dialog-ui-core](../dialog-ui-core) - Headless dialog processing logic
- [@ethereal-nexus/dialog-ui-example](../dialog-ui-example) - Example implementations

## License

ISC License - see [LICENSE](../../LICENSE.md) for details.
