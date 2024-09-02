"use client";

import React  from 'react';
import { ToogleCodePreviewUI } from "@/components/ui/toogle-code-preview-ui";
import GeneratedCodeDisplay from "@/app/(session)/components/generate/GeneratedCodeDisplay";
import GeneratedCodePreviewer from "@/app/(session)/components/generate/GeneratedCodePreviewer";
import CopyToClipboard from "@/app/(session)/components/generate/CopyToClipboard";

const GeneratedUISwitch = ({ generatedCode, id }) => {
    const [displayCode, setDisplayCode] = React.useState<boolean>(true);

    const copyCodeToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(generatedCode);
        } catch (error) {
            console.error(error.message);
        }
    };

    return (
        <section className="relative border border-gray-300 rounded-lg p-4">
            <div className="absolute right-0 m-2 top-0">
                <ToogleCodePreviewUI previewCode={displayCode} updateViewMode={() => setDisplayCode(prevState => !prevState)}/>
            </div>
            <div className="absolute right-0 m-2 bottom-0 p-2">
                <CopyToClipboard copyCodeToClipboard={copyCodeToClipboard} />
            </div>
            {
                displayCode ?
                    <GeneratedCodeDisplay generatedCode={generatedCode} /> :
                    <GeneratedCodePreviewer id={id}>
                        <div dangerouslySetInnerHTML={{ __html: generatedCode }} />
                    </GeneratedCodePreviewer>
            }
        </section>
    );
};

export default GeneratedUISwitch;
