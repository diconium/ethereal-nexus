# [Ethereal Nexus](https://diconium.github.io/ethereal-nexus/)

![License](https://img.shields.io/badge/license-Apache--2.0-blue)

## Project Overview

Ethereal Nexus is a tool designed to integrate micro-frontend components developed using modern frontend technologies into various Content Management Systems (CMS).

- **Empowering Frontend Developers:** Leverage expertise in modern web technologies (e.g., React, Vue, Angular) to create and maintain components independently of CMS.
- **Seamless CMS Integration:** Easily incorporate remote components while maintaining a consistent authoring experience.
- **Modular and Scalable:** Host UI elements on a remote server for modular, scalable web applications.

## Getting Started

### Installation

1. **Install via npm:**
    ```sh
    npm install @ethereal-nexus/core @ethereal-nexus/cli @ethereal-nexus/vite-plugin-ethereal-nexus
    ```

2. **Configure via CLI:**
    ```sh
    ethereal init
    ```

### Example Usage

This is a condensed example of the usage of the Nexus libraries on a project that uses Vite + React.

```ts
   //Component.tsx
import {
   text,
   dialog,
   type Output,
} from '@ethereal-nexus/core';


const schema = dialog({
   title: text({
      label: 'Title',
      placeholder: 'Title'
   }),
});

type Props = Output<typeof schema>;

export const Component: React.FC<Props> = ({ title }) => {
   //...component code
};
   ```

```ts
    //vite.config.ts
import { defineConfig } from 'vite'
import ethereal from '@ethereal-nexus/vite-plugin-ethereal-nexus';
import react from '@vitejs/plugin-react';

export default defineConfig({
   plugins: [
      react(),
      ethereal({
         exposes: {
            Component: './path/to/component'
         },
      })
   ],
   //...vite configuration
})
   ```

Further examples can be found in the [examples repository folder](./examples).

## Documentation

For further documentation on how to get started using Ethereal Nexus, you can also refer to the  [official documentation site](https://diconium.github.io/ethereal-nexus/).

Check out the [Getting Started](https://diconium.github.io/ethereal-nexus/setup/introduction/) section for complete examples on how to set up a project.

## Contributing

We welcome all contributors to help us improve and expand this project. Please see our [Contributing Guide](CONTRIBUTING.md) for more details on how to get started.

## Open Source

Ethereal Nexus is an open-source project licensed under the Apache License 2.0. See the [LICENSE.md](LICENSE.md) file for details.
Documentation
