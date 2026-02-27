import {useState} from 'react';
import {SpectrumTagsField} from '../components/SpectrumTagsField';
import {StoryFn, Meta} from '@storybook/react';

export default {
    title: 'Components/SpectrumTagsField',
    component: SpectrumTagsField,
} as Meta;

const Template: StoryFn = (args) => {
    const [value, setValue] = useState(args.value || '');

    return (
        <SpectrumTagsField
            {...args}
            field={args.field} // Ensure 'field' is passed
            value={value}
            onChange={(newValue) => setValue(newValue)}
        />
    );
};

export const Default = Template.bind({});
Default.args = {
    field: {
        name: 'tags',
        label: 'Tags',
        rootPath: '/content/cq:tags',
        tooltip: 'Select tags from the list.',
    },
    value: '',
    error: null,
};

export const WithInitialTags = Template.bind({});
WithInitialTags.args = {
    field: {
        name: 'tags',
        label: 'Tags',
        rootPath: '/content/cq:tags',
        tooltip: 'Select tags from the list.',
    },
    value: 'tag1,tag2',
    error: null,
};

export const WithError = Template.bind({});
WithError.args = {
    field: {
        name: 'tags',
        label: 'Tags',
        rootPath: '/content/cq:tags',
        tooltip: 'Select tags from the list.',
    },
    value: '',
    error: 'This field is required.',
};
