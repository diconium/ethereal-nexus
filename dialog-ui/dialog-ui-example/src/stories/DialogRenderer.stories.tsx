import type { Meta, StoryObj } from '@storybook/react';
import { DialogRenderer } from '../components/DialogRenderer.tsx';

const meta: Meta<typeof DialogRenderer> = {
  title: 'Components/DialogRenderer',
  component: DialogRenderer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A dialog component that renders a contact form with validation using shadcn/ui components.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'text',
      description: 'The name to display in the greeting',
      defaultValue: 'World'
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'World',
  },
};

export const WithCustomName: Story = {
  args: {
    name: 'Developer',
  },
};

export const WithLongName: Story = {
  args: {
    name: 'React Developer',
  },
};
