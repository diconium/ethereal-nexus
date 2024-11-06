"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { SendIcon } from "lucide-react";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { ComponentCard } from "@/components/components/create/ComponentCard";

interface GeneratedJsxMessageProps {
    messageId: string;
    componentDescription: string;
    componentName: string;
    fileName: string;
    generatedCode: string;
    chatId: string;
};

export function GeneratedJsxMessage({ messageId, componentName, fileName, componentDescription, generatedCode, chatId }: GeneratedJsxMessageProps) {
    const { append } = useChat({
        id: chatId,
        body: { id: chatId },
        maxSteps: 1,
    });

    const handleGenerateEtherealNexusStructuredFile = async () => {
        await append({
            role: 'user',
            content: `Generate me the Modified Component file for this code: ${generatedCode}. The file can be called ${fileName}Modified.tsx`
        });
    }

    return (
        <Card className="w-full max-w-2xl">
            <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">{componentDescription}</p>
                <ComponentCard id={messageId} componentName={componentName} fileName={fileName} generatedCode={generatedCode} />
            </CardContent>
            <CardFooter className="justify-between items-center">
                <Button onClick={handleGenerateEtherealNexusStructuredFile}>
                    <SendIcon className="mr-2 h-4 w-4" /> Generate Ethereal Nexus Structured File
                </Button>
            </CardFooter>
        </Card>
    );
};
