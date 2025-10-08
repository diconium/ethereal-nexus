import React from 'react';

import './page.css';
import {SpectrumProvider} from "../providers/SpectrumProvider";
import {useDialogProcessor} from "@ethereal-nexus/dialog-ui-core";
import {TextField} from "./TextField";


const sampleDialogConfig = {
    fields: [
        {
            id: 'title',
            name: 'title',
            label: 'Title',
            type: 'textfield' as const,
            required: true,
            placeholder: 'Enter a title...',
            tooltip: 'This is the main title of your content'
        },
        {
            id: 'description',
            name: 'description',
            label: 'Description',
            type: 'textfield' as const,
            placeholder: 'Enter a description...',
            tooltip: 'A brief description of your content'
        }
    ]
};


export const Page: React.FC = () => {
    const {formData, updateField, errors, isValid} = useDialogProcessor(sampleDialogConfig, {});


    return (
        <SpectrumProvider colorScheme="light">
            <div style={{padding: '2rem', maxWidth: '600px', margin: '0 auto'}}>
                <h1>Ethereal Nexus AEM UI Demo</h1>
                <p>This demo showcases the React component library with Adobe Spectrum UI.</p>

                <form onSubmit={(e) => e.preventDefault()}>
                    {sampleDialogConfig.fields.map((field) => (
                        <div key={field.name} style={{marginBottom: '1rem'}}>
                            <TextField
                                field={field}
                                value={formData[field.name]}
                                onChange={(value: any) => updateField(field.name, value)}
                                error={errors[field.name]}
                            />
                        </div>
                    ))}

                    <div style={{marginTop: '2rem'}}>
                        <h3>Current Form Data:</h3>
                        <pre style={{background: '#f5f5f5', padding: '1rem', borderRadius: '4px'}}>
              {JSON.stringify(formData, null, 2)}
            </pre>
                        <p>Form is {isValid ? 'valid' : 'invalid'}</p>
                    </div>
                </form>
            </div>
        </SpectrumProvider>
    );
};
