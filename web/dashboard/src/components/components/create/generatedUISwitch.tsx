"use client";

import React, { useContext } from 'react';
import { ToogleCodePreviewUI } from "@/components/ui/toogle-code-preview-ui";
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live'
import { useCopyToClipboard } from "@/components/hooks/useCopyToClipboard";
import { Button } from "@/components/ui/button";
import { Clipboard, ClipboardCheck } from "lucide-react";
import { useActions, useUIState } from "ai/rsc";
import { AI } from "@/components/components/create/utils/actions";
import { UserMessage } from "@/components/components/create/userMessageCard";
import { MessageContext } from "@/components/components/create/utils/messageContext";

interface GeneratedUISwitchProps {
    generatedCode: string;
    originalComponentName: string;
    generatedFile: string;
};

const GeneratedUISwitch = ({ generatedCode, generatedFile, originalComponentName } : GeneratedUISwitchProps) => {
    const [displayCode, setDisplayCode] = React.useState<boolean>(true);
    const { setCurrentMessage } = useContext(MessageContext);
    const [copiedText, copy] = useCopyToClipboard();

    const handleCopy = async () => {
        await copy(generatedCode);
    };

    const [_, setMessages] = useUIState<typeof AI>([]);
    const { sendMessage } = useActions<typeof AI>();

    const printFile = async () => {
        setMessages(currentMessages => [
            ...currentMessages,
            {
                id: Date.now(),
                role: "user",
                display: <UserMessage>Generate me a ethereal-nexus structured file for the UI defined before</UserMessage>,
            },
        ]);

        try {
            const message = `Generate me the Modified Component file for this code: ${generatedCode}. The file can be called ${originalComponentName}Modified.tsx`;
            const responseMessage = await sendMessage(message);
            setMessages(currentMessages => [...currentMessages, responseMessage]);
        } catch (error) {
            console.error('Error', error);
        }
    };

    const setMessageToDisplay = () => {
        setCurrentMessage({
            generatedCode,
            generatedFile,
            originalComponentName,
        });
    };

    return (
        <div className="relative border border-gray-300 rounded-lg p-4" onClick={setMessageToDisplay} style={{ border: "1px solid red" }}>
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
            <LiveProvider code={generatedCode}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {
                        displayCode ?
                            <div>
                                <LiveEditor className="rounded border" />
                                <LiveError className="text-red-500 mt-2" />
                            </div>:
                            <div>
                                <div className="rounded p-4">
                                    <LivePreview />
                                </div>
                            </div>
                    }
                </div>
            </LiveProvider>
            <div className="text-center mt-4">
                <Button variant="secondary" type="button" onClick={printFile}>
                    Create ethereal-nexus structured file
                </Button>
            </div>
        </div>
    );
};

export default GeneratedUISwitch;
