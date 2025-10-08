import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToggleDebugTest } from './ToggleDebug';

const meta: Meta<typeof ToggleDebugTest> = {
  title: 'Debug/Toggle Test',
  component: ToggleDebugTest,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
