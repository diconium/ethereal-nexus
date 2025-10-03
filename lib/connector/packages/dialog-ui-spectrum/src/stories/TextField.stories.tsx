import type {Meta, StoryObj} from '@storybook/react-vite';
import {TextField} from './TextField';

const meta: Meta<typeof TextField> = {
    title: 'UI Spectrum/TextField',
    component: TextField,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        field: {
            control: 'object',
        },
        value: {
            control: 'text',
        },
        error: {
            control: 'text',
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        field: {
            id: 'basic-textfield',
            name: 'username',
            label: 'Username',
            type: 'textfield',
            placeholder: 'Enter your username',
            required: false,
        },
        value: '',
        onChange: (value: string) => console.log('Value changed:', value),
    },
};

export const Required: Story = {
    args: {
        field: {
            id: 'required-field',
            name: 'required-field',
            label: 'Required Field',
            type: 'textfield',
            placeholder: 'This field is required',
            required: true,
            tooltip: 'This field must be filled out',
        },
        value: '',
        onChange: (value: string) => console.log('Value changed:', value),
    },
};

export const WithError: Story = {
    args: {
        field: {
            id: 'error-field',
            name: 'error-field',
            label: 'Field with Error',
            type: 'textfield',
            placeholder: 'This field has an error',
            required: true,
        },
        value: '',
        error: 'This field is required',
        onChange: (value: string) => console.log('Value changed:', value),
    },
};

export const WithValue: Story = {
    args: {
        field: {
            id: 'filled-field',
            name: 'filled-field',
            label: 'Pre-filled Field',
            type: 'textfield',
            placeholder: 'This field has a value',
            tooltip: 'This field already has content',
        },
        value: 'Sample content',
        onChange: (value: string) => console.log('Value changed:', value),
    },
};
