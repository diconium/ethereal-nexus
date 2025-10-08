import {useState} from 'react';
import {SpectrumPathbrowserField} from '../components/SpectrumPathbrowserField';

export default {
    title: 'Fields/SpectrumPathbrowserField',
    component: SpectrumPathbrowserField,
};

export const Default = () => {
    const [value, setValue] = useState('');

    return (
        <SpectrumPathbrowserField
            field={{
                label: 'Pathbrowser',
                tooltip: 'Select a path from AEM',
                rootPath: '/content',
                placeholder: 'Select a path...'
            }}
            value={value}
            onChange={v => {
                setValue(v);
                console.log('[Storybook] Pathbrowser value changed:', v);
            }}
            error={value === '' ? 'Please select a path.' : undefined}
        />
    );
};
