"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { SendIcon } from "lucide-react";
import { useActions, useUIState } from "ai/rsc";
import { Button } from "@/components/ui/button";
import { ComponentCard } from "@/components/components/create/ComponentCard";
import { AI } from "@/components/components/create/utils/actions";
import { UserMessage } from "@/components/components/create/UserMessage";

interface GeneratedJsxMessageProps {
    componentDescription: string;
    componentName: string;
    fileName: string;
    generatedCode: string;
};

export function GeneratedJsxMessage({ componentName, fileName, componentDescription, generatedCode }: GeneratedJsxMessageProps) {
    const [_, setMessages] = useUIState<typeof AI>([]);
    const { sendMessage } = useActions<typeof AI>();

    const handleGenerateEtherealNexusStructuredFile = async () => {
        setMessages(currentMessages => [
            ...currentMessages,
            {
                id: Date.now(),
                role: "user",
                display: <UserMessage>Generate me a ethereal-nexus structured file for the UI defined before</UserMessage>,
            },
        ]);

        try {
            const message = `Generate me the Modified Component file for this code: ${generatedCode}. The file can be called ${fileName}Modified.tsx`;
            const responseMessage = await sendMessage(message);
            setMessages(currentMessages => [...currentMessages, responseMessage]);
        } catch (error) {
            console.error('Error', error);
        }
    }

    return (
        <Card className="w-full max-w-2xl">
            <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">{componentDescription}</p>
                <ComponentCard componentName={componentName} fileName={fileName} generatedCode={generatedCode}/>
            </CardContent>
            <CardFooter className="justify-between items-center">
                <Button onClick={handleGenerateEtherealNexusStructuredFile}>
                    <SendIcon className="mr-2 h-4 w-4" /> Generate Ethereal Nexus Structured File
                </Button>
            </CardFooter>
        </Card>
    );
};
