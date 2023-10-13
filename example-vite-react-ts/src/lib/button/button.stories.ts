import type { Meta, StoryObj } from '@storybook/react';

import Button, { ButtonProps } from './button';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {},
} as Meta<typeof Button>;

export default meta;

type Story = StoryObj<ButtonProps>;

export const Primary: Story = {
  args: {
    name: 'Button',
    label: 'Primary button',
    url: 'https://www.diconium.com',
    type: 'button',
    style: 'primary',
  },
};
