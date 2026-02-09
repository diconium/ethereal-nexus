import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import {
  DialogTrigger,
  ActionButton,
  Dialog,
  Heading,
  Header,
  Divider,
  Content,
  Footer,
  ButtonGroup,
  Button,
  Form,
  Flex,
  Text,
  View
} from '@adobe/react-spectrum';
import { SpectrumFieldRendererComponent } from '../components/SpectrumFieldRenderer';
import Settings from '@spectrum-icons/workflow/Settings';

// Demo component specifically for testing toggle group functionality
const ToggleGroupDemo: React.FC = () => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = (close: () => void) => {
    console.log('Form submitted with data:', formData);
    alert(`Form submitted! Check console for data.`);
    close();
  };

  const handleCancel = (close: () => void) => {
    console.log('Form cancelled');
    setFormData({});
    close();
  };

  // Sample field configurations with toggle groups
  const toggleGroupFields = [
    {
      id: 'basicInfo',
      name: 'basicInfo',
      type: 'group',
      label: 'Basic Information',
      tooltip: 'Toggle to show/hide basic information fields',
      showastoggle: true,
      children: [
        {
          id: 'firstName',
          name: 'firstName',
          type: 'textfield',
          label: 'First Name',
          placeholder: 'Enter your first name',
          required: true
        },
        {
          id: 'lastName',
          name: 'lastName',
          type: 'textfield',
          label: 'Last Name',
          placeholder: 'Enter your last name',
          required: true
        },
        {
          id: 'email',
          name: 'email',
          type: 'email',
          label: 'Email Address',
          placeholder: 'Enter your email',
          required: true
        }
      ]
    },
    {
      id: 'contactDetails',
      name: 'contactDetails',
      type: 'group',
      label: 'Contact Details',
      tooltip: 'Optional contact information - toggle to expand',
      showastoggle: true,
      children: [
        {
          id: 'phone',
          name: 'phone',
          type: 'tel',
          label: 'Phone Number',
          placeholder: '+1 (555) 123-4567'
        },
        {
          id: 'address',
          name: 'address',
          type: 'textfield',
          label: 'Address',
          placeholder: 'Enter your address'
        },
        {
          id: 'country',
          name: 'country',
          type: 'select',
          label: 'Country',
          options: [
            { value: 'us', label: 'United States' },
            { value: 'ca', label: 'Canada' },
            { value: 'uk', label: 'United Kingdom' },
            { value: 'de', label: 'Germany' },
            { value: 'fr', label: 'France' }
          ]
        }
      ]
    },
    {
      id: 'preferences',
      name: 'preferences',
      type: 'group',
      label: 'User Preferences',
      tooltip: 'Customize your experience settings',
      showastoggle: true,
      children: [
        {
          id: 'newsletter',
          name: 'newsletter',
          type: 'checkbox',
          label: 'Subscribe to Newsletter',
          description: 'Receive updates and news'
        },
        {
          id: 'notifications',
          name: 'notifications',
          type: 'switch',
          label: 'Enable Notifications',
          description: 'Allow browser notifications'
        },
        {
          id: 'theme',
          name: 'theme',
          type: 'radio',
          label: 'Theme Preference',
          options: [
            { value: 'light', label: 'Light Theme' },
            { value: 'dark', label: 'Dark Theme' },
            { value: 'auto', label: 'Auto (System)' }
          ]
        }
      ]
    },
    {
      id: 'nonToggleGroup',
      name: 'nonToggleGroup',
      type: 'group',
      label: 'Always Visible Group',
      tooltip: 'This group does not have toggle functionality',
      children: [
        {
          id: 'comments',
          name: 'comments',
          type: 'textarea',
          label: 'Additional Comments',
          placeholder: 'Any additional information...'
        }
      ]
    },
    {
      id: 'testGroup',
      name: 'testGroup',
      type: 'group',
      label: 'Toggle Behavior Test',
      tooltip: 'This group starts collapsed but has existing data',
      showastoggle: true,
      children: [
        {
          id: 'existingDataField1',
          name: 'existingDataField1',
          type: 'textfield',
          label: 'Existing Data Field 1',
          placeholder: 'This has pre-filled data',
          defaultValue: 'Pre-filled value 1'
        },
        {
          id: 'existingDataField2',
          name: 'existingDataField2',
          type: 'number',
          label: 'Existing Data Field 2',
          placeholder: 'Another pre-filled field',
          defaultValue: 42
        }
      ]
    }
  ];

  return (
    <DialogTrigger>
      <ActionButton>
        <Settings />
        <Text>Test Toggle Groups</Text>
      </ActionButton>
      {(close) => (
        <Dialog size="L">
          <Heading>
            <Flex alignItems="center" gap="size-100">
              <Settings size="S" />
              <Text>Toggle Group Test Form</Text>
            </Flex>
          </Heading>
          <Header>
            <Text>
              This form demonstrates toggle group functionality. Use the switches to show/hide group content.
            </Text>
          </Header>
          <Divider />
          <Content>
            <Form>
              <Flex direction="column" gap="size-200">
                {toggleGroupFields.map((field) => (
                  <SpectrumFieldRendererComponent
                    key={field.id}
                    field={field}
                    value={formData[field.name]}
                    onChange={(value) => handleFieldChange(field.name, value)}
                  />
                ))}
              </Flex>
            </Form>
          </Content>
          <Footer>
            <Text UNSAFE_style={{ fontSize: '12px', color: '#666' }}>
              Toggle the switches to show/hide group content. Form data will be preserved when toggling.
            </Text>
          </Footer>
          <ButtonGroup>
            <Button variant="secondary" onPress={() => handleCancel(close)}>
              Cancel
            </Button>
            <Button variant="accent" onPress={() => handleSubmit(close)}>
              Save Form
            </Button>
          </ButtonGroup>
        </Dialog>
      )}
    </DialogTrigger>
  );
};

// Standalone component for testing toggle groups without dialog
const StandaloneToggleGroupDemo: React.FC = () => {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const simpleToggleGroup = {
    id: 'simpleToggle',
    name: 'simpleToggle',
    type: 'group',
    label: 'Collapsible Section',
    tooltip: 'Click the toggle to expand or collapse this section',
    showastoggle: true,
    children: [
      {
        id: 'field1',
        name: 'field1',
        type: 'textfield',
        label: 'Field 1',
        placeholder: 'Enter some text'
      },
      {
        id: 'field2',
        name: 'field2',
        type: 'number',
        label: 'Field 2',
        placeholder: 'Enter a number'
      },
      {
        id: 'field3',
        name: 'field3',
        type: 'select',
        label: 'Field 3',
        options: [
          { value: 'option1', label: 'Option 1' },
          { value: 'option2', label: 'Option 2' },
          { value: 'option3', label: 'Option 3' }
        ]
      }
    ]
  };

  return (
    <View padding="size-400" maxWidth="600px">
      <Text UNSAFE_style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
        Standalone Toggle Group Test
      </Text>
      <Text UNSAFE_style={{ marginBottom: '20px', color: '#666' }}>
        This demonstrates a toggle group outside of a dialog context.
      </Text>
      <Form>
        <SpectrumFieldRendererComponent
          field={simpleToggleGroup}
          value={formData[simpleToggleGroup.name]}
          onChange={(value) => handleFieldChange(simpleToggleGroup.name, value)}
        />
      </Form>
    </View>
  );
};

const meta: Meta<typeof ToggleGroupDemo> = {
  title: 'Example/ToggleGroupDemo',
  component: ToggleGroupDemo
};

export default meta;
type Story = StoryObj<typeof ToggleGroupDemo>;

export const Default: Story = {};
export const Standalone: Story = {
  render: () => <StandaloneToggleGroupDemo />
};
