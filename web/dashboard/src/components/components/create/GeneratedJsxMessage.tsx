"use client";

import React, { useContext } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ToolInvocation } from "ai";
import { SendIcon, DownloadIcon } from "lucide-react";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { EtherealNexusFileCard } from "@/components/components/create/EtherealNexusFileCard";
import { ChatContext } from "@/components/components/create/utils/chatContext";

interface GeneratedMessageProps {
    chatId: string;
    messageId: string;
    toolInvocation: ToolInvocation;
}

export function GeneratedJsxMessage({ messageId, chatId, toolInvocation }: GeneratedMessageProps) {
    const { currentMessage, setCurrentMessage, setIsComponentDetailsContainerOpen } = useContext(ChatContext);

    const { toolName, result } = toolInvocation;
    const isModified = toolName === 'generateEtherealNexusJSX';
    const { append } = useChat({
        id: chatId,
        body: { id: chatId },
        maxSteps: 1,
    });

    const handleGenerateEtherealNexusStructuredFile = async () => {
        await append({
            role: 'user',
            content: `Generate me the Modified Component file for this code: ${result.code}. The file can be called ${result.fileName}Modified.tsx`
        });
    }

    const downloadEtherealNexusFile = async () => {
        const file = new File([result?.code], result?.fileName, {
            type: 'text/plain',
        })

        const link = document.createElement('a');
        const url = URL.createObjectURL(file);

        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const handleOnComponentCardClick = () => {
        if (currentMessage?.id === messageId) {
            setCurrentMessage(undefined);
            setIsComponentDetailsContainerOpen(false);
            return;
        }

        setCurrentMessage({
            id: messageId as string,
            componentName: result.componentName as string,
            fileName: result.fileName as string,
            generatedCode: result.code as string,
            type: toolName as "generateJSX" | "generateEtherealNexusJSX",
        });
        setIsComponentDetailsContainerOpen(true);
    };

    return (
        <Card className="w-full max-w-2xl">
            <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">{result.description}</p>
                <EtherealNexusFileCard
                    id={messageId}
                    isModified={isModified}
                    fileName={result.fileName}
                    fileCode={result.code}
                    componentName={result.componentName}
                    handleClick={handleOnComponentCardClick} />
            </CardContent>
            <CardFooter className="justify-between items-center">
                <Button variant="text" className="text-orange-500 font-bold text-base p-0" onClick={!isModified ? handleGenerateEtherealNexusStructuredFile : downloadEtherealNexusFile}>
                    {
                        !isModified ?
                            <><SendIcon className="mr-2 h-4 w-4" />Generate Ethereal Nexus Structured File</> :
                            <><DownloadIcon className="w-4 h-4 mr-2" />Download File</>
                    }
                </Button>
            </CardFooter>
        </Card>
    );
};
