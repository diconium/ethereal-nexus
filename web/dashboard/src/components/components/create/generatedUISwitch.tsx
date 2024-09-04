"use client";

import React  from 'react';
import { ToogleCodePreviewUI } from "@/components/ui/toogle-code-preview-ui";
import GeneratedCodeDisplay from "@/components/components/create/generatedCodeDisplay";
import GeneratedCodePreviewer from "@/components/components/create/generatedCodePreviewer";
import { useCopyToClipboard } from "@/components/hooks/useCopyToClipboard";
import { Button } from "@/components/ui/button";
import { Clipboard, ClipboardCheck } from "lucide-react";

const GeneratedUISwitch = ({ generatedCode, id }) => {
    const [displayCode, setDisplayCode] = React.useState<boolean>(true);
    const [copiedText, copy] = useCopyToClipboard();

    const handleCopy = async () => {
        await copy(generatedCode);
    };

    return (
        <div className="relative border border-gray-300 rounded-lg p-4">
            <div className="absolute right-0 m-2 top-0">
                <ToogleCodePreviewUI previewCode={displayCode} updateViewMode={() => setDisplayCode(prevState => !prevState)}/>
            </div>
            {
                displayCode &&
                <div className="absolute right-0 m-2 bottom-0 p-2">
                    <Button variant="secondary" type="button" onClick={handleCopy}>
                        {
                            copiedText ? <ClipboardCheck className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />
                        }
                    </Button>
                </div>
            }
            {
                displayCode ?
                    <GeneratedCodeDisplay generatedCode={generatedCode} /> :
                    <GeneratedCodePreviewer id={id}>
                        <div dangerouslySetInnerHTML={{ __html: generatedCode }} className="w-full h-full table" />
                    </GeneratedCodePreviewer>
            }
        </div>
    );
};

export default GeneratedUISwitch;
