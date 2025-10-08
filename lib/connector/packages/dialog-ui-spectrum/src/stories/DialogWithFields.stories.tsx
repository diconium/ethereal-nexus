import type {Meta, StoryObj} from '@storybook/react-vite';
import React, {useState} from 'react';
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
    Link
} from '@adobe/react-spectrum';
import {SpectrumFieldRendererComponent} from '../components/SpectrumFieldRenderer';
import Settings from '@spectrum-icons/workflow/Settings';

// Demo component that shows various field types in a dialog
const DialogWithFieldsDemo: React.FC = () => {
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

    // Sample field configurations to demonstrate various field types
    const sampleFields = [
        {
            id: 'title',
            name: 'title',
            type: 'textfield',
            label: 'Title',
            placeholder: 'Enter a title...',
            required: true,
            tooltip: 'This is a required text field'
        },
        {
            id: 'description',
            name: 'description',
            type: 'textfield',
            label: 'Description',
            placeholder: 'Enter description...',
            tooltip: 'Optional description field'
        },
        {
            id: 'category',
            name: 'category',
            type: 'select',
            label: 'Category',
            required: true,
            options: [
                {value: 'news', label: 'News'},
                {value: 'events', label: 'Events'},
                {value: 'articles', label: 'Articles'},
                {value: 'announcements', label: 'Announcements'}
            ],
            tooltip: 'Select a category for this content'
        },
        {
            id: 'heroImage',
            name: 'heroImage',
            type: 'image',
            label: 'Hero Image',
            required: false,
            tooltip: 'Upload a hero image for this content. Supports JPEG, PNG, GIF, and WebP formats.'
        },
        {
            id: 'mediaGallery',
            name: 'mediaGallery',
            type: 'media',
            label: 'Media Gallery',
            required: false,
            tooltip: 'Upload media files for the gallery. Drag and drop or browse to select files.'
        },
        {
            id: 'publishDate',
            name: 'publishDate',
            type: 'calendar',
            label: 'Publish Date',
            required: true,
            tooltip: 'Select when this content should be published. This calendar should appear above the dialog.'
        },
        {
            id: 'featured',
            name: 'featured',
            type: 'checkbox',
            label: 'Featured Content',
            tooltip: 'Mark this content as featured'
        },
        {
            id: 'active',
            name: 'active',
            type: 'switch',
            label: 'Active',
            tooltip: 'Enable or disable this content'
        },
        {
            id: 'contentPath',
            name: 'contentPath',
            type: 'pathbrowser',
            label: 'Content Path',
            required: false,
            tooltip: 'Select a path from the AEM content tree.'
        }
    ];

    return (
        <DialogTrigger>
            <ActionButton>
                <Settings/>
                <Text>Open Content Editor</Text>
            </ActionButton>
            {(close) => (
                <Dialog>
                    <Heading>
                        <Flex alignItems="center" gap="size-100">
                            <Settings size="S"/>
                            <Text>Content Editor</Text>
                        </Flex>
                    </Heading>
                    <Header>
                        <Link>
                            <a href="https://experienceleague.adobe.com/docs/experience-manager-core-components/using/introduction.html"
                               target="_blank">
                                Learn more about AEM Components
                            </a>
                        </Link>
                    </Header>
                    <Divider/>
                    <Content>
                        <Form>
                            <Flex direction="column" gap="size-200">
                                {sampleFields.map((field) => (
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
                        <Text UNSAFE_style={{fontSize: '12px', color: '#666'}}>
                            Test the calendar field to ensure it appears above this dialog. The z-index fix should make
                            it fully functional.
                        </Text>
                    </Footer>
                    <ButtonGroup>
                        <Button variant="secondary" onPress={() => handleCancel(close)}>
                            Cancel
                        </Button>
                        <Button variant="accent" onPress={() => handleSubmit(close)}>
                            Save Content
                        </Button>
                    </ButtonGroup>
                </Dialog>
            )}
        </DialogTrigger>
    );
};

// Storybook meta configuration
const meta: Meta<typeof DialogWithFieldsDemo> = {
    title: 'Examples/Dialog with Fields',
    component: DialogWithFieldsDemo,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: 'Demonstrates various SpectrumFieldRenderer components within an Adobe Spectrum Dialog. This story is particularly useful for testing the calendar field z-index fix to ensure date pickers appear above modal dialogs.',
            },
        },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default story showing the dialog with various field types
export const Default: Story = {
    name: 'Content Editor Dialog',
    parameters: {
        docs: {
            description: {
                story: 'A complete dialog example showcasing different field types including text fields, selects, calendar (date picker), checkbox, and switch. Click "Open Content Editor" to test the dialog. Pay special attention to the calendar field - when clicked, the date picker should appear above the modal dialog due to the z-index fix.',
            },
        },
    },
};

// Story specifically focused on testing the calendar z-index fix
export const CalendarZIndexTest: Story = {
    render: () => {
        const [date, setDate] = useState('');

        return (
            <DialogTrigger>
                <ActionButton>
                    Test Calendar Z-Index
                </ActionButton>
                {(close) => (
                    <Dialog>
                        <Heading>Calendar Z-Index Test</Heading>
                        <Divider/>
                        <Content>
                            <Form>
                                <Flex direction="column" gap="size-300">
                                    <Text>
                                        This dialog specifically tests the calendar field z-index fix.
                                        Click on the calendar field below and verify that the date picker
                                        appears above this modal dialog.
                                    </Text>
                                    <SpectrumFieldRendererComponent
                                        field={{
                                            id: 'testDate',
                                            name: 'testDate',
                                            type: 'calendar',
                                            label: 'Test Date',
                                            required: true,
                                            tooltip: 'This calendar should appear above the dialog when clicked'
                                        }}
                                        value={date}
                                        onChange={setDate}
                                    />
                                    <Text UNSAFE_style={{fontSize: '12px', fontStyle: 'italic'}}>
                                        Selected date: {date || 'None'}
                                    </Text>
                                </Flex>
                            </Form>
                        </Content>
                        <ButtonGroup>
                            <Button variant="secondary" onPress={close}>
                                Close
                            </Button>
                        </ButtonGroup>
                    </Dialog>
                )}
            </DialogTrigger>
        );
    },
    name: 'Calendar Z-Index Test',
    parameters: {
        docs: {
            description: {
                story: 'A focused test for the calendar field z-index fix. This story contains only a calendar field within a dialog to specifically test that the date picker popup appears above the modal dialog and is fully functional.',
            },
        },
    },
};

// Story showing a complex form with nested fields
export const ComplexForm: Story = {
    render: () => {
        const [formData, setFormData] = useState<Record<string, any>>({});

        const handleFieldChange = (fieldName: string, value: any) => {
            setFormData(prev => ({
                ...prev,
                [fieldName]: value
            }));
        };

        const complexFields = [
            {
                id: 'basic-info',
                name: 'basic-info',
                type: 'group',
                label: 'Basic Information',
                tooltip: 'Essential content information',
                children: [
                    {
                        id: 'title',
                        name: 'title',
                        type: 'textfield',
                        label: 'Content Title',
                        required: true,
                        placeholder: 'Enter title...'
                    },
                    {
                        id: 'subtitle',
                        name: 'subtitle',
                        type: 'textfield',
                        label: 'Subtitle',
                        placeholder: 'Enter subtitle...'
                    }
                ]
            },
            {
                id: 'scheduling',
                name: 'scheduling',
                type: 'group',
                label: 'Scheduling',
                tooltip: 'Content scheduling options',
                children: [
                    {
                        id: 'publishDate',
                        name: 'publishDate',
                        type: 'calendar',
                        label: 'Publish Date',
                        required: true,
                        tooltip: 'When should this content be published?'
                    },
                    {
                        id: 'expireDate',
                        name: 'expireDate',
                        type: 'calendar',
                        label: 'Expire Date',
                        tooltip: 'When should this content expire? (Optional)'
                    }
                ]
            },
            {
                id: 'settings',
                name: 'settings',
                type: 'group',
                label: 'Settings',
                toggle: true,
                tooltip: 'Advanced content settings',
                children: [
                    {
                        id: 'featured',
                        name: 'featured',
                        type: 'checkbox',
                        label: 'Featured Content'
                    },
                    {
                        id: 'active',
                        name: 'active',
                        type: 'switch',
                        label: 'Active'
                    },
                    {
                        id: 'priority',
                        name: 'priority',
                        type: 'select',
                        label: 'Priority',
                        options: [
                            {value: 'low', label: 'Low'},
                            {value: 'medium', label: 'Medium'},
                            {value: 'high', label: 'High'},
                            {value: 'urgent', label: 'Urgent'}
                        ]
                    }
                ]
            }
        ];

        return (
            <DialogTrigger>
                <ActionButton>
                    Open Advanced Editor
                </ActionButton>
                {(close) => (
                    <Dialog size="L">
                        <Heading>Advanced Content Editor</Heading>
                        <Divider/>
                        <Content>
                            <Form>
                                <Flex direction="column" gap="size-200">
                                    {complexFields.map((field) => (
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
                        <ButtonGroup>
                            <Button variant="secondary" onPress={close}>
                                Cancel
                            </Button>
                            <Button variant="accent" onPress={() => {
                                console.log('Complex form data:', formData);
                                alert('Form saved! Check console for data.');
                                close();
                            }}>
                                Save
                            </Button>
                        </ButtonGroup>
                    </Dialog>
                )}
            </DialogTrigger>
        );
    },
    name: 'Complex Form with Groups',
    parameters: {
        docs: {
            description: {
                story: 'A complex form example showcasing grouped fields, toggle groups, and multiple calendar fields within a larger dialog. This demonstrates the field renderer\'s capability to handle nested structures while maintaining proper z-index behavior for calendar fields.',
            },
        },
    },
};
