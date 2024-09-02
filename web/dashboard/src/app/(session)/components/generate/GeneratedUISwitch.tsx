"use client";

import React  from 'react';
import { ToogleCodePreviewUI } from "@/components/ui/toogle-code-preview-ui";
import GeneratedCodeDisplay from "@/app/(session)/components/generate/GeneratedCodeDisplay";
import GeneratedCodePreviewer from "@/app/(session)/components/generate/GeneratedCodePreviewer";

const GeneratedUISwitch = ({ generatedCode }) => {
    const [previewCode, setPreviewCode] = React.useState<boolean>(true);
    console.log('GeneratedUISwitch', generatedCode);

    return (
        <section className="relative border border-gray-300 rounded-lg p-4">
            <div className="absolute right-0 m-2 top-0">
                <ToogleCodePreviewUI previewCode={previewCode} updateViewMode={() => setPreviewCode(prevState => !prevState)}/>
            </div>
            {
                previewCode ?
                    <GeneratedCodeDisplay generatedCode={generatedCode} /> :
                    <GeneratedCodePreviewer>
                        <div dangerouslySetInnerHTML={{ __html: generatedCode }} />
                    </GeneratedCodePreviewer>
            }
        </section>
    );
};

export default GeneratedUISwitch;
