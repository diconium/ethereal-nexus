import type { Preview } from '@storybook/react-vite';
import React from 'react';
import { Provider, defaultTheme } from '@adobe/react-spectrum';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <Provider theme={defaultTheme}>
        <Story />
      </Provider>
    ),
  ],
};

export default preview;
