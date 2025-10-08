 # Dialog UI Example with shadcn/ui

This package demonstrates how to extend the `@ethereal-nexus/dialog-ui-core` package with custom UI components using shadcn/ui. It provides a complete implementation of field renderers using modern React components built on top of Radix UI primitives.

## Features

- 🎨 **shadcn/ui Components**: Beautiful, accessible UI components
- 🔧 **Extensible Architecture**: Extends the core dialog-ui package without modifications
- 📚 **Storybook Integration**: Interactive documentation and testing
- 🎯 **Type Safety**: Full TypeScript support with proper type definitions
- 🎪 **Multiple Field Types**: Support for text, select, checkbox, switch, and multifield components

## Quick Start

### Installation

```bash
pnpm install
```

### Development

Start the storybook development server:

```bash
pnpm storybook
```

Build the package:

```bash
pnpm build
```

## Usage

### Basic Implementation

```tsx
import React, { useState } from 'react';
import { ShadcnFieldRenderer } from '@ethereal-nexus/dialog-ui-example';
import type { FieldConfig } from '@ethereal-nexus/dialog-ui-core';

const MyForm = () => {
  const [value, setValue] = useState('');
  const renderer = new ShadcnFieldRenderer();

  const field: FieldConfig = {
    id: 'title',
    name: 'title',
    label: 'Article Title',
    type: 'textfield',
    required: true,
    placeholder: 'Enter title...',
  };

  return (
    <div>
      {renderer.render({
        field,
        value,
        onChange: setValue,
        error: null,
      })}
    </div>
  );
};
```

### Extending the Renderer

You can create your own custom field renderer by extending the `BaseFieldRenderer`:

```tsx
import { BaseFieldRenderer } from '@ethereal-nexus/dialog-ui-core';
import { ShadcnFieldRenderer } from '@ethereal-nexus/dialog-ui-example';

class CustomFieldRenderer extends ShadcnFieldRenderer {
  renderCustomField(props: FieldRendererProps): React.ReactElement {
    // Your custom implementation
    return <div>Custom field implementation</div>;
  }

  render(props: FieldRendererProps): React.ReactElement {
    if (props.field.type === 'custom') {
      return this.renderCustomField(props);
    }
    return super.render(props);
  }
}
```

## Supported Field Types

- **textfield**: Single-line text input
- **select**: Dropdown selection with options
- **checkbox**: Boolean checkbox input
- **switch**: Toggle switch for boolean values
- **multifield**: Dynamic arrays of nested field groups

## Architecture

This package demonstrates the power of the dialog-ui-core's extensible architecture:

1. **Core Logic**: All field rendering logic is handled by `@ethereal-nexus/dialog-ui-core`
2. **UI Implementation**: This package provides the visual components using shadcn/ui
3. **Separation of Concerns**: Business logic and UI rendering are completely separated

### Key Components

- `ShadcnFieldRenderer`: Main renderer class extending `BaseFieldRenderer`
- `FieldRenderLogic`: Utility functions from the core package for field manipulation
- shadcn/ui components: Input, Select, Checkbox, Switch, Button, Label

## Storybook Stories

The package includes comprehensive Storybook stories showcasing:

- Individual field type examples
- Complex multi-field forms
- Error handling and validation
- Real-time value updates

## Styling

This package uses Tailwind CSS with shadcn/ui design tokens. The components support:

- Light/dark mode via CSS variables
- Customizable color schemes
- Responsive design
- Accessibility features

## Dependencies

### Core Dependencies
- `@ethereal-nexus/dialog-ui-core`: Core field rendering logic
- `@radix-ui/*`: Primitive components for accessibility
- `tailwindcss`: Utility-first CSS framework
- `lucide-react`: Icon library

### Development Dependencies
- `@storybook/*`: Interactive component documentation
- `vite`: Build tool and development server
- `typescript`: Type checking and compilation

## Contributing

1. Make sure all stories work correctly in Storybook
2. Add tests for new field types
3. Update this README with any new features
4. Follow the existing code style and patterns

## License

ISC
